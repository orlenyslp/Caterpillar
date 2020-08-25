import * as mongoose from 'mongoose';

export let interpreterSchema = mongoose.model('InterpreterRepo', {
  procID: String,
  procName: String,
  bpmnModel: String,
  indexToElement: [mongoose.Schema.Types.Mixed],
});
