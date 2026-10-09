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
// ☁️ Cloudinary
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
  console.log('☁️ Cloudinary مفعّل');
} else {
  console.log('📁 Cloudinary غير مفعّل - تخزين محلي');
}

// ═══════════════════════════════════════════════
// 📁 مجلد الرفع
// ═══════════════════════════════════════════════
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ═══════════════════════════════════════════════
// 🔐 كلمات السر
// ═══════════════════════════════════════════════
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jeddah2025';
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD || 'Review2025!Jeddah';

// ═══════════════════════════════════════════════
// 👨‍🏫 قائمة الأساتذة (اسم → كلمة سر)
// ═══════════════════════════════════════════════
let TEACHERS = {};
try {
  TEACHERS = JSON.parse(process.env.TEACHERS_JSON || '{}');
  const count = Object.keys(TEACHERS).length;
  console.log(`👨‍🏫 عدد الأساتذة المسجلين: ${count}`);
} catch (err) {
  console.error('❌ خطأ في قراءة TEACHERS_JSON:', err.message);
  TEACHERS = {};
}

console.log('🔑 كلمات السر:');
console.log('   - الأدمن:', ADMIN_PASSWORD ? 'موجودة ✅' : 'مفقودة ❌');
console.log('   - المراجعة:', REVIEW_PASSWORD ? 'موجودة ✅' : 'مفقودة ❌');

// ═══════════════════════════════════════════════
// ⚙️ Express
// ═══════════════════════════════════════════════
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ═══════════════════════════════════════════════
// 📤 multer
// ═══════════════════════════════════════════════
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. المسموح: PDF, DOC, DOCX'));
  }
});

// ═══════════════════════════════════════════════
// 🔒 Middlewares
// ═══════════════════════════════════════════════
const checkAdmin = (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'كلمة سر الأدمن غير صحيحة' });
};

const checkTeacher = (req, res, next) => {
  const pwd = req.headers['x-teacher-password'];
  
  // ابحث عن الأستاذ بكلمة السر
  const teacherName = Object.keys(TEACHERS).find(
    name => TEACHERS[name] === pwd
  );
  
  if (teacherName) {
    req.teacher = teacherName;
    return next();
  }
  
  res.status(401).json({ error: 'كلمة سر الأستاذ غير صحيحة' });
};

const checkReview = (req, res, next) => {
  const pwd = req.headers['x-review-password'];
  if (pwd === REVIEW_PASSWORD) return next();
  res.status(401).json({ error: 'كلمة سر المراجعة غير صحيحة' });
};

// ═══════════════════════════════════════════════
// 🔤 إصلاح ترميز الأسماء العربية
// ═══════════════════════════════════════════════
function fixEncoding(str) {
  try {
    return Buffer.from(str, 'latin1').toString('utf8');
  } catch (err) {
    return str;
  }
}

// ═══════════════════════════════════════════════
// ☁️ دوال الرفع
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

async function uploadFile(file) {
  if (useCloudinary) {
    const result = await uploadToCloudinary(file.buffer, file.originalname);
    return {
      url: result.secure_url,
      storedName: result.public_id,
      storage: 'cloudinary'
    };
  } else {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const storedName = unique + ext;
    const filePath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(filePath, file.buffer);
    return {
      url: `/uploads/${storedName}`,
      storedName,
      storage: 'local'
    };
  }
}

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════
app.post('/api/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true, role: 'admin' });
  } else {
    res.status(401).json({ error: 'كلمة السر خاطئة' });
  }
});

app.post('/api/teacher-login', (req, res) => {
  const { password } = req.body;
  
  const teacherName = Object.keys(TEACHERS).find(
    name => TEACHERS[name] === password
  );
  
  if (teacherName) {
    console.log(`✅ دخول الأستاذ: ${teacherName}`);
    res.json({ 
      success: true, 
      role: 'teacher',
      name: teacherName
    });
  } else {
    res.status(401).json({ error: 'كلمة السر غير صحيحة' });
  }
});

app.post('/api/review-login', (req, res) => {
  if (req.body.password === REVIEW_PASSWORD) {
    res.json({ success: true, role: 'reviewer' });
  } else {
    res.status(401).json({ error: 'كلمة سر المراجعة خاطئة' });
  }
});

// ═══════════════════════════════════════════════
// 📤 رفع درس واحد (الأدمن)
// ═══════════════════════════════════════════════
app.post('/api/lessons', checkAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, year, specialization, subject, description } = req.body;
    if (!req.file) return res.status(400).json({ error: 'لم يتم إرسال ملف' });

    const fixedName = fixEncoding(req.file.originalname);
    const fileData = await uploadFile(req.file);

    const lesson = await Lesson.create({
      id: Date.now().toString(),
      title: title || path.parse(fixedName).name,
      year: year || 'غير محدد',
      specialization: specialization || 'غير محدد',
      subject: subject || 'عام',
      description: description || '',
      filename: fixedName,
      storedName: fileData.storedName,
      size: req.file.size,
      type: path.extname(fixedName).slice(1).toLowerCase(),
      url: fileData.url,
      storage: fileData.storage,
      status: 'approved',
      uploader: 'admin',
      date: new Date()
    });

    res.json({ success: true, lesson });
  } catch (err) {
    console.error('خطأ:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 👨‍🏫 رفع متعدد من الأستاذ (نشر فوري)
// ═══════════════════════════════════════════════
app.post('/api/teacher/batch', checkTeacher, upload.array('files', 10), async (req, res) => {
  try {
    const { year, specialization, subject } = req.body;
    const teacherName = req.teacher;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'لم يتم إرسال ملفات' });
    }

    if (!year || !specialization || !subject) {
      return res.status(400).json({ error: 'يجب اختيار السنة والتخصص والمادة' });
    }

    const titles = Array.isArray(req.body.titles) ? req.body.titles : [req.body.titles].filter(Boolean);

    const uploaded = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const fileData = await uploadFile(file);
        const fixedName = fixEncoding(file.originalname);
        
        const title = (titles[i] && titles[i].trim()) 
          || path.parse(fixedName).name;

        const lesson = await Lesson.create({
          id: Date.now().toString() + '-' + i,
          title: title,
          year: year,
          specialization: specialization,
          subject: subject,
          description: '',
          filename: fixedName,
          storedName: fileData.storedName,
          size: file.size,
          type: path.extname(fixedName).slice(1).toLowerCase(),
          url: fileData.url,
          storage: fileData.storage,
          status: 'approved',
          uploader: 'teacher',
          uploaderName: teacherName,
          date: new Date()
        });

        uploaded.push(lesson);
        console.log(`☁️ [${teacherName}] رُفع: ${title}`);
      } catch (err) {
        console.error(`خطأ في الملف ${file.originalname}:`, err);
        errors.push({ filename: file.originalname, error: err.message });
      }
    }

    res.json({
      success: true,
      uploaded: uploaded.length,
      failed: errors.length,
      lessons: uploaded,
      errors: errors
    });
  } catch (err) {
    console.error('خطأ:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 📚 دروس الأستاذ (خاصة به)
// ═══════════════════════════════════════════════
app.get('/api/teacher/my-lessons', checkTeacher, async (req, res) => {
  try {
    const lessons = await Lesson.find({ 
      uploader: 'teacher',
      uploaderName: req.teacher
    }).sort({ date: -1 });
    
    res.json(lessons);
  } catch (err) {
    console.error('خطأ:', err);
    res.status(500).json({ error: 'تعذر جلب الدروس' });
  }
});

// ═══════════════════════════════════════════════
// 🗑️ حذف درس (الأستاذ - فقط دروسه)
// ═══════════════════════════════════════════════
app.delete('/api/teacher/lessons/:id', checkTeacher, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ 
      id: req.params.id, 
      uploader: 'teacher',
      uploaderName: req.teacher
    });
    
    if (!lesson) {
      return res.status(403).json({ 
        error: '❌ لا يمكنك حذف دروس أستاذ آخر' 
      });
    }

    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try {
        await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' });
        console.log('☁️ تم حذف الملف من Cloudinary');
      } catch (err) {
        console.error('خطأ في حذف Cloudinary:', err);
      }
    } else if (lesson.storedName) {
      const filePath = path.join(UPLOAD_DIR, lesson.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Lesson.deleteOne({ id: req.params.id });
    console.log(`🗑️ [${req.teacher}] حذف: ${lesson.title}`);
    res.json({ success: true });
  } catch (err) {
    console.error('خطأ:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 👨‍🎓 رفع من الطالب (للمراجعة)
// ═══════════════════════════════════════════════
app.post('/api/student/submit', upload.array('files', 5), async (req, res) => {
  try {
    const { year, specialization, subject, studentName, studentEmail, note } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'لم يتم إرسال ملفات' });
    }

    if (!year || !specialization || !subject) {
      return res.status(400).json({ error: 'يجب اختيار السنة والتخصص والمادة' });
    }

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: 'يجب كتابة اسمك' });
    }

    const titles = Array.isArray(req.body.titles) ? req.body.titles : [req.body.titles].filter(Boolean);
    const uploaded = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const fileData = await uploadFile(file);
        const fixedName = fixEncoding(file.originalname);

        const title = (titles[i] && titles[i].trim()) 
          || path.parse(fixedName).name;

        const lesson = await Lesson.create({
          id: Date.now().toString() + '-S' + i,
          title: title,
          year: year,
          specialization: specialization,
          subject: subject,
          description: note || '',
          filename: fixedName,
          storedName: fileData.storedName,
          size: file.size,
          type: path.extname(fixedName).slice(1).toLowerCase(),
          url: fileData.url,
          storage: fileData.storage,
          status: 'pending',
          uploader: 'student',
          uploaderName: studentName,
          uploaderEmail: studentEmail || '',
          date: new Date()
        });

        uploaded.push(lesson);
        console.log(`⏳ [طالب] ${title} - ${studentName}`);
      } catch (err) {
        console.error(`خطأ:`, err);
        errors.push({ filename: file.originalname, error: err.message });
      }
    }

    res.json({
      success: true,
      submitted: uploaded.length,
      failed: errors.length,
      errors: errors
    });
  } catch (err) {
    console.error('خطأ:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 📚 الدروس المعتمدة (للطلاب والزوار)
// ═══════════════════════════════════════════════
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find({ 
      $or: [
        { status: 'approved' },
        { status: { $exists: false } },
        { status: null }
      ]
    }).sort({ date: -1 });
    res.json(lessons);
  } catch (err) {
    console.error('خطأ:', err);
    res.status(500).json({ error: 'تعذر جلب الدروس' });
  }
});

// ═══════════════════════════════════════════════
// 📥 الدروس المعلّقة (للمراجعة)
// ═══════════════════════════════════════════════
app.get('/api/pending', checkReview, async (req, res) => {
  try {
    const pending = await Lesson.find({ status: 'pending' }).sort({ date: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب المعلّقة' });
  }
});

// ═══════════════════════════════════════════════
// ✅ الموافقة على درس
// ═══════════════════════════════════════════════
app.post('/api/pending/:id/approve', checkReview, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id, status: 'pending' });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });

    lesson.status = 'approved';
    lesson.reviewedAt = new Date();
    lesson.reviewNote = req.body.note || 'تمت الموافقة';
    await lesson.save();

    console.log(`✅ تمت الموافقة: ${lesson.title}`);
    res.json({ success: true, lesson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// ❌ رفض درس
// ═══════════════════════════════════════════════
app.post('/api/pending/:id/reject', checkReview, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id, status: 'pending' });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });

    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try {
        await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' });
      } catch (err) {}
    }

    await Lesson.deleteOne({ id: req.params.id });
    console.log(`❌ تم رفض: ${lesson.title}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 🗑️ حذف درس (الأدمن - أي درس)
// ═══════════════════════════════════════════════
app.delete('/api/lessons/:id', checkAdmin, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });

    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try {
        await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' });
      } catch (err) {}
    } else if (lesson.storedName) {
      const filePath = path.join(UPLOAD_DIR, lesson.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Lesson.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 🚀 الاتصال + Migration
// ═══════════════════════════════════════════════
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI غير موجود');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('🍃 متصل بـ MongoDB');
    
    try {
      const result = await Lesson.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'approved', uploader: 'admin' } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🔄 تم تحديث ${result.modifiedCount} درس قديم`);
      }
    } catch (err) {
      console.error('خطأ Migration:', err);
    }
    
    app.listen(PORT, () => {
      console.log(`✅ الموقع يعمل على http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ فشل MongoDB:', err.message);
    process.exit(1);
  });