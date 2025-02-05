const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const requestSchema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  status: { type: Boolean, default: false },
});

requestSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Request', requestSchema);
