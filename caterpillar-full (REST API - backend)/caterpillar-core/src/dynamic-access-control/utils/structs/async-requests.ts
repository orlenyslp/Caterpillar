import { ContractInfo } from './../../../adapters/ethereum-blockchain/structs/contract-info';
import { CompilationResult } from "./../../../adapters/ethereum-blockchain/structs/compilation-output";
import { IRequest } from "./../../../adapters/event-monitor/event-monitor-structs";

export class NewInstanceRequest extends IRequest {
  contractAddress: string;
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public compilationInfo: CompilationResult
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(transInfo: any) {
    this.contractAddress = transInfo.contractAddress;
    this.gasCost = parseInt(transInfo.gasUsed);
    this.functionCallback(this);
  }
}

export class NewBPolicyInstance extends NewInstanceRequest {
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public compilationInfo: CompilationResult,
    public policyModel: string,
    public roleIndexMap: Map<string, number>,
  ) {
    super(transactionHash, functionCallback, compilationInfo);
  }
}

export class NewRoleTaskMap extends NewInstanceRequest {
  contractAddress: string;
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public compilationInfo: CompilationResult,
    public roleTaskPairs: Array<any>
  ) {
    super(transactionHash, functionCallback, compilationInfo);
  }
}

export class PolicyLinkRequest extends IRequest {
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public policyAddress: string,
    public taskRoleAddress: string,
    public accessControlInfo: ContractInfo

  ) {
    super(transactionHash, functionCallback);
  }
}

export class RuntimeOperationCall extends IRequest {
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public operationName: string,
    public inParamNames: Array<string>,
    public inParamsValues: Array<string>
  ) {
    super(transactionHash, functionCallback);
  }

}
