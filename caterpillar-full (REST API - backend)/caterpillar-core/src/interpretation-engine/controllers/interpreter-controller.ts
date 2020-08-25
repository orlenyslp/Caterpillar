import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { webSocket } from "./../../app";
import { printl } from "./../../adapters/logs/request-logs";
import { printp } from "./../../adapters/logs/pending-logs";
import { TypeMessage, print } from "../../adapters/logs/console-log";
import { Request, Response } from "express";

import * as parsingService from "../services/process-analyser/bpmn-parser";
import * as compilationService from "../services/process-analyser/bpmn-compiler";
import * as deploymentService from "../services/process-setup-handler/deployment-mediator";
import * as runtimeRegistryService from "./../../runtime-registry/services/registry-service";
import * as infoCollectorService from "./../services/worklist-handler/process-info-collector";

let runtimeRegistry: ContractInfo;

export let parseAndDeployProcessModelFull = async (
  request: Request,
  response: Response
) => {
  let interpreterInfo: any;
  let iFlowInfo: any;
  let iDataInfo: any;
  let iFactoryInfo: any;
  parsingService
    .parseBpmnModel(request.body.bpmn)
    .then((procInfo) => {
      printl(5, procInfo.procName);
      runtimeRegistryService
        .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
        .then((runtimeRegistry) => {
          this.runtimeRegistry = runtimeRegistry;
          compilationService
            .compileBPMNINterpreter()
            .then((cInfo) => {
              interpreterInfo = cInfo;
              return compilationService.compileIFlow();
            })
            .then((cInfo) => {
              iFlowInfo = cInfo;
              return compilationService.compileIData(procInfo);
            })
            .then((cInfo) => {
              iDataInfo = cInfo;
              return compilationService.compileIFactory(procInfo);
            })
            .then((cInfo) => {
              iFactoryInfo = cInfo;
              print(
                `IData and IFactory contracts generated and compiled succesfully`,
                TypeMessage.success
              );
              print(
                `Starting contract deployments and registration`,
                TypeMessage.pending
              );
              return deploymentService.deployAllProcessContracts(
                procInfo,
                interpreterInfo,
                iFlowInfo,
                iDataInfo,
                iFactoryInfo,
                runtimeRegistry as ContractInfo,
                request.body.bpmn
              );
            })
            .then((transactionHashes) => {
              print(`Deployment transactions sent`, TypeMessage.pending);
              print(transactionHashes, TypeMessage.data);
              response.status(201).send({
                BPMNINterpreter: JSON.stringify(interpreterInfo),
                IData: JSON.stringify(iDataInfo),
                IFlow: JSON.stringify(iFlowInfo),
                IFactry: JSON.stringify(iFactoryInfo),
                transactionHashes: transactionHashes,
              });
            })
            .catch((error) => {
              response.status(400).send(error);
            });
        })
        .catch((error) => {
          response.status(400).send(error);
        });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let createNewInterpreterInstance = (
  request: Request,
  response: Response
) => {
  printl(13, "BPMN Interpreter");
  compilationService
    .compileBPMNINterpreter()
    .then((cInfo) => {
      return deploymentService.deploySmartContractSync(cInfo);
    })
    .then((deploymentResult) => {
      if (webSocket) webSocket.send(JSON.stringify(deploymentResult));
      response.status(201).send(JSON.stringify(deploymentResult));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let getParsedModelList = (request: Request, response: Response) => {
  printl(18, ["IFlow nodes", request.get("registryAddress")]);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      runtimeRegistryService
        .findAllRegisteredIFlows(runtimeRegistry as ContractInfo)
        .then((addressList) => {
          response.status(200).send(JSON.stringify(addressList));
        })
        .catch((error) => {
          response.status(400).send(JSON.stringify(error));
        });
    })
    .catch((error) => {
      response.status(400).send(JSON.stringify(error));
    });
};

export let getProcessModelMetadata = (request: Request, response: Response) => {
  printl(19, [request.params.mHash]);
  infoCollectorService
    .findProcessModelMetadata(request.params.mHash)
    .then((pInfo) => {
      response.status(200).send(JSON.stringify(pInfo));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};
