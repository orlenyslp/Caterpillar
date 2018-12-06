import * as mongoose from 'mongoose';

export let repoSchema = mongoose.model('ProcessRepo', {
  rootProcessID: String,
  rootProcessName: String,
  bpmnModel: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
  indexToElement: [mongoose.Schema.Types.Mixed],
  worklistAbi: String,
});
