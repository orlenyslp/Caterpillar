import { AccountInfo } from "./../../adapters/ethereum-blockchain/structs/account-info";
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import {
  RoleBindingPolicy,
  RoleTaskMap,
  ModelMetadata,
} from "./../../adapters/mongo-db/repo-models";
import {
  print,
  printSeparator,
  TypeMessage,
} from "../../adapters/messages/console-log";
import { RepoType } from "../../adapters/mongo-db/repo-types";

import * as ethereumAdapter from "./../../adapters/ethereum-blockchain/ethereum-adapter";
import * as mongoDBAdapter from "./../../adapters/mongo-db/mongo-db-adapter";
import { FunctionInfo } from "../../adapters/ethereum-blockchain/structs/function-info";

let defaultAccount: AccountInfo;

export let findPolicyMetadata = async (policyAddress: string) => {
  let policyInfo = await mongoDBAdapter.findPolicyByAddress(
    RepoType.RoleBindingPolicy,
    policyAddress
  );
  printMetadata(policyAddress, policyInfo);
  if (policyInfo instanceof RoleBindingPolicy) return policyInfo;
  return Promise.reject(policyInfo);
};

export let findRoleTaskMapMetadata = async (roleTaskMapAddress: string) => {
  let roleTaskInfo = await mongoDBAdapter.findPolicyByAddress(
    RepoType.RoleTaskMap,
    roleTaskMapAddress
  );
  printMetadata(roleTaskMapAddress, roleTaskInfo);
  if (roleTaskInfo instanceof RoleTaskMap) return roleTaskInfo;
  return Promise.reject(roleTaskInfo);
};

export let findAccessControlMetadata = async (accessControlAddr: string) => {
  let accessControlInfo = await mongoDBAdapter.findContractInfoByAddress(
    RepoType.SmartContract,
    accessControlAddr
  );
  printMetadata(accessControlAddr, accessControlInfo);
  if (accessControlInfo instanceof ContractInfo) return accessControlInfo;
  return Promise.reject(accessControlInfo);
};

export let findPolicyRelatedAddresses = async (
  runtimeRegistry: ContractInfo,
  pCase: string
) => {
  try {
    let [accCtrlInfo, policyInfo] = (await recoverPolicyInfo(
      runtimeRegistry,
      pCase
    )) as [ContractInfo, RoleBindingPolicy];

    let roleTaskAddr = await ethereumAdapter.callContractFunction(
      accCtrlInfo.address,
      accCtrlInfo.abi,
      new FunctionInfo("getTaskRoleAddress", ["address"], "address"),
      this.defaultAccount,
      [pCase]
    );
    printAddresses([
      pCase,
      accCtrlInfo.address,
      policyInfo.contractInfo.address,
      roleTaskAddr,
    ]);
    return [accCtrlInfo.address, policyInfo.contractInfo.address, roleTaskAddr];
  } catch (error) {
    return Promise.reject(error);
  }
};

export let recoverPolicyInfo = async (
  runtimeRegistry: ContractInfo,
  pCase: string
) => {
  try {
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let accessCtrlAddr = await ethereumAdapter.callContractFunction(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("findRuntimePolicy", ["address"], "address"),
      this.defaultAccount,
      [pCase]
    );

    let accessCtrlInfo = (await mongoDBAdapter.findContractInfoByAddress(
      RepoType.SmartContract,
      accessCtrlAddr
    )) as ContractInfo;

    let policyAddr = await ethereumAdapter.callContractFunction(
      accessCtrlInfo.address,
      accessCtrlInfo.abi,
      new FunctionInfo("getPolicyAddress", ["address"], "address"),
      this.defaultAccount,
      [pCase]
    );

    let policyInfo = (await mongoDBAdapter.findPolicyByAddress(
      RepoType.RoleBindingPolicy,
      policyAddr
    )) as RoleBindingPolicy;

    return [accessCtrlInfo, policyInfo];
  } catch (error) {
    return Promise.reject(error);
  }
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let printMetadata = (input: string, policyInfo: any) => {
  if (policyInfo instanceof RoleBindingPolicy) {
    print(
      `SUCCESS: Role-Binding Policy metadata running at ${input} recovered successfully`,
      TypeMessage.success
    );
    printableMap(policyInfo);
  } else if (policyInfo instanceof RoleTaskMap) {
    print(
      `SUCCESS: Role-Task Map metadata running at ${input} recovered successfully`,
      TypeMessage.success
    );
    print(JSON.stringify(policyInfo), TypeMessage.data);
  } else if (policyInfo instanceof ContractInfo) {
    print(
      `SUCCESS: Dynamic Access Control metadata running at ${input} recovered successfully`,
      TypeMessage.success
    );
    print(JSON.stringify(policyInfo), TypeMessage.data);
  } else {
    print(`ERROR: Recovering policy metadata at ${input}`, TypeMessage.error);
    print(`${policyInfo}`, TypeMessage.error);
  }
  printSeparator();
};

let printableMap = (policy: RoleBindingPolicy) => {
  let jsonMap = {};
  policy.roleIndexMap.forEach((eInd, eId) => {
    jsonMap[eId] = eInd;
  });
  print(
    JSON.stringify({
      _id: policy._id,
      policyModel: policy.policyModel,
      roleIndexMap: jsonMap,
      contractInfo: policy.contractInfo,
    }),
    TypeMessage.data
  );
};

let printAddresses = (addreses: Array<string>) => {
  print(
    `SUCCESS: Addresses of policy-related contracts linked to process instance at ${addreses[0]} recovered`,
    TypeMessage.success
  );
  print(`   Access Control Address: ${addreses[1]}`, TypeMessage.data);
  print(`   Binding Policy Address: ${addreses[2]}`, TypeMessage.data);
  print(`   Role-Task Map Address:  ${addreses[3]}`, TypeMessage.data);
  printSeparator();
};
