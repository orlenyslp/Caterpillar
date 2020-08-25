export class IRequest {
  gasUsed: number = 0;
  constructor(public transactionHash: string, public functionCallback: any) {}

  executeCallback(logInfo: any) {
    this.functionCallback(logInfo);
  }
}

export class TaskCompletedRequest extends IRequest {
  constructor(
    public taskName: string,
    public workitemIndex: number,
    public worklistAddress: string,
    transactionHash: string,
    functionCallback: any
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(logInfo: any) {
    this.functionCallback(
      this.taskName,
      this.workitemIndex,
      this.worklistAddress,
      this.transactionHash,
      this.gasUsed,
      logInfo
    );
  }
}

export class NewInstRequest extends IRequest {
  constructor(
    public workflowContractName: string,
    public processId: string,
    transactionHash: string,
    functionCallback: any
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(logInfo: any) {
    this.functionCallback(
      this.workflowContractName,
      this.processId,
      this.transactionHash,
      logInfo, 
      this.gasUsed
    );
  }
}
