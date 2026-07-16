const mongoose = require('mongoose');

const conversationPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  otherUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  archived: { type: Boolean, default: false },
  hiddenCompany: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
}, { timestamps: true });

conversationPreferenceSchema.index({ user: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationPreference', conversationPreferenceSchema);
