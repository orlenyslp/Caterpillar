import { printp } from "./../../adapters/logs/pending-logs";
import { PromiseError, Component } from "./../../adapters/errors/promise-error";
import { ProcessCEMetadata } from "../../adapters/mongo-db/repo-models";

import {
  DeploymentError,
  DeploymentResult,
} from "../../adapters/ethereum-blockchain/structs/deployment-output";

import { AccountInfo } from "../../adapters/ethereum-blockchain/structs/account-info";
import { FunctionInfo } from "../../adapters/ethereum-blockchain/structs/function-info";

import {
  CompilationResult,
  CompilationOutput,
} from "../../adapters/ethereum-blockchain/structs/compilation-output";

import { CompilationInfo } from "../../adapters/ethereum-blockchain/structs/compilation-output";
import { ModelInfo } from "../utils/structs/compilation-info";

import { ContractInfo } from "../../adapters/ethereum-blockchain/structs/contract-info";

import * as ethereumAdapter from "../../adapters/ethereum-blockchain/ethereum-adapter";
import {
  TypeMessage,
  print,
  printSeparator,
} from "../../adapters/logs/console-log";

import * as mongoDBAdapter from "../../adapters/mongo-db/mongo-db-adapter";
import { RepoType } from "../../adapters/mongo-db/repo-types";

let defaultAccount: AccountInfo;

// Step 1. Model Registration: Collects the compilation artifacts of the produced models,
//         and saves all these metadata as an entry in the Process Repository.

export let registerProcessRepository = (
  modelInfo: ModelInfo,
  contracts: CompilationInfo
) => {
  printp(2);
  return new Promise<Array<any>>((resolve, reject) => {
    // Sorting elements such that children are created first
    let queue = [
      {
        nodeId: modelInfo.id,
        nodeName: modelInfo.name,
        bundleId: "",
        nodeIndex: 0,
        bundleParent: "",
        factoryContract: "",
      },
    ];
    for (let i = 0; i < queue.length; i++) {
      if (modelInfo.controlFlowInfoMap.has(queue[i].nodeId)) {
        let cfInfo = modelInfo.controlFlowInfoMap.get(queue[i].nodeId);
        let candidates = [
          cfInfo.multiinstanceActivities,
          cfInfo.nonInterruptingEvents,
          cfInfo.callActivities,
        ];
        candidates.forEach((children) => {
          if (children) {
            children.forEach((value, key) => {
              queue.push({
                nodeId: key,
                nodeName: value,
                bundleId: "",
                nodeIndex: 0,
                bundleParent: "",
                factoryContract: "",
              });
            });
          }
        });
      }
    }
    queue.reverse();
    let nodeIndexes = new Map();
    for (let i = 0; i < queue.length; i++) nodeIndexes.set(queue[i].nodeId, i);
    saveProcessInRepository(queue, nodeIndexes, modelInfo, contracts)
      .then((sortedElements) => {
        resolve(sortedElements);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export let registerParent2ChildrenRelation = async (
  sortedElements: Array<any>,
  modelInfo: ModelInfo,
  runtimeRegistry: ContractInfo
): Promise<Array<any>> => {
  printp(3);
  try {
    if (!defaultAccount)
      defaultAccount = await ethereumAdapter.defaultDeployment();

    for (let i = 0; i < sortedElements.length; i++) {
      let executionRes = await ethereumAdapter.execContractFunctionSync(
        runtimeRegistry.address,
        runtimeRegistry.abi,
        new FunctionInfo("addChildBundleId", ["bytes32", "bytes32", "uint256"]),
        defaultAccount,
        [
          sortedElements[i].bundleParent,
          sortedElements[i].bundleId,
          sortedElements[i].nodeIndex,
        ]
      );
      if (executionRes instanceof DeploymentError) {
        printTreeRelations(sortedElements[i], executionRes);
        return Promise.reject([(executionRes as DeploymentError).error]);
      } else printTreeRelations(sortedElements[i], executionRes);
    }

    let removedCallActivities: Array<any> = [];
    sortedElements.forEach((element) => {
      if (
        modelInfo.controlFlowInfoMap.has(element.nodeId) ||
        modelInfo.globalNodeMap.get(element.nodeId).$type === "bpmn:StartEvent"
      ) {
        removedCallActivities.push(element);
      }
    });
    printSeparator();
    return removedCallActivities;
  } catch (error) {
    printTreeRelations(undefined, undefined, error);
    return Promise.reject(error);
  }
};

export let deployAndRegisterFactories = async (
  sortedElements: Array<any>,
  contracts: Array<CompilationOutput>,
  runtimeRegistry: ContractInfo
): Promise<Array<any>> => {
  printp(4);
  return await deployAndRegisterContract(
    "Factory",
    sortedElements,
    contracts,
    runtimeRegistry
  );
};

export let deployAndRegisterWorklists = async (
  modelInfo: ModelInfo,
  sortedElements: Array<any>,
  contracts: Array<CompilationOutput>,
  runtimeRegistry: ContractInfo
) => {
  printp(5);
  await deployAndRegisterContract(
    "Worklist",
    sortedElements,
    contracts,
    runtimeRegistry
  );

  let bundleId = "";
  for (let i = 0; i < sortedElements.length; i++) {
    if (sortedElements[i].nodeName === modelInfo.name) {
      bundleId = sortedElements[i].bundleId;
      break;
    }
  }
  return bundleId;
};

export let retrieveProcessModelMetadata = async (
  mHash: string
): Promise<ProcessCEMetadata> => {
  let modelInfo = await mongoDBAdapter.findModelMetadataById(
    RepoType.ProcessCompiledEngine,
    mHash
  );

  if (modelInfo instanceof PromiseError) {
    modelInfo.components.push(
      new Component("deployment-mediator", "retrieveProcessModelMetadata")
    );
    return Promise.reject(modelInfo);
  }

  print(JSON.stringify(modelInfo as ProcessCEMetadata));
  printSeparator();
  return modelInfo as ProcessCEMetadata;
};

////////////////////////////////////////////////
////////////   PRIVATE FUNCTIONS   /////////////
////////////////////////////////////////////////

let saveProcessInRepository = async (
  sortedElements: Array<any>,
  nodeIndexes: Map<string, number>,
  modelInfo: ModelInfo,
  contracts: CompilationInfo
): Promise<Array<any>> => {
  for (let i = 0; i < sortedElements.length; i++) {
    let nodeName = sortedElements[i].nodeName;
    let gNodeId = sortedElements[i].nodeId;
    let controlFlowInfo = modelInfo.controlFlowInfoMap.get(gNodeId);

    if (modelInfo.globalNodeMap.get(gNodeId).$type === "bpmn:StartEvent")
      controlFlowInfo = modelInfo.controlFlowInfoMap.get(
        modelInfo.globalNodeMap.get(gNodeId).$parent.id
      );

    if (controlFlowInfo) {
      let indexToFunctionName = [];
      let childrenSubproc = [];

      controlFlowInfo.nodeList.forEach((nodeId) => {
        let element = modelInfo.globalNodeMap.get(nodeId);
        if (controlFlowInfo.nodeList.indexOf(nodeId) >= 0) {
          let type = "None";
          let role = "None";
          if (
            controlFlowInfo.callActivities.has(nodeId) ||
            controlFlowInfo.multiinstanceActivities.has(nodeId) ||
            controlFlowInfo.nonInterruptingEvents.has(nodeId)
          )
            type = "Separate-Instance";
          else if (element.$type === "bpmn:ServiceTask") type = "Service";
          else if (
            element.$type === "bpmn:UserTask" ||
            element.$type === "bpmn:ReceiveTask" ||
            controlFlowInfo.catchingMessages.indexOf(nodeId) >= 0
          ) {
            type = "Workitem";
          }
          indexToFunctionName[controlFlowInfo.nodeIndexMap.get(nodeId)] = {
            name: controlFlowInfo.nodeNameMap.get(nodeId),
            id: nodeId,
            type: type,
            role: role,
          };
          if (
            controlFlowInfo.callActivities.has(nodeId) ||
            controlFlowInfo.multiinstanceActivities.has(nodeId) ||
            controlFlowInfo.nonInterruptingEvents.has(nodeId)
          ) {
            childrenSubproc.push(nodeId);
            sortedElements[
              nodeIndexes.get(nodeId)
            ].nodeIndex = controlFlowInfo.nodeIndexMap.get(nodeId);
            if (controlFlowInfo.externalBundles.has(nodeId))
              sortedElements[
                nodeIndexes.get(nodeId)
              ].bundleId = controlFlowInfo.externalBundles.get(nodeId);
          }
        }
      });

      try {
        let processRepoId = await mongoDBAdapter.updateRepository(
          RepoType.ProcessCompiledEngine,
          new ProcessCEMetadata(
            "",
            gNodeId,
            nodeName,
            i < sortedElements.length - 1 ? "empty" : modelInfo.bpmn,
            indexToFunctionName,
            getContractAbi(
              `${nodeName}Worklist`,
              contracts.compilationMetadata
            ),
            new ContractInfo(
              `${nodeName}Workflow`,
              getContractAbi(
                `${nodeName}Workflow`,
                contracts.compilationMetadata
              ),
              getContractBytecode(
                `${nodeName}Workflow`,
                contracts.compilationMetadata
              ),
              modelInfo.solidity,
              undefined
            )
          )
        );
        sortedElements[i].bundleId = processRepoId;
        sortedElements[i].bundleParent = processRepoId;
        childrenSubproc.forEach((childId) => {
          sortedElements[nodeIndexes.get(childId)].bundleParent = processRepoId;
        });
        printRepoUpdates(`${nodeName}Workflow`, processRepoId);
      } catch (error) {
        printRepoUpdates(`${nodeName}Workflow`, undefined, error);
        return Promise.reject(error);
      }
    }
  }
  return sortedElements;
};

let deployAndRegisterContract = async (
  nameSuffix: string,
  sortedElements: Array<any>,
  contracts: Array<CompilationOutput>,
  runtimeRegistry: ContractInfo
): Promise<Array<any>> => {
  try {
    if (!defaultAccount)
      defaultAccount = await ethereumAdapter.defaultDeployment();

    for (let i = 0; i < sortedElements.length; i++) {
      let contractName = sortedElements[i].nodeName + nameSuffix;
      let compilationInfo = getCompilationResults(contractName, contracts);
      if (!compilationInfo) continue;
      let contractDeployment = (await ethereumAdapter.deploySmartContractSync(
        compilationInfo,
        defaultAccount
      )) as DeploymentResult;

      printDeployment(`${nameSuffix} ${contractName}`, contractDeployment);

      let executionResult = (await ethereumAdapter.execContractFunctionSync(
        runtimeRegistry.address,
        runtimeRegistry.abi,
        new FunctionInfo("register" + nameSuffix, ["bytes32", "address"]),
        defaultAccount,
        [sortedElements[i].bundleId, contractDeployment.contractAddress]
      )) as DeploymentResult;

      printRegistryUpdates(`${nameSuffix} ${contractName}`, executionResult);
    }
    return sortedElements;
  } catch (error) {
    return Promise.reject(error);
  }
};

let getCompilationResults = (
  contractName: string,
  contracts: Array<CompilationOutput>
): CompilationResult => {
  let contract = contracts.find((contract) => {
    return contract.contractName === contractName;
  });
  return contract ? (contract as CompilationResult) : undefined;
};

let getContractAbi = (
  contractName: string,
  contracts: Array<CompilationOutput>
) => {
  let compilationResults = getCompilationResults(contractName, contracts);
  return compilationResults ? compilationResults.abi : undefined;
};

let getContractBytecode = (
  contractName: string,
  contracts: Array<CompilationOutput>
) => {
  let compilationResults = getCompilationResults(contractName, contracts);
  return compilationResults ? compilationResults.bytecode : undefined;
};

let printRepoUpdates = (contractName: string, id: any, error?: any) => {
  if (error) {
    print(
      `ERROR: Updating process repository with contract ${contractName}`,
      TypeMessage.error
    );
    print(error.toString(), TypeMessage.error);
  } else {
    print(
      `SUCCESS: Metadata of contract ${contractName} updated in process repository`,
      TypeMessage.success
    );
    print(` ID: ${id}`, TypeMessage.info);
  }
  printSeparator();
};

let printDeployment = (
  contractName: string,
  contractDeployment: DeploymentResult
) => {
  print(`SUCCESS: ${contractName} deployed`, TypeMessage.success);
  print(` Address: ${contractDeployment.contractAddress})`, TypeMessage.info);
  print(` Cost: ${contractDeployment.gasCost} gas units`, TypeMessage.info);
  printSeparator();
};

let printRegistryUpdates = (
  contractName: string,
  executionResult: DeploymentResult
) => {
  print(
    `SUCCESS: Runtime registry updated with: ${contractName}`,
    TypeMessage.success
  );
  print(` Cost: ${executionResult.gasCost} gas units`, TypeMessage.info);
  printSeparator();
};

let printTreeRelations = (sortedElement: any, result: any, error?: any) => {
  if (error) {
    print(
      "ERROR: Registering process hierarchical relations in runtime registry",
      TypeMessage.error
    );
    print(error.toString(), TypeMessage.error);
    printSeparator();
  } else if (result instanceof DeploymentError) {
    print(
      `ERROR: registering Parent-Child Relation in Contract ${sortedElement.name}`,
      TypeMessage.error
    );
    print((result as DeploymentError).error.toString(), TypeMessage.error);
    printSeparator();
  } else {
    print(
      `SUCCESS: Relation Parent(${sortedElement.bundleParent})-Child(${sortedElement.bundleId}) updated`,
      TypeMessage.success
    );
    print(
      ` Cost: ${(result as DeploymentResult).gasCost} gas units`,
      TypeMessage.info
    );
  }
};
