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
const bcrypt = require('bcryptjs');

const Lesson = require('./models/Lesson');
const Teacher = require('./models/Teacher');

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
// 🔐 Google OAuth
// ═══════════════════════════════════════════════
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ||
  (process.env.NODE_ENV === 'production'
    ? 'https://islamic-lessons.onrender.com/auth/google/callback'
    : 'http://localhost:3000/auth/google/callback');

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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const REVIEW_PASSWORD = process.env.REVIEW_PASSWORD;
if (!ADMIN_PASSWORD || !REVIEW_PASSWORD || !process.env.SESSION_SECRET) {
  console.error('❌ ADMIN_PASSWORD و REVIEW_PASSWORD و SESSION_SECRET مطلوبة');
  process.exit(1);
}

// ═══════════════════════════════════════════════
// ⚙️ Express
// ═══════════════════════════════════════════════
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '200mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET,
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

const checkTeacher = async (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'teacher') {
    if (req.session.user.id) {
      try {
        const t = await Teacher.findById(req.session.user.id).lean();
        if (!t) {
          return res.status(403).json({ error: 'الحساب غير موجود' });
        }
        if (!t.active) {
          return res.status(403).json({ error: 'الحساب معطّل. تواصل مع الإدارة.' });
        }
        req.teacher = t.name;
        req.teacherId = String(t._id);
        req.teacherEmail = t.email;
        return next();
      } catch (e) {
        // في حال خطأ في القراءة، نكمل بالبيانات القديمة
      }
    }
    req.teacher = req.session.user.name;
    req.teacherId = null;
    req.teacherEmail = req.session.user.email || '';
    return next();
  }
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
  const from = req.query.from === 'teacher' ? 'teacher' : 'admin';
  const state = Buffer.from(JSON.stringify({ from })).toString('base64');
  const url = googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    redirect_uri: GOOGLE_REDIRECT_URI,
    state: state
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;
    let from = 'admin';
    try {
      const parsed = JSON.parse(Buffer.from(state || '', 'base64').toString('utf8'));
      if (parsed.from === 'teacher') from = 'teacher';
    } catch (e) { /* نبقى على admin */ }

    if (error) {
      return res.redirect((from === 'teacher' ? '/teacher.html' : '/admin.html') + '?error=google_denied');
    }
    if (!code) {
      return res.redirect((from === 'teacher' ? '/teacher.html' : '/admin.html') + '?error=no_code');
    }

    const { tokens } = await googleClient.getToken({ code, redirect_uri: GOOGLE_REDIRECT_URI });
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();
    console.log('📧 بريد Google المستلم:', email);

    // ═══ 1) هل هو مدير؟ ═══
    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (admins.includes(email)) {
      if (from === 'teacher') {
        return res.redirect('/teacher.html?error=wrong_role');
      }
      req.session.user = {
        email,
        name: 'المدير',
        picture: payload.picture || '',
        role: 'admin'
      };
      console.log('✅ مدير:', email);
      return res.redirect('/admin.html');
    }

    // ═══ 2) هل هو أستاذ في قاعدة البيانات؟ ═══
    const teacher = await Teacher.findOne({ email, active: true });
    if (teacher) {
      if (from === 'admin') {
        return res.redirect('/admin.html?error=wrong_role');
      }
      teacher.lastLogin = new Date();
      await teacher.save();

      req.session.user = {
        id: String(teacher._id),
        email: teacher.email,
        name: teacher.name,
        picture: payload.picture || '',
        role: 'teacher'
      };
      console.log('✅ أستاذ:', teacher.name, '—', email);
      return res.redirect('/teacher.html');
    }

    // ═══ 3) غير مصرح ═══
    console.warn('⛔ بريد غير مصرح:', email);
    return res.redirect((from === 'teacher' ? '/teacher.html' : '/admin.html') + '?error=unauthorized');
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
app.post('/api/teacher-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ error: 'البريد وكلمة السر مطلوبان' });
    }

    const teacher = await Teacher.findOne({ email: email.toLowerCase().trim() });
    if (!teacher) {
      return res.status(401).json({ error: 'البريد أو كلمة السر غير صحيحة' });
    }

    if (!teacher.active) {
      return res.status(403).json({ error: 'هذا الحساب معطّل. تواصل مع الإدارة.' });
    }

    const ok = await bcrypt.compare(password, teacher.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'البريد أو كلمة السر غير صحيحة' });
    }

    teacher.lastLogin = new Date();
    await teacher.save();

    req.session.user = {
      id: String(teacher._id),
      email: teacher.email,
      name: teacher.name,
      role: 'teacher'
    };

    res.json({ success: true, role: 'teacher', name: teacher.name });
  } catch (err) {
    console.error('خطأ في teacher-login:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

app.post('/api/review-login', (req, res) => {
  if (req.body.password === REVIEW_PASSWORD) res.json({ success: true, role: 'reviewer' });
  else res.status(401).json({ error: 'كلمة سر المراجعة خاطئة' });
});

// ═══════════════════════════════════════════════
// 👥 إدارة الأساتذة (للمدير فقط)
// ═══════════════════════════════════════════════
app.get('/api/admin/teachers', checkAdmin, async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 }).lean();

    const counts = await Lesson.aggregate([
      { $match: { uploader: 'teacher', uploaderId: { $ne: null } } },
      { $group: { _id: '$uploaderId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[String(c._id)] = c.count; });

    const result = teachers.map(t => ({
      _id: String(t._id),
      email: t.email,
      name: t.name,
      active: t.active,
      createdAt: t.createdAt,
      lastLogin: t.lastLogin,
      lessonCount: countMap[String(t._id)] || 0
    }));
    res.json(result);
  } catch (err) {
    console.error('خطأ في جلب الأساتذة:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/teachers', checkAdmin, async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'البريد والاسم وكلمة السر مطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة السر 6 أحرف على الأقل' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await Teacher.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ error: 'هذا البريد مسجل مسبقاً' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await Teacher.create({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      active: true,
      role: 'teacher',
      createdBy: req.session.user.email || 'admin'
    });

    console.log(`✅ أستاذ جديد: ${teacher.name} — ${teacher.email}`);

    res.json({
      success: true,
      teacher: {
        _id: String(teacher._id),
        email: teacher.email,
        name: teacher.name,
        active: teacher.active,
        lessonCount: 0,
        createdAt: teacher.createdAt
      }
    });
  } catch (err) {
    console.error('خطأ في إضافة أستاذ:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/teachers/:id', checkAdmin, async (req, res) => {
  try {
    const { name, password } = req.body;
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'الأستاذ غير موجود' });

    if (name && name.trim()) teacher.name = name.trim();

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'كلمة السر 6 أحرف على الأقل' });
      }
      teacher.passwordHash = await bcrypt.hash(password, 10);
    }

    await teacher.save();
    console.log(`✏️ تحديث الأستاذ: ${teacher.name}`);

    res.json({ success: true });
  } catch (err) {
    console.error('خطأ في تعديل الأستاذ:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/teachers/:id/disable', checkAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!teacher) return res.status(404).json({ error: 'الأستاذ غير موجود' });

    const count = await Lesson.countDocuments({ uploaderId: teacher._id });

    console.log(`⏸️ تعطيل الأستاذ: ${teacher.name} (${count} درس محفوظ)`);

    res.json({
      success: true,
      message: `تم تعطيل ${teacher.name}. ${count} درس ما زالت في الموقع.`
    });
  } catch (err) {
    console.error('خطأ في تعطيل الأستاذ:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/teachers/:id/activate', checkAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { active: true },
      { new: true }
    );
    if (!teacher) return res.status(404).json({ error: 'الأستاذ غير موجود' });

    console.log(`▶️ تفعيل الأستاذ: ${teacher.name}`);
    res.json({ success: true });
  } catch (err) {
    console.error('خطأ في تفعيل الأستاذ:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/teachers/:id', checkAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'الأستاذ غير موجود' });

    const count = await Lesson.countDocuments({ uploaderId: teacher._id });
    if (count > 0) {
      return res.status(400).json({
        error: `لا يمكن الحذف. للأستاذ ${count} درس. استخدم "تعطيل" بدلاً من ذلك.`
      });
    }

    await Teacher.deleteOne({ _id: teacher._id });
    console.log(`🗑️ حذف الأستاذ: ${teacher.name}`);
    res.json({ success: true });
  } catch (err) {
    console.error('خطأ في حذف الأستاذ:', err);
    res.status(500).json({ error: err.message });
  }
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
    const teacherId = req.teacherId;
    const teacherEmail = req.teacherEmail || '';

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
          uploaderId: teacherId,
          uploaderName: teacherName,
          uploaderEmail: teacherEmail,
          date: new Date()
        });
        uploaded.push(lesson);
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
      }
    }

    res.json({
      success: true,
      uploaded: uploaded.length,
      failed: errors.length,
      lessons: uploaded,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/my-lessons', checkTeacher, async (req, res) => {
  try {
    const query = req.teacherId
      ? { uploader: 'teacher', uploaderId: req.teacherId }
      : { uploader: 'teacher', uploaderName: req.teacher };
    const lessons = await Lesson.find(query).sort({ date: -1 });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب الدروس' });
  }
});

app.delete('/api/teacher/lessons/:id', checkTeacher, async (req, res) => {
  try {
    const query = req.teacherId
      ? { id: req.params.id, uploader: 'teacher', uploaderId: req.teacherId }
      : { id: req.params.id, uploader: 'teacher', uploaderName: req.teacher };

    const lesson = await Lesson.findOne(query);
    if (!lesson) return res.status(403).json({ error: '❌ لا يمكنك حذف دروس أستاذ آخر' });

    if (lesson.storage === 'cloudinary' && lesson.storedName) {
      try { await cloudinary.uploader.destroy(lesson.storedName, { resource_type: 'raw' }); } catch (err) {}
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب الدروس' });
  }
});

app.get('/api/pending', checkReview, async (req, res) => {
  try {
    const pending = await Lesson.find({ status: 'pending' }).sort({ date: -1 });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب المعلّقة' });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 🔄 Migration: نقل الأساتذة من TEACHERS_JSON
// ═══════════════════════════════════════════════
async function migrateTeachers() {
  try {
    const existing = await Teacher.countDocuments();
    if (existing > 0) {
      console.log(`👨‍🏫 الأساتذة في قاعدة البيانات: ${existing}`);
      return;
    }

    const raw = process.env.TEACHERS_JSON || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }

    let migrated = 0;
    for (const key of Object.keys(parsed)) {
      const val = parsed[key];
      if (val && typeof val === 'object' && val.password && key.includes('@')) {
        const hash = await bcrypt.hash(val.password, 10);
        try {
          await Teacher.create({
            email: key.toLowerCase().trim(),
            name: val.name || key,
            passwordHash: hash,
            active: true,
            role: 'teacher',
            createdBy: 'migration'
          });
          migrated++;
        } catch (e) {
          if (e.code !== 11000) {
            console.error(`خطأ في ترحيل ${key}:`, e.message);
          }
        }
      }
    }

    if (migrated > 0) {
      console.log(`🔄 تم ترحيل ${migrated} أستاذ من TEACHERS_JSON إلى قاعدة البيانات`);
    } else {
      console.log('ℹ️ لا يوجد أساتذة لترحيلهم');
    }
  } catch (err) {
    console.error('خطأ في ترحيل الأساتذة:', err.message);
  }
}

// ═══════════════════════════════════════════════
// 🔄 Migration: ربط الدروس القديمة بالأساتذة
// ═══════════════════════════════════════════════
async function migrateLessonOwners() {
  try {
    const orphans = await Lesson.countDocuments({
      uploader: 'teacher',
      $or: [
        { uploaderId: { $exists: false } },
        { uploaderId: null }
      ]
    });

    if (orphans === 0) return;

    console.log(`🔄 ترحيل ${orphans} درس قديم (بدون uploaderId)...`);
    const teachers = await Teacher.find().lean();
    let linked = 0;

    for (const t of teachers) {
      const result = await Lesson.updateMany(
        {
          uploader: 'teacher',
          uploaderName: t.name,
          $or: [{ uploaderId: { $exists: false } }, { uploaderId: null }]
        },
        { $set: { uploaderId: t._id, uploaderEmail: t.email } }
      );
      linked += result.modifiedCount;
    }

    const unlinked = await Lesson.countDocuments({
      uploader: 'teacher',
      $or: [{ uploaderId: { $exists: false } }, { uploaderId: null }]
    });

    console.log(`✅ تم ربط ${linked} درس بالأستاذ الصحيح`);
    if (unlinked > 0) {
      console.log(`⚠️ ${unlinked} درس لم نجد له أستاذاً مطابقاً (سيظهر للمدير فقط)`);
    }
  } catch (err) {
    console.error('خطأ في ربط الدروس:', err.message);
  }
}

// ═══════════════════════════════════════════════
// 🚀 الاتصال + التشغيل
// ═══════════════════════════════════════════════
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('🍃 متصل بـ MongoDB');

    await migrateTeachers();
    await migrateLessonOwners();

    try {
      const result = await Lesson.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'approved', uploader: 'admin' } }
      );
      if (result.modifiedCount > 0) console.log(`🔄 تم تحديث ${result.modifiedCount} درس قديم`);
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