const mongoose = require('mongoose');

const businessClientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, trim: true, lowercase: true },
  address: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BusinessClient', businessClientSchema);
