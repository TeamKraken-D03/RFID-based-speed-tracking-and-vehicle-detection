const mongoose = require('mongoose');

const esp1LogSchema = new mongoose.Schema({
  uid: String,
  time: Number
});

module.exports = mongoose.model('ESP1Log', esp1LogSchema);
