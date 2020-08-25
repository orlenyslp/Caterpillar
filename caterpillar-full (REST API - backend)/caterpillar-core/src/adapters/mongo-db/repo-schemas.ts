import { RepoType } from "./repo-types";
import * as mongoose from "mongoose";

export let getModelSchema = (repoType: RepoType) => {
  switch (repoType) {
    case RepoType.ProcessCompiledEngine: {
      return ProcessCESchema;
    }
    case RepoType.RuntimeRegistry: {
      return SContractsSchema;
    }
    case RepoType.ProcessInterpretedEngine: {
      return ProcessIESchema;
    }
    case RepoType.SmartContract: {
      return SContractsSchema;
    }
    case RepoType.RoleBindingPolicy: {
      return RoleBindingSchema;
    }
    case RepoType.RoleTaskMap: {
      return RoleTaskMapSchema;
    }
    default:
      return undefined;
  }
};

export let SContractsSchema = mongoose.model("SContractsRepo", {
  contractName: String,
  address: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
  _relId: String
});

export let ProcessCESchema = mongoose.model("ProcessCERepo", {
  rootProcessID: String,
  rootProcessName: String,
  bpmnModel: String,
  indexToElement: [mongoose.Schema.Types.Mixed],
  worklistAbi: String,
  contractName: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
});

export let ProcessIESchema = mongoose.model("ProcessIERepo", {
  processID: String,
  processName: String,
  bpmnModel: String,
  indexToElement: [mongoose.Schema.Types.Mixed],
  children: [String],
  iDataId: String,
  iFactoryId: String,
  iFlowId: String
});

export let RoleBindingSchema = mongoose.model("RoleBinding", {
  policyModel: String,
  roleIndexMap: [String],
  contractName: String,
  address: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
});

export let RoleTaskMapSchema = mongoose.model("RoleTaskMap", {
  indexToRole: [String],
  contractName: String,
  address: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
});

