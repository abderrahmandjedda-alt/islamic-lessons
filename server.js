const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const Lesson = require('./models/Lesson');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════
// ☁️ إعداد Cloudinary
// ═══════════════════════════════════════════════
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME &&
                          process.env.CLOUDINARY_API_KEY &&
                          process.env.CLOUDINARY_API_SECRET);

if (useCloudinary) {
  console.log('☁️ Cloudinary مفعّل - الملفات ستُخزّن بشكل دائم');
} else {
  console.log('📁 Cloudinary غير مفعّل - الملفات ستُخزّن محلياً');
}

// ═══════════════════════════════════════════════
// 📁 مجلد الرفع المحلي (احتياطي فقط)
// ═══════════════════════════════════════════════
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ═══════════════════════════════════════════════
// 🔐 كلمة سر الأدمن
// ═══════════════════════════════════════════════
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MyStr0ng!Pass2025#Jeddah';

// ═══════════════════════════════════════════════
// ⚙️ إعدادات Express
// ═══════════════════════════════════════════════
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════
// 📤 إعداد رفع الملفات (multer - للذاكرة)
// ═══════════════════════════════════════════════
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 ميغا
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. المسموح: PDF, DOC, DOCX'));
  }
});

// ═══════════════════════════════════════════════
// 🔒 التحقق من كلمة سر الأدمن
// ═══════════════════════════════════════════════
const checkAdmin = (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'كلمة السر غير صحيحة' });
};

// ═══════════════════════════════════════════════
// ☁️ دالة رفع إلى Cloudinary
// ═══════════════════════════════════════════════
function uploadToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: 'islamic-lessons',
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`,
        use_filename: false,
        unique_filename: true
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// ═══════════════════════════════════════════════
// 📤 رفع درس جديد
// ═══════════════════════════════════════════════
app.post('/api/lessons', checkAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, year, specialization, subject, description } = req.body;
    if (!req.file) return res.status(400).json({ error: 'لم يتم إرسال ملف' });

    let fileUrl, storedName;

    if (useCloudinary) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        fileUrl = result.secure_url;
        storedName = result.public_id;
        console.log('☁️ تم رفع الملف إلى Cloudinary:', fileUrl);
      } catch (err) {
        console.error('خطأ في Cloudinary:', err);
        return res.status(500).json({ error: 'فشل الرفع إلى Cloudinary: ' + err.message });
      }
    } else {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(req.file.originalname);
      storedName = unique + ext;
      const filePath = path.join(UPLOAD_DIR, storedName);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/${storedName}`;
      console.log('📁 تم رفع الملف محلياً:', fileUrl);
    }

    // حفظ بيانات الدرس في MongoDB
    const lesson = await Lesson.create({
      id: Date.now().toString(),
      title: title || 'بدون عنوان',
      year: year || 'غير محدد',
      specialization: specialization || 'غير محدد',
      subject: subject || 'عام',
      description: description || '',
      filename: req.file.originalname,
      storedName: storedName,
      size: req.file.size,
      type: path.extname(req.file.originalname).slice(1).toLowerCase(),
      url: fileUrl,
      storage: useCloudinary ? 'cloudinary' : 'local',
      date: new Date()
    });

    res.json({ success: true, lesson });
  } catch (err) {
    console.error('خطأ عام:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 📚 كل الدروس (الأحدث أولاً)
// ═══════════════════════════════════════════════
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ date: -1 });
    res.json(lessons);
  } catch (err) {
    console.error('خطأ في جلب الدروس:', err);
    res.status(500).json({ error: 'تعذر جلب الدروس' });
  }
});

// ═══════════════════════════════════════════════
// 🗑️ حذف درس
// ═══════════════════════════════════════════════
app.delete('/api/lessons/:id', checkAdmin, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });

    // حذف الملف أولاً
    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try {
        const result = await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' });
        console.log('☁️ نتيجة حذف Cloudinary:', result.result);
      } catch (err) {
        console.error('خطأ في حذف Cloudinary:', err);
      }
    } else if (lesson.storedName) {
      const filePath = path.join(UPLOAD_DIR, lesson.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // ثم حذف السجل من MongoDB
    await Lesson.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error('خطأ في الحذف:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 🔐 التحقق من كلمة السر
// ═══════════════════════════════════════════════
app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ error: 'كلمة السر خاطئة' });
});

// ═══════════════════════════════════════════════
// 🚀 الاتصال بـ MongoDB ثم بدء السيرفر
// ═══════════════════════════════════════════════
if (!process.env.MONGODB_URI) {
  console.error('❌ المتغير MONGODB_URI غير موجود. تأكد من ملف .env');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('🍃 تم الاتصال بـ MongoDB بنجاح');
    app.listen(PORT, () => {
      console.log(`✅ الموقع يعمل على http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ فشل الاتصال بـ MongoDB:', err.message);
    process.exit(1);
  });