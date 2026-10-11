const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ['teacher', 'admin'],
      default: 'teacher'
    },

    active: { type: Boolean, default: true, index: true },

    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },

    // للتدقيق
    createdBy: { type: String, default: 'system' }
  },
  { versionKey: false }
);

teacherSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('Teacher', teacherSchema);