const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
  lastMessage: { type: Date },
  messages: { type: Schema.Types.Mixed, default: [] },
  readed: { type: Schema.Types.Mixed, default: [] },
  joined: { type: Schema.Types.Mixed, default: [] },
  avatars: { type: Schema.Types.Mixed, default: [] },
  type: { type: 'string', default: 'chat' },
  info: { type: Schema.Types.Mixed, default: [] },
}, { versionKey: false });

chatSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Chat', chatSchema);
