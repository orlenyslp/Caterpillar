import { ProcessIEMetadata } from "./../../../adapters/mongo-db/repo-models";
import {
  NewContractRequest,
  TaskExecutionRequest,
} from "./../../utils/structs/async-requests";
import {
  print,
  TypeMessage,
  printSeparator,
} from "../../../adapters/messages/console-log";
import { AccountInfo } from "./../../../adapters/ethereum-blockchain/structs/account-info";
import { ContractInfo } from "./../../../adapters/ethereum-blockchain/structs/contract-info";
import { RepoType } from "../../../adapters/mongo-db/repo-types";
import { printError } from "../../../adapters/messages/error-logs";

import * as mongoDBAdapter from "./../../../adapters/mongo-db/mongo-db-adapter";
import * as ethereumAdapter from "./../../../adapters/ethereum-blockchain/ethereum-adapter";
import { FunctionInfo } from "../../../adapters/ethereum-blockchain/structs/function-info";

import * as eventMonitorService from "./event-monitor";
import { EventType } from "./../worklist-handler/event-monitor";
import { webSocket } from "../../../app";

let defaultAcccount: AccountInfo;

export let createNewProcessInstance = async (
  iFlowAddr: string,
  runtimeRegistry: ContractInfo,
  accessCtrolAddr: string,
  rbPolicyAddr: string,
  taskRoleMapAddr: string
) => {
  try {
    await validateAddressInput(iFlowAddr, "IFlow");
    await validateAddressInput(accessCtrolAddr, "DynamicAccessControl");
    await validateAddressInput(rbPolicyAddr, "RoleBindingPolicy");
    await validateAddressInput(taskRoleMapAddr, "TaskRoleMap");
    let interpreterInfo = await getInterpreterInfoFromIFlow(iFlowAddr);
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("newRestrictedIInstanceFor", [
        "address",
        "address",
        "address",
        "address",
        "address",
      ]),
      this.defaultAccount,
      [
        iFlowAddr,
        interpreterInfo.address,
        accessCtrolAddr,
        rbPolicyAddr,
        taskRoleMapAddr,
      ]
    );
    eventMonitorService.listenForPendingLogs(
      interpreterInfo.address,
      interpreterInfo.abi,
      EventType.NewCaseCreated,
      new NewContractRequest(
        transactionHash,
        this.handleNewInstanceCreated,
        interpreterInfo.address
      )
    );
    return transactionHash;
  } catch (error) {
    printError(
      `INTERPRETATION ENGINE: executionMediator`,
      "createNewProcessInstance",
      error
    );
    return Promise.reject(error);
  }
};

export let queryProcessState = async (
  iDataAddr: string,
  runtimeRegistry: ContractInfo
) => {
  try {
    await validateAddressInput(iDataAddr, "IData");
    // Retrieving the IFlow node related to the input IData from Runtime Registry.
    let iFlowAddr = await findIFlowAddress(iDataAddr, runtimeRegistry);
    // Retrieving identifier of the process metadata entry in repository from Runtime Registry.
    let procId = await ethereumAdapter.callContractFunction(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("getBundleIdFromIFlow", ["address"], "bytes32"),
      this.defaultAccount,
      [iFlowAddr]
    );
    // Retrieving the Process Hierarchy metadata from process repository
    let procInfo = (await mongoDBAdapter.findModelMetadataById(
      RepoType.ProcessInterpretedEngine,
      procId
    )) as ProcessIEMetadata;
    // BFS on process hierarchy to discover enabled tasks
    let enabledWorkitems = new Array<any>();
    let queue = [procInfo];
    let iDataAddresses = [iDataAddr];
    for (let topP = 0; topP < queue.length; topP++) {
      procInfo = queue[topP];
      iDataAddr = iDataAddresses[topP];
      let iFlowInfo = procInfo.iFlow;
      let iDataInfo = procInfo.iData;
      let tokens = ethereumAdapter.toBinaryArray(
        await ethereumAdapter.callContractFunction(
          iDataAddr,
          iDataInfo.abi,
          new FunctionInfo("getMarking", [], "uint256"),
          this.defaultAccount
        )
      );
      let elementList: Array<any> = procInfo.indexToElement;
      for (let eInd = 1; eInd < elementList.length; eInd++) {
        let preC = ethereumAdapter.toBinaryArray(
          await ethereumAdapter.callContractFunction(
            iFlowInfo.address,
            iFlowInfo.abi,
            new FunctionInfo("getPreCond", ["uint256"], "uint256"),
            this.defaultAccount,
            [eInd]
          )
        );
        let typeInfo = ethereumAdapter.toBinaryArray(
          await ethereumAdapter.callContractFunction(
            iFlowInfo.address,
            iFlowInfo.abi,
            new FunctionInfo("getTypeInfo", ["uint256"], "uint256"),
            this.defaultAccount,
            [eInd]
          )
        );
        if (isWorkItem(typeInfo)) {
          // User Task or Receive Task
          for (let i = 0; i < preC.length; i++) {
            if (preC[i] === "1" && i < tokens.length && tokens[i] === "1") {
              enabledWorkitems.push({
                elementName: JSON.parse(elementList[eInd].element).eName,
                input: elementList[eInd].input,
                output: elementList[eInd].output,
                bundleId: procInfo._id,
                hrefs: [`/i-flow/${eInd}/i-data/${iDataAddr}`],
              });
              break;
            }
          }
        }
      }
      let startedActivities = ethereumAdapter.toBinaryArray(
        await ethereumAdapter.callContractFunction(
          iDataAddr,
          iDataInfo.abi,
          new FunctionInfo("getStartedActivities", [], "uint256"),
          this.defaultAccount
        )
      );
      for (let subPInd = 1; subPInd < startedActivities.length; subPInd++) {
        if (startedActivities[subPInd] === "1") {
          let childAddresses: Array<string> = await ethereumAdapter.callContractFunction(
            iDataAddr,
            iDataInfo.abi,
            new FunctionInfo("getChildProcInst", ["uint256"], "address[]"),
            this.defaultAccount,
            [subPInd]
          );
          for (let j = 0; j < childAddresses.length; j++) {
            queue.push(procInfo.children[j]);
            iDataAddresses.push(childAddresses[j]);
          }
        }
      }
    }
    printInOutInfo(1, [iDataAddresses[0], enabledWorkitems]);
    return enabledWorkitems;
  } catch (error) {
    printError(
      `INTERPRETATION ENGINE: executionMediator`,
      "queryProcessState",
      error
    );
    return Promise.reject(error);
  }
};

export let executeTask = async (
  eIndex: string,
  iDataAddr: string,
  inParams: any,
  runtimeRegistry: ContractInfo
) => {
  try {
    await validateAddressInput(iDataAddr, "IData");
    // Retrieving the IFlow node related to the input IData from Runtime Registry.
    let iFlowAddr = await findIFlowAddress(iDataAddr, runtimeRegistry);
    let iFlowInfo = (await mongoDBAdapter.findContractInfoByAddress(
      RepoType.SmartContract,
      iFlowAddr
    )) as ContractInfo;
    let iDataInfo = (await mongoDBAdapter.findContractInfoById(
      RepoType.SmartContract,
      iFlowInfo._relId
    )) as ContractInfo;
    let [paramTypes, paramValues] = extractParams(inParams, eIndex);
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      iDataAddr,
      iDataInfo.abi,
      new FunctionInfo("checkIn", paramTypes),
      this.defaultAccount,
      paramValues
    );
    eventMonitorService.listenForPendingTransaction(
      transactionHash,
      new TaskExecutionRequest(
        transactionHash,
        this.handleTaskExecutionCompleted,
        eIndex,
        paramValues,
        iDataAddr
      )
    );
    return transactionHash;
  } catch (error) {
    return Promise.reject(error);
  }
};

export let checkOutTaskData = async (
  eIndex: string,
  iDataAddr: string,
  outParams: Array<any>,
  runtimeRegistry: ContractInfo
) => {
  try {
    if (outParams.length == 0) return {};
    await validateAddressInput(iDataAddr, "IData");
    // Retrieving the IFlow node related to the input IData from Runtime Registry.
    let iFlowAddr = await findIFlowAddress(iDataAddr, runtimeRegistry);
    let iFlowInfo = (await mongoDBAdapter.findContractInfoByAddress(
      RepoType.SmartContract,
      iFlowAddr
    )) as ContractInfo;
    let iDataInfo = (await mongoDBAdapter.findContractInfoById(
      RepoType.SmartContract,
      iFlowInfo._relId
    )) as ContractInfo;
    let paramInfo = extractOutParams(outParams);
    let processData = mapOutParamToValue(
      await ethereumAdapter.callContractFunction(
        iDataAddr,
        iDataInfo.abi,
        new FunctionInfo(paramInfo[0], ["uint256"], paramInfo[1], true),
        this.defaultAccount,
        [eIndex]
      ),
      outParams
    );
    printInOutInfo(2, [eIndex, iDataAddr, processData]);
    return processData;
  } catch (error) {
    print(error, TypeMessage.error);
    return Promise.reject(error);
  }
};

/////////////////////////////////////////////////////
/////// CALLBACKS FOR ASYNCHRONOUS OPERATIONS ///////
/////////////////////////////////////////////////////

let findIFlowAddress = async (
  iDataAddr: string,
  runtimeRegistry: ContractInfo
): Promise<string> => {
  return await ethereumAdapter.callContractFunction(
    runtimeRegistry.address,
    runtimeRegistry.abi,
    new FunctionInfo("getIFlowFromIData", ["address"], "address"),
    this.defaultAccount,
    [iDataAddr]
  );
};

export let handleNewInstanceCreated = async (
  requestInfo: NewContractRequest
) => {
  if (webSocket) webSocket.send(JSON.stringify(requestInfo));
  printHandlerInfo(1, requestInfo);
};

export let handleTaskExecutionCompleted = (
  requestInfo: TaskExecutionRequest
) => {
  if (webSocket) webSocket.send(JSON.stringify(requestInfo));
  printHandlerInfo(2, requestInfo);
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let validateAddressInput = async (address: string, nodeType: string) => {
  if (!ethereumAdapter.isValidBlockchainAddress(address)) {
    printError(
      `INTERPRETATION ENGINE: executionMediator`,
      "createNewProcessInstance",
      `Invalid ${nodeType} Address ${address}`
    );
    throw new Error(`Invalid ${nodeType} Address ${address}`);
  }
  if (!this.defaultAccount)
    this.defaultAccount = await ethereumAdapter.defaultDeployment();
};

let isWorkItem = (typeInfo: Array<string>) => {
  return (
    typeInfo[0] === "1" &&
    typeInfo[3] === "1" &&
    (typeInfo[11] === "1" || typeInfo[14] === "1")
  );
};

let getInterpreterInfoFromIFlow = async (
  iFlowAddr: string
): Promise<ContractInfo> => {
  let iFlowInfo = await mongoDBAdapter.findContractInfoByAddress(
    RepoType.SmartContract,
    iFlowAddr
  );
  let interpreterAddr = await ethereumAdapter.callContractFunction(
    iFlowAddr,
    (iFlowInfo as ContractInfo).abi,
    new FunctionInfo("getInterpreterInst", [], "address"),
    this.defaultAccount,
    []
  );
  let interpreterInfo = await mongoDBAdapter.findContractInfoByAddress(
    RepoType.SmartContract,
    interpreterAddr
  );
  return interpreterInfo as ContractInfo;
};

let extractParams = (jsonInput: Array<any>, eInd: string) => {
  let types = ["uint256"];
  let values = [eInd];
  jsonInput.forEach((param) => {
    types.push(param.type);
    values.push(param.value);
  });
  return [types, values];
};

let extractOutParams = (outParams: Array<any>): Array<string> => {
  let functName = "checkOut";
  let paramTypes = [];
  outParams.forEach((param) => {
    functName += param.type.charAt(0).toUpperCase() + param.type.charAt(1);
    paramTypes.push(param.type.toString());
  });
  return [functName, `${paramTypes.toString()}`];
};

let mapOutParamToValue = (processData: any, outParams: Array<any>) => {
  let result = {};
  for (let i = 0; i < outParams.length; i++)
    result[outParams[i].name] = processData[i];
  return result;
};

let printInOutInfo = (type: number, info: any) => {
  switch (type) {
    case 1: {
      print(
        `Enabled activities of process running at ${info[0]} retrieved`,
        TypeMessage.success
      );
      print(JSON.stringify(info[1]), TypeMessage.data);
      printSeparator();
      break;
    }
    case 2: {
      print(
        `Output params from task ${info[0]} at IData ${info[1]} checked out`,
        TypeMessage.success
      );
      print(`   Data: ${JSON.stringify(info[2])}`, TypeMessage.data);
      printSeparator();
      break;
    }
  }
};

let printHandlerInfo = (type: number, requestInfo: any) => {
  switch (type) {
    case 1: {
      print(
        `SUCCESS: New Process Instance created from IFlow running at ${requestInfo.iFlowAddr}`,
        TypeMessage.success
      );
      print(
        `  TransactionHash: ${requestInfo.transactionHash}`,
        TypeMessage.info
      );
      print(`  Address: ${requestInfo.iDataAddr}`, TypeMessage.info);
      print(`  GasUsed: ${requestInfo.gasCost} units`, TypeMessage.info);
      printSeparator();
      break;
    }
    case 2: {
      print(
        `SUCCESS: Task ${requestInfo.eName} executed successfully at IData running at ${requestInfo.iDataAddr}`,
        TypeMessage.success
      );
      print(
        `  TransactionHash: ${requestInfo.transactionHash}`,
        TypeMessage.info
      );
      print(`  Input Params: ${requestInfo.params}`, TypeMessage.info);
      print(`  GasUsed: ${requestInfo.gasCost} units`, TypeMessage.info);
      printSeparator();
      break;
    }
  }
};
