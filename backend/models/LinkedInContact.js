const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
  sender: { type: String },
  message: { type: String },
  timestamp: { type: String },
  channel: { type: String, enum: ['LinkedIn', 'WhatsApp', 'Call', 'Other'], default: 'LinkedIn' }
}, { _id: true });

const linkedInContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  position: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  location: { type: String, trim: true },
  reason: { 
    type: String, 
    default: 'Freelance BDE Opportunity',
    trim: true 
  },
  linkedinUrl: { type: String, trim: true },
  mobile: { type: String, trim: true },
  email: { type: String, trim: true },
  status: { 
    type: String, 
    enum: [
      'Connected',
      'In Conversation',
      'WhatsApp Connected',
      'Meeting Scheduled',
      'Call Completed',
      'Proposal / Terms Sent',
      'Closed / Partnered',
      'Not Interested'
    ],
    default: 'In Conversation' 
  },
  priority: { 
    type: String, 
    enum: ['Hot', 'Warm', 'Cold'], 
    default: 'Warm' 
  },
  meetingLink: { type: String, trim: true },
  meetingDate: { type: Date },
  followupDate: { type: Date },
  commission: { type: String, trim: true, default: '' },
  dealTerms: { type: String, trim: true, default: '' },
  skills: [{ type: String, trim: true }],
  summary: { type: String },
  notes: { type: String },
  conversationLog: [messageLogSchema],
  rawSnippet: { type: String },
  convertedToLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  department: { type: String, enum: ['tech', 'marketing', 'all'], default: 'all' }
}, {
  timestamps: true
});

module.exports = mongoose.model('LinkedInContact', linkedInContactSchema);
