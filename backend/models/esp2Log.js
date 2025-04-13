const mongoose = require('mongoose');

const esp2LogSchema = new mongoose.Schema({
  uid: String,
  time: Number
});

module.exports = mongoose.model('ESP2Log', esp2LogSchema);
