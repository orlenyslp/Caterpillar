import { IRequest } from "../utils/structs/async-requests";

import { FunctionInfo } from "../../adapters/ethereum-blockchain/structs/function-info";
import {
  print,
  TypeMessage,
  printSeparator,
} from "../../adapters/logs/console-log";
import * as ethereumAdapter from "../../adapters/ethereum-blockchain/ethereum-adapter";

export enum EventType {
  NewProcessInstanceCreated,
  UserTaskCompleted,
}

let pendingRequests: Map<string, IRequest> = new Map();

export let listenForPendingTransaction = (
  contractAddress: string,
  contractAbi: string,
  eventType: EventType,
  requestInfo: IRequest
) => {
  try {
    pendingRequests.set(requestInfo.transactionHash, requestInfo);
    ethereumAdapter.subscribeToLog(
      contractAddress,
      contractAbi,
      toFunctionInfo(eventType),
      this.handleEventFromMinedTransaction
    );
  } catch (error) {
    printError(error, requestInfo);
  }
};

export let handleEventFromMinedTransaction = (
  transactionHash: string,
  gasUsed: string,
  logInfo: any
) => {
  try {
    if (pendingRequests.has(transactionHash)) {
      let request = pendingRequests.get(transactionHash);
      pendingRequests.delete(transactionHash);
      request.gasUsed = parseInt(gasUsed);
      request.executeCallback(logInfo.processAddress);
    }
  } catch (error) {
    printError(error, logInfo);
  }
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let toFunctionInfo = (eventType: EventType) => {
  switch (eventType) {
    case EventType.NewProcessInstanceCreated: {
      return new FunctionInfo("NewInstanceCreatedFor", ["address", "address"]);
    }
    case EventType.UserTaskCompleted: {
      return new FunctionInfo("TaskExecutionCompleted", ["address", "uint256"]);
    }
  }
};

let printError = (error: any, info: any) => {
  print("ERROR: IN EVENT MONITOR", TypeMessage.error);
  print(` { Input: ${info} }`, TypeMessage.error);
  print(` { Error: ${error} }`, TypeMessage.error);
  printSeparator();
};
