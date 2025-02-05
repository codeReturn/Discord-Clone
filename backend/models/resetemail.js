const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const resetEmailSchema = new Schema({
    email: { type: String, required: true },
    newemail: { type: String, required: true },
    link: { type: String, required: true },
    date: { type: String, required: true },
    status: {type: Number, default: '0'},
});

module.exports = mongoose.model('ResetEmail', resetEmailSchema);
