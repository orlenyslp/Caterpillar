import { FunctionInfo } from "../ethereum-blockchain/structs/function-info";

export enum EventType {
  NewCaseCreated = "NewCaseCreated",
  NewProcessInstanceCreated = "NewInstanceCreatedFor",
  UserTaskCompleted = "TaskExecutionCompleted",
}

export let eventParameters = (eventType: EventType) => {
  switch (eventType) {
    case EventType.NewCaseCreated: {
      return new FunctionInfo(EventType.NewCaseCreated, ["address"]);
    }
    case EventType.NewProcessInstanceCreated: {
      return new FunctionInfo(EventType.NewProcessInstanceCreated, [
        "address",
        "address",
      ]);
    }
    case EventType.UserTaskCompleted: {
      return new FunctionInfo(EventType.UserTaskCompleted, [
        "address",
        "uint256",
      ]);
    }
  }
};

export class IRequest {
  gasCost: number = 0;
  constructor(public transactionHash: string, public functionCallback: any) {}

  executeCallback(transInfo: any) {
    this.gasCost = parseInt(transInfo.gasUsed);
    this.functionCallback(this);
  }
}
