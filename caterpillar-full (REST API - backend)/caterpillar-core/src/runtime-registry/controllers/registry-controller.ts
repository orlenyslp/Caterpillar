import { Request, Response } from "express";
import { CompilationError } from "./../../adapters/ethereum-blockchain/structs/compilation-output";
import { CompilationResult } from "../../adapters/ethereum-blockchain/structs/compilation-output";
import { DeploymentResult } from "../../adapters/ethereum-blockchain/structs/deployment-output";
import {
  IContractInfo,
  ContractInfo,
} from "../../adapters/ethereum-blockchain/structs/contract-info";

import * as registryService from "../services/registry-service";
import { printl } from "../../adapters/messages/request-logs";

export let deployRuntimeRegistry = (request: Request, response: Response) => {
  try {
    printl(9, "Runtime Registry");
    let compilationInfo = registryService.compileRuntimeRegistry();
    if (compilationInfo instanceof CompilationError) {
      response
        .status(400)
        .send(JSON.stringify((compilationInfo as CompilationError).errors));
    } else {
      registryService
        .deployRegistry(compilationInfo as CompilationResult)
        .then((deploymentInfo) => {
          return registryService.updateRegistryRepository(
            new ContractInfo(
              "Runtime Registry",
              (compilationInfo as CompilationResult).abi,
              (compilationInfo as CompilationResult).bytecode,
              registryService.getRegistrySolidityCode(),
              (deploymentInfo as DeploymentResult).contractAddress
            )
          );
        })
        .then((repoID) => {
          response.status(201).send({ ID: repoID });
        })
        .catch((error) => {
          response.status(400).send(JSON.stringify(error));
        });
    }
  } catch (error) {
    response.status(400).send(error.toString());
  }
};

export let getRuntimeRegistryInfo = (request: Request, response: Response) => {
  printl(10, [
    request.params.registryId,
    request.params.registryAddress,
  ]);
  
  let query = request.params.registryId
    ? registryService.findRegistryById(request.params.registryId)
    : registryService.findRegistryByAddress(request.params.registryAddress);

  query
    .then((data: IContractInfo) => {
      response.status(200).send(JSON.stringify(data));
    })
    .catch((error: IContractInfo) => {
      console.log(error);
      response.status(400).send(JSON.stringify(error));
    });
};
