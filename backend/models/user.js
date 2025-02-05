const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  rank: { type: Number, default: 0 },
  avatar: { type: String, default: '' },
  status: { type: Number, default: 0 },
  socket: { type: String },
  description: { type: String },
  friends: { type: Schema.Types.Mixed, default: [] },
  model: { type: String, default: 'cecelia' },
  verification: { type: Boolean, default: false },
  verification_link: { type: String, default: '' },
  badges: { type: [String], default: [] }
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
