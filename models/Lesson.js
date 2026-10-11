const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, default: 'بدون عنوان' },
    year: { type: String, default: 'غير محدد' },
    specialization: { type: String, default: 'غير محدد' },
    subject: { type: String, default: 'عام' },
    description: { type: String, default: '' },
    filename: String,
    storedName: String,
    size: Number,
    type: String,
    url: String,
    storage: String,
    date: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved'
    },
    uploader: {
      type: String,
      enum: ['admin', 'teacher', 'student'],
      default: 'admin'
    },

    // ✨ جديد: ربط الأستاذ بهوية ثابتة
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      index: true,
      default: null
    },
    uploaderEmail: { type: String, default: '' },

    // ⚠️ للتوافق: نُبقي uploaderName للعرض فقط
    uploaderName: { type: String, default: '' },

    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date }
  },
  { versionKey: false }
);

lessonSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Lesson', lessonSchema);