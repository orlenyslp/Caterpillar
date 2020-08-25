import { ContractInfo } from "./contract-info";

export class CompilationOutput {
  contractName: string;

  constructor(contractName: string, solidityCode?: string) {
    this.contractName = contractName;
  }
}

export class CompilationError extends CompilationOutput {
  errors: any;

  constructor(contractName: string, errors: any) {
    super(contractName);
    this.errors = errors;
  }
}

export class CompilationResult extends CompilationOutput {
  abi: string;
  bytecode: string;
  solidity: string;

  constructor(contractName: string, abi: string, bytecode: string) {
    super(contractName);
    this.abi = abi;
    this.bytecode = bytecode;
  }
}

export class CompilationInfo extends CompilationOutput {
  compilationMetadata: Array<CompilationOutput>;
  codeDependencies: Array<string>;
  solidityCode: string;

  constructor(rootProcessName: string, solidityCode: string) {
    super(rootProcessName);
    this.solidityCode = solidityCode;
  }
}
