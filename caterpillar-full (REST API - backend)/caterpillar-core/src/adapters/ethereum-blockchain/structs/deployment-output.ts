export class DeploymentOutput {
  smartContractName: string;

  constructor(smartContractName: string) {
    this.smartContractName = smartContractName;
  }
}

export class DeploymentError extends DeploymentOutput {
  error: string;

  constructor(smartContractName: string, error: any) {
    super(smartContractName);
    this.error = error;
  }
}

export class DeploymentResult extends DeploymentOutput {
  transactionHash: string;
  gasCost: string;
  contractAddress: string;

  constructor(
    smartContractName: string,
    transactionHash?: string,
    contractAddress?: string,
    gasCost?: string
  ) {
    super(smartContractName);
    if (transactionHash) this.transactionHash = transactionHash;
    if (contractAddress) this.contractAddress = contractAddress;
    if (gasCost) this.gasCost = gasCost;
  }
}