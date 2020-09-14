import { CompilationInfo } from "../../adapters/ethereum-blockchain/structs/compilation-output";
import { InvalidContractInfo } from "../../adapters/ethereum-blockchain/structs/contract-info";
import { Request, Response } from "express";

import { ModelInfo } from "../utils/structs/compilation-info";
import { parseModel } from "../services/bpmn-parser";

import * as compilationService from "../services/bpmn-compiler";
import * as deploymentService from "../services/deployment-mediator";
import * as registryService from "../../runtime-registry/services/registry-service";
import * as runtimeRegistryService from "../../runtime-registry/services/registry-service";

import { ContractInfo } from "../../adapters/ethereum-blockchain/structs/contract-info";
import { printl } from "../../adapters/messages/request-logs";

let runtimeRegistry: ContractInfo;

export let compileProcessModels = (request: Request, response: Response) => {
  let modelInfo: ModelInfo = request.body as ModelInfo;
  printl(8, modelInfo.name);
  parseModel(modelInfo)
    .then(() => {
      return compilationService.compileProcessModel(modelInfo);
    })
    .then((contracts) => response.status(201).send(JSON.stringify(contracts)))
    .catch((error) => response.status(400).send(error));
};

export let deployProcessModels = (request: Request, response: Response) => {
  let modelInfo: ModelInfo = request.body as ModelInfo;
  let contracts: CompilationInfo;
  printl(5, modelInfo.name);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      parseModel(modelInfo)
        .then(() => {
          return compilationService.compileProcessModel(modelInfo);
        })
        .then((compiledContracts) => {
          contracts = compiledContracts;
          return deploymentService.registerProcessRepository(
            modelInfo,
            contracts
          );
        })
        .then((result) => {
          return deploymentService.registerParent2ChildrenRelation(
            result,
            modelInfo,
            this.runtimeRegistry
          );
        })
        .then((result) => {
          return deploymentService.deployAndRegisterFactories(
            result,
            contracts.compilationMetadata,
            this.runtimeRegistry
          );
        })
        .then((result) => {
          return deploymentService.deployAndRegisterWorklists(
            modelInfo,
            result,
            contracts.compilationMetadata,
            this.runtimeRegistry
          );
        })
        .then((result) => response.status(201).send({ bundleID: result }))
        .catch((error) => {
          response.status(400).send(error);
        });
    })
    .catch((error: InvalidContractInfo) => response.status(400).send(error));
};

export let queryProcessModels = (request: Request, response: Response) => {
  printl(6, request.get("registryAddress"));
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      registryService
        .findAllRegisteredModels(this.runtimeRegistry)
        .then((models) => {
          response.status(200).send(JSON.stringify(models));
        })
        .catch((error) => {
          response.status(400).send(error);
        });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let retrieveModelMetadata = (request: Request, response: Response) => {
  printl(7, request.params.mHash)
  deploymentService
    .retrieveProcessModelMetadata(request.params.mHash)
    .then((modelInfo) => {
      response.status(200).send(modelInfo);
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};
