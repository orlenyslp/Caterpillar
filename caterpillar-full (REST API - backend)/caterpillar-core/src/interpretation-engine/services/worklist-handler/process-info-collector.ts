import { printError } from "./../../../adapters/logs/error-logs";
import {
  print,
  TypeMessage,
  printSeparator,
} from "./../../../adapters/logs/console-log";
import { AccountInfo } from "./../../../adapters/ethereum-blockchain/structs/account-info";
import { ContractInfo } from "./../../../adapters/ethereum-blockchain/structs/contract-info";
import * as mongoDBAdapter from "./../../../adapters/mongo-db/mongo-db-adapter";
import { RepoType } from "../../../adapters/mongo-db/repo-types";

import * as ethereumAdapter from "./../../../adapters/ethereum-blockchain/ethereum-adapter";
import { FunctionInfo } from "../../../adapters/ethereum-blockchain/structs/function-info";

let defaultAccount: AccountInfo;

export let findProcessModelMetadata = async (mHash: string) => {
  let info = await mongoDBAdapter.findModelMetadataById(
    RepoType.ProcessInterpretedEngine,
    mHash
  );
  printQueryInfo(0, [mHash, info]);
  return info;
};

export let findIDataInstances = async (iFlowAddr: string) => {
  if (!ethereumAdapter.isValidBlockchainAddress(iFlowAddr))
    return Promise.reject(`Invalid iFlow address ${iFlowAddr}`);
  let iFlowInfo = await mongoDBAdapter.findContractInfoByAddress(
    RepoType.SmartContract,
    iFlowAddr
  );
  if (!this.defaultAccount)
    this.defaultAccount = await ethereumAdapter.defaultDeployment();
  let pCases = await ethereumAdapter.callContractFunction(
    iFlowAddr,
    (iFlowInfo as ContractInfo).abi,
    new FunctionInfo("getIDataInstances", [], "address[]"),
    this.defaultAccount,
    []
  );
  printQueryInfo(1, [iFlowAddr, pCases]);
  return pCases;
};

export let findIFlowInfo = async (iFlowAddr: string) => {
  try {
    if (!ethereumAdapter.isValidBlockchainAddress(iFlowAddr))
      return Promise.reject(`Invalid iFlow address ${iFlowAddr}`);
    if (!this.defaultAccount)
      this.defaultAccount = await ethereumAdapter.defaultDeployment();
    let iFlowInfo = (await mongoDBAdapter.findContractInfoByAddress(
      RepoType.SmartContract,
      iFlowAddr
    )) as ContractInfo;
    let eInd = 1;
    let elementInfo = [];
    while (true) {
      let info = await ethereumAdapter.callContractFunction(
        iFlowAddr,
        iFlowInfo.abi,
        new FunctionInfo(
          "getElementInfo",
          ["uint256"],
          "uint256,uint256,uint256,uint256[]",
          true
        ),
        this.defaultAccount,
        [eInd]
      );
      if (info[2] === "0") break;
      elementInfo.push(formatElementInfo(eInd, info));
      eInd++;
    }
    let subProcIndexes: Array<any> = await ethereumAdapter.callContractFunction(
      iFlowAddr,
      iFlowInfo.abi,
      new FunctionInfo("getSubProcList", [], "uint256[]"),
      this.defaultAccount,
      []
    );
    let subProcInfo = [];
    for (let i = 0; i < subProcIndexes.length; i++) {
      subProcInfo.push({
        subProcIndex: subProcIndexes[i],
        iFlowAddress: await ethereumAdapter.callContractFunction(
          iFlowAddr,
          iFlowInfo.abi,
          new FunctionInfo("getSubProcInst", ["uint256"], "address"),
          this.defaultAccount,
          [subProcIndexes[i]]
        ),
      });
    }
    let result = {
      factoryAddress: await ethereumAdapter.callContractFunction(
        iFlowAddr,
        iFlowInfo.abi,
        new FunctionInfo("getFactoryInst", [], "address"),
        this.defaultAccount,
        []
      ),
      interpreterAddress: await ethereumAdapter.callContractFunction(
        iFlowAddr,
        iFlowInfo.abi,
        new FunctionInfo("getInterpreterInst", [], "address"),
        this.defaultAccount,
        []
      ),
      subProcesses: subProcInfo,
      elementInfo: elementInfo,
    };
    printQueryInfo(2, [iFlowAddr, result]);
    return result;
  } catch (error) {
    printError("process-info-collector", "findIFlowInfo", error);
    return Promise.reject(error);
  }
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let formatElementInfo = (eInd: number, elementInfo: any) => {
  return {
    eInd: eInd,
    preC: elementInfo[0],
    postC: elementInfo[1],
    typeInfo: elementInfo[2],
    next: elementInfo[3],
  };
};

let printQueryInfo = (type: number, info: any) => {
  switch(type) {
    case 0: {
      print(
        `SUCCESS: Process metadata retrieved successfully from ID ${info[0]}`,
        TypeMessage.success
      );
      print(`${JSON.stringify(info[1])} `, TypeMessage.data);
      printSeparator();
      break;
    }
    case 1: {
      print(
        `SUCCESS: Process instances retrieved successfully from IFlow running at ${info[0]}`,
        TypeMessage.success
      );
      print(`  Addresses: ${info[1]} `, TypeMessage.data);
      printSeparator();
      break;
    }
    case 2: {
      print(
        `SUCCESS: Information from IFlow node at ${info[0]} collected`,
        TypeMessage.success
      );
      print(JSON.stringify(info[1]), TypeMessage.data);
      printSeparator();
      break;
    }
  }
}
