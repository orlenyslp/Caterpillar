import { print, TypeMessage } from "../../../adapters/messages/console-log";
import {
  ElementIFlow,
  SubProcLinkInfo,
} from "./../../utils/structs/parsing-info";
import { FunctionInfo } from "./../../../adapters/ethereum-blockchain/structs/function-info";

import * as ethereumAdapter from "./../../../adapters/ethereum-blockchain/ethereum-adapter";

export let setIFlowNodeElement = async (
  iFlowAddress: string,
  iFlowAbi: string,
  elemInfo: ElementIFlow
) => {
  if (!ethereumAdapter.isValidBlockchainAddress(iFlowAddress))
    return Promise.reject(`Invalid address ${iFlowAddress} of IFlow node`);
  if (!this.defaultAccount)
    this.defaultAccount = await ethereumAdapter.defaultDeployment();
  try {
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      iFlowAddress,
      iFlowAbi,
      new FunctionInfo("setElement", [
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
        "uint256[]",
      ]),
      this.defaultAccount,
      [
        elemInfo.eInd,
        elemInfo.preC,
        elemInfo.postC,
        elemInfo.typeInfo,
        elemInfo.eName,
        toArray(elemInfo.next.toString()),
      ]
    );
    return transactionHash;
  } catch (error) {
    return Promise.reject(
      `Error updating element ${elemInfo.eName} into IFlow node running at ${iFlowAddress}`
    );
  }
};

export let linkSubProcess = async (
  iFlowAddress: string,
  iFlowAbi: string,
  subprocessInfo: SubProcLinkInfo
) => {
  if (!ethereumAdapter.isValidBlockchainAddress(iFlowAddress))
    return Promise.reject(`Invalid address ${iFlowAddress} of IFlow node`);
  if (!this.defaultAccount)
    this.defaultAccount = await ethereumAdapter.defaultDeployment();
  try {
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      iFlowAddress,
      iFlowAbi,
      new FunctionInfo("linkSubProcess", [
        "uint256",
        "address",
        "uint256[]",
        "uint256",
      ]),
      this.defaultAccount,
      [
        subprocessInfo.pInd,
        subprocessInfo.cFlowInst,
        toArray(subprocessInfo.attachedEvt.toString()),
        subprocessInfo.countInstances,
      ]
    );
    return transactionHash;
  } catch (error) {
    console.log(error);
    return Promise.reject(
      `Error updating child subprocess ${subprocessInfo.pInd} into IFlow node running at ${iFlowAddress}`
    );
  }
};

export let relateContractAddressToIflow = async (
  iFlowAddress: string,
  contractAddress: string,
  iFlowAbi: string,
  contractType: string,
  functionName: string
) => {
  if (!ethereumAdapter.isValidBlockchainAddress(iFlowAddress))
    return Promise.reject(`Invalid address ${iFlowAddress} of IFlow node`);
  if (!ethereumAdapter.isValidBlockchainAddress(contractAddress))
    return Promise.reject(
      `Invalid address ${contractAddress} of ${contractType} contract`
    );
  if (!this.defaultAccount)
    this.defaultAccount = await ethereumAdapter.defaultDeployment();
  try {
    let transactionHash = await ethereumAdapter.execContractFunctionAsync(
      iFlowAddress,
      iFlowAbi,
      new FunctionInfo(functionName, ["address"]),
      this.defaultAccount,
      [contractAddress]
    );
    return transactionHash;
  } catch (error) {
    return Promise.reject(
      `Error relating ${contractType} at ${contractAddress} with IFlow node running at ${iFlowAddress}`
    );
  }
};

//////////////////////////////////////////////////////
/////// HANDLERS FOR ASYNCHRONOUS REQUESTS ///////////
//////////////////////////////////////////////////////

export let handleIFlowElementUpdated = (
  elementInfo: ElementIFlow,
  iFlowAddress: string,
  transactionHash: string,
  gasCost: string
) => {
  print(`SUCCESS: IFlow Element updated at ${iFlowAddress}`, TypeMessage.success);
  print(` Input ${elementInfo}`, TypeMessage.data);
  print(` Transaction Hash: ${transactionHash}`, TypeMessage.data);
  print(` Cost: ${gasCost} gas`, TypeMessage.data);
};

export let handleIFactoryIFlowRelation = (
  factoryAddress: string,
  iFlowAddress: string,
  transactionHash: string,
  gasCost: string
) => {
  print(
    `SUCCESS: IFactory at ${factoryAddress} related to IFlow node at ${iFlowAddress}`,
    TypeMessage.success
  );
  print(` Transaction Hash: ${transactionHash}`, TypeMessage.data);
  print(` Cost: ${gasCost} gas`, TypeMessage.data);
};

//////////////////////////////////////////////////////
/////////////// PRIVATE FUNCTIONS ////////////////////
//////////////////////////////////////////////////////

let toArray = (stringArray: string) => {
  
  return stringArray.length < 1
    ? []
    : [stringArray
        .split(",")
        .map((element) => element.trim())];
};
