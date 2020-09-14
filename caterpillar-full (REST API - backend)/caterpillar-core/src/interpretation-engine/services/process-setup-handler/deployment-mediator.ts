import { ProcessIEInput } from "./../../../adapters/mongo-db/repo-models";
import { printSeparator } from "../../../adapters/messages/console-log";
import {
  SubProcessInfo,
  ElementIFlow,
  SubProcLinkInfo,
  IDataInfo,
} from "./../../utils/structs/parsing-info";
import { ContractInfo } from "./../../../adapters/ethereum-blockchain/structs/contract-info";
import {
  NewContractInstRequest,
  TypeContract,
  FunctionCallRequest,
  LinkProcessRequest,
} from "./../../utils/structs/async-requests";

import { DeploymentResult } from "../../../adapters/ethereum-blockchain/structs/deployment-output";
import { print, TypeMessage } from "../../../adapters/messages/console-log";
import { printError } from "../../../adapters/messages/error-logs";
import { CompilationResult } from "../../../adapters/ethereum-blockchain/structs/compilation-output";
import { AccountInfo } from "../../../adapters/ethereum-blockchain/structs/account-info";

import * as ethereumAdapter from "../../../adapters/ethereum-blockchain/ethereum-adapter";
import * as mongoDBAdapter from "./../../../adapters/mongo-db/mongo-db-adapter";

import * as eventMonitor from "./../worklist-handler/event-monitor";
import * as registrationService from "./../process-setup-handler/registration-mediator";

import { RepoType } from "../../../adapters/mongo-db/repo-types";
import { ModelMetadata } from "../../../adapters/mongo-db/repo-models";
import { FunctionInfo } from "../../../adapters/ethereum-blockchain/structs/function-info";
import { webSocket } from "../../../app";

class SetUpInfo {
  rootId: string = undefined;
  interpreterInfo: NewContractInstRequest;
  factoryIFlowRel = new Map<
    number,
    Map<TypeContract, NewContractInstRequest>
  >();

  constructor(
    public processInfo: Array<SubProcessInfo>,
    public iDataInfo: Array<CompilationResult>,
    public runtimeRegistry: ContractInfo,
    public bpmnModel: string
  ) {}
}

let defaultAcccount: AccountInfo;

let setUpInfo = new Map<number, SetUpInfo>();

let contractDeploymentCount = new Map<number, number>();
let functionTransactionCount = new Map<number, number>();

let lastInd = 0;

export let deploySmartContractSync = async (
  compilationInfo: CompilationResult,
  params?: Array<any>
): Promise<DeploymentResult> => {
  try {
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let contractDeployment = await ethereumAdapter.deploySmartContractSync(
      compilationInfo,
      this.defaultAccount,
      params
    );
    printDplInfo(compilationInfo, contractDeployment);
    return contractDeployment as DeploymentResult;
  } catch (error) {
    printError(
      "DeploymentMediator",
      "deploySmartContractSync",
      deploySmartContractSync
    );
    return error;
  }
};

export let deploySmartContractAsync = async (
  compilationInfo: CompilationResult,
  pId: number,
  procIndex: number,
  type: TypeContract,
  params?: any
) => {
  try {
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let transactionHash = await ethereumAdapter.deploySmartContractAsync(
      compilationInfo,
      this.defaultAccount,
      params
    );
    let newRequest = new NewContractInstRequest(
      compilationInfo,
      pId,
      procIndex,
      type,
      transactionHash,
      this.handleNewInstanceCreated
    );
    eventMonitor.listenForPendingTransaction(transactionHash, newRequest);
    return transactionHash;
  } catch (error) {
    printError("DeploymentMediator", "deploySmartContractAsync", error);
    return error;
  }
};

export let deployAllProcessContracts = async (
  processInfo: SubProcessInfo,
  interpreterInfo: CompilationResult,
  iFlowInfo: CompilationResult,
  iDataInfo: Array<CompilationResult>,
  iFactoryInfo: Array<CompilationResult>,
  runtimeRegistry: ContractInfo,
  bpmnModel: string
): Promise<any> => {
  try {
    let interpreterTHash = await deploySmartContractAsync(
      interpreterInfo,
      lastInd,
      0,
      TypeContract.BPMNInterpreter
    );
    let sortedProcesses = sortProcessHierarchy(
      processInfo,
      iDataInfo,
      iFactoryInfo
    );
    iFactoryInfo = sortedProcesses[2];
    setUpInfo.set(
      lastInd,
      new SetUpInfo(
        sortedProcesses[0],
        sortedProcesses[1],
        runtimeRegistry,
        bpmnModel
      )
    );
    findTotalTransactionCount(lastInd, sortedProcesses[0]);
    let iFlowTHashes = new Array<string>();
    let iFactoryTHashes = new Array<string>();
    for (let i = 0; i < iDataInfo.length; i++) {
      iFlowTHashes.push(
        await deploySmartContractAsync(
          iFlowInfo,
          lastInd,
          i,
          TypeContract.IFlow,
          [runtimeRegistry.address]
        )
      );
      iFactoryTHashes.push(
        await deploySmartContractAsync(
          iFactoryInfo[i],
          lastInd,
          i,
          TypeContract.IFactory
        )
      );
    }
    lastInd++;
    return {
      interpreterTHash: interpreterTHash,
      iFlowTHashes: iFlowTHashes,
      iFactoryTHashes: iFactoryTHashes,
    };
  } catch (error) {
    print(error, TypeMessage.error);
    return error;
  }
};

/////////////////////////////////////////////////////
/////// CALLBACKS FOR ASYNCHRONOUS OPERATIONS ///////
/////////////////////////////////////////////////////

export let handleNewInstanceCreated = async (
  reqInfo: NewContractInstRequest
) => {
  try {
    printHandlerInfo(1, reqInfo);
    // (1) Check and relate IFactory and BPMNInterpreter into IFlow once the instances are mined
    checkAndUpdateIFlowRel(reqInfo);
    // (2) Register all the BPMN elements into IFlow, and decrease pending transaction count
    let iDataId = undefined;
    if (reqInfo.type === TypeContract.IFlow) {
      registerIFlowElementList(
        setUpInfo.get(reqInfo.pId).processInfo[reqInfo.contractIndex],
        reqInfo
      );
      let spInfo = setUpInfo.get(reqInfo.pId);
      iDataId = await updateContractRepository(
        spInfo.iDataInfo[reqInfo.contractIndex],
        ""
      );
      printHandlerInfo(2, [spInfo, reqInfo, iDataId]);
    }
    contractDeploymentCount.set(
      reqInfo.pId,
      contractDeploymentCount.get(reqInfo.pId) - 1
    );
    reqInfo.repoId = await updateContractRepository(
      reqInfo.compilationInfo,
      reqInfo.contractAddress,
      iDataId
    );
    printHandlerInfo(3, reqInfo);
    checkAndLinkSubProcess(reqInfo.pId);
    checkAndUpdateProcessRepository(reqInfo.pId);
  } catch (error) {
    printError("DeploymentMediator", "handleNewInstanceCreated", error);
  }
};

export let handleFunctionCallRequest = (fRequest: FunctionCallRequest) => {
  functionTransactionCount.set(
    fRequest.pInd,
    functionTransactionCount.get(fRequest.pInd) - 1
  );
  printFunctionCallHandled(
    fRequest.functionName,
    fRequest.gasCost,
    fRequest.params
  );
  if (functionTransactionCount.get(fRequest.pInd) === 0)
    webSocket.send(
      JSON.stringify({ bundleId: setUpInfo.get(fRequest.pInd).rootId })
    );
};

export let handleSubprocessLink = async (linkRequest: LinkProcessRequest) => {
  try {
    functionTransactionCount.set(
      linkRequest.iFlowP.pId,
      functionTransactionCount.get(linkRequest.iFlowP.pId) - 1
    );
    printFunctionCallHandled(
      "setElement",
      linkRequest.gasCost,
      linkRequest.elementInfo
    );
    let transactionHash = await registrationService.linkSubProcess(
      linkRequest.iFlowP.contractAddress,
      linkRequest.iFlowP.compilationInfo.abi,
      linkRequest.toLink
    );
    eventMonitor.listenForPendingTransaction(
      transactionHash,
      new FunctionCallRequest(
        transactionHash,
        this.handleFunctionCallRequest,
        linkRequest.iFlowP.pId,
        "linkSubProcess",
        linkRequest.toLink
      )
    );
  } catch (error) {
    printError("DeploymentMediator", "handleSubprocessLink", error);
  }
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let sortProcessHierarchy = (
  pInfo: SubProcessInfo,
  iDataInfo: Array<CompilationResult>,
  iFactoryInfo: Array<CompilationResult>
): Array<any> => {
  let nodes = [pInfo];
  let sortedFactory = [];
  let sortedData = [];
  for (let i = 0; i < nodes.length; i++)
    nodes = nodes.concat(nodes[i].children);
  nodes = nodes.reverse();

  nodes.forEach((node) => {
    sortedFactory.push(
      iFactoryInfo.filter((fContract) => {
        return fContract.contractName === node.procName + "Factory";
      })
    );
    sortedData.push(
      iDataInfo.filter((fContract) => {
        return fContract.contractName === node.procName + "Data";
      })
    );
  });
  return [nodes, sortedData.flat(), sortedFactory.flat()];
};

let findTotalTransactionCount = (
  pIndex: number,
  processes: Array<SubProcessInfo>
) => {
  let contractCount = 1; // Deployment of Interpreter
  let functionCount = 1; // Update of Root process in Runtime Registry
  for (let i = 0; i < processes.length; i++) {
    contractCount += 2; // Deployment of IFactory and IFlow contracts
    functionCount += processes[i].iflow.elementInfo.size + 2; // BPMN Elements to Register + Rel(Iflow-IFactory) + Rel(IFlow-INterpreter)
    functionCount += processes[i].children.length; // Children registration
  }
  contractDeploymentCount.set(pIndex, contractCount);
  functionTransactionCount.set(pIndex, functionCount);
};

let registerIFlowElementList = (
  procInfo: SubProcessInfo,
  iFlowInfo: NewContractInstRequest
) => {
  procInfo.iflow.nodeIndexMap.forEach(async (eInd, eId) => {
    try {
      if (!isSubprocess(eId, procInfo)) {
        let eInfo = procInfo.iflow.elementInfo.get(eInd);
        let transactionHash = await registrationService.setIFlowNodeElement(
          iFlowInfo.contractAddress,
          iFlowInfo.compilationInfo.abi,
          eInfo
        );
        eventMonitor.listenForPendingTransaction(
          transactionHash,
          new FunctionCallRequest(
            transactionHash,
            this.handleFunctionCallRequest,
            iFlowInfo.pId,
            "setElement",
            eInfo
          )
        );
      }
    } catch (error) {
      printError("DeploymentMediator", "registerIflowElementList", error);
    }
  });
};

let isSubprocess = (eId: string, iFlowInfo: SubProcessInfo) => {
  return (
    iFlowInfo.children.filter((node) => {
      return node.procBpmnId === eId;
    }).length > 0
  );
};

let checkAndUpdateIFlowRel = async (reqInfo: NewContractInstRequest) => {
  try {
    let spInd = reqInfo.contractIndex;
    let pInfo = setUpInfo.get(reqInfo.pId);
    if (reqInfo.type === TypeContract.BPMNInterpreter) {
      pInfo.interpreterInfo = reqInfo;
    } else {
      if (!pInfo.factoryIFlowRel.has(spInd)) {
        pInfo.factoryIFlowRel.set(
          spInd,
          new Map<TypeContract, NewContractInstRequest>()
        );
      }
      pInfo.factoryIFlowRel.get(spInd).set(reqInfo.type, reqInfo);
    }
    if (
      pInfo.interpreterInfo &&
      pInfo.factoryIFlowRel.has(spInd) &&
      pInfo.factoryIFlowRel.get(spInd).get(TypeContract.IFlow) &&
      pInfo.factoryIFlowRel.get(spInd).get(TypeContract.IFactory)
    ) {
      let iFlow = pInfo.factoryIFlowRel.get(spInd).get(TypeContract.IFlow);
      let iFactory = pInfo.factoryIFlowRel
        .get(spInd)
        .get(TypeContract.IFactory);
      if (!this.defaultAccount)
        this.defaultAccount = await ethereumAdapter.defaultDeployment();
      registerContractAddress(
        iFlow.contractAddress,
        iFlow.compilationInfo.abi,
        reqInfo.pId,
        "setFactoryInst",
        iFactory.contractAddress
      );
      registerContractAddress(
        iFlow.contractAddress,
        iFlow.compilationInfo.abi,
        reqInfo.pId,
        "setInterpreterInst",
        pInfo.interpreterInfo.contractAddress
      );
    }
  } catch (error) {
    printError("DeploymentMediator", "checkAndUpdateIFlowRel", error);
  }
};

let checkAndUpdateProcessRepository = async (pInd: number) => {
  try {
    if (contractDeploymentCount.get(pInd) === 0) {
      let procHash = undefined;
      let spInfo = setUpInfo.get(pInd);
      let procChildren = new Map<string, Array<string>>();
      for (let i = 0; i < spInfo.processInfo.length; i++)
        procChildren.set(spInfo.processInfo[i].procName, new Array<string>());
      for (let i = 0; i < spInfo.iDataInfo.length; i++) {
        let processInfo = spInfo.processInfo[i];
        procHash = await mongoDBAdapter.updateRepository(
          RepoType.ProcessInterpretedEngine,
          new ProcessIEInput(
            processInfo.procBpmnId,
            processInfo.procName,
            spInfo.bpmnModel,
            infoToArray(processInfo.iflow.elementInfo, processInfo.iData),
            procChildren.get(processInfo.procName),
            spInfo.factoryIFlowRel.get(i).get(TypeContract.IFactory).repoId,
            spInfo.factoryIFlowRel.get(i).get(TypeContract.IFlow).repoId
          )
        );
        if (processInfo.parent)
          procChildren.get(processInfo.parent.procName).push(procHash);
        print(
          `Process ${processInfo.procName} updated in repositpry`,
          TypeMessage.success
        );
        print(`  ID: ${procHash}`, TypeMessage.data);
        printSeparator();
      }
      let rootProc = spInfo.processInfo.length - 1;
      spInfo.rootId = procHash;
      updateRuntimeRegistry(
        pInd,
        spInfo.runtimeRegistry,
        procHash,
        spInfo.factoryIFlowRel.get(rootProc).get(TypeContract.IFlow)
          .contractAddress
      );
    }
  } catch (error) {
    printError("DeploymentMediator", "checkAndUpdateProcessRepository", error);
  }
};

let checkAndLinkSubProcess = async (pInd: number) => {
  try {
    if (contractDeploymentCount.get(pInd) === 0) {
      let processes = setUpInfo.get(pInd).processInfo;
      let stInfo = setUpInfo.get(pInd);
      for (let i = 0; i < processes.length - 1; i++) {
        let childP = processes[i];
        if (childP.parent) {
          let parentP = childP.parent;
          let prtInd = -1;
          for (let j = i + 1; j < processes.length; j++)
            if (processes[j].procName === parentP.procName) {
              prtInd = j;
              break;
            }
          if (prtInd !== -1) {
            let iFlowP = stInfo.factoryIFlowRel
              .get(prtInd)
              .get(TypeContract.IFlow);
            let iFlowC = stInfo.factoryIFlowRel.get(i).get(TypeContract.IFlow);
            let childIndex = parentP.iflow.nodeIndexMap.get(childP.procBpmnId);
            let toLink = new SubProcLinkInfo(
              childIndex,
              iFlowC.contractAddress,
              parentP.iflow.attachedEvents.get(childIndex)
                ? parentP.iflow.attachedEvents.get(childIndex)
                : [],
              childP.instCount
            );
            let transactionHash = await registrationService.setIFlowNodeElement(
              iFlowP.contractAddress,
              iFlowP.compilationInfo.abi,
              parentP.iflow.elementInfo.get(childIndex)
            );
            eventMonitor.listenForPendingTransaction(
              transactionHash,
              new LinkProcessRequest(
                transactionHash,
                this.handleSubprocessLink,
                toLink,
                parentP.iflow.elementInfo.get(childIndex),
                iFlowP
              )
            );
          }
        }
      }
    }
  } catch (error) {
    printError("DeploymentMediator", "checkAndLinkSubProcess", error);
  }
};

let updateRuntimeRegistry = async (
  pInd: number,
  runtimeRegistry: ContractInfo,
  rootProcId: string,
  iFlowAddress: string
) => {
  try {
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("registerIFlow", ["bytes32", "address"]),
      this.defaultAccount,
      [rootProcId, iFlowAddress]
    );
    eventMonitor.listenForPendingTransaction(
      transactionHash,
      new FunctionCallRequest(
        transactionHash,
        this.handleFunctionCallRequest,
        pInd,
        "registerIFlow",
        [rootProcId, iFlowAddress]
      )
    );
  } catch (error) {
    printError("DeploymentMediator", "updateRuntimeRegistry", error);
  }
};

let infoToArray = (
  iFlowMap: Map<number, ElementIFlow>,
  iDataInfo: IDataInfo
) => {
  let result = [];
  iFlowMap.forEach((element, index) => {
    let input = iDataInfo.inParams.has(index)
      ? iDataInfo.inParams.get(index)
      : [];
    let output = iDataInfo.outParams.has(index)
      ? iDataInfo.outParams.get(index)
      : [];
    result[index] = {
      element: JSON.stringify(element),
      input: JSON.stringify(input),
      output: JSON.stringify(output),
    };
  });
  return result;
};

let updateContractRepository = async (
  cInfo: CompilationResult,
  address: string,
  linkedId?: string
) => {
  try {
    let toSave = new ContractInfo(
      cInfo.contractName,
      cInfo.abi,
      cInfo.bytecode,
      cInfo.solidity,
      address
    );
    if (linkedId) toSave._relId = linkedId;
    return await mongoDBAdapter.updateRepository(
      RepoType.SmartContract,
      new ModelMetadata(toSave)
    );
  } catch (error) {
    printError("DeploymentMediator", "updateContractRepository", error);
  }
};

let registerContractAddress = async (
  contractAddress: any,
  contractAbi: any,
  pInd: number,
  funcName: string,
  addressToRegister: string
) => {
  try {
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      contractAddress,
      contractAbi,
      new FunctionInfo(funcName, ["address"]),
      this.defaultAccount,
      [addressToRegister]
    );
    eventMonitor.listenForPendingTransaction(
      transactionHash,
      new FunctionCallRequest(
        transactionHash,
        this.handleFunctionCallRequest,
        pInd,
        funcName,
        addressToRegister
      )
    );
  } catch (error) {
    printError("DeploymentMediator", "registerContractAddress", error);
  }
};

let printFunctionCallHandled = (
  functionName: string,
  gasCost: any,
  params: any
) => {
  let cName = functionName === "registerIFlow" ? "RuntimeRegistry" : "IFlow";
  print(`SUCCESS: Executed function ${cName}.${functionName}`, TypeMessage.success);
  print(` ${JSON.stringify(params)}`, TypeMessage.data);
  print(` Cost: ${gasCost} gas`, TypeMessage.data);
  printSeparator();
};

let printDplInfo = (compilationInfo: any, contractDeployment: any) => {
  print(
    `SUCCESS: ${compilationInfo.contractName} deployed successfully`,
    TypeMessage.success
  );
  print(
    ` Address: ${(contractDeployment as DeploymentResult).contractAddress}`,
    TypeMessage.info
  );
  print(
    ` Cost: ${(contractDeployment as DeploymentResult).gasCost} gas units`,
    TypeMessage.info
  );
  printSeparator();
};

let printHandlerInfo = (type: number, info: any) => {
  switch (type) {
    case 1: {
      print(
        `SUCCESS: Transaction ${info.transactionHash} for deploying ${info.type} accepted`,
        TypeMessage.success
      );
      print(` Contract Address ${info.contractAddress}`, TypeMessage.data);
      print(` Cost ${info.gasCost} gas units`, TypeMessage.data);
      printSeparator();
      break;
    }
    case 2: {
      print(
        `SUCCESS: IData metadata from ${
          info[0].processInfo[info[1].contractIndex].procName
        } updated in repositpry`,
        TypeMessage.success
      );
      print(`  ID: ${info[2]}`, TypeMessage.data);
      printSeparator();
      break;
    }
    case 3: {
      print(
        `SUCCESS: ${info.type} running at ${info.contractAddress} updated in repositpry`,
        TypeMessage.success
      );
      print(`  ID: ${info.repoId}`, TypeMessage.data);
      printSeparator();
      break;
    }
  }
};
