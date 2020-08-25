import {
  print,
  printSeparator,
  TypeMessage,
} from "./../../adapters/logs/console-log";
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { DeploymentOutput } from "../../adapters/ethereum-blockchain/structs/deployment-output";
import * as fs from "fs";

import * as solidityCompiler from "../../adapters/ethereum-blockchain/solidity-compiler";
import * as ethereumAdapter from "../../adapters/ethereum-blockchain/ethereum-adapter";

import { CompilationInput } from "../../adapters/ethereum-blockchain/structs/compilation-input";

import {
  CompilationError,
  CompilationResult,
} from "../../adapters/ethereum-blockchain/structs/compilation-output";

import { IContractInfo } from "../../adapters/ethereum-blockchain/structs/contract-info";

import * as mongoDBAdapter from "../../adapters/mongo-db/mongo-db-adapter";
import { RepoType } from "../../adapters/mongo-db/repo-types";
import { ModelMetadata } from "../../adapters/mongo-db/repo-models";
import { FunctionInfo } from "../../adapters/ethereum-blockchain/structs/function-info";
import { printError } from "../../adapters/logs/error-logs";

export let getRegistrySolidityCode = () => {
  return fs.readFileSync(
    "./src/runtime-registry/solidity-code/runtime-registry.sol",
    "utf8"
  );
};

export let compileRuntimeRegistry = () => {
  let contractsToCompile = new CompilationInput(
    "RuntimeRegistry",
    fs.readFileSync(
      "./src/runtime-registry/solidity-code/runtime-registry.sol",
      "utf8"
    ),
    []
  );

  let compiledContracts = solidityCompiler.compileSmartContracts(
    contractsToCompile
  );

  return compiledContracts[0] instanceof CompilationError
    ? compiledContracts[0]
    : compiledContracts.find((elem) => {
        return elem.contractName === "RuntimeRegistry";
      });
};

export let deployRegistry = (input: CompilationResult) => {
  return new Promise<DeploymentOutput>((resolve, reject) => {
    ethereumAdapter
      .defaultDeployment()
      .then((deploymentParams) => {
        resolve(
          ethereumAdapter.deploySmartContractSync(input, deploymentParams)
        );
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export let updateRegistryRepository = (contractInfo: ContractInfo) => {
  return new Promise<string>((resolve, reject) => {
    mongoDBAdapter
      .updateRepository(
        RepoType.RuntimeRegistry,
        new ModelMetadata(contractInfo)
      )
      .then((repoId) => {
        printResult(1, repoId);
        resolve(repoId);
      })
      .catch((error) => {
        printResult(2, error);
        reject(error);
      });
  });
};

export let validateRegistry = (
  address: string,
  currentRegistry: ContractInfo
) => {
  return new Promise<IContractInfo>((resolve, reject) => {
    try {
      if (currentRegistry && currentRegistry.address === address) {
        resolve(currentRegistry);
      } else {
        findRegistryByAddress(address)
          .then((registry) => {
            resolve(registry);
          })
          .catch((error) => {
            printResult(3, error);
            reject(error);
          });
      }
    } catch (error) {
      reject(error);
    }
  });
};

export let findRegistryById = (id: string) => {
  return new Promise<IContractInfo>((resolve, reject) => {
    mongoDBAdapter
      .findContractInfoById(RepoType.RuntimeRegistry, id)
      .then((result) => resolve(result))
      .catch((error) => reject(error));
  });
};

export let findRegistryByAddress = (address: string) => {
  return new Promise<IContractInfo>((resolve, reject) => {
    mongoDBAdapter
      .findContractInfoByAddress(RepoType.RuntimeRegistry, address)
      .then((result) => resolve(result))
      .catch((error) => reject(error));
  });
};

////////////////////////////////////////////////////////////////
/// FUNCTIONS TO RETRIEVE REGISTERED COMPILATION ENGINE INFO ///
////////////////////////////////////////////////////////////////

export let findAllRegisteredModels = async (runtimeRegistry: ContractInfo) => {
  return await findFullList(
    runtimeRegistry,
    "allRegisteredModels",
    "bytes32[]",
    "findAllRegisteredModels"
  );
};

export let findRunningInstancesFor = async (
  processId: string,
  runtimeRegistry: ContractInfo
) => {
  try {
    let defaultAccount = await ethereumAdapter.defaultDeployment();
    let fullAddressList = await ethereumAdapter.callContractFunction(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("allInstances", [], "address[]"),
      defaultAccount,
      []
    );

    let result = await asyncFilter(fullAddressList, async (address: any) => {
      let id = await ethereumAdapter.callContractFunction(
        runtimeRegistry.address,
        runtimeRegistry.abi,
        new FunctionInfo("bundleFor", ["address"], "bytes32"),
        defaultAccount,
        [address]
      );
      return id === processId;
    });
    printResult(4, [processId, result]);
    return result;
  } catch (error) {
    print(error);
    return Promise.reject(error);
  }
};

///////////////////////////////////////////////////////////////////
/// FUNCTIONS TO RETRIEVE REGISTERED INTERPRETATION ENGINE INFO ///
///////////////////////////////////////////////////////////////////

export let findBundleFromIFlow = async (
  runtimeRegistry: ContractInfo,
  iFlowAddr: string
) => {
  try {
    let defaultAccount = await ethereumAdapter.defaultDeployment();
    let repoId = await ethereumAdapter.callContractFunction(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo("getBundleIdFromIFlow", ["address"], "bytes32"),
      defaultAccount,
      [iFlowAddr]
    );
    return repoId;
  } catch (error) {
    printError("RuntimeRegistryService", "findBundleFromIFlow", error);
    return error;
  }
};

export let findAllRegisteredIFlows = async (runtimeRegistry: ContractInfo) => {
  return await findFullList(
    runtimeRegistry,
    "allRegisteredIFlows",
    "bytes32[]",
    "findAllRegisteredIFlows"
  );
};

export let findAllRegisteredIData = async (runtimeRegistry: ContractInfo) => {
  return await findFullList(
    runtimeRegistry,
    "allIDataInstances",
    "address[]",
    "findAllRegisteredIData"
  );
};

/////////////////////////////////////////
/////////// PRIVATE FUNCTIONS ///////////
/////////////////////////////////////////

let asyncFilter = async (inputArray: Array<any>, predicate: any) => {
  const results = await Promise.all(inputArray.map(predicate));
  return inputArray.filter((_v, index) => results[index]);
};

let findFullList = async (
  runtimeRegistry: ContractInfo,
  functionName: string,
  returnTpe: string,
  sourceFunction: string
) => {
  try {
    let defaultAccount = await ethereumAdapter.defaultDeployment();
    let resultList = await ethereumAdapter.callContractFunction(
      runtimeRegistry.address,
      runtimeRegistry.abi,
      new FunctionInfo(functionName, [], returnTpe),
      defaultAccount,
      []
    );
    printResult(5, [returnTpe, resultList]);
    return resultList;
  } catch (error) {
    printError("RuntimeRegistryService", sourceFunction, error);
    return Promise.reject(error);
  }
};

let printResult = (type: number, info: any) => {
  switch (type) {
    case 1: {
      print(
        "SUCCESS: Runtime Registry Metadata updated in Process Repository",
        TypeMessage.success
      );
      print(` ID: ${info}`, TypeMessage.info);
      printSeparator();
      break;
    }
    case 2: {
      print("ERROR: Updating Runtime Registry Metadata", TypeMessage.error);
      print(info, TypeMessage.error);
      printSeparator();
      break;
    }
    case 3: {
      print("ERROR: Invalid Runtime Registry", TypeMessage.error);
      print(info.toString(), TypeMessage.error);
      printSeparator();
      break;
    }
    case 4: {
      print(
        `SUCCESS: Instances of Process with ID ${info[0]} Retrieved Successfully.`,
        TypeMessage.success
      );
      print(` Addressess: ${info[1]}`, TypeMessage.info);
      printSeparator();
      break;
    }
    case 5: {
      print("SUCCESS: List Retrieved Successfully.", TypeMessage.success);
      print(` ${info[0]}: ${info[1]}`, TypeMessage.info);
      printSeparator();
      break;
    }
  }
};
