import { ContractInfo } from "./../../../adapters/ethereum-blockchain/structs/contract-info";
import { CompilationResult } from "./../../../adapters/ethereum-blockchain/structs/compilation-output";
import { CompilationInfo } from "../../../adapters/ethereum-blockchain/structs/compilation-output";
import { SubProcLinkInfo, ElementIFlow } from "./parsing-info";

export enum TypeContract {
  IFlow = "IFlow",
  IData = "IData",
  IFactory = "IFactory",
  BPMNInterpreter = "BPMNINterpreter",
}

export class IRequest {
  gasCost: number = 0;
  constructor(public transactionHash: string, public functionCallback: any) {}

  executeCallback(transInfo: any) {
    this.gasCost =  parseInt(transInfo.gasUsed);
    this.functionCallback(this);
  }
}

export class NewContractRequest extends IRequest {
  iDataAddr: string;
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public iFlowAddr: string
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(transInfo: any) {
    this.iDataAddr = transInfo.result.pCase;
    this.gasCost = parseInt(transInfo.gasCost);
    this.functionCallback(this);
  }
}

export class TaskExecutionRequest extends IRequest {
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public eName: string,
    public params: Array<any>,
    public iDataAddr: string
  ) {
    super(transactionHash, functionCallback);
  }
}

export class FunctionCallRequest extends IRequest {
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public pInd: any,
    public functionName: string,
    public params?: any
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(transInfo: any) {
    this.gasCost = parseInt(transInfo.gasUsed);
    this.functionCallback(this);
  }
}

export class NewContractInstRequest extends IRequest {
  contractAddress: string = "";
  repoId: string = "";

  constructor(
    public compilationInfo: CompilationResult,
    public pId: number,
    public contractIndex: number,
    public type: TypeContract,
    public transactionHash: string,
    public functionCallback: any
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(transInfo: any) {
    this.gasCost = parseInt(transInfo.gasUsed);
    this.contractAddress = transInfo.contractAddress;
    this.functionCallback(this);
  }
}

export class LinkProcessRequest extends IRequest {
  constructor(
    public transactionHash: string,
    public functionCallback: any,
    public toLink: SubProcLinkInfo,
    public elementInfo: ElementIFlow,
    public iFlowP: NewContractInstRequest
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(transInfo: any) {
    this.gasCost = parseInt(transInfo.gasUsed);
    this.functionCallback(this);
  }
}

export class UpdatingIFlowRequest extends IRequest {
  constructor(
    public elementInfo: string,
    public contractAddress: string,
    public transactionHash: string,
    public functionCallback: any
  ) {
    super(transactionHash, functionCallback);
  }

  executeCallback(transInfo: any) {
    this.functionCallback(
      this.elementInfo,
      this.contractAddress,
      this.transactionHash,
      transInfo.gasUsed
    );
  }
}
