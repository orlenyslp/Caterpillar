import { ContractInfo } from "./../../../adapters/ethereum-blockchain/structs/contract-info";
import * as fs from "fs";

import { SubProcessInfo } from "../../utils/structs/parsing-info";
import {
  CompilationError,
  CompilationResult,
} from "../../../adapters/ethereum-blockchain/structs/compilation-output";

import * as solidityCompiler from "../../../adapters/ethereum-blockchain/solidity-compiler";
import { CompilationInput } from "../../../adapters/ethereum-blockchain/structs/compilation-input";

export let compileIFlow = async (): Promise<CompilationResult> => {
  try {
    let cInput = newFileInput(
      "IFlow",
      "./src/interpretation-engine/utils/solidity-interfaces/i-flow.sol"
    );
    return withSolidityCode(
      cInput,
      await compileSmartContract(cInput, "IFlowImpl")
    );
  } catch (error) {
    return Promise.reject(error);
  }
};

export let compileBPMNINterpreter = async (): Promise<CompilationResult> => {
  try {
    let cInput = newFileInput(
      "BPMNInterpreter",
      "./src/interpretation-engine/utils/solidity-interfaces/bpmn-interpreter.sol",
      [
        newFileInput(
          "IFactory",
          "./src/interpretation-engine/utils/solidity-interfaces/i-factory.sol"
        ),
        newFileInput(
          "IData",
          "./src/interpretation-engine/utils/solidity-interfaces/i-data.sol"
        ),
        newFileInput(
          "IFlow",
          "./src/interpretation-engine/utils/solidity-interfaces/i-flow.sol"
        ),
      ]
    );
    return withSolidityCode(
      cInput,
      await compileSmartContract(cInput, "BPMNInterpreter")
    );
  } catch (error) {
    return Promise.reject(error);
  }
};

export let compileIData = async (
  procInfo: SubProcessInfo
): Promise<Array<CompilationResult>> => {
  return await compileContractList(procInfo, "Data");
};

export let compileIFactory = async (
  procInfo: SubProcessInfo
): Promise<Array<CompilationResult>> => {
  return await compileContractList(procInfo, "Factory");
};

////////////////////////////////////////////////
/////////////// PRIVATE FUNCTIONS   ////////////
////////////////////////////////////////////////

let compileContractList = async (procInfo: SubProcessInfo, suffix: string) => {
  try {
    let processes: Array<SubProcessInfo> = new Array();
    processes.push(procInfo);
    let compiledContracts = new Array<CompilationResult>();
    while (processes.length > 0) {
      let topProc: SubProcessInfo = processes.pop();
      let cInput =
        suffix === "Data"
          ? extractIDataInfo(topProc)
          : extractFactoryInfo(topProc);
      let compilationInfo = await compileSmartContract(
        cInput,
        topProc.procName + suffix
      );
      if (compilationInfo instanceof CompilationError)
        return Promise.reject(compilationInfo);
      compiledContracts.push(withSolidityCode(cInput, compilationInfo));
      for (let i = 0; i < topProc.children.length; i++)
        processes.push(topProc.children[i]);
    }
    return compiledContracts;
  } catch (error) {
    return Promise.reject(error);
  }
};

let compileSmartContract = (
  inputContract: CompilationInput,
  targetContract: string
) => {
  return new Promise<CompilationResult>((resolve, reject) => {
    let compiledContracts = solidityCompiler.compileSmartContracts(
      inputContract
    );
    if (compiledContracts[0] instanceof CompilationError)
      reject(compiledContracts[0]);
    let res = compiledContracts.find((elem) => {
      return elem.contractName === targetContract;
    });
    resolve(res as CompilationResult);
  });
};

let extractFactoryInfo = (element: any) => {
  return new CompilationInput(
    element.procName + "Factory",
    element.iData.factorySolidity,
    [
      newFileInput(
        "IDataImp",
        "./src/interpretation-engine/utils/solidity-interfaces/i-data.sol"
      ),
      new CompilationInput(
        element.procName + "Data",
        element.iData.iDataSolidity,
        []
      ),
    ]
  );
};

let extractIDataInfo = (element: any) => {
  return new CompilationInput(
    element.procName + "Data",
    element.iData.iDataSolidity,
    [
      newFileInput(
        "IDataImp",
        "./src/interpretation-engine/utils/solidity-interfaces/i-data.sol"
      ),
    ]
  );
};

let newFileInput = (
  outName: string,
  filePath: string,
  dependencies?: Array<CompilationInput>
) => {
  return new CompilationInput(
    outName,
    fs.readFileSync(filePath, "utf8"),
    dependencies ? dependencies : []
  );
};

let withSolidityCode = (
  cInput: CompilationInput,
  cOutput: CompilationResult
) => {
  cOutput.solidity = cInput.solidityCode;
  return cOutput;
};
