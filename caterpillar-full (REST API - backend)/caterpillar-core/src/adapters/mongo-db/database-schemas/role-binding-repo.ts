import * as mongoose from 'mongoose';

export let policySchema = mongoose.model('PolicyRepo', {
  address: String,
  model: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
  indexToRole: [String],
  accessControlAbi: String,
  accessControlBytecode: String,
});