import { ContractInfo } from "./../ethereum-blockchain/structs/contract-info";

export class ModelMetadata {
  constructor(public contractInfo: ContractInfo) {}
}

export class ProcessCEMetadata extends ModelMetadata {
  constructor(
    public repoId: string,
    public rootModelID: string,
    public rootModelName: string,
    public bpmnModel: string,
    public indexToElementMap: Array<any>,
    public worklistABI: string,
    public contractInfo: ContractInfo
  ) {
    super(contractInfo);
  }
}

export class ProcessIEMetadata extends ModelMetadata {
  _id: string = "";
  constructor(
    public processID: string,
    public prpcessName: string,
    public bpmnModel: string,
    public indexToElement: Array<any>,
    public children: Array<ProcessIEMetadata>,
    public iData: ContractInfo,
    public iFactory: ContractInfo,
    public iFlow: ContractInfo
  ) {
    super(iData);
  }
}

export class ProcessIEInput extends ModelMetadata {
  constructor(
    public processID: string,
    public processName: string,
    public bpmnModel: string,
    public indexToElement: Array<any>,
    public children: Array<string>,
    public iFactory: string,
    public iFlow: string
  ) {
    super(undefined);
  }
}

export class RoleBindingPolicy extends ModelMetadata {
  _id: string = "";
  constructor(
    public policyModel: string,
    public roleIndexMap: Map<string, number>,
    contractInfo: ContractInfo
  ) {
    super(contractInfo);
  }
}

export class RoleTaskMap extends ModelMetadata {
  _id: string = "";
  constructor(public indexToRole: Array<string>, contractInfo: ContractInfo) {
    super(contractInfo);
  }
}
