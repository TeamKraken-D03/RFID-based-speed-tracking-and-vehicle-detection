const mongoose = require('mongoose');

const speedLogSchema = new mongoose.Schema({
  uid: String,
  email: String,
  startTime: Number,
  endTime: Number,
  speed: Number,
  overspeedCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('SpeedLog', speedLogSchema);
