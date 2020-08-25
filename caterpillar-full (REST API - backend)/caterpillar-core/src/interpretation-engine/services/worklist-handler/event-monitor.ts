import { IRequest } from "./../../utils/structs/async-requests";
import * as ethereumAdapter from "./../../../adapters/ethereum-blockchain/ethereum-adapter";
import { FunctionInfo } from "../../../adapters/ethereum-blockchain/structs/function-info";

let pendingRequests: Map<string, IRequest> = new Map();

export enum EventType {
  NewCaseCreated,
}

export let listenForPendingTransaction = (
  transactionHash: string,
  requestInfo: IRequest
) => {
  pendingRequests.set(transactionHash, requestInfo);
  ethereumAdapter.listenForTransactionMined(
    transactionHash,
    this.handleMinedTransaction
  );
};

export let listenForPendingLogs = (
  contractAddress: string,
  contractAbi: string,
  eventType: EventType,
  requestInfo: IRequest
) => {
  pendingRequests.set(requestInfo.transactionHash, requestInfo);
  ethereumAdapter.subscribeToLog(
    contractAddress,
    contractAbi,
    toFunctionInfo(eventType),
    this.handleTransactionFromLog
  );
};

export let handleMinedTransaction = (
  transactionHash: string,
  transactionInfo: any
) => {
  try {
    if (pendingRequests.has(transactionHash)) {
      let request = pendingRequests.get(transactionHash);
      pendingRequests.delete(transactionHash);
      request.executeCallback(transactionInfo);
    }
  } catch (error) {
    console.log(error);
  }
};

export let handleTransactionFromLog = (
  transactionHash: string,
  gasCost: any,
  transactionInfo: any
) => {
  try {
    if (pendingRequests.has(transactionHash)) {
      let request = pendingRequests.get(transactionHash);
      pendingRequests.delete(transactionHash);
      request.executeCallback({
        gasCost: gasCost,
        result: transactionInfo,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

let toFunctionInfo = (eventType: EventType) => {
  switch (eventType) {
    case EventType.NewCaseCreated: {
      return new FunctionInfo("NewCaseCreated", ["address"]);
    }
  }
};
