export interface IContractInfo {}

export class ContractInfo implements IContractInfo {
  public _id: string = undefined;
  public _relId: string = undefined;
  constructor(
    public contractName: string,
    public abi: string,
    public bytecode: string,
    public solidityCode: string,
    public address: string
  ) {}
}

export class InvalidContractInfo implements IContractInfo {
  constructor(public idContract: string, public error: string) {}
}
