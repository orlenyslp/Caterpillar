import * as mongoose from 'mongoose';

export let roleTaskSchema = mongoose.model('RoleTaskRepo', {
  address: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
});