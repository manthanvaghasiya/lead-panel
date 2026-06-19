const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  note: { type: String, required: true },
  statusAtTime: { type: String },
  typeAtTime: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'] },
  nextFollowup: { type: Date },
  outcome: { type: String }
});

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  businessType: { type: String },
  city: { type: String },
  address: { type: String },
  source: { type: String, default: 'Website' },
  type: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'], default: 'Cold' },
  status: { type: String, default: 'Pending' },
  followupDate: { type: Date },
  callLogs: [callLogSchema],
  tags: [{ type: String }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
