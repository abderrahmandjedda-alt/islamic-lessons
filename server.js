const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { OAuth2Client } = require('google-auth-library');
const Lesson = require('./models/Lesson');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════
// 🔴 حماية: MONGODB_URI مطلوب
// ═══════════════════════════════════════════════
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI غير موجود');
  process.exit(1);
}

// ═══════════════════════════════════════════════
// 🔐 Google OAuth (اختياري)
// ═══════════════════════════════════════════════
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ||
  (process.env.NODE_ENV === 'production'
    ? 'https://islamic-lessons.onrender.com/auth/google/callback'
    : 'http://localhost:3000/auth/google/callback');

function getRoleAndName(email) {
  const e = (email || '').toLowerCase().trim();
  if (!e) return null;

  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (admins.includes(e)) return { role: 'admin', name: null };

  // الأساتذة من TEACHERS_JSON (الصيغة الجديدة)
  const t = TEACHERS[e];
  if (t) return { role: 'teacher', name: t.name || null };

  return null;
}

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

if (useCloudinary) console.log('☁️ Cloudinary مفعّل');
else console.log('📁 Cloudinary غير مفعّل - تخزين محلي');

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
// 👨‍🏫 قائمة الأساتذة: { email: { name, password } }
// ═══════════════════════════════════════════════
let TEACHERS = {};
let TEACHERS_BY_PWD = {};

try {
  const raw = JSON.parse(process.env.TEACHERS_JSON || '{}');
  Object.keys(raw).forEach(function (key) {
    const val = raw[key];
    if (typeof val === 'string') {
      // صيغة قديمة: { name: password }
      TEACHERS_BY_PWD[val] = key;
    } else if (val && typeof val === 'object' && val.password) {
      // صيغة جديدة: { email: { name, password } }
      const email = key.toLowerCase().trim();
      TEACHERS[email] = {
        name: val.name || key,
        password: val.password
      };
      TEACHERS_BY_PWD[val.password] = val.name || key;
    }
  });
  console.log(`👨‍🏫 عدد الأساتذة المسجلين: ${Object.keys(TEACHERS).length}`);
} catch (err) {
  console.error('❌ خطأ في قراءة TEACHERS_JSON:', err.message);
  TEACHERS = {};
  TEACHERS_BY_PWD = {};
}

function findTeacherByEmail(email, password) {
  if (!email || !password) return null;
  const t = TEACHERS[email.toLowerCase().trim()];
  if (!t) return null;
  if (t.password !== password) return null;
  return t;
}

function findTeacherByPassword(password) {
  if (!password) return null;
  const name = TEACHERS_BY_PWD[password];
  if (!name) return null;
  return { name };
}

// ═══════════════════════════════════════════════
// ⚙️ Express
// ═══════════════════════════════════════════════
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '200mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-please',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

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
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  const pwd = req.headers['x-admin-password'];
  if (pwd === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'غير مصرح' });
};

const checkTeacher = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'teacher') {
    req.teacher = req.session.user.name || req.session.user.email;
    return next();
  }
  const pwd = req.headers['x-teacher-password'];
  const t = findTeacherByPassword(pwd);
  if (t) { req.teacher = t.name; return next(); }
  res.status(401).json({ error: 'غير مصرح' });
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
  try { return Buffer.from(str, 'latin1').toString('utf8'); }
  catch (err) { return str; }
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
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    uploadStream.end(buffer);
  });
}

async function uploadFile(file) {
  if (useCloudinary) {
    const result = await uploadToCloudinary(file.buffer, file.originalname);
    return { url: result.secure_url, storedName: result.public_id, storage: 'cloudinary' };
  } else {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const storedName = unique + ext;
    const filePath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(filePath, file.buffer);
    return { url: `/uploads/${storedName}`, storedName, storage: 'local' };
  }
}

// ═══════════════════════════════════════════════
// 🔵 Google OAuth
// ═══════════════════════════════════════════════
app.get('/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).send('Google OAuth غير مضبوط');
  const url = googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    redirect_uri: GOOGLE_REDIRECT_URI
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.redirect('/admin.html?error=google_denied');
    if (!code) return res.redirect('/admin.html?error=no_code');

    const { tokens } = await googleClient.getToken({ code, redirect_uri: GOOGLE_REDIRECT_URI });
    googleClient.setCredentials(tokens);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();
    const info = getRoleAndName(email);
    if (!info) return res.redirect('/admin.html?error=unauthorized');

    req.session.user = {
      email,
      name: info.name || payload.name || email,
      picture: payload.picture || '',
      role: info.role
    };
    if (info.role === 'admin') return res.redirect('/admin.html');
    if (info.role === 'teacher') return res.redirect('/teacher.html');
    res.redirect('/');
  } catch (err) {
    console.error('خطأ في Google callback:', err);
    res.redirect('/admin.html?error=google_failed');
  }
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) return res.json(req.session.user);
  res.status(401).json({ error: 'not_logged_in' });
});

app.post('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  } else res.json({ ok: true });
});

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول (المدير)
// ═══════════════════════════════════════════════
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!password) {
    return res.status(401).json({ error: 'البريد وكلمة السر مطلوبان' });
  }

  if (password === ADMIN_PASSWORD) {
    if (email && process.env.ADMIN_EMAILS) {
      const admins = process.env.ADMIN_EMAILS.split(',')
        .map(e => e.trim().toLowerCase()).filter(Boolean);
      if (admins.length && !admins.includes(email.toLowerCase().trim())) {
        return res.status(401).json({ error: 'هذا البريد ليس للمدير' });
      }
    }
    req.session.user = {
      email: (email || '').trim().toLowerCase() || 'admin',
      name: 'المدير',
      role: 'admin'
    };
    return res.json({ success: true, role: 'admin' });
  }

  res.status(401).json({ error: 'البريد أو كلمة السر غير صحيحة' });
});

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول (الأستاذ)
// ═══════════════════════════════════════════════
app.post('/api/teacher-login', (req, res) => {
  const { email, password } = req.body;

  if (!password) {
    return res.status(401).json({ error: 'البريد وكلمة السر مطلوبان' });
  }

  // الصيغة الجديدة: بريد + كلمة سر
  if (email) {
    const t = findTeacherByEmail(email, password);
    if (t) {
      req.session.user = {
        email: email.toLowerCase().trim(),
        name: t.name,
        role: 'teacher'
      };
      return res.json({ success: true, role: 'teacher', name: t.name });
    }
    return res.status(401).json({ error: 'البريد أو كلمة السر غير صحيحة' });
  }

  // الصيغة القديمة: كلمة سر فقط
  const t = findTeacherByPassword(password);
  if (t) {
    req.session.user = {
      email: '',
      name: t.name,
      role: 'teacher'
    };
    return res.json({ success: true, role: 'teacher', name: t.name });
  }

  res.status(401).json({ error: 'كلمة السر غير صحيحة' });
});

app.post('/api/review-login', (req, res) => {
  if (req.body.password === REVIEW_PASSWORD) res.json({ success: true, role: 'reviewer' });
  else res.status(401).json({ error: 'كلمة سر المراجعة خاطئة' });
});

// ═══════════════════════════════════════════════
// 📤 رفع درس (الأدمن)
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
// 👨‍🏫 رفع متعدد من الأستاذ
// ═══════════════════════════════════════════════
app.post('/api/teacher/batch', checkTeacher, upload.array('files', 10), async (req, res) => {
  try {
    const { year, specialization, subject } = req.body;
    const teacherName = req.teacher;
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'لم يتم إرسال ملفات' });
    if (!year || !specialization || !subject) return res.status(400).json({ error: 'يجب اختيار السنة والتخصص والمادة' });

    const titles = Array.isArray(req.body.titles) ? req.body.titles : [req.body.titles].filter(Boolean);
    const uploaded = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const fileData = await uploadFile(file);
        const fixedName = fixEncoding(file.originalname);
        const title = (titles[i] && titles[i].trim()) || path.parse(fixedName).name;
        const lesson = await Lesson.create({
          id: Date.now().toString() + '-' + i,
          title, year, specialization, subject,
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
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
      }
    }
    res.json({ success: true, uploaded: uploaded.length, failed: errors.length, lessons: uploaded, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/teacher/my-lessons', checkTeacher, async (req, res) => {
  try {
    const lessons = await Lesson.find({ uploader: 'teacher', uploaderName: req.teacher }).sort({ date: -1 });
    res.json(lessons);
  } catch (err) { res.status(500).json({ error: 'تعذر جلب الدروس' }); }
});

app.delete('/api/teacher/lessons/:id', checkTeacher, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id, uploader: 'teacher', uploaderName: req.teacher });
    if (!lesson) return res.status(403).json({ error: '❌ لا يمكنك حذف دروس أستاذ آخر' });

    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try { await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' }); } catch (err) {}
    } else if (lesson.storedName) {
      const filePath = path.join(UPLOAD_DIR, lesson.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Lesson.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
// 👨‍🎓 رفع من الطالب
// ═══════════════════════════════════════════════
app.post('/api/student/submit', upload.array('files', 5), async (req, res) => {
  try {
    const { year, specialization, subject, studentName, studentEmail, note } = req.body;
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'لم يتم إرسال ملفات' });
    if (!year || !specialization || !subject) return res.status(400).json({ error: 'يجب اختيار السنة والتخصص والمادة' });
    if (!studentName || !studentName.trim()) return res.status(400).json({ error: 'يجب كتابة اسمك' });

    const titles = Array.isArray(req.body.titles) ? req.body.titles : [req.body.titles].filter(Boolean);
    const uploaded = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const fileData = await uploadFile(file);
        const fixedName = fixEncoding(file.originalname);
        const title = (titles[i] && titles[i].trim()) || path.parse(fixedName).name;
        const lesson = await Lesson.create({
          id: Date.now().toString() + '-S' + i,
          title, year, specialization, subject,
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
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
      }
    }
    res.json({ success: true, submitted: uploaded.length, failed: errors.length, errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
// 📚 الدروس المعتمدة
// ═══════════════════════════════════════════════
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find({
      $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }]
    }).sort({ date: -1 });
    res.json(lessons);
  } catch (err) { res.status(500).json({ error: 'تعذر جلب الدروس' }); }
});

app.get('/api/pending', checkReview, async (req, res) => {
  try {
    const pending = await Lesson.find({ status: 'pending' }).sort({ date: -1 });
    res.json(pending);
  } catch (err) { res.status(500).json({ error: 'تعذر جلب المعلّقة' }); }
});

app.post('/api/pending/:id/approve', checkReview, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id, status: 'pending' });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });
    lesson.status = 'approved';
    lesson.reviewedAt = new Date();
    lesson.reviewNote = req.body.note || 'تمت الموافقة';
    await lesson.save();
    res.json({ success: true, lesson });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pending/:id/reject', checkReview, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id, status: 'pending' });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });
    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try { await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' }); } catch (err) {}
    }
    await Lesson.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/lessons/:id', checkAdmin, async (req, res) => {
  try {
    const lesson = await Lesson.findOne({ id: req.params.id });
    if (!lesson) return res.status(404).json({ error: 'غير موجود' });
    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try { await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' }); } catch (err) {}
    } else if (lesson.storedName) {
      const filePath = path.join(UPLOAD_DIR, lesson.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Lesson.deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════
// 🚀 الاتصال + التشغيل
// ═══════════════════════════════════════════════
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('🍃 متصل بـ MongoDB');
    try {
      const result = await Lesson.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'approved', uploader: 'admin' } }
      );
      if (result.modifiedCount > 0) console.log(`🔄 تم تحديث ${result.modifiedCount} درس قديم`);
    } catch (err) { console.error('خطأ Migration:', err); }

    app.listen(PORT, () => {
      console.log(`✅ الموقع يعمل على http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ فشل MongoDB:', err.message);
    process.exit(1);
  });