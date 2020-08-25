import { ContractInfo } from "./../ethereum-blockchain/structs/contract-info";
import {
  ModelMetadata,
  ProcessCEMetadata,
  ProcessIEMetadata,
  ProcessIEInput,
  RoleBindingPolicy,
  RoleTaskMap,
} from "./repo-models";
import { RepoType } from "./repo-types";

export let getJsonDocument = (
  repoType: RepoType,
  modelMetadata: ModelMetadata
) => {
  let jsonDocument = modelMetadata.contractInfo
    ? {
        contractName: modelMetadata.contractInfo.contractName,
        address: modelMetadata.contractInfo.address,
        solidityCode: modelMetadata.contractInfo.solidityCode,
        abi: modelMetadata.contractInfo.abi,
        bytecode: modelMetadata.contractInfo.bytecode,
      }
    : undefined;

  switch (repoType) {
    case RepoType.ProcessCompiledEngine: {
      return createProcessDocument(
        jsonDocument,
        modelMetadata as ProcessCEMetadata
      );
    }
    case RepoType.ProcessInterpretedEngine: {
      return createProcessIEDocument(modelMetadata as ProcessIEInput);
    }
    case RepoType.RoleBindingPolicy: {
      jsonDocument[
        "policyModel"
      ] = (modelMetadata as RoleBindingPolicy).policyModel;
      jsonDocument["roleIndexMap"] = mapToArray(
        (modelMetadata as RoleBindingPolicy).roleIndexMap
      );
      return jsonDocument;
    }
    case RepoType.RoleTaskMap: {
      jsonDocument["indexToRole"] = (modelMetadata as RoleTaskMap).indexToRole;
      return jsonDocument;
    }
    default: {
      jsonDocument["_relId"] = modelMetadata.contractInfo._relId;
      return jsonDocument;
    }
  }
};

let createProcessDocument = (
  jsonDocument: any,
  processMetadata: ProcessCEMetadata
) => {
  jsonDocument["rootProcessID"] = processMetadata.rootModelID;
  jsonDocument["rootProcessName"] = processMetadata.rootModelName;
  jsonDocument["bpmnModel"] = processMetadata.bpmnModel;
  jsonDocument["indexToElement"] = processMetadata.indexToElementMap;
  jsonDocument["worklistAbi"] = processMetadata.worklistABI;
  return jsonDocument;
};

let createProcessIEDocument = (processMetadata: ProcessIEInput) => {
  return {
    processID: processMetadata.processID,
    processName: processMetadata.processName,
    bpmnModel: processMetadata.bpmnModel,
    indexToElement: processMetadata.indexToElement,
    children: processMetadata.children,
    iFactoryId: processMetadata.iFactory,
    iFlowId: processMetadata.iFlow,
  };
};

let extractIds = (children: Array<ProcessIEMetadata>): Array<string> => {
  return children.map((subProc) => {
    return subProc._id;
  });
};

let mapToArray = (roleIndexMap: Map<string, number>) => {
  let indexes = [];
  roleIndexMap.forEach((rInd: number, role: string) => {
    indexes[rInd] = role;
  });
  return indexes;
};
