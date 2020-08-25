import { IRequest, EventType, eventParameters } from './event-monitor-structs';
import * as ethereumAdapter from "./../ethereum-blockchain/ethereum-adapter";


let pendingRequests: Map<string, IRequest> = new Map();

export let listenForPendingTransaction = (
  requestInfo: IRequest
) => {
  pendingRequests.set( requestInfo.transactionHash, requestInfo);
  ethereumAdapter.listenForTransactionMined(
    requestInfo.transactionHash,
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
    eventParameters(eventType),
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
