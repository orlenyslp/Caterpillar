import {
  CompilationResult,
  CompilationError,
  CompilationOutput,
} from "./structs/compilation-output";
import { CompilationInput } from "./structs/compilation-input";

import * as solc from "solc";

let contractDependencies: CompilationInput[];

export let compileSmartContracts = (
  contractInfo: CompilationInput
): Array<CompilationOutput> => {
  contractDependencies = contractInfo.dependencies;
  let config = createConfiguration(
    contractInfo.smartContractName,
    contractInfo.solidityCode
  );

  try {
    let output = JSON.parse(
      solc.compile(JSON.stringify(config), { import: configureDependencies })
    );
    let errors = filterErrors(output.errors);
    if (errors.length > 0) {
      return [
        new CompilationError(contractInfo.smartContractName, errors),
      ];
    } else {
      let contracts = new Array<CompilationResult>();
      for (let name in output.contracts["contractContent"]) {
        contracts.push(
          new CompilationResult(
            name,
            JSON.stringify(output.contracts["contractContent"][name].abi),
            output.contracts["contractContent"][name].evm.bytecode.object
          )
        );
      }
      return contracts;
    }
  } catch (error) {
    return [new CompilationError(contractInfo.smartContractName, error)];
  }
};

let createConfiguration = (contractName: string, smartContract: string) => {
  return {
    language: "Solidity",
    sources: {
      contractContent: {
        content: smartContract,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
      },
      outputSelection: {
        "*": {
          "*": ["*"],
        },
      },
    },
  };
};

let configureDependencies = (dependency: string) => {
  let contract = contractDependencies.find((c) => {
    return c.smartContractName === dependency;
  });
  return contract
    ? { contents: contract.solidityCode }
    : { error: `${dependency} -- Dependency NOT Found` };
};

let filterErrors = (outputErrors: Array<any>) => {

  return outputErrors ?
    outputErrors.filter(error => {
      return error.type !== "Warning";
    }) : []
  
};
