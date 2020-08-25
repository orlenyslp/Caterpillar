import * as fs from "fs";

import { printSeparator } from "./../../adapters/logs/console-log";
import { CompilationInput } from "../../adapters/ethereum-blockchain/structs/compilation-input";
import { ModelInfo } from "../utils/structs/compilation-info";
import { CompilationInfo } from "../../adapters/ethereum-blockchain/structs/compilation-output";
import { print, TypeMessage } from "../../adapters/logs/console-log";
import {
  CompilationError,
  CompilationResult,
} from "./../../adapters/ethereum-blockchain/structs/compilation-output";

import * as solidityCompiler from "../../adapters/ethereum-blockchain/solidity-compiler";

export let compileProcessModel = (modelInfo: ModelInfo) => {
  print("SUBMITED: Compile smart contracts ...", TypeMessage.pending);
  return new Promise<CompilationInfo>((resolve, reject) => {
    let dependencies: Array<CompilationInput> = [
      new CompilationInput(
        "IFactory",
        fs.readFileSync(
          "./src/compilation-engine/utils/solidity-interfaces/factory-interface.sol",
          "utf8"
        ),
        []
      ),
      new CompilationInput(
        "IWorkflow",
        fs.readFileSync(
          "./src/compilation-engine/utils/solidity-interfaces/workflow-interface.sol",
          "utf8"
        ),
        []
      ),
      new CompilationInput(
        "IWorklist",
        fs.readFileSync(
          "./src/compilation-engine/utils/solidity-interfaces/worklist-interface.sol",
          "utf8"
        ),
        []
      ),
      new CompilationInput(
        "IRegistry",
        fs.readFileSync(
          "./src/compilation-engine/utils/solidity-interfaces/registry-interface.sol",
          "utf8"
        ),
        []
      ),
    ];

    let contractsToCompile = new CompilationInput(
      modelInfo.name + "Workflow",
      modelInfo.solidity,
      dependencies
    );

    let compiledContracts = solidityCompiler.compileSmartContracts(
      contractsToCompile
    );

    if (compiledContracts[0] instanceof CompilationError) {
      printCompilationResult(compiledContracts[0], modelInfo.solidity);
      return (compiledContracts[0] as CompilationError).errors;
    }

    let response: CompilationInfo = new CompilationInfo(
      contractsToCompile.smartContractName,
      contractsToCompile.solidityCode
    );

    response.codeDependencies = dependencies.map((elem): string => {
      return elem.solidityCode;
    });

    response.compilationMetadata = (<Array<CompilationResult>>(
      compiledContracts
    )).map((elem) => {
      return new CompilationResult(elem.contractName, elem.abi, elem.bytecode);
    });

    printCompilationResult(response);
    resolve(response);
  });
};

////////////////////////////////////////////
//////////// PRIVATE FUNCTIONS /////////////
////////////////////////////////////////////

let printCompilationResult = (compilationInfo: any, solidityCode?: string) => {
  if (compilationInfo instanceof CompilationError) {
    print("Errors compiling smart contracts ...", TypeMessage.error);
    print(solidityCode, TypeMessage.data);
    print((compilationInfo as CompilationError).errors, TypeMessage.error);
  } else {
    print("SUCCESS: Smart contracts compiled", TypeMessage.success);
    print(`${JSON.stringify(compilationInfo)}`, TypeMessage.data);
  }
  printSeparator();
};
