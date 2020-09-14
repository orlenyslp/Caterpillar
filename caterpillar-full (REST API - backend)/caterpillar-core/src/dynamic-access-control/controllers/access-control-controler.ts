import { ContractInfo } from "./../../adapters/ethereum-blockchain/structs/contract-info";
import { Request, Response } from "express";

import * as deploymentService from "./../services/deployment-mediator";
import * as runtimeRegistryService from "./../../runtime-registry/services/registry-service";
import * as runtimeOperations from "./../services/runtime-operations-mediator";
import * as policyInfoCollector from "./../services/policy-info-collector";
import { printl } from "../../adapters/messages/request-logs";

let runtimeRegistry: ContractInfo;

export let deployAccessControl = (request: Request, response: Response) => {
  printl(9, "DynamicAccessControl");
  deploymentService
    .deployAccessControl()
    .then((compilationResult) => {
      response.status(202).send(JSON.stringify(compilationResult));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let findRoleState = (request: Request, response: Response) => {
  printl(22, [request.get("role"), request.params.pCase]);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return runtimeOperations.getRoleState(
        this.runtimeRegistry,
        request.params.pCase,
        request.get("role")
      );
    })
    .then((roleState) => {
      response
        .status(200)
        .send({ role: request.get("role"), state: roleState });
    })
    .catch((error) => {
      response.status(400).send({ error: error });
    });
};

export let nominateCaseCreator = (request: Request, response: Response) => {
  printl(23, ["nominate-case-creator", request.params.pCase]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return runtimeOperations.nominateCaseCreator(
        this.runtimeRegistry,
        request.params.pCase,
        request.body.rNominee,
        request.body.nominee
      );
    })
    .then((result) => {
      response.status(202).send(JSON.stringify(result));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let nominate = (request: Request, response: Response) => {
  printl(23, ["nominate", request.params.pCase]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return runtimeOperations.nominate(
        this.runtimeRegistry,
        request.params.pCase,
        request.body.rNominator,
        request.body.rNominee,
        request.body.nominator,
        request.body.nominee
      );
    })
    .then((result) => {
      response.status(202).send(JSON.stringify(result));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let release = (request: Request, response: Response) => {
  printl(23, ["release", request.params.pCase]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return runtimeOperations.release(
        this.runtimeRegistry,
        request.params.pCase,
        request.body.rNominator,
        request.body.rNominee,
        request.body.nominator
      );
    })
    .then((result) => {
      response.status(202).send(JSON.stringify(result));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let vote = (request: Request, response: Response) => {
  printl(23, ["vote", request.params.pCase]);
  runtimeRegistryService
    .validateRegistry(request.body.registryAddress, this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return runtimeOperations.vote(
        this.runtimeRegistry,
        request.params.pCase,
        request.body.rNominator,
        request.body.rNominee,
        request.body.rEndorser,
        request.body.endorser,
        request.body.isAccepted,
        request.body.toEndorseOp === "nominate"
          ? runtimeOperations.OperationType.voteNomination
          : runtimeOperations.OperationType.voteRelease
      );
    })
    .then((result) => {
      response.status(202).send(JSON.stringify(result));
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};

export let findAccessControlMetadata = (
  request: Request,
  response: Response
) => {
  printl(24, ["Dynamic Access Control", request.params.accessCtrlAddr]);
  policyInfoCollector
    .findAccessControlMetadata(request.params.accessCtrlAddr)
    .then((accessControlInfo) => {
      response.status(200).send(JSON.stringify(accessControlInfo));
    })
    .catch((error) => {
      response
        .status(400)
        .send({ Error: "RoleTaskMap Metadata NOT Found", response: error });
    });
};

export let findPolicyAddresses = (request: Request, response: Response) => {
  printl(25, request.params.pCase);
  runtimeRegistryService
    .validateRegistry(request.get("registryAddress"), this.runtimeRegistry)
    .then((runtimeRegistry) => {
      this.runtimeRegistry = runtimeRegistry;
      return policyInfoCollector.findPolicyRelatedAddresses(
        this.runtimeRegistry,
        request.params.pCase
      );
    })
    .then((addressList) => {
      response.status(200).send({
        accessControl: addressList[0],
        bindingPolicy: addressList[1],
        roleTaskMap: addressList[2],
      });
    })
    .catch((error) => {
      response.status(400).send(error);
    });
};
