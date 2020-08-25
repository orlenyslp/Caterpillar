import * as mongoose from "mongoose";

export let registrySchema = mongoose.model("RegistryRepo", {
  contractName: String,
  address: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
});
