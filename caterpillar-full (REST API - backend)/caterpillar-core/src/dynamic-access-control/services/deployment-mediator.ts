import * as fs from "fs";

import { printError } from "./../../adapters/logs/error-logs";
import {
  RoleBindingPolicy,
  RoleTaskMap,
  ModelMetadata,
} from "./../../adapters/mongo-db/repo-models";
import {
  print,
  printSeparator,
  TypeMessage,
} from "./../../adapters/logs/console-log";
import { AccountInfo } from "./../../adapters/ethereum-blockchain/structs/account-info";
import {
  CompilationError,
  CompilationResult,
} from "./../../adapters/ethereum-blockchain/structs/compilation-output";
import { CompilationInput } from "./../../adapters/ethereum-blockchain/structs/compilation-input";
import { Policy } from "./../utils/structs/policy-info";
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import {
  NewBPolicyInstance,
  NewRoleTaskMap,
  NewInstanceRequest,
  PolicyLinkRequest,
} from "./../utils/structs/async-requests";

import * as solidityCompiler from "./../../adapters/ethereum-blockchain/solidity-compiler";
import * as ethereumAdapter from "./../../adapters/ethereum-blockchain/ethereum-adapter";
import * as mongoDBAdapter from "./../../adapters/mongo-db/mongo-db-adapter";
import * as eventMonitor from "./../../adapters/event-monitor/event-monitor";
import { RepoType } from "../../adapters/mongo-db/repo-types";
import { sendThroughSocket } from "../../app";

let defaultAccount: AccountInfo;

export let deployBindingPolicy = async (rbPolicy: Policy) => {
  try {
    let [cInfo, transactionHash] = await deployContract(
      "RoleBindingPolicy",
      rbPolicy.solidity
    );
    let newRequest = new NewBPolicyInstance(
      transactionHash,
      this.handleNewBPolicyInstance,
      cInfo,
      rbPolicy.model,
      rbPolicy.roleIndexMap
    );
    eventMonitor.listenForPendingTransaction(newRequest);
    printNewTransaction(transactionHash, cInfo.contractName);
    return transactionHash;
  } catch (error) {
    return Promise.reject(error);
  }
};

export let deployTaskRoleMap = async (
  contractName: string,
  taskRolePairs: Array<any>,
  solidityCode: string
) => {
  try {
    let [cInfo, transactionHash] = await deployContract(
      contractName,
      solidityCode
    );
    let newRequest = new NewRoleTaskMap(
      transactionHash,
      this.handleNewRoleTaskMap,
      cInfo,
      taskRolePairs
    );
    eventMonitor.listenForPendingTransaction(newRequest);
    printNewTransaction(transactionHash, cInfo.contractName);
    return transactionHash;
  } catch (error) {
    return Promise.reject(error);
  }
};

export let deployAccessControl = async () => {
  let [cInfo, transactionHash] = await deployContract(
    "BindingAccessControl",
    fs.readFileSync(
      "./src/dynamic-access-control/utils/solidity-interfaces/binding-access-control.sol",
      "utf8"
    )
  );
  let newRequest = new NewInstanceRequest(
    transactionHash,
    this.handleNewAccessControl,
    cInfo
  );
  eventMonitor.listenForPendingTransaction(newRequest);
  printNewTransaction(transactionHash, cInfo.contractName);
  return transactionHash;
};

/////////////////////////////////////////////////////
/////// CALLBACKS FOR ASYNCHRONOUS OPERATIONS ///////
/////////////////////////////////////////////////////

export let handleNewAccessControl = async (cInfo: NewInstanceRequest) => {
  try {
    let repoId = await mongoDBAdapter.updateRepository(
      RepoType.SmartContract,
      new ModelMetadata(toContractInfo(cInfo))
    );
    sendResponse(cInfo, repoId);
  } catch (error) {
    handleError("handleNewBPolicyInstance", error);
  }
};

export let handleNewBPolicyInstance = async (
  policyInfo: NewBPolicyInstance
) => {
  try {
    let policyID = await mongoDBAdapter.updateRepository(
      RepoType.RoleBindingPolicy,
      new RoleBindingPolicy(
        policyInfo.policyModel,
        policyInfo.roleIndexMap,
        toContractInfo(policyInfo)
      )
    );
    sendResponse(policyInfo, policyID);
  } catch (error) {
    handleError("handleNewBPolicyInstance", error);
  }
};

export let handleNewRoleTaskMap = async (mapInfo: NewRoleTaskMap) => {
  try {
    let policyID = await mongoDBAdapter.updateRepository(
      RepoType.RoleTaskMap,
      new RoleTaskMap(toArray(mapInfo.roleTaskPairs), toContractInfo(mapInfo))
    );
    sendResponse(mapInfo, policyID);
  } catch (error) {
    handleError("handleNewRoleTaskMap", error);
  }
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let compilePolicyContract = async (
  contractName: string,
  solidityCode: string
): Promise<CompilationResult> => {
  try {
    let inputContract = new CompilationInput(contractName, solidityCode, []);
    let compiledContracts = solidityCompiler.compileSmartContracts(
      inputContract
    );
    if (compiledContracts[0] instanceof CompilationError)
      return Promise.reject(compiledContracts[0]);
    let result = compiledContracts[0] as CompilationResult;
    result.solidity = solidityCode;
    return result;
  } catch (error) {
    return Promise.reject(error);
  }
};

let deployContract = async (
  contractName: string,
  solidityCode: string,
  args?: Array<any>
) => {
  try {
    let cInfo = await compilePolicyContract(contractName, solidityCode);
    if (cInfo instanceof CompilationResult) {
      if (!this.defaultAccount)
        this.defaultAccount = await ethereumAdapter.defaultDeployment();

      let transactionHash = await ethereumAdapter.deploySmartContractAsync(
        cInfo,
        this.defaultAccount,
        args
      );

      return [cInfo, transactionHash];
    } else {
      throw new Error(cInfo);
    }
  } catch (error) {
    print(error, TypeMessage.error);
    throw new Error(error);
  }
};

let validateInfoToLink = async (
  processId: string,
  isCompiled: boolean,
  accessControlId: string,
  rbPolicyID: string,
  trMapAddrID: string
) => {
  try {
    let rbPolicyInfo = await mongoDBAdapter.findModelMetadataById(
      RepoType.RoleBindingPolicy,
      rbPolicyID
    );
    if (!(rbPolicyInfo instanceof ModelMetadata))
      return Promise.reject("Invalid policy ID");

    let taskRoleInfo = await mongoDBAdapter.findModelMetadataById(
      RepoType.RoleTaskMap,
      trMapAddrID
    );
    if (!(taskRoleInfo instanceof ModelMetadata))
      return Promise.reject("Invalid task role map id");

    let accessControlInfo = await mongoDBAdapter.findContractInfoById(
      RepoType.SmartContract,
      accessControlId
    );
    if (!(accessControlInfo instanceof ContractInfo))
      return Promise.reject("Invalid access control id");

    let processInfo = await mongoDBAdapter.findModelMetadataById(
      isCompiled === false
        ? RepoType.ProcessCompiledEngine
        : RepoType.ProcessInterpretedEngine,
      processId
    );
    if (!(processInfo instanceof ModelMetadata))
      return Promise.reject("Invalid process id");

    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();

    return [
      rbPolicyInfo.contractInfo.address,
      taskRoleInfo.contractInfo.address,
      accessControlInfo,
    ];
  } catch (error) {
    return Promise.reject(error);
  }
};

let toContractInfo = (resultInfo: NewInstanceRequest) => {
  return new ContractInfo(
    resultInfo.compilationInfo.contractName,
    resultInfo.compilationInfo.abi,
    resultInfo.compilationInfo.bytecode,
    resultInfo.compilationInfo.solidity,
    resultInfo.contractAddress
  );
};

let toArray = (roleTask: Array<any>) => {
  let result = [];
  roleTask.forEach((element) => {
    result[element.taskIndex] = element.roleIndex;
  });
  return result;
};

let sendResponse = (info: any, id: string) => {
  print(
    `SUCCESS: ${info.compilationInfo.contractName} deployed succesfully`,
    TypeMessage.success
  );
  print(`   Transaction Hash: ${info.transactionHash}`, TypeMessage.data);
  print(`   Address: ${info.contractAddress}`, TypeMessage.data);
  print(`   Cost: ${info.gasCost} gas`, TypeMessage.data);
  print(`   Repository ID: ${id}`, TypeMessage.data);
  printSeparator();

  sendThroughSocket(
    JSON.stringify({
      repoID: id,
      policyInfo: JSON.stringify(info),
    })
  );
};

let printNewTransaction = (transactionHash: string, contractName: string) => {
  print(
    `SUBMITTED: new instance of ${contractName} submitted`,
    TypeMessage.pending
  );
  print(`   Transaction Hash: ${transactionHash}`, TypeMessage.data);
  printSeparator();
};

let handleError = (functName: string, errorMessage: any) => {
  printError(
    "ERROR: DYNAMIC-ACCESS CONTROL: deployment-mediator",
    functName,
    errorMessage
  );
  sendThroughSocket(errorMessage.toString());
};

let printExecutionInfo = (callInfo: PolicyLinkRequest) => {
  print(
    `SUCCESS: Function RuntimeRegistry.relateProcessToPolicy executed succesfully`,
    TypeMessage.success
  );
  print(`   Transaction Hash: ${callInfo.transactionHash}`, TypeMessage.data);
  print(`   Cost: ${callInfo.gasCost} gas`, TypeMessage.data);
  print(`   Policy Address: ${callInfo.policyAddress}`, TypeMessage.data);
  print(`   Task-Role Address: ${callInfo.taskRoleAddress}`, TypeMessage.data);
  print(
    `   Access Control Address: ${callInfo.accessControlInfo.address}`,
    TypeMessage.data
  );
  printSeparator();
};
