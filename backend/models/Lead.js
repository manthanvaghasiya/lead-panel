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
  ownerName: { type: String },
  mobile: { type: String, required: true },
  businessType: { type: String },
  city: { type: String },
  address: { type: String },
  mapsUrl: { type: String },
  website: { type: String },
  source: { type: String, default: 'Website' },
  type: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'], default: 'Cold' },
  status: { type: String, default: 'Pending' },
  followupDate: { type: Date },
  callLogs: [callLogSchema],
  tags: [{ type: String }],
  socials: {
    instagram: { type: String },
    facebook: { type: String },
    youtube: { type: String },
    linkedin: { type: String },
    rating: { type: String },
    reviews: { type: String },
    summary: { type: String },
    hours: { type: String },
    emails: { type: String },
    phones: { type: String },
    addressMatch: { type: String },
    instagramFollowers: { type: String },
    facebookFollowers: { type: String },
    youtubeSubscribers: { type: String },
    platforms: [{
      name: { type: String },
      rating: { type: String },
      reviews: { type: String },
      url: { type: String }
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
