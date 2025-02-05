const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const serverSchema = new Schema({
    title: { type: String },
    description: { type: String },
    image: { type: String },
    joined: { type: Schema.Types.Mixed, default: [] },
    rooms: { type: Schema.Types.Mixed, default: [] },
    author: { type: String },
    admins: { type: [String], default: [] },
    banned: { type: [String], default: [] },
    mutted: { type: [String], default: [] }
}, { versionKey: false });

serverSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Server', serverSchema);
