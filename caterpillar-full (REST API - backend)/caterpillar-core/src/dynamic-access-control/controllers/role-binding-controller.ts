import { Request, Response } from "express";
import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";

import * as policyParsingService from "./../services/binding-policy-parser";
import * as deploymentService from "./../services/deployment-mediator";
import * as policyInfoCollector from "./../services/policy-info-collector";
import * as runtimeRegistryService from "./../../runtime-registry/services/registry-service";

import { printl } from "../../adapters/logs/request-logs";

let runtimeRegistry: ContractInfo;

export let parseAndDeployRBPolicy = (request: Request, response: Response) => {
  printl(20, request.body.policy);
  policyParsingService
    .generatePolicy(request.body.policy, "BindingPolicy")
    .then((rbPolicy) => {
      rbPolicy.model = request.body.policy;
      return deploymentService.deployBindingPolicy(rbPolicy);
    })
    .then((compilationResult) => {
      response.status(202).send(JSON.stringify(compilationResult));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let parseAndDeployTaskRoleMap = (
  request: Request,
  response: Response
) => {
  printl(21, request.body.roleTaskPairs);
  policyParsingService
    .generateRoleTaskContract(
      JSON.parse(request.body.roleTaskPairs),
      request.body.contractName,
      true
    )
    .then((solidityCode) => {
      return deploymentService.deployTaskRoleMap(
        request.body.contractName,
        JSON.parse(request.body.roleTaskPairs),
        solidityCode
      );
    })
    .then((compilationResult) => {
      response.status(202).send(JSON.stringify(compilationResult));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let findRBPolicyMetadata = (request: Request, response: Response) => {
  printl(24, ["Role-Binding Policy", request.params.rbPolicyAddr]);
  policyInfoCollector
    .findPolicyMetadata(request.params.rbPolicyAddr)
    .then((policyInfo) => {
      response.status(200).send(JSON.stringify(policyInfo));
    })
    .catch((error) => {
      response
        .status(400)
        .send({ Error: "Policy Metadata NOT Found", response: error });
    });
};

export let findRoleTaskMapMetadata = (request: Request, response: Response) => {
  printl(24, ["Role-Task Map", request.params.taskRoleMAddr]);
  policyInfoCollector
    .findRoleTaskMapMetadata(request.params.taskRoleMAddr)
    .then((roleTaskInfo) => {
      response.status(200).send(JSON.stringify(roleTaskInfo));
    })
    .catch((error) => {
      response
        .status(400)
        .send({ Error: "RoleTaskMap Metadata NOT Found", response: error });
    });
};
