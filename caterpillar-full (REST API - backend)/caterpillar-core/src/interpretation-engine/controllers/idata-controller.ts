import { printl } from './../../adapters/logs/request-logs';
import { print } from './../../adapters/logs/console-log';
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { Request, Response } from "express";

import * as executionMediatorService from "./../services/worklist-handler/execution-mediator";
import * as processInfoCollectorService from "./../services/worklist-handler/process-info-collector";
import * as runtimeRegistryService from "./../../runtime-registry/services/registry-service";

let runtimeRegistry: ContractInfo;

export let createNewProcessInstance = (
  request: Request,
  response: Response
) => {
  printl(1, ['IFlow address', request.params.cfAddress])
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return executionMediatorService.createNewProcessInstance(
        request.params.cfAddress,
        this.runtimeRegistry,
        request.body.accessCtrlAddr,
        request.body.rbPolicyAddr,
        request.body.taskRoleMapAddr
      );
    })
    .then((transactionHash) => {
      response.status(202).send({ transactionHash: transactionHash });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let getProcessInstancesList = (request: Request, response: Response) => {
  printl(2, ['IFlow address', request.params.cfAddress])
  processInfoCollectorService
    .findIDataInstances(request.params.cfAddress)
    .then((instancesList) => {
      response.status(200).send(JSON.stringify(instancesList));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let getProcessInstanceState = (request: Request, response: Response) => {
  printl(3, request.params.pcAddress);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return executionMediatorService.queryProcessState(
        request.params.pcAddress,
        this.runtimeRegistry
      );
    })
    .then((processState) => {
      response.status(200).send(JSON.stringify(processState));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let checkOutTaskInProcessInstance = (
  request: Request,
  response: Response
) => {
  printl(12, [request.params.eIndex, request.params.pcAddress]);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return executionMediatorService.checkOutTaskData(
        request.params.eIndex,
        request.params.pcAddress,
        JSON.parse(request.get("outParams")),
        this.runtimeRegistry
      );
    })
    .then((processData) => {
      response.status(200).send({output: processData});
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let checkInTaskInProcessInstance = (
  request: Request,
  response: Response
) => {
  printl(11, [request.params.eIndex, request.params.pcAddress]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return executionMediatorService.executeTask(
        request.params.eIndex,
        request.params.pcAddress,
        JSON.parse(request.body.inParams),
        this.runtimeRegistry
      );
    })
    .then((transactionHash) => {
      response.status(202).send(JSON.stringify(transactionHash));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};
