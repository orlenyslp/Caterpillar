export class CompilationInput {
  smartContractID: string;

  constructor(
    public smartContractName: string,
    public solidityCode: string,
    public dependencies: Array<CompilationInput>
  ) {}
}

