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
    date: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// إخفاء الحقل الداخلي _id حتى يبقى شكل البيانات مطابقًا لما تتوقعه الواجهة
lessonSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Lesson', lessonSchema);