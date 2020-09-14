import { TaskCompletedRequest } from "./../utils/structs/async-requests";
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { Request, Response } from "express";

import { NewInstRequest } from "../utils/structs/async-requests";

import * as executionService from "../services/execution-monitor";
import * as runtimeRegistryService from "../../runtime-registry/services/registry-service";

import * as eventMonitor from "../services/event-monitor";
import { printl } from "../../adapters/messages/request-logs";

let runtimeRegistry: ContractInfo;

export let createNewProcessInstance = (
  request: Request,
  response: Response
) => {
  printl(1, ['ID', request.params.mHash]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return executionService.createProcessInstance(
        request.params.mHash,
        this.runtimeRegistry,
        request.body.accessCtrlAddr,
        request.body.rbPolicyAddr,
        request.body.taskRoleMapAddr
      );
    })
    .then((transactionHash) => {
      eventMonitor.listenForPendingTransaction(
        this.runtimeRegistry.address,
        this.runtimeRegistry.abi,
        eventMonitor.EventType.NewProcessInstanceCreated,
        new NewInstRequest(
          request.params.mHash,
          request.params.mHash,
          transactionHash,
          executionService.handleNewInstance
        )
      );
      response.status(202).send({ transactionHash: transactionHash });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let queryProcessInstances = (request: Request, response: Response) => {
  printl(2, ['ID', request.params.mHash]);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      runtimeRegistryService
        .findRunningInstancesFor(request.params.mHash, this.runtimeRegistry)
        .then((instances) => {
          response.status(200).send(JSON.stringify(instances));
        })
        .catch((error) => {
          response.status(400).send(error);
        });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let queryProcessState = (request: Request, response: Response) => {
  printl(3, request.params.pAddress);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      executionService
        .queryProcessState(request.params.pAddress, this.runtimeRegistry)
        .then((workitems) => {
          response.status(200).send(JSON.stringify(workitems));
        })
        .catch((error) => {
          response.status(400).send(error);
        });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let executeWorkitem = (request: Request, response: Response) => {
  printl(4, [request.params.wi, request.params.wlAddress]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return executionService.executeWorkitem(
        request.params.wlAddress,
        parseInt(request.params.wiIndex),
        request.body.inputParameters,
        this.runtimeRegistry
      );
    })
    .then((result) => {
      eventMonitor.listenForPendingTransaction(
        request.params.wlAddress,
        result.worklistAbi,
        eventMonitor.EventType.UserTaskCompleted,
        new TaskCompletedRequest(
          result.taskName,
          parseInt(request.params.wiIndex),
          request.params.wlAddress,
          result.transactionHash,
          executionService.handleWorkitemExecuted
        )
      );
      response.status(202).send({ transactionHash: result.transactionHash });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};
