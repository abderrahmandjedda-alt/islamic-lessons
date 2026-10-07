const API = '/api';
let adminPassword = sessionStorage.getItem('adminPwd') || '';

// ═══════════════════════════════════════════════
// 📅 السنوات والتخصصات والمواد (نفس app.js)
// ═══════════════════════════════════════════════
const YEARS = [
  { id: 'L1', name: 'السنة الأولى ليسانس' },
  { id: 'L2', name: 'السنة الثانية ليسانس' },
  { id: 'L3', name: 'السنة الثالثة ليسانس' },
  { id: 'M1', name: 'السنة الأولى ماستر' },
  { id: 'M2', name: 'السنة الثانية ماستر' }
];

const SPECIALIZATIONS = {
  'L1': ['العلوم الإسلامية', 'اللغة العربية', 'الحضارة الإسلامية'],
  'L2': ['العلوم الإسلامية', 'اللغة العربية', 'الحضارة الإسلامية'],
  'L3': ['العلوم الإسلامية', 'اللغة العربية', 'الحضارة الإسلامية'],
  'M1': ['اللغة والدراسات القرآنية', 'الحديث وعلومه', 'العقيدة والفكر الإسلامي', 'الفقه وأصوله'],
  'M2': ['اللغة والدراسات القرآنية', 'الحديث وعلومه', 'العقيدة والفكر الإسلامي']
};

const SUBJECTS = {
  'M1': {
    'اللغة والدراسات القرآنية': ['حفظ القرآن', 'تاريخ المصحف', 'أصول النحو ومذاهبه', 'دراسات في البلاغة العربية', 'علم الدلالة', 'مصادر الاحتجاج اللغوي', 'علم الرسم والضبط 1', 'غريب القرآن', 'اللغة الإنجليزية', 'البرمجة والذكاء الاصطناعي', 'نظرية النظم', 'اللسانيات'],
    'الحديث وعلومه': ['علم الحديث', 'مصطلح الحديث', 'تخريج الحديث', 'علل الحديث', 'رجال الحديث', 'مناهج المحدثين'],
    'العقيدة والفكر الإسلامي': ['العقيدة الإسلامية', 'الفكر الإسلامي', 'الفرق والمذاهب', 'علم الكلام', 'التصوف الإسلامي', 'الفلسفة الإسلامية'],
    'الفقه وأصوله': ['الفقه المقارن', 'أصول الفقه', 'مقاصد الشريعة', 'القواعد الفقهية']
  },
  'L1': {
    'العلوم الإسلامية': ['القرآن الكريم', 'السيرة النبوية', 'التوحيد', 'الفقه', 'الحديث'],
    'اللغة العربية': ['النحو', 'الصرف', 'البلاغة', 'الأدب', 'النصوص'],
    'الحضارة الإسلامية': ['تاريخ الحضارة', 'الفكر الإسلامي', 'العلوم الإسلامية']
  }
};

// الوضع الليلي
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// ═══════════════════════════════════════════════
// 📋 ملء القوائم
// ═══════════════════════════════════════════════
function fillYears() {
  const sel = document.getElementById('yearSelect');
  YEARS.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y.id;
    opt.textContent = y.name;
    sel.appendChild(opt);
  });
}

function updateSpecializations() {
  const yearId = document.getElementById('yearSelect').value;
  const specSel = document.getElementById('specializationSelect');
  const subSel = document.getElementById('subjectSelect');
  
  specSel.innerHTML = '<option value="">اختر التخصص</option>';
  subSel.innerHTML = '<option value="">اختر التخصص أولاً</option>';
  
  if (yearId && SPECIALIZATIONS[yearId]) {
    SPECIALIZATIONS[yearId].forEach(spec => {
      const opt = document.createElement('option');
      opt.value = spec;
      opt.textContent = spec;
      specSel.appendChild(opt);
    });
  }
}

function updateSubjects() {
  const yearId = document.getElementById('yearSelect').value;
  const spec = document.getElementById('specializationSelect').value;
  const subSel = document.getElementById('subjectSelect');
  
  subSel.innerHTML = '<option value="">اختر المادة</option>';
  
  if (yearId && spec && SUBJECTS[yearId] && SUBJECTS[yearId][spec]) {
    SUBJECTS[yearId][spec].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      subSel.appendChild(opt);
    });
  } else if (yearId && spec) {
    // إذا لم تكن المواد معرفة في SUBJECTS، أضف حقل إدخال يدوي
    const opt = document.createElement('option');
    opt.value = 'مادة عامة';
    opt.textContent = '— اكتب المادة يدوياً في الحقل —';
    subSel.appendChild(opt);
    // اسمح بالإدخال اليدوي
    subSel.outerHTML = `<input type="text" name="subject" id="subjectSelect" required placeholder="اكتب اسم المادة">`;
  }
}

// ═══════════════════════════════════════════════
// 🔐 تسجيل الدخول
// ═══════════════════════════════════════════════
if (adminPassword) showPanel();

document.getElementById('loginBtn').addEventListener('click', async () => {
  const pwd = document.getElementById('passwordInput').value;
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  });
  if (res.ok) {
    adminPassword = pwd;
    sessionStorage.setItem('adminPwd', pwd);
    showPanel();
  } else {
    document.getElementById('loginError').textContent = '❌ كلمة السر غير صحيحة';
  }
});

function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  fillYears();
  loadAdminLessons();
}

// ═══════════════════════════════════════════════
// 📤 رفع درس
// ═══════════════════════════════════════════════
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById('uploadStatus');
  const data = new FormData(form);
  status.textContent = '⏳ جارٍ الرفع...';
  status.style.color = 'var(--primary)';

  try {
    const res = await fetch(`${API}/lessons`, {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
      body: data
    });
    const json = await res.json();
    if (res.ok) {
      status.textContent = '✅ تم رفع الدرس بنجاح!';
      status.style.color = 'green';
      form.reset();
      updateSpecializations();
      loadAdminLessons();
    } else {
      status.textContent = '❌ ' + (json.error || 'فشل الرفع');
      status.style.color = 'red';
    }
  } catch (err) {
    status.textContent = '❌ خطأ في الاتصال';
    status.style.color = 'red';
  }
});

// ═══════════════════════════════════════════════
// 📋 عرض قائمة الدروس للإدارة
// ═══════════════════════════════════════════════
async function loadAdminLessons() {
  const res = await fetch(`${API}/lessons`);
  const lessons = await res.json();
  const div = document.getElementById('adminLessons');

  if (!lessons.length) {
    div.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px">لا توجد دروس مرفوعة</p>';
    return;
  }

  div.innerHTML = lessons.map(l => {
    const yearObj = YEARS.find(y => y.id === l.year);
    const yearName = yearObj ? yearObj.name : (l.year || 'غير محدد');
    return `
      <div class="admin-lesson-item">
        <div class="info">
          <h5>${escapeHtml(l.title)}</h5>
          <small>
            ${escapeHtml(yearName)} › 
            ${escapeHtml(l.specialization || 'غير محدد')} › 
            ${escapeHtml(l.subject)}
            • ${l.type.toUpperCase()} 
            • ${new Date(l.date).toLocaleDateString('ar-EG')}
          </small>
        </div>
        <a href="${l.url}" target="_blank" class="btn btn-view" style="flex:0 0 auto;padding:8px 14px">👁️</a>
        <button class="btn btn-delete" onclick="deleteLesson('${l.id}')">🗑️</button>
      </div>
    `;
  }).join('');
}

async function deleteLesson(id) {
  if (!confirm('هل تريد حذف هذا الدرس نهائياً؟')) return;
  const res = await fetch(`${API}/lessons/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword }
  });
  if (res.ok) loadAdminLessons();
  else alert('فشل الحذف');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}