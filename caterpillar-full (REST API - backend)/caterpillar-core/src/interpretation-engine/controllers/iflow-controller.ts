import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { TypeMessage, print } from "../../adapters/messages/console-log";
import { UpdatingIFlowRequest } from "./../utils/structs/async-requests";
import { ElementIFlow, SubProcLinkInfo } from "./../utils/structs/parsing-info";
import { Request, Response } from "express";
import { printl } from "../../adapters/messages/request-logs";

import * as compilationService from "../services/process-analyser/bpmn-compiler";
import * as deploymentService from "../services/process-setup-handler/deployment-mediator";
import * as registrationService from "./../services/process-setup-handler/registration-mediator";
import * as eventMonitor from "./../services/worklist-handler/event-monitor";
import * as processInfoCollector from "./../services/worklist-handler/process-info-collector";
import * as runtimeRegistryService from "./../../runtime-registry/services/registry-service";

let runtimeRegistry: ContractInfo;

export let createNewIFlowInstance = (request: Request, response: Response) => {
  printl(13, "IFlow node");
  let compilationInfo: any;
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return compilationService.compileIFlow();
    })
    .then((cInfo) => {
      compilationInfo = cInfo;
      return deploymentService.deploySmartContractSync(
        cInfo,
        [request.body.registryAddress]
      );
    })
    .then((deploymentResult) => {
      response.status(201).send({
        compilation: JSON.stringify(compilationInfo),
        deployment: JSON.stringify(deploymentResult),
      });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let setElementInIflowNode = (request: Request, response: Response) => {
  printl(14, [request.params.cfAddress, request.body.elemInfo]);
  registrationService
    .setIFlowNodeElement(
      request.params.cfAddress,
      request.body.iFlowAbi,
      JSON.parse(request.body.elemInfo) as ElementIFlow
    )
    .then((transactionHash) => {
      eventMonitor.listenForPendingTransaction(
        transactionHash,
        new UpdatingIFlowRequest(
          request.body.elemInfo,
          request.params.cfAddress,
          transactionHash,
          registrationService.handleIFlowElementUpdated
        )
      );
      response.status(202).send({ transactionHash: transactionHash });
    })
    .catch((error) => {
      response.status(400).send({ error: error });
    });
};

export let setChildInIflowNode = (request: Request, response: Response) => {
  printl(15, [request.params.cfAddress, request.body.subProcessInfo]);
  registrationService
    .linkSubProcess(
      request.params.cfAddress,
      request.body.iFlowAbi,
      JSON.parse(request.body.subProcessInfo) as SubProcLinkInfo
    )
    .then((transactionHash) => {
      eventMonitor.listenForPendingTransaction(
        transactionHash,
        new UpdatingIFlowRequest(
          request.body.subProcessInfo,
          request.params.cfAddress,
          transactionHash,
          registrationService.handleIFlowElementUpdated
        )
      );
      response.status(202).send({ transactionHash: transactionHash });
    })
    .catch((error) => {
      response.status(400).send({ error: error });
    });
};

export let relateFactoryToIFlow = (request: Request, response: Response) => {
  printl(16, [request.params.cfAddress, request.body.iFactoryAddress]);
  registrationService
    .relateContractAddressToIflow(
      request.params.cfAddress,
      request.body.iFactoryAddress,
      request.body.iFlowAbi,
      "IFactory",
      "setFactoryInst"
    )
    .then((transactionHash) => {
      eventMonitor.listenForPendingTransaction(
        transactionHash,
        new UpdatingIFlowRequest(
          request.body.iFactoryAddress,
          request.params.cfAddress,
          transactionHash,
          registrationService.handleIFactoryIFlowRelation
        )
      );
      response.status(202).send({ transactionHash: transactionHash });
    })
    .catch((error) => {
      response.status(400).send({ error: error });
    });
};

export let getIFlowOnChainInfo = (request: Request, response: Response) => {
  printl(17, [request.params.cfAddress]);
  processInfoCollector
    .findIFlowInfo(request.params.cfAddress)
    .then((info) => {
      response.status(200).send(info);
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};
