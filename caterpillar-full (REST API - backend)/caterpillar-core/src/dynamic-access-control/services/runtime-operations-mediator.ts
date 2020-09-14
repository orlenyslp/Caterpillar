import { sendThroughSocket } from "./../../app";
import {
  print,
  TypeMessage,
  printSeparator,
} from "../../adapters/messages/console-log";
import { RuntimeOperationCall } from "./../utils/structs/async-requests";
import { printError } from "../../adapters/messages/error-logs";
import { AccountInfo } from "./../../adapters/ethereum-blockchain/structs/account-info";
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";

import * as ethereumAdapter from "./../../adapters/ethereum-blockchain/ethereum-adapter";
import * as mongoDBAdapter from "./../../adapters/mongo-db/mongo-db-adapter";
import * as eventMonitor from "./../../adapters/event-monitor/event-monitor";
import { recoverPolicyInfo } from "./../services/policy-info-collector";

import { FunctionInfo } from "../../adapters/ethereum-blockchain/structs/function-info";
import { RepoType } from "../../adapters/mongo-db/repo-types";
import { RoleBindingPolicy } from "../../adapters/mongo-db/repo-models";

export enum OperationType {
  voteNomination = "voteN",
  voteRelease = "voteR",
}
let roleStates = ["UNBOUND", "RELEASING", "NOMINATED", "BOUND"];

let defaultAcccount: AccountInfo;

export let nominateCaseCreator = async (
  runtimeRegistry: ContractInfo,
  pCase: string,
  rNominee: string,
  nomineeAddr: string
) => {
  return await performOperation(
    runtimeRegistry,
    2,
    "nominateCaseCreator",
    ["uint256", "address", "address"],
    ["rNominee", "nominee", "pCase"],
    [rNominee, nomineeAddr, pCase]
  );
};

export let nominate = async (
  runtimeRegistry: ContractInfo,
  pCase: string,
  rNominator: string,
  rNominee: string,
  nominatorAddr: string,
  nomineeAddr: string
) => {
  return await performOperation(
    runtimeRegistry,
    4,
    "nominate",
    ["uint256", "uint256", "address", "address", "address"],
    ["rNominator", "rNominee", "nominator", "nominee", "pCase"],
    [rNominator, rNominee, nominatorAddr, nomineeAddr, pCase]
  );
};

export let release = async (
  runtimeRegistry: ContractInfo,
  pCase: string,
  rNominator: string,
  rNominee: string,
  nominatorAddr: string
) => {
  return await performOperation(
    runtimeRegistry,
    3,
    "release",
    ["uint256", "uint256", "address", "address"],
    ["rNominator", "rNominee", "nominator", "pCase"],
    [rNominator, rNominee, nominatorAddr, pCase]
  );
};

export let vote = async (
  runtimeRegistry: ContractInfo,
  pCase: string,
  rNominator: string,
  rNominee: string,
  rEndorser: string,
  endorserAddr: string,
  isAccepted: string,
  operationType: OperationType
) => {
  return await performOperation(
    runtimeRegistry,
    4,
    operationType,
    ["uint256", "uint256", "uint256", "address", "address", "bool"],
    ["rNominator", "rNominee", "rEndorser", "endorser", "pCase", "isAccepted"],
    [rNominator, rNominee, rEndorser, endorserAddr, pCase, isAccepted]
  );
};

export let getRoleState = async (
  runtimeRegistry: ContractInfo,
  pCase: string,
  role: string
) => {
  try {
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let [accCtrlInfo, policyInfo] = (await recoverPolicyInfo(
      runtimeRegistry,
      pCase
    )) as [ContractInfo, RoleBindingPolicy];
    let roleIndex = findRoleIndex([role], policyInfo.roleIndexMap);
    if (roleIndex[0] === role) return printAndReturn(role, "UNDEFINED");
    return printAndReturn(
      role,
      roleStates[
        await ethereumAdapter.callContractFunction(
          accCtrlInfo.address,
          accCtrlInfo.abi,
          new FunctionInfo("roleState", ["uint256", "address"], "uint256"),
          this.defaultAccount,
          [roleIndex, pCase]
        )
      ]
    );
  } catch (error) {
    print(`ERROR retrieving role-state: ${error}`, TypeMessage.error);
    return Promise.reject(error);
  }
};

/////////////////////////////////////////////////////
/////// CALLBACKS FOR ASYNCHRONOUS OPERATIONS ///////
/////////////////////////////////////////////////////

export let handleRuntimeOperation = (rOperation: RuntimeOperationCall) => {
  print(
    `SUCCESS: Runtime Operation ${rOperation.operationName} executed`,
    TypeMessage.success
  );
  print(`   TransactionHash: ${rOperation.transactionHash}`, TypeMessage.data);
  print(`   Cost: ${rOperation.gasCost}`, TypeMessage.data);
  print("   Input Paramaters:  ");
  for (let i = 0; i < rOperation.inParamsValues.length; i++)
    print(
      `     ${rOperation.inParamNames[i]}: ${rOperation.inParamsValues[i]}`,
      TypeMessage.data
    );
  printSeparator();
  sendThroughSocket(JSON.stringify(rOperation));
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let printAndReturn = (role: string, state: string) => {
  print(`SUCCESS: State of role ${role}  retrieved`, TypeMessage.success);
  print(` State: ${state}`, TypeMessage.data);
  printSeparator();
  return state;
};

export let performOperation = async (
  runtimeRegistry: ContractInfo,
  pCaseIndex: number,
  functName: string,
  inParamsType: Array<string>,
  inParamsNames: Array<string>,
  inParamsValues: Array<string>
) => {
  try {
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let pCase = inParamsValues[pCaseIndex];
    let [accCtrlInfo, policyInfo] = (await recoverPolicyInfo(
      runtimeRegistry,
      pCase
    )) as [ContractInfo, RoleBindingPolicy];
    let transHash = await ethereumAdapter.execContractFunctionAsync(
      accCtrlInfo.address,
      accCtrlInfo.abi,
      new FunctionInfo(functName, inParamsType),
      this.defaultAccount,
      findRoleIndex(inParamsValues, policyInfo.roleIndexMap)
    );
    eventMonitor.listenForPendingTransaction(
      new RuntimeOperationCall(
        transHash,
        this.handleRuntimeOperation,
        functName,
        inParamsNames,
        inParamsValues
      )
    );
    return { transactionHash: transHash };
  } catch (error) {
    return Promise.reject(error);
  }
};

let findRoleIndex = (
  values: Array<string>,
  roleIndexMap: Map<string, number>
) => {
  return values.map((role) => {
    return roleIndexMap.has(role) ? roleIndexMap.get(role) : role;
  });
};
