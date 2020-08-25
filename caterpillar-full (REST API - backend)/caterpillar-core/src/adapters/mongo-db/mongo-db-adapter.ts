import * as mongoose from "mongoose";

import { RepoType } from "./repo-types";
import * as repoSchemas from "./repo-schemas";
import * as repoDocuments from "./repo-documents";

import {
  ContractInfo,
  IContractInfo,
} from "./../ethereum-blockchain/structs/contract-info";

import {
  ModelMetadata,
  ProcessCEMetadata,
  ProcessIEMetadata,
  RoleBindingPolicy,
  RoleTaskMap,
} from "./repo-models";
import { PromiseError, Component } from "../errors/promise-error";

export let updateRepository = (
  repoType: RepoType,
  modelMetadata: ModelMetadata
) => {
  return new Promise<string>((resolve, reject) => {
    try {
      let mongoDBModel = repoSchemas.getModelSchema(repoType);
      if (!mongoDBModel) reject("undefined database schema");
      mongoDBModel.create(
        repoDocuments.getJsonDocument(repoType, modelMetadata),
        (error: any, repoData: any) => {
          if (error) reject(error);
          else {
            resolve(repoData._id);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

export let findContractInfoById = (repoType: RepoType, id: string) => {
  return new Promise<IContractInfo>((resolve, reject) => {
    let mongoDBModel = repoSchemas.getModelSchema(repoType);
    mongoDBModel.find({ _id: id }, (error: any, repoData: any) => {
      if (error) {
        reject(
          new PromiseError(
            `Querying metadata of contract info with ID ${id} from repository`,
            error,
            [new Component("MongoDB Adapter", "findContractInfoById")]
          )
        );
      } else {
        try {
          resolve(toContractInfo(repoData));
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

export let findContractInfoByAddress = (
  repoType: RepoType,
  address: string
) => {
  return new Promise<IContractInfo>((resolve, reject) => {
    let mongoDBModel = repoSchemas.getModelSchema(repoType);
    mongoDBModel.find({ address: address }, (error: any, repoData: any) => {
      if (error) {
        reject(
          new PromiseError(
            `Querying contract metadata from address ${address} from repository`,
            error,
            [new Component("MongoDB Adapter", "findContractInfoByAddress")]
          )
        );
      } else {
        try {
          resolve(toContractInfo(repoData));
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

export let findModelMetadataById = (repoType: RepoType, id: string) => {
  return new Promise<ModelMetadata>((resolve, reject) => {
    let mongoDBModel = repoSchemas.getModelSchema(repoType);
    mongoDBModel.find({ _id: id }, async (error: any, repoData: any) => {
      if (error) {
        reject(
          new PromiseError(
            `Querying metadata of process with ID ${id} from repository`,
            error,
            [new Component("MongoDB Adapter", "findModelMetadataById")]
          )
        );
      } else {
        try {
          switch (repoType) {
            case RepoType.ProcessCompiledEngine: {
              resolve(toProcessMetadata(repoData)[0]);
              break;
            }
            case RepoType.ProcessInterpretedEngine: {
              let processInfo = await toProcessIEMetadata(repoData);
              resolve(processInfo[0]);
              break;
            }
            case RepoType.RoleBindingPolicy: {
              resolve(toRoleBindingPolicy(repoData));
              break;
            }
            case RepoType.RoleTaskMap: {
              resolve(toRoleTaskMap(repoData));
              break;
            }
            default: {
              reject(`Invalid type ${repoData}`);
            }
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};

export let findPolicyByAddress = (repoType: RepoType, address: string) => {
  return new Promise<ModelMetadata>((resolve, reject) => {
    let mongoDBModel = repoSchemas.getModelSchema(repoType);
    mongoDBModel.find(
      { address: address },
      async (error: any, repoData: any) => {
        if (error) {
          reject(
            new PromiseError(
              `Querying metadata of process with ID ${address} from repository`,
              error,
              [new Component("MongoDB Adapter", "findPolicyByAddress")]
            )
          );
        } else {
          try {
            switch (repoType) {
              case RepoType.RoleBindingPolicy: {
                resolve(toRoleBindingPolicy(repoData));
                break;
              }
              case RepoType.RoleTaskMap: {
                resolve(toRoleTaskMap(repoData));
                break;
              }
              default: {
                reject(`Invalid type ${repoData}`);
              }
            }
          } catch (error) {
            reject(error);
          }
        }
      }
    );
  });
};

let toContractInfo = (repoData: any) => {
  let result = new ContractInfo(
    repoData[0].contractName,
    repoData[0].abi,
    repoData[0].bytecode,
    repoData[0].solidityCode,
    repoData[0].address
  );
  if (repoData[0]._relId) result._relId = repoData[0]._relId;
  return result;
};

let toRoleBindingPolicy = (repoData: any) => {
  let result = new RoleBindingPolicy(
    repoData[0].policyModel,
    createMap(repoData[0].roleIndexMap),
    toContractInfo(repoData)
  );
  result._id = repoData._id;
  return result;
};

let toRoleTaskMap = (repoData: any) => {
  let result = new RoleTaskMap(
    repoData[0].indexToRole as Array<string>,
    toContractInfo(repoData)
  );
  result._id = repoData._id;
  return result;
};

let toProcessMetadata = (repoData: Array<any>): Array<ProcessCEMetadata> => {
  return repoData.map((modelInfo) => {
    return new ProcessCEMetadata(
      modelInfo._id,
      modelInfo.rootProcessID,
      modelInfo.rootProcessName,
      modelInfo.bpmnModel,
      modelInfo.indexToElement as Array<any>,
      modelInfo.worklistAbi,
      new ContractInfo(
        modelInfo.contractName,
        modelInfo.abi,
        modelInfo.bytecode,
        modelInfo.solidityCode,
        undefined
      )
    );
  });
};

let toProcessIEMetadata = async (
  repoData: Array<any>
): Promise<Array<ProcessIEMetadata>> => {
  let result = new Array<ProcessIEMetadata>();
  for (let i = 0; i < repoData.length; i++) {
    let relatedContracts = await extractContractInfo(repoData[i]);
    result[i] = new ProcessIEMetadata(
      repoData[i].processID,
      repoData[i].processName,
      repoData[i].bpmnModel,
      repoData[i].indexToElement,
      await extractChildren(repoData[i].children),
      relatedContracts[0] as ContractInfo,
      relatedContracts[1] as ContractInfo,
      relatedContracts[2] as ContractInfo
    );
    result[i]._id = repoData[i]._id;
  }
  return result;
};

let extractChildren = async (children: Array<string>) => {
  let result = new Array<ProcessIEMetadata>();
  for (let i = 0; i < children.length; i++) {
    let pInfo = await findModelMetadataById(
      RepoType.ProcessInterpretedEngine,
      children[i]
    );
    result.push(pInfo as ProcessIEMetadata);
  }
  return result;
};

let extractContractInfo = async (repoData: any) => {
  let iFlow = await findContractInfoById(
    RepoType.SmartContract,
    repoData.iFlowId
  );
  let iData = await findContractInfoById(
    RepoType.SmartContract,
    (iFlow as ContractInfo)._relId
  );
  let iFactory = await findContractInfoById(
    RepoType.SmartContract,
    repoData.iFactoryId
  );
  return [iData, iFactory, iFlow];
};

let createMap = (indexArr: Array<string>) => {
  let result = new Map<string, number>();
  for (let i = 0; i < indexArr.length; i++) result.set(indexArr[i], i);
  return result;
};
