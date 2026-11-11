
// ==========================================
// 1. قواعد البيانات والتهيئة الأساسية
// ==========================================
const TEACHER_NAME = "القيصر";
let students = JSON.parse(localStorage.getItem("students")) || [];
let classSessions = JSON.parse(localStorage.getItem("classSessions")) || []; 
let exams = JSON.parse(localStorage.getItem("exams")) || []; 
let homeworks = JSON.parse(localStorage.getItem("homeworks")) || []; 
let financeRecords = JSON.parse(localStorage.getItem("financeRecords")) || {}; 
let expenses = JSON.parse(localStorage.getItem("expenses")) || []; 
let schedule = JSON.parse(localStorage.getItem("schedule")) || []; 
let isAssistantMode = localStorage.getItem("isAssistantMode") === "true";
let adminPin = localStorage.getItem("adminPin") || "1234";
let books = JSON.parse(localStorage.getItem("books")) || [];


// تحديث المجموعات
let groups = JSON.parse(localStorage.getItem("groups")) || [];
if (groups.length > 0 && typeof groups[0] === 'string') {
    groups = groups.map(g => ({ name: g, level: 'الثالث الثانوي' }));
    localStorage.setItem("groups", JSON.stringify(groups));
}

let currentActiveSessionId = null, currentActiveExamId = null, currentActiveHwId = null;
let currentActiveGroup = null, currentStudentProfileCode = null;
let attendanceChartInstance = null, groupsChartInstance = null, financeChartInstance = null;
let html5QrcodeScanner = null, currentScannerTarget = '';


// ==========================================
// 1. قواعد البيانات والتهيئة الأساسية
// ==========================================

const NOTIFICATIONS_SERVER_URL = "https://infections-muscles-letting-pee.trycloudflare.com";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// ==========================================
// 2. دوال المساعدة (Utils) والتنبيهات
// ==========================================
function formatTime12(timeStr) {
    if (!timeStr) return "";
    try {
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        let period = hours >= 12 ? "مساءً" : "صباحاً";
        hours = hours % 12 || 12; 
        return `${hours}:${minutes} ${period}`;
    } catch (e) { return timeStr; }
}

function normalizeArabicName(text) {
    if (!text) return "";
    return text.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/[يى]/g, 'ي').replace(/\s+/g, ' ').trim();
}




// ==========================================
// 🧠 دالة المعالجة الذكية للحروف العربية
// ==========================================
window.smartArabicNormalize = function(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[أإآا]/g, 'ا') // توحيد الألف
        .replace(/ة/g, 'ه')      // توحيد التاء المربوطة والهاء
        .replace(/[يى]/g, 'ي')    // توحيد الياء والألف اللينة
        .replace(/[ئءؤ]/g, 'ء')   // توحيد أشكال الهمزة
        .replace(/\s+/g, ' ')     // إزالة المسافات الزائدة
        .trim();
};

// ==========================================
// 1️⃣ دالة المعالجة الذكية للحروف والبحث (توحيد وتطابق جزئي)
// ==========================================
window.smartArabicNormalize = function(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[أإآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[يى]/g, 'ي')
        .replace(/[ئءؤ]/g, 'ء')
        .replace(/\s+/g, ' ')
        .trim();
};

window.findStudentByCodeOrName = function(input) {
    const val = input.trim();
    
    // 1. البحث بالكود أو رقم الهاتف (الطالب أو ولي الأمر) كأولوية قصوى
    const studentByExactMatch = students.find(s => 
        String(s.code) === String(val) || 
        String(s.phone) === String(val) || 
        String(s.parentPhone) === String(val)
    );
    if (studentByExactMatch) return studentByExactMatch;
    
    // 2. البحث بالاسم (تطابق ذكي) كخطة بديلة
    const normalizedInput = window.smartArabicNormalize(val);
    const inputWords = normalizedInput.split(' '); 
    
    return students.find(s => {
        let dbName = window.smartArabicNormalize(s.name);
        return dbName === normalizedInput || inputWords.every(word => dbName.includes(word));
    });
};


// ==========================================
// 🔍 البحث العام السريع عن طالب من أي صفحة
// ==========================================
window.handleGlobalSearch = function(e) {
    // لو داس Enter من الكيبورد
    if (e.key === 'Enter') {
        e.preventDefault();
        executeGlobalSearch();
    }
};

window.executeGlobalSearch = function() {
    let inputEl = document.getElementById("globalStudentSearch");
    let val = inputEl.value.trim();
    
    if (!val) {
        showToast("يرجى كتابة كود أو اسم الطالب أولاً!", "error");
        return;
    }

    // استخدام دالة البحث
    let student = findStudentByCodeOrName(val);
    
    if (student) {
        // الطالب موجود -> افتح ملفه فوراً
        openStudentProfile(student.code);
        inputEl.value = ""; 
        showToast(`تم فتح ملف: ${student.name} 🎓`);
    } else {
        // 🚀 السحر الجديد: نافذة تأكيد ذكية لو الطالب مش موجود
        customConfirm(`الطالب "${val}" غير مسجل بالنظام!\nهل تريد تسجيل طالب جديد بهذه البيانات؟`, () => {
            
            // 1. التوجيه لصفحة الطلاب أولاً لضمان وجودنا في المكان الصحيح
            switchPage('students');
            
            // 2. فتح نافذة الإضافة
            openModal('addStudentModal');
            
            // 3. تأخير بسيط جداً لوضع القيمة في مكانها الصحيح وتخطي التوليد التلقائي للكود
            setTimeout(() => {
                let isNumber = /^\d+$/.test(val); // فحص هل المدخل أرقام فقط أم حروف
                
                if (isNumber) {
                    // لو أرقام -> حطها في خانة الكود وخلي المؤشر على خانة الاسم
                    document.getElementById('studentCode').value = val;
                    document.getElementById('studentName').focus();
                } else {
                    // لو حروف -> حطها في خانة الاسم وخلي المؤشر على خانة الهاتف
                    document.getElementById('studentName').value = val;
                    document.getElementById('studentPhone').focus();
                }
            }, 50);
            
            // تفريغ صندوق البحث بعد التأكيد
            inputEl.value = ""; 
        });
    }
};

// 🔊 تعريف ملفات الصوت (يجب وضع الملفين في فولدر المشروع)
const successSound = new Audio('success.mp3');
const errorSound = new Audio('error.mp3');
// تقليل مستوى الصوت شوية عشان ميكونش مزعج
successSound.volume = 0.7; 
errorSound.volume = 0.8;

// ==========================================
// 🔔 نظام الإشعارات (متضمن اللون الموف للتكرار)
// ==========================================
window.showToast = function(message, type = 'success') {
    if (!document.getElementById("premium-toast-styles")) {
        const style = document.createElement("style");
        style.id = "premium-toast-styles";
        style.innerHTML = `
            #premium-toast-container { position: fixed; top: 30px; left: 30px; z-index: 999999; display: flex; flex-direction: column; gap: 15px; pointer-events: none; }
            .premium-toast { min-width: 320px; max-width: 420px; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(10px); border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden; animation: slideInLeftToast 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; border: 1px solid rgba(255,255,255,0.5); }
            .premium-toast-content { display: flex; align-items: center; padding: 18px 24px; gap: 18px; direction: rtl; }
            .toast-icon { font-size: 28px; display: flex; align-items: center; justify-content: center; animation: popIcon 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.1s; opacity: 0; transform: scale(0.5); }
            .toast-text { color: #1e293b; font-family: 'Cairo', sans-serif; font-size: 15px; font-weight: 800; line-height: 1.5; flex: 1; text-align: right; text-shadow: 0 1px 1px rgba(255,255,255,0.8); }
            .toast-progress-bg { width: 100%; height: 5px; background: rgba(0,0,0,0.05); }
            .toast-progress-bar { height: 100%; width: 100%; animation: shrinkProgress 4s linear forwards; border-radius: 0 5px 5px 0; }
            
            /* ألوان الحالات (Themes) */
            .toast-success .toast-progress-bar { background: linear-gradient(90deg, #10b981, #34d399); }
            .toast-success { border-right: 6px solid #10b981; }
            
            .toast-error .toast-progress-bar { background: linear-gradient(90deg, #ef4444, #f87171); }
            .toast-error { border-right: 6px solid #ef4444; }
            
            .toast-warning .toast-progress-bar { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
            .toast-warning { border-right: 6px solid #f59e0b; background: linear-gradient(to left, rgba(254, 252, 232, 0.95), rgba(255,255,255,0.95)); }
            
            .toast-info .toast-progress-bar { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
            .toast-info { border-right: 6px solid #3b82f6; background: linear-gradient(to left, rgba(239, 246, 255, 0.95), rgba(255,255,255,0.95)); }

            /* ✨ التعديل الجديد: لون موف للطالب المسجل بالفعل */
            .toast-duplicate .toast-progress-bar { background: linear-gradient(90deg, #8b5cf6, #a855f7); }
            .toast-duplicate { border-right: 6px solid #8b5cf6; background: linear-gradient(to left, rgba(243, 232, 255, 0.95), rgba(255,255,255,0.95)); }
            
            @keyframes slideInLeftToast { 0% { opacity: 0; transform: translateX(-60px) scale(0.9); } 100% { opacity: 1; transform: translateX(0) scale(1); } }
            @keyframes slideOutLeftToast { 0% { opacity: 1; transform: translateX(0) scale(1); max-height: 100px; margin-bottom: 15px; } 100% { opacity: 0; transform: translateX(-60px) scale(0.9); max-height: 0; margin-bottom: 0; padding: 0; border: none; } }
            @keyframes shrinkProgress { from { width: 100%; } to { width: 0%; } }
            @keyframes popIcon { 0% { opacity: 0; transform: scale(0.5) rotate(-20deg); } 80% { transform: scale(1.2) rotate(10deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        `;
        document.head.appendChild(style);
    }

    try {
        if (typeof successSound !== 'undefined' && typeof errorSound !== 'undefined') {
            if (type === 'success' || type === 'info') { successSound.currentTime = 0; successSound.play().catch(e=>{}); }
            else { errorSound.currentTime = 0; errorSound.play().catch(e=>{}); }
        }
    } catch (e) {}

    let container = document.getElementById('premium-toast-container');
    if (!container) { 
        container = document.createElement('div'); 
        container.id = 'premium-toast-container'; 
        document.body.appendChild(container); 
    }

    // تحديد الأيقونة المناسبة
    let icon = '✨';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '🔔';
    if (type === 'info') icon = '💻';
    if (type === 'duplicate') icon = '🔁'; // أيقونة التكرار

    const toast = document.createElement('div'); 
    toast.className = `premium-toast toast-${type}`;
    
    toast.innerHTML = `
        <div class="premium-toast-content">
            <div class="toast-icon">${icon}</div>
            <div class="toast-text">${message}</div>
        </div>
        <div class="toast-progress-bg">
            <div class="toast-progress-bar"></div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => { 
        toast.style.animation = 'slideOutLeftToast 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'; 
        setTimeout(() => toast.remove(), 500); 
    }, 4000);
};

let confirmCallback = null;
function customConfirm(message, callback) {
    document.getElementById('confirmMessage').innerText = message; confirmCallback = callback;
    document.getElementById('customConfirmModal').style.display = 'block';
}
document.getElementById('confirmYesBtn')?.addEventListener('click', function() {
    if(confirmCallback) confirmCallback(); closeModal('customConfirmModal');
});

function openModal(modalId) { 
    document.getElementById(modalId).style.display = "block"; 
    if(modalId === 'addStudentModal') {
        document.getElementById('studentCode').value = generateStudentCode(); 
    }
    if(modalId === 'addSessionModal') { document.getElementById('sessionDate').valueAsDate = new Date(); toggleAutoInputs(); } 
    if(modalId === 'addExamModal') document.getElementById('examDate').valueAsDate = new Date(); 
    if(modalId === 'addHwModal') document.getElementById('hwDate').valueAsDate = new Date(); 
    if(modalId === 'settingsModal') {
        const tInput = document.getElementById('teacherNameInput');
        const cInput = document.getElementById('centerNameInput');
        if(tInput) tInput.value = localStorage.getItem('teacherName') || TEACHER_NAME;
        if(cInput) cInput.value = localStorage.getItem('centerName') || "القيصر";
    }
}
function closeModal(modalId) { document.getElementById(modalId).style.display = "none"; if(modalId === 'scannerModal') stopCameraScanner(); }

function populateDropdowns() {
    const selects = ["studentLevel", "editStudentLevel", "sessionLevelSelect", "examLevelSelect", "hwLevelSelect", "financeLevelSelect", "leaderboardLevel", "schedLevel"];
    selects.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
}

function isValidEgyptianPhone(phone) {
    // 1. تحويل القيمة لنص احتياطياً عشان لو جاية من الداتا كـ (Number) وإزالة المسافات
    let p = String(phone).trim();

    // 2. السماح برقم 0 (إنجليزي أو عربي) أو الخانة الفاضية كقيمة بديلة
    if (p === "0" || p === "٠" || p === "") return true; 
    
    // 3. التحقق من الأرقام المصرية المعتادة
    const regex = /^(010|011|012|015)\d{8}$/;
    return regex.test(p);
}

// ==========================================
// 3. تسجيل الدخول والتنقل
// ==========================================
const ADMIN_USER = "shefo", ADMIN_PASS = "12345"; 

// ==========================================
// 3. التحقق من الدخول عند تحميل الصفحة
// ==========================================
if (sessionStorage.getItem("isLoggedIn") === "true" || localStorage.getItem("keepLoggedIn") === "true") {
    sessionStorage.setItem("isLoggedIn", "true");
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-app").style.display = "flex";
    
    // 🔥 الحل السحري: لازم نأمر السيستم يسحب الداتا ويتأكد من الباقة أول ما الصفحة تفتح
    setTimeout(() => {
        if (typeof applyAssistantPermissions === "function") applyAssistantPermissions();
        if (typeof loadDataFromFirebase === "function") loadDataFromFirebase();
    }, 100);
}
// دوال التنقل بين شاشة الدخول وشاشة التفعيل
function showActivationScreen() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("activation-screen").style.display = "flex";
}
function showLoginScreen() {
    document.getElementById("activation-screen").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
}
// تحديث زرار تسجيل الخروج لمسح "تذكرني" وحالة الديمو
window.logout = function() { 
    sessionStorage.removeItem("isLoggedIn"); 
    localStorage.setItem("keepLoggedIn", "false");
    localStorage.removeItem("is_demo_mode"); // 🛑 مهم عشان لو اشترى كود حقيقي يعرف يسجل
    location.reload(); 
};


function switchPage(pageId) {
    document.querySelectorAll(".view-section").forEach(el => el.style.display = "none");
    document.querySelectorAll(".nav-links li").forEach(el => el.classList.remove("active"));
    document.getElementById(pageId + "-view").style.display = "block";
    document.getElementById("nav-" + pageId).classList.add("active");

    // تظبيط الترحيب عشان ميقولش "مستر يا مدير" 😂
    let tName = localStorage.getItem("teacherName");
    let greeting = (tName && tName !== "null" && tName.trim() !== "") ? `أهلاً بك مستر ${tName} 👋` : "أهلاً بك يا مدير 👋";

    const titles = {
        "dashboard": [greeting, "الرسوم البيانية ونظرة عامة"],
        "schedule": ["الجدول الأسبوعي 📅", "ترتيب مواعيد حصصك على مدار الأسبوع"],
        "groups": ["إدارة المجموعات 📚", "إضافة، تعديل، وإدارة المجموعات"],
        "students": ["إدارة الطلاب 🎓", "سجل الطلاب الشامل والملفات"],
        "attendance": ["سجل الحضور 📋", "تسجيل غياب الطلاب"],
        "exams": ["الامتحانات 📝", "رصد درجات الامتحانات"],
        "homework": ["الواجبات 📝", "تقييم الواجبات"],
        "finance": ["الماليات (حساب الحصة) 💰", "الإيرادات والمصروفات وصافي الربح لكل حصة"],
        "leaderboard": ["لوحة الشرف 🏆", "أفضل 5 طلاب في المجموعات"],
        "backup": ["لوحة التحكم والصيانة الشاملة ⚙️", "تنظيف وقفل البيانات، ضبط المصنع، وإدارة الملفات الاحتياطية"],
        "atrisk": ["تحت الملاحظة 🚨", "الطلاب المعرضين للخطر (تأخر دراسي)"],
        "books": ["إدارة الكتب 📘", "حسابات الكتب والسناتر ونسب المبيعات"],
        "broadcast": ["الإرسال الجماعي 📢", "إرسال تنبيهات لكل الطلاب بضغطة زر"],
    "platform": ["إدارة المنصة 💻", "تحكم في المحتوى الرقمي، المحفظة، والامتحانات الإلكترونية"], // <--- الفاصلة دي مهمة جداً
    "bot": ["المساعد الذكي 🤖", "تحكم في الذكاء الاصطناعي الخاص بالرد التلقائي"]
    };
    
    if(titles[pageId]) { 
        document.getElementById("page-title").innerText = titles[pageId][0]; 
        document.getElementById("page-desc").innerText = titles[pageId][1]; 
    }

    if (pageId === "dashboard") { renderDashboardCharts(); }
    if (pageId === "schedule") { renderSchedule(); }
    if (pageId === "students") { document.getElementById("students-overview").style.display = "block"; document.getElementById("student-profile-view").style.display = "none"; renderTable(); }
    if (pageId === "groups") { document.getElementById("groups-overview").style.display = "block"; document.getElementById("group-details-view").style.display = "none"; renderGroupCards(); }
    if (pageId === "attendance") { document.getElementById("sessions-overview").style.display = "block"; document.getElementById("session-details-view").style.display = "none"; renderSessionCards(); populateDropdowns(); }
    if (pageId === "exams") { document.getElementById("exams-overview").style.display = "block"; document.getElementById("exam-details-view").style.display = "none"; renderExamCards(); populateDropdowns(); }
    if (pageId === "homework") { document.getElementById("hw-overview").style.display = "block"; document.getElementById("hw-details-view").style.display = "none"; renderHwCards(); populateDropdowns(); }
    if (pageId === "finance") { populateDropdowns(); renderFinanceTable(); }
    if (pageId === "leaderboard") { populateDropdowns(); }
    if (pageId === "atrisk") { renderAtRiskStudents(); }
    if (pageId === "books") { renderBooksTable(); }
    if (pageId === "bot") {
        document.getElementById('settingBotEnabled').checked = localStorage.getItem('botEnabled') === 'true';
        document.getElementById('settingBotName').value = localStorage.getItem('botName') || 'أوكتو';
        document.getElementById('settingBotInstructions').value = localStorage.getItem('botInstructions') || '';
    }
    if (pageId === "broadcast") { 
        const select = document.getElementById('broadcastTarget');
        if(select) {
            select.innerHTML = "<option value='all'>كل الطلاب</option>";
            groups.forEach(g => { select.innerHTML += `<option value="${g.name}">مجموعة: ${g.name}</option>`; });
            if(typeof updateBroadcastCount === "function") updateBroadcastCount();
        }
    }
}

// السمة (Theme)
const currentTheme = localStorage.getItem("theme") || "dark"; const themeBtn = document.getElementById("theme-btn");
if (currentTheme === "light") { document.documentElement.setAttribute("data-theme", "light"); themeBtn.innerText = "☀️ الوضع الفاتح"; }
function toggleTheme() {
    const root = document.documentElement;
    if (root.getAttribute("data-theme") === "light") { root.removeAttribute("data-theme"); localStorage.setItem("theme", "dark"); themeBtn.innerText = "☀️ الوضع الفاتح"; } 
    else { root.setAttribute("data-theme", "light"); localStorage.setItem("theme", "light"); themeBtn.innerText = "🌙 الوضع الداكن"; }
    renderDashboardCharts(); 
}




// ==========================================
// 12. نظام التفعيل وفصل البيانات (Multi-Tenancy) والمزامنة
// ==========================================
let isFirebaseLoaded = false;
let licenseKey = "AlQaisar_System"; // 🔒 تثبيت إجباري للسينيور

// الدالة دي بتولد مسار الداتابيز المخصوص للمدرس
function getFirebaseUrl() {
    return `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/AlQaisar_System/data.json`;
}

// ==========================================
// 🧠 نظام الدخول الموحد + صلاحيات المساعدين (RBAC)
// ==========================================

// تعبئة كود السنتر تلقائياً لو متسجل
window.addEventListener('DOMContentLoaded', () => {
    let savedKey = localStorage.getItem("licenseKey");
    if(savedKey && document.getElementById("loginCenterCode")) {
        document.getElementById("loginCenterCode").value = savedKey;
    }
});

let loginForm = document.getElementById("loginForm");
if(loginForm) {
    let newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
    
    newLoginForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        // 🔒 تثبيت كود السنتر في الخلفية لنسخة السينيور
let code = "AlQaisar_System";
        
        let user = document.getElementById("loginUsername").value.trim();
        let pass = document.getElementById("loginPassword").value.trim();
        let errorMsg = document.getElementById("loginError");
        let rememberMe = document.getElementById("rememberMeCheck")?.checked;

        let btn = this.querySelector('button[type="submit"]');
        let originalText = btn.innerText; 
        btn.innerText = "جاري التحقق... ⏳"; 
        errorMsg.style.display = "none";

        try {
            // 👑 فحص المدير
            let settingsRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${code}/data/settings.json`);
            let settings = await settingsRes.json();
            
            // 🔒 التعديل هنا: لو الداتابيز فاضية، هيدخلك باليوزر الافتراضي (admin) والباسورد (12345)
            if ((settings && settings.adminUser === user && settings.adminPass === pass) || (!settings && user === "admin" && pass === "12345")) {
                localStorage.setItem("licenseKey", code); 
                localStorage.setItem("adminUser", user);
                localStorage.setItem("adminPass", pass); 
                localStorage.setItem("isAssistantMode", "false");
                localStorage.setItem("keepLoggedIn", rememberMe ? "true" : "false");
                sessionStorage.setItem("isLoggedIn", "true"); 
                location.reload(); 
                return;
            }
            
            // 👥 فحص المساعد
            let asstRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${code}/assistants/${user}.json`);
            let asstData = await asstRes.json();
            
            if (asstData && asstData.password === pass) {
                localStorage.setItem("licenseKey", code);
                localStorage.setItem("isAssistantMode", "true"); 
                let perms = asstData.permissions || ['dashboard','schedule','students','groups','attendance','homework','exams','leaderboard'];
                localStorage.setItem("assistantPermissions", JSON.stringify(perms));
                localStorage.setItem("keepLoggedIn", "false"); 
                sessionStorage.setItem("isLoggedIn", "true");
                location.reload(); 
                return;
            }

            errorMsg.innerText = "بيانات الدخول غير صحيحة!"; 
            errorMsg.style.display = "block";
        } catch (err) { 
            errorMsg.innerText = "خطأ في الاتصال بالإنترنت!"; 
            errorMsg.style.display = "block"; 
        }
        btn.innerText = originalText;
    });
}

// ➕ إنشاء المساعد مع الصلاحيات
window.createAssistant = async function() {
    let uid = window.getSafeUid();
    let user = document.getElementById('newAsstUser').value.trim();
    let pass = document.getElementById('newAsstPass').value.trim();
    
    // سحب الصلاحيات اللي إنت علمت عليها
    let selectedPerms = Array.from(document.querySelectorAll('.perm-cb:checked')).map(cb => cb.value);

    if(!user || !pass) {
        if(typeof showToast === "function") showToast("أدخل اليوزر والباسورد!", "error"); return;
    }

    let btn = document.querySelector('.admin-panel-card button[onclick="createAssistant()"]');
    let orig = btn.innerText; btn.innerText = "جاري... ⏳";

    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/assistants/${user}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass, permissions: selectedPerms, createdAt: new Date().toISOString() })
        });
        if(typeof showToast === "function") showToast("تم إضافة المساعد بصلاحياته المحددة! 👥");
        
        document.getElementById('newAsstUser').value = ""; document.getElementById('newAsstPass').value = "";
        
        // إرجاع الصلاحيات للوضع الافتراضي
        document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = ['dashboard','schedule','students','groups','attendance','homework','exams','leaderboard'].includes(cb.value));
        renderAssistants();
    } catch(e) { alert("حدث خطأ أثناء الحفظ!"); }
    btn.innerText = orig;
};

// 📋 عرض المساعدين في الجدول
// 📋 عرض المساعدين في الجدول (محدثة بزرار الصلاحيات)
window.renderAssistants = async function() {
    let tbody = document.getElementById("assistants-list-body");
    if(!tbody) return;
    
    let disp = document.getElementById("displayMyCenterCode");
    if(disp) disp.innerText = window.getSafeUid() || "غير متوفر";

    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">جاري التحميل...</td></tr>`;
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/assistants.json`);
        let data = await res.json() || {};
        
        tbody.innerHTML = "";
        let keys = Object.keys(data);
        if(keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">لا يوجد مساعدين مسجلين.</td></tr>`;
            return;
        }

        keys.forEach(user => {
            tbody.innerHTML += `<tr>
                <td style="font-weight:bold; color:var(--primary-color);">${user}</td>
                <td style="font-weight:bold; letter-spacing: 2px;">${data[user].password}</td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="icon-btn" style="background-color: #f59e0b; color: white; border: none;" onclick="openEditPermissionsModal('${user}')">الصلاحيات ⚙️</button>
                        <button class="icon-btn danger" onclick="deleteAssistant('${user}')">حذف 🗑️</button>
                    </div>
                </td>
            </tr>`;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color:red;">خطأ بالاتصال</td></tr>`; }
};

// ⚙️ فتح نافذة تعديل الصلاحيات للمساعد
window.openEditPermissionsModal = async function(user) {
    document.getElementById("editPermAsstUser").value = user;
    
    try {
        // جلب صلاحيات المساعد الحالية من السيرفر
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/assistants/${user}.json`);
        let data = await res.json();
        let perms = data.permissions || ['dashboard','schedule','students','groups','attendance','homework','exams','leaderboard']; 

        // تحديد الخانات الحالية
        document.querySelectorAll('.edit-perm-cb').forEach(cb => {
            cb.checked = perms.includes(cb.value);
        });

        openModal('editAssistantPermissionsModal');
    } catch(e) {
        alert("حدث خطأ في جلب الصلاحيات!");
    }
};

// 💾 حفظ التعديلات في الصلاحيات
window.saveEditedPermissions = async function() {
    let user = document.getElementById("editPermAsstUser").value;
    let selectedPerms = Array.from(document.querySelectorAll('.edit-perm-cb:checked')).map(cb => cb.value);
    
    let btn = document.getElementById('saveEditPermBtn');
    let orig = btn.innerText; btn.innerText = "جاري الحفظ... ⏳";
    
    try {
        // تحديث الصلاحيات فقط في الفايربيز (بدون مسح الباسورد)
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/assistants/${user}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions: selectedPerms })
        });
        
        if(typeof showToast === "function") showToast("تم تحديث الصلاحيات بنجاح! ✅");
        closeModal('editAssistantPermissionsModal');
    } catch(e) {
        alert("حدث خطأ أثناء الحفظ!");
    }
    btn.innerText = orig;
};

// 🗑️ حذف المساعد
window.deleteAssistant = async function(user) {
    if(!confirm(`هل تريد حذف المساعد: ${user} نهائياً؟`)) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/assistants/${user}.json`, { method: 'DELETE' });
        renderAssistants();
    } catch(e) {}
};


// 🛡️ تطبيق الصلاحيات (إخفاء الشاشات اللي ملوش صلاحية عليها)
window.applyAssistantPermissions = function() {
    if (localStorage.getItem("isAssistantMode") === "true") {
        let perms = JSON.parse(localStorage.getItem("assistantPermissions")) || [];
        
        // إخفاء الروابط من القائمة الجانبية
        document.querySelectorAll('.sidebar .nav-links li[id^="nav-"]').forEach(li => {
            let pageName = li.id.replace('nav-', '');
            // الصفحات دي محظورة إجبارياً للمساعدين
            if (['logs', 'backup', 'settings', 'affiliate'].includes(pageName)) {
                li.style.display = 'none'; return;
            }
            // إخفاء الصفحة لو مش في الصلاحيات
            if (!perms.includes(pageName)) { li.style.display = 'none'; }
        });
        
        // إخفاء العناوين المنسدلة (لو كل اللي تحتها مخفي)
        document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
            let visibleLinks = dropdown.querySelectorAll('.dropdown-menu li:not([style*="display: none"])');
            if (visibleLinks.length === 0) dropdown.style.display = 'none';
        });
    }
};

// حماية دالة الانتقال عشان لو حاول يفتح صفحة مش بتاعته
const oldSwitchPageForPerms = window.switchPage;
window.switchPage = function(pageId) {
    if (localStorage.getItem("isAssistantMode") === "true") {
        let perms = JSON.parse(localStorage.getItem("assistantPermissions")) || [];
        let restrictedPages = ['dashboard', 'schedule', 'students', 'groups', 'attendance', 'homework', 'exams', 'platform', 'books', 'reports', 'leaderboard', 'atrisk', 'broadcast', 'finance'];
        
        if (restrictedPages.includes(pageId) && !perms.includes(pageId)) {
            if(typeof showToast === "function") showToast("عفواً، ليس لديك صلاحية لهذه الصفحة 🚫", "error");
            return;
        }
    }
    if (oldSwitchPageForPerms) oldSwitchPageForPerms(pageId);
};

// جلب المساعدين عند الدخول للوحة الإدارة
const oldSwitchPageForAsst = window.switchPage;
window.switchPage = function(pageId) {
    oldSwitchPageForPerms(pageId); // تشغيل الحماية أولاً
    if (pageId === "backup" && typeof renderAssistants === "function") renderAssistants();
};

// 2. دالة تفعيل البرنامج وتثبيت العلامة التجارية
async function activateSoftware() {
    const elements = {
        key: document.getElementById("licenseKeyInput").value.trim(),
        tName: document.getElementById("actTeacherName").value.trim(),
        cName: document.getElementById("actCenterName").value.trim(),
        newUser: document.getElementById("newAdminUser").value.trim(),
        newPass: document.getElementById("newAdminPass").value.trim(),
        newPin: document.getElementById("newAdminPin").value.trim()
    };

    if (Object.values(elements).some(val => val === "")) {
        const err = document.getElementById("activationError");
        err.style.display = "block"; err.innerText = "يرجى ملء جميع الخانات لتأمين حسابك!";
        return;
    }
    
    try {
        let licRes = await fetch(`https://edutrack-system-1ded4-default-rtdb.firebaseio.com/licenses/${elements.key}.json`);
        let licData = await licRes.json();
        
        if (!licData || licData.status === 'suspended') {
            document.getElementById("activationError").style.display = "block";
            document.getElementById("activationError").innerText = "الكود غير صحيح أو موقوف!";
            return;
        }

        // حفظ البيانات محلياً
        localStorage.setItem("licenseKey", elements.key);
        localStorage.setItem("teacherName", elements.tName);
        localStorage.setItem("centerName", elements.cName);
        localStorage.setItem("adminUser", elements.newUser);
        localStorage.setItem("adminPass", elements.newPass);
        localStorage.setItem("adminPin", elements.newPin);
        localStorage.setItem("teacherPhones", elements.phoneNumbers);
        
        licenseKey = elements.key; adminPin = elements.newPin;

        // رفع إعدادات الأمان للهوية المحفورة (Branding & Security Lock)
        const initialSettings = { 
            settings: { 
                teacherName: elements.tName, 
                centerName: elements.cName,
                adminUser: elements.newUser,
                adminPass: elements.newPass,
                adminPin: elements.newPin,
                phoneNumbers: elements.phoneNumbers
            } 
        };
        
        await fetch(getFirebaseUrl(), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialSettings)
        });

        // تحديث لوحة المدير العام
        await fetch(`https://edutrack-system-1ded4-default-rtdb.firebaseio.com/licenses/${elements.key}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claimedBy: elements.tName, activatedAt: new Date().toISOString() })
        });

        showToast("تم التفعيل وتأمين الحساب بنجاح!");
        document.getElementById("activation-screen").style.display = "none";
        document.getElementById("login-screen").style.display = "flex";
        loadDataFromFirebase();
    } catch (e) { showToast("عطل في الاتصال بالخادم", "error"); }
}

// =========================================================
// 🛡️ محرك المزامنة الذكي المزدوج (Smart Two-Way Sync Engine)
// يمنع ضياع الحضور الأوفلاين ويحمي تعديلات الأجهزة الأخرى الأونلاين
// =========================================================

window.isIncomingSync = false;
window.isSyncingNow = false;
window.hasPendingOfflineChanges = localStorage.getItem("hasPendingOfflineChanges") === "true";

const originalSetItem = localStorage.setItem;
const keysToSync = ["students", "classSessions", "exams", "homeworks", "schedule", "groups", "financeRecords", "expenses", "books", "monthlyPayments", "onlineExams"];

// 1️⃣ مراقبة أي تعديل محلي وتسجيل ختم زمني له (Timestamp)
localStorage.setItem = function(k, v) {
    originalSetItem.apply(this, arguments);

    if (keysToSync.includes(k) && !window.isIncomingSync) {
        // تسجيل أن هناك تعديلات محلية لم تُرفع بعد (مهم جداً لوضع الأوفلاين)
        originalSetItem.call(localStorage, "hasPendingOfflineChanges", "true");
        originalSetItem.call(localStorage, "lastLocalEditTime", Date.now().toString());
        window.hasPendingOfflineChanges = true;

        updateNetworkBadgeUI(navigator.onLine ? "syncing" : "offline");

        clearTimeout(window.syncTimeoutTimer);
        window.syncTimeoutTimer = setTimeout(() => {
            if (navigator.onLine) {
                window.smartTwoWaySync();
            } else {
                updateNetworkBadgeUI("offline");
            }
        }, 2500);
    }
};

// 2️⃣ تحديث شكل مؤشر الإنترنت في القائمة الجانبية
function updateNetworkBadgeUI(state) {
    const dot = document.getElementById("network-status-dot");
    const txt = document.getElementById("network-status-text");
    const badge = document.getElementById("network-status-badge");
    if (!dot || !txt || !badge) return;

    if (state === "online") {
        dot.style.background = "#10b981";
        dot.style.boxShadow = "0 0 6px #10b981";
        txt.innerText = "متصل ومزامن ✅";
        badge.style.color = "#10b981";
        badge.style.background = "rgba(16, 185, 129, 0.1)";
    } else if (state === "syncing") {
        dot.style.background = "#f59e0b";
        dot.style.boxShadow = "0 0 6px #f59e0b";
        txt.innerText = "جاري دمج وحفظ البيانات... ⏳";
        badge.style.color = "#f59e0b";
        badge.style.background = "rgba(245, 158, 11, 0.1)";
    } else {
        dot.style.background = "#ef4444";
        dot.style.boxShadow = "0 0 6px #ef4444";
        txt.innerText = "أوفلاين (محفوظ بالجهاز) 🔒";
        badge.style.color = "#ef4444";
        badge.style.background = "rgba(239, 68, 68, 0.1)";
    }
}

// 3️⃣ خوارزمية الدمج الذكي (تدمج الداتا المحلية مع السحابية بدون مسح أي طرف)
function mergeLocalAndCloudData(cloudData) {
    cloudData = cloudData || {};

    // أ. دمج الحصص وسجل الحضور (الأولوية القصوى لعدم ضياع أي تحضير)
    const cloudSessions = Array.isArray(cloudData.classSessions) ? cloudData.classSessions : Object.values(cloudData.classSessions || {}).filter(Boolean);
    const localSessions = Array.isArray(classSessions) ? classSessions : [];
    const sessionMap = new Map();

    // وضع حصص السحابة أولاً
    cloudSessions.forEach(cs => {
        if (cs && cs.id) sessionMap.set(String(cs.id), JSON.parse(JSON.stringify(cs)));
    });

    // دمج حصص الجهاز المحلي فوقها بذكاء
    localSessions.forEach(ls => {
        if (!ls || !ls.id) return;
        const idStr = String(ls.id);
        if (!sessionMap.has(idStr)) {
            // حصة تم إنشاؤها في الأوفلاين -> نحتفظ بها كاملة
            sessionMap.set(idStr, ls);
        } else {
            const cs = sessionMap.get(idStr);
            
            // 🔥 دمج كشف الحضور طالب بطالب
            const mergedAtt = { ...(cs.attendance || {}) };
            const localAtt = ls.attendance || {};

            Object.keys(localAtt).forEach(stCode => {
                const localVal = localAtt[stCode];
                const cloudVal = mergedAtt[stCode];

                // إذا كان الطالب محضراً محلياً (حاضر / متأخر / تعويض) وكان في السحابة غير مسجل أو غائب، نأخذ الحضور المحلي!
                if (!cloudVal || cloudVal === 'absent' || cloudVal === 'none') {
                    mergedAtt[stCode] = localVal;
                } else {
                    // لو متسجل في الاتنين، نأخذ التعديل الأحدث بناءً على وقت التسجيل
                    const localTs = ls.attendanceLog?.[stCode]?.ts || 0;
                    const cloudTs = cs.attendanceLog?.[stCode]?.ts || 0;
                    if (localTs >= cloudTs) {
                        mergedAtt[stCode] = localVal;
                    }
                }
            });

            // دمج سجل أوقات الحضور (Attendance Log)
            const mergedLog = { ...(cs.attendanceLog || {}), ...(ls.attendanceLog || {}) };
            // دمج تقارير الواتساب
            const mergedReport = ls.reportData || cs.reportData || null;

            sessionMap.set(idStr, {
                ...cs,
                ...ls,
                status: (ls.status === 'closed' || cs.status === 'closed') ? 'closed' : 'open',
                attendance: mergedAtt,
                attendanceLog: mergedLog,
                reportData: mergedReport
            });
        }
    });
    classSessions = Array.from(sessionMap.values());

    // ب. دمج الطلاب (حماية الطلاب الجدد في الأونلاين والأوفلاين + الحفاظ على الرصيد والنقاط)
    const cloudStudents = Array.isArray(cloudData.students) ? cloudData.students : Object.values(cloudData.students || {}).filter(Boolean);
    const localStudents = Array.isArray(students) ? students : [];
    const studentMap = new Map();

    cloudStudents.forEach(cst => {
        if (cst && cst.code) studentMap.set(String(cst.code).trim(), cst);
    });

    localStudents.forEach(lst => {
        if (!lst || !lst.code) return;
        const codeKey = String(lst.code).trim();
        if (!studentMap.has(codeKey)) {
            // طالب أضيف في الأوفلاين
            studentMap.set(codeKey, lst);
        } else {
            const cst = studentMap.get(codeKey);
            // إذا كان هناك تعديل محلي معلق، ندمج مع الحفاظ على محفظة ونقاط وكورسات الطالب من السحابة
            const base = window.hasPendingOfflineChanges ? { ...cst, ...lst } : { ...lst, ...cst };
            base.walletBalance = Math.max(parseFloat(cst.walletBalance) || 0, parseFloat(lst.walletBalance) || 0);
            base.behaviorPoints = Math.max(parseFloat(cst.behaviorPoints) || 0, parseFloat(lst.behaviorPoints) || 0);
            
            const cCourses = Array.isArray(cst.purchasedCourses) ? cst.purchasedCourses : Object.values(cst.purchasedCourses || {});
            const lCourses = Array.isArray(lst.purchasedCourses) ? lst.purchasedCourses : Object.values(lst.purchasedCourses || {});
            base.purchasedCourses = [...new Set([...cCourses, ...lCourses])];

            studentMap.set(codeKey, base);
        }
    });
    students = Array.from(studentMap.values());

    // ج. دمج المجموعات
    const cloudGroups = Array.isArray(cloudData.groups) ? cloudData.groups : Object.values(cloudData.groups || {}).filter(Boolean);
    const groupMap = new Map();
    cloudGroups.forEach(g => { if (g && g.name) groupMap.set(g.name, g); });
    (groups || []).forEach(g => { if (g && g.name) groupMap.set(g.name, window.hasPendingOfflineChanges ? g : (groupMap.get(g.name) || g)); });
    groups = Array.from(groupMap.values());

    // د. دمج الامتحانات الورقية ودرجاتها
    const cloudExams = Array.isArray(cloudData.exams) ? cloudData.exams : Object.values(cloudData.exams || {}).filter(Boolean);
    const examMap = new Map();
    cloudExams.forEach(ex => { if (ex && ex.id) examMap.set(String(ex.id), ex); });
    (exams || []).forEach(lex => {
        if (!lex || !lex.id) return;
        const idStr = String(lex.id);
        if (!examMap.has(idStr)) examMap.set(idStr, lex);
        else {
            const cex = examMap.get(idStr);
            examMap.set(idStr, { ...cex, ...lex, grades: { ...(cex.grades || {}), ...(lex.grades || {}) } });
        }
    });
    exams = Array.from(examMap.values());

    // هـ. دمج الواجبات ودرجاتها
    const cloudHw = Array.isArray(cloudData.homeworks) ? cloudData.homeworks : Object.values(cloudData.homeworks || {}).filter(Boolean);
    const hwMap = new Map();
    cloudHw.forEach(hw => { if (hw && hw.id) hwMap.set(String(hw.id), hw); });
    (homeworks || []).forEach(lhw => {
        if (!lhw || !lhw.id) return;
        const idStr = String(lhw.id);
        if (!hwMap.has(idStr)) hwMap.set(idStr, lhw);
        else {
            const chw = hwMap.get(idStr);
            hwMap.set(idStr, { ...chw, ...lhw, grades: { ...(chw.grades || {}), ...(lhw.grades || {}) } });
        }
    });
    homeworks = Array.from(hwMap.values());

    // و. دمج الخزنة والماليات والاشتراكات الشهرية (حصة بحصة وطالب بطالب)
    const cloudFin = cloudData.financeRecords || {};
    const mergedFin = { ...cloudFin };
    Object.keys(financeRecords || {}).forEach(sessKey => {
        mergedFin[sessKey] = { ...(cloudFin[sessKey] || {}), ...(financeRecords[sessKey] || {}) };
    });
    financeRecords = mergedFin;

    const cloudMonthly = cloudData.monthlyPayments || {};
    const localMonthly = window.monthlyPayments || {};
    const mergedMonthly = { ...cloudMonthly };
    Object.keys(localMonthly).forEach(stCode => {
        mergedMonthly[stCode] = { ...(cloudMonthly[stCode] || {}), ...(localMonthly[stCode] || {}) };
    });
    window.monthlyPayments = mergedMonthly;

    // ز. دمج المصروفات والكتب والجدول والامتحانات الأونلاين
    const mergeById = (cloudArr, localArr) => {
        const map = new Map();
        (Array.isArray(cloudArr) ? cloudArr : Object.values(cloudArr || {}).filter(Boolean)).forEach(i => { if (i && i.id) map.set(String(i.id), i); });
        (Array.isArray(localArr) ? localArr : []).forEach(i => { if (i && i.id) map.set(String(i.id), window.hasPendingOfflineChanges ? i : (map.get(String(i.id)) || i)); });
        return Array.from(map.values());
    };

    expenses = mergeById(cloudData.expenses, expenses);
    books = mergeById(cloudData.books, books);
    schedule = mergeById(cloudData.schedule, schedule);
    if (cloudData.onlineExams) {
        window.fetchedOnlineExams = mergeById(cloudData.onlineExams, window.fetchedOnlineExams);
    }

    // حفظ النسخة المدمجة محلياً بدون إطلاق حدث المزامنة مرة أخرى
    window.isIncomingSync = true;
    originalSetItem.call(localStorage, "students", JSON.stringify(students));
    originalSetItem.call(localStorage, "classSessions", JSON.stringify(classSessions));
    originalSetItem.call(localStorage, "groups", JSON.stringify(groups));
    originalSetItem.call(localStorage, "exams", JSON.stringify(exams));
    originalSetItem.call(localStorage, "homeworks", JSON.stringify(homeworks));
    originalSetItem.call(localStorage, "financeRecords", JSON.stringify(financeRecords));
    originalSetItem.call(localStorage, "monthlyPayments", JSON.stringify(window.monthlyPayments));
    originalSetItem.call(localStorage, "expenses", JSON.stringify(expenses));
    originalSetItem.call(localStorage, "books", JSON.stringify(books));
    originalSetItem.call(localStorage, "schedule", JSON.stringify(schedule));
    if (window.fetchedOnlineExams) originalSetItem.call(localStorage, "onlineExams", JSON.stringify(window.fetchedOnlineExams));
    window.isIncomingSync = false;
}

// 4️⃣ الدالة الموحدة الآمنة (تسحب دائماً، ولا ترفع إلا عند وجود تعديل حقيقي)
window.smartTwoWaySync = async function(forcePush = false) {
    if (window.isSyncingNow || !navigator.onLine) {
        if (!navigator.onLine) updateNetworkBadgeUI("offline");
        return;
    }

    window.isSyncingNow = true;
    updateNetworkBadgeUI("syncing");

    try {
        const uid = getSafeUid();
        // خطوة 1: سحب أحدث نسخة من مسار المدرس في السحابة
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/data.json`);
        let cloudData = await res.json();

        // 🔄 حماية ذكية: لو مسار AlQaisar_System كان فارغاً بينما الداتا موجودة في الجذر القديم (/data)
        if (!cloudData && uid === "AlQaisar_System") {
            let rootRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/data.json`);
            cloudData = await rootRes.json();
        }
        cloudData = cloudData || {};

        const hadLocalEdits = window.hasPendingOfflineChanges || forcePush;

        // خطوة 2: دمج بيانات السحابة مع بيانات الجهاز المحلي
        mergeLocalAndCloudData(cloudData);

        // خطوة 3: لا ترفع للسحابة إلا إذا كان هناك تعديل محلي فعلي (يمنع المتصفح الفارغ من الكتابة بدون داعي)
        if (hadLocalEdits && (students.length > 0 || groups.length > 0)) {
            const payload = {
                students: students,
                classSessions: classSessions,
                exams: exams,
                homeworks: homeworks,
                groups: groups,
                financeRecords: financeRecords,
                expenses: expenses,
                books: books,
                schedule: schedule,
                monthlyPayments: window.monthlyPayments || {},
                onlineExams: window.fetchedOnlineExams || cloudData.onlineExams || []
            };

            const pushRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/data.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!pushRes.ok) throw new Error("Push failed");
        }

        window.hasPendingOfflineChanges = false;
        originalSetItem.call(localStorage, "hasPendingOfflineChanges", "false");
        updateNetworkBadgeUI("online");
        refreshVisibleViewsAfterSync();

    } catch (err) {
        console.warn("Offline or Sync Error:", err);
        updateNetworkBadgeUI("offline");
    } finally {
        window.isSyncingNow = false;
    }
};

// ربط الدوال القديمة بالمحرك الجديد لضمان توافق كل أزرار السيستم
window.syncDataToBot = window.smartTwoWaySync;
window.loadDataFromFirebase = window.smartTwoWaySync;

// تحديث الشاشات المفتوحة بعد الدمج بهدوء
function refreshVisibleViewsAfterSync() {
    if (document.getElementById("dashboard-view")?.style.display === "block" && typeof renderDashboardCharts === "function") renderDashboardCharts();
    if (document.getElementById("students-overview")?.style.display === "block" && typeof renderTable === "function") renderTable();
    if (document.getElementById("groups-overview")?.style.display === "block" && typeof renderGroupCards === "function") renderGroupCards();
    if (document.getElementById("sessions-overview")?.style.display === "block" && typeof renderSessionCards === "function") renderSessionCards();
    
    // تحديث جدول الحصة المفتوحة حالياً أثناء الرصد دون فقدان التركيز من خانة الباركود
    if (document.getElementById("session-details-view")?.style.display === "block" && currentActiveSessionId) {
        const activeSess = classSessions.find(s => String(s.id) === String(currentActiveSessionId));
        if (activeSess && typeof renderAttendanceTable === "function") {
            renderAttendanceTable(activeSess);
        }
    }
}

// 5️⃣ الاستماع الفوري لعودة الإنترنت أو انقطاعه
window.addEventListener('online', () => {
    if (typeof showToast === 'function') showToast("🌐 عاد الاتصال بالإنترنت! جاري دمج وحفظ الحضور...", "info");
    window.smartTwoWaySync();
});

window.addEventListener('offline', () => {
    updateNetworkBadgeUI("offline");
    if (typeof showToast === 'function') showToast("🔒 انقطع الإنترنت! يمكنك استكمال الرصد وسيتم الحفظ على الجهاز.", "warning");
});

// ==========================================
// 5. إدارة الجدول الأسبوعي (النسخة المرنة الديناميكية)
// ==========================================
function renderSchedule() {
    const grid = document.getElementById("schedule-grid"); 
    if(!grid) return;
    grid.innerHTML = ""; 
    
    const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    
    // 1. استخراج كل الأوقات الفريدة من المواعيد المسجلة وترتيبها زمنياً
    let uniqueTimes = [...new Set(schedule.map(s => s.time))].sort();

    // 2. لو الجدول فاضي خالص، هنعرض أوقات افتراضية عشان شكل الجدول ميبقاش بايظ
    if (uniqueTimes.length === 0) {
        uniqueTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
    }

    // 3. بناء رأس الجدول (الأعمدة) بناءً على الأوقات الفعلية
    let html = `<div class="schedule-table-container"><table class="timetable"><thead><tr><th>اليوم / الساعة</th>`;
    uniqueTimes.forEach(timeStr => {
        html += `<th>${formatTime12(timeStr)}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // 4. بناء صفوف الأيام وتوزيع الحصص في أعمدتها الدقيقة
    days.forEach(day => {
        html += `<tr><td class="day-head">${day}</td>`;
        uniqueTimes.forEach(timeStr => {
            // فلترة دقيقة: لازم اليوم والساعة والدقيقة يتطابقوا بالمللي
            const items = schedule.filter(s => s.day === day && s.time === timeStr);
            html += `<td>`;
            items.forEach(item => {
                const idx = schedule.findIndex(x => x.id === item.id);
                // ✏️ كارت الحصة متضمن زرار التعديل
                html += `
                    <div class="slot-card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="slot-time">⏰ ${formatTime12(item.time)}</span>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span class="edit-btn admin-only" onclick="openEditSlotModal(${idx})" style="cursor:pointer; font-size: 14px;">✏️</span>
                                <span class="del-btn admin-only" onclick="deleteScheduleItem(${item.id})" style="cursor:pointer; font-size: 16px; color: var(--danger-color);">&times;</span>
                            </div>
                        </div>
                        <div class="slot-group">👥 ${item.group}</div>
                        <div class="slot-location">📍 ${item.location || "غير محدد"}</div>
                    </div>`;
            });
            html += `</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    grid.innerHTML = html;
}

// إضافة موعد جديد
document.getElementById("addScheduleForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    schedule.push({
        id: Date.now(),
        day: document.getElementById("schedDay").value,
        time: document.getElementById("schedTime").value,
        group: document.getElementById("schedGroup").value,
        location: document.getElementById("schedLocation")?.value || document.getElementById("schedSubject")?.value || "السنتر"
    });
    localStorage.setItem("schedule", JSON.stringify(schedule));
    closeModal('addScheduleModal'); 
    this.reset(); 
    renderSchedule(); 
    showToast("تم إضافة الموعد للجدول بنجاح");
});

function deleteScheduleItem(id) { 
    customConfirm("حذف هذا الموعد من الجدول؟", () => { 
        schedule = schedule.filter(s => s.id !== id); 
        localStorage.setItem("schedule", JSON.stringify(schedule)); 
        renderSchedule(); 
    }); 
}

// ✏️ فتح نافذة التعديل للموعد
function openEditSlotModal(index) {
    const slot = schedule[index];
    if(!slot) return;
    document.getElementById('editSlotIndex').value = index;
    document.getElementById('editSlotDay').value = slot.day;
    document.getElementById('editSlotTime').value = slot.time;
    document.getElementById('editSlotGroup').value = slot.group;
    document.getElementById('editSlotLocation').value = slot.location || "";
    openModal('editSlotModal');
}

// ✏️ حفظ التعديلات في الموعد
function updateScheduleSlot() {
    const index = document.getElementById('editSlotIndex').value;
    if(index === "") return;
    
    schedule[index].day = document.getElementById('editSlotDay').value;
    schedule[index].time = document.getElementById('editSlotTime').value;
    schedule[index].group = document.getElementById('editSlotGroup').value;
    schedule[index].location = document.getElementById('editSlotLocation').value;
    
    localStorage.setItem("schedule", JSON.stringify(schedule));
    renderSchedule();
    closeModal('editSlotModal');
    showToast("تم تحديث الحصة بنجاح");
}


// ==========================================
// 6. إدارة الطلاب والمجموعات
// ==========================================
function filterGroupsByLevel(levelSelectId, groupSelectId) {
    const level = document.getElementById(levelSelectId).value;
    const groupSelect = document.getElementById(groupSelectId);
    if(!groupSelect) return;
    groupSelect.innerHTML = "<option value=''>اختر المجموعة...</option>";
    if(level) { groups.filter(g => g.level === level).forEach(g => { groupSelect.innerHTML += `<option value="${g.name}">${g.name}</option>`; }); }
}



// دالة توليد كود الطالب (تعتمد على آخر طالب مضاف)
window.generateStudentCode = function() {
    if (students.length === 0) return "1"; // لو السيستم فاضي

    // هنجيب آخر طالب تم حفظه
    let lastStudent = students[students.length - 1];
    let numStr = String(lastStudent.code).replace(/\D/g, ''); 
    let lastNum = parseInt(numStr, 10);

    // لو الكود الأخير رقم سليم، زود 1
    if (!isNaN(lastNum)) {
        return (lastNum + 1).toString();
    } else {
        // خطة بديلة لو آخر كود مكنش رقم
        let maxId = 0;
        students.forEach(s => {
            let nStr = String(s.code).replace(/\D/g, ''); 
            let n = parseInt(nStr, 10);
            if (!isNaN(n) && n > maxId) maxId = n;
        });
        return (maxId + 1).toString();
    }
};

// دالة مساعدة لتحديث الخانة
window.updateGeneratedCode = function() {
    let codeInput = document.getElementById("studentCode");
    if(codeInput) codeInput.value = window.generateStudentCode();
};

// دالة الفحص اللحظي لتكرار رقم ولي الأمر
window.checkDuplicateParentPhone = function() {
    let phone = document.getElementById("parentPhone").value.trim();
    let warningEl = document.getElementById("parentPhoneWarning");
    
    if (!warningEl) return;

    // لو الرقم لسه صغير أو صفر، نخفي التنبيه
    if (phone.length < 10 || phone === "0") {
        warningEl.style.display = "none";
        return;
    }

    // البحث عن طلاب مسجلين بنفس رقم ولي الأمر
    let duplicates = students.filter(s => s.parentPhone === phone);

    if (duplicates.length > 0) {
        // لو لقينا، نجيب أساميهم ونعرضها
        let names = duplicates.map(s => s.name).join("، ");
        warningEl.innerHTML = `⚠️ تنبيه: هذا الرقم مسجل بالفعل للطالب: <strong style="text-decoration: underline;">${names}</strong>`;
        warningEl.style.display = "block";
    } else {
        // لو مفيش تكرار، نخفي التنبيه
        warningEl.style.display = "none";
    }
};

// دالة مساعدة لحفظ الطالب تعمل مع الزرارين (حفظ وإنهاء / حفظ وإضافة)
window.processStudentSaving = async function(keepOpen) {
    const code = document.getElementById("studentCode").value.trim(); 
    const name = document.getElementById("studentName").value.trim(); 
    const level = document.getElementById("studentLevel").value; 
    const gender = document.getElementById("studentGender").value; 
    const track = "عام";
    
    const phoneEl = document.getElementById("studentPhone");
    const phone = phoneEl && phoneEl.value.trim() !== "" ? phoneEl.value.trim() : "0"; 
    
    const parentPhoneEl = document.getElementById("parentPhone");
    const parentPhone = parentPhoneEl && parentPhoneEl.value.trim() !== "" ? parentPhoneEl.value.trim() : "0"; 
    
    const group = document.getElementById("studentGroup").value; 
    
    if(group === "") return showToast("يرجى اختيار مجموعة!", "error"); 
    if (!isValidEgyptianPhone(phone)) return showToast("رقم هاتف الطالب خطأ!", "error");
    if (!isValidEgyptianPhone(parentPhone)) return showToast("رقم هاتف ولي الأمر خطأ!", "error");

    if (phone !== "0" && parentPhone !== "0" && phone === parentPhone) {
        return showToast("رقم الطالب يجب أن يختلف عن ولي الأمر", "error");
    }

    const duplicate = students.find(s => 
        s.code === code || 
        (phone !== "0" && s.phone === phone)
    );
    
    if(duplicate) return showToast(`تنبيه! كود الطالب أو هاتفه مسجل مسبقاً: ${duplicate.name}`, "error");
    
    

    // حفظ الطالب في النظام
    let isSpecialCase = document.getElementById("studentIsSpecial") ? document.getElementById("studentIsSpecial").checked : false;
    let specialAmount = isSpecialCase ? (parseFloat(document.getElementById("studentSpecialAmount").value) || 0) : 0;

    students.push({ code, name, level, gender, phone, parentPhone, group, track, behaviorPoints: 0, isSpecialCase: isSpecialCase, specialAmount: specialAmount }); 

    localStorage.setItem("students", JSON.stringify(students)); 
    
    if(typeof addSystemLog === "function") addSystemLog("إضافة طالب 🎓", `تسجيل الطالب: ${name} (كود: ${code}) في ${group}`);

    // إرسال الواتساب
    const portalLink = `https://ma9248290-collab.github.io/historya-systtem/parent.html`;
    const teacherName = localStorage.getItem("teacherName") || "Sami Samir";
    const centerName = localStorage.getItem("centerName") || "القيصر";

    const welcomeMsg = `🌟 *مرحبًا بك في كتيبة الأوائل مع ${centerName}* 🌟\n*مستر / ${teacherName}*\n\nأهلاً بك يا بطل/ة: *${name}* 👑\nتم تسجيل بياناتك بنجاح في المنصة التعليمية 🎉\n\n📌 *بيانات حسابك في النظام:*\n▫️ *كود الطالب:* \`${code}\`\n▫️ *الصف الدراسي:* ${level}\n▫️ *المجموعة:* ${group}\n\n🔗 *رابط الدخول للمنصة التعليمية:*\n${portalLink}\n\n💡 *تنبيه:* استخدم كود الطالب ورقم هاتف ولي الأمر لتسجيل الدخول لمتابعة المحاضرات والامتحانات ونتائجك أولاً بأول.\n\nمع تمنياتنا لك بالتفوق والدرجة النهائية! 🎯💪`;

    if (typeof sendAutoWhatsApp === "function") {
        if (phone !== "0" ) {
            setTimeout(() => sendAutoWhatsApp(phone, welcomeMsg), 2500);
        }
    }

    // 🔥 السحر هنا: تحديث الواجهات والجداول تلقائياً بدون ريفريش 🔥
    renderTable(); 
    if (typeof renderGroupCards === "function") renderGroupCards();
    if (typeof renderGroupStudentsTable === "function" && document.getElementById("group-details-view")?.style.display === "block") {
        renderGroupStudentsTable();
    }
    if (document.getElementById("dashboard-view")?.style.display === "block") {
        document.getElementById("total-students").innerText = students.length;
    }

    // المزامنة مع السيرفر
    if (typeof syncDataToBot === "function") syncDataToBot();

    if (keepOpen) {
        // لو ضغط "حفظ وإضافة آخر"
        showToast("تم الحفظ! جاهز لإضافة الطالب التالي ➕");
        
        document.getElementById("studentName").value = "";
        document.getElementById("studentPhone").value = "";
        document.getElementById("parentPhone").value = "";
        let warningEl = document.getElementById("parentPhoneWarning");
        if (warningEl) warningEl.style.display = "none";

        if(document.getElementById("studentIsSpecial")) {
            document.getElementById("studentIsSpecial").checked = false;
            document.getElementById("studentSpecialAmountDiv").style.display = 'none';
            document.getElementById("studentSpecialAmount").value = '';
        }
        
        window.updateGeneratedCode(); 
        document.getElementById("studentName").focus();
    } else {
        // لو ضغط "حفظ وإنهاء"
        showToast("تم تسجيل الطالب بنجاح ✅"); 
        document.getElementById("addStudentForm").reset(); 
        closeModal('addStudentModal'); 

        // 🌟 الإضافة السحرية: التحضير التلقائي لو جينا من شاشة الحضور
        if (window.pendingAttendanceAfterAction && currentActiveSessionId) {
            let isLate = document.getElementById('markAsLateCheckbox')?.checked;
            let attStatus = isLate ? 'late' : 'present';
            markAttendance(code, attStatus);
            showToast(`تم إضافة الطالب وتحضيره في الحصة فوراً! 🚀`);
            window.pendingAttendanceAfterAction = false;
            
            // فتح شاشة الدفع السريع لو كانت متفعلة
            let autoPaymentEnabled = document.getElementById('autoPaymentCheckbox')?.checked;
            if (autoPaymentEnabled) {
                let newStudent = students.find(s => s.code === code);
                if(newStudent) setTimeout(() => openQuickPaymentModal(newStudent), 500);
            } else {
                // استعادة الفوكس للباركود
                setTimeout(() => document.getElementById('attendanceBarcode')?.focus(), 200);
            }
        }
    }
};

// ربط الدالة بزر (حفظ وإنهاء)
document.getElementById("addStudentForm")?.addEventListener("submit", async function(e) { 
    e.preventDefault(); 
    await processStudentSaving(false);
});

// دالة زر (حفظ وإضافة آخر)
window.saveAndAddAnotherStudent = async function() {
    const form = document.getElementById("addStudentForm");
    if (form.checkValidity()) {
        await processStudentSaving(true);
    } else {
        form.reportValidity(); // لإظهار التنبيهات لو خانة ناقصة
    }
};


window.searchStudent = function() { 
    const filter = document.getElementById("searchInput").value.toLowerCase(); 
    const tbody = document.getElementById("students-list");
    if (!tbody) return;
    const rows = tbody.rows; 
    
    for (let i = 0; i < rows.length; i++) { 
        // استخدام textContent أسرع 100 مرة من innerText لأنه مبيعملش Reflow للشاشة
        const txt = rows[i].textContent.toLowerCase(); 
        rows[i].style.display = (txt.includes(filter)) ? "" : "none"; 
    } 
};






// ==========================================
// 8. تهيئة الكاميرا والـ QR
// ==========================================
function startCameraScanner(targetInputId) { currentScannerTarget = targetInputId; document.getElementById('scannerModal').style.display = 'block'; html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false); html5QrcodeScanner.render(onScanSuccess, onScanFailure); }
function stopCameraScanner() { if(html5QrcodeScanner) { html5QrcodeScanner.clear().then(() => { document.getElementById('scannerModal').style.display = 'none'; }).catch(e => { document.getElementById('scannerModal').style.display = 'none'; }); } else { document.getElementById('scannerModal').style.display = 'none'; } }
function onScanSuccess(decodedText) { stopCameraScanner(); const targetInput = document.getElementById(currentScannerTarget); if(targetInput) { targetInput.value = decodedText; const enterEvent = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }); targetInput.dispatchEvent(enterEvent); } }
function onScanFailure() {}




// ملاحظة: دوال الواجبات والامتحانات والحضور اللي في كودك الأصلي موجودة وتعمل بنفس المنطق.


// ==========================================
// ⛔ نظام إيقاف وتفعيل الطلاب
// ==========================================
window.toggleStudentSuspension = function() {
    if(!currentStudentProfileCode) return;
    let student = students.find(s => s.code === currentStudentProfileCode);
    if(student) {
        let isCurrentlySuspended = student.isSuspended || false;
        let msg = isCurrentlySuspended ? `هل أنت متأكد من إعادة تفعيل الطالب: ${student.name}؟` : `هل أنت متأكد من إيقاف الطالب: ${student.name}؟\n(لن يتمكن من تسجيل الحضور حتى يتم تفعيله)`;
        
        customConfirm(msg, () => {
            student.isSuspended = !isCurrentlySuspended; // عكس الحالة
            localStorage.setItem("students", JSON.stringify(students));
            
            if(typeof addSystemLog === "function") {
                addSystemLog(student.isSuspended ? "إيقاف طالب ⛔" : "تفعيل طالب ✅", `تم ${student.isSuspended ? 'إيقاف' : 'إعادة تفعيل'} الطالب: ${student.name} (كود: ${student.code})`);
            }
            
            showToast(student.isSuspended ? "تم إيقاف الطالب بنجاح ⛔" : "تم إعادة تفعيل الطالب ✅", student.isSuspended ? "warning" : "success");
            
            // تحديث الواجهة فوراً
            openStudentProfile(currentStudentProfileCode); 
            renderTable(); 
            if(typeof syncDataToBot === "function") syncDataToBot();
        });
    }
};

// ==========================================
// 10. تكملة ملف الطالب وتعديل بياناته
// ==========================================
function deleteStudentFromProfile() { 
    customConfirm("حذف الطالب نهائياً؟", () => { 
        const student = students.find(s => s.code === currentStudentProfileCode);
        if(typeof addSystemLog === "function" && student) addSystemLog("حذف طالب 🗑️", `تم مسح الطالب: ${student.name} (كود: ${student.code}) نهائياً من النظام`);
        
        students = students.filter(s => s.code !== currentStudentProfileCode); 
        localStorage.setItem("students", JSON.stringify(students)); 
        backToStudents(); renderTable(); showToast("تم الحذف"); 
    }); 
}




window.openEditStudentModal = function() { 
    const student = students.find(s => s.code === currentStudentProfileCode); 
    if(student) { 
        document.getElementById('editStudentCodeOriginal').value = student.code;
        document.getElementById('editStudentCode').value = student.code; 
        document.getElementById('editStudentName').value = student.name; 

        document.getElementById('editStudentLevel').value = student.level; 
        
        // 👈 مسحنا سطر الـ toggleTrackDropdown اللي كان بيعمل الإيرور
        
        filterGroupsByLevel('editStudentLevel', 'editStudentGroup');
        
        setTimeout(() => {
            const groupSelect = document.getElementById('editStudentGroup');
            if(groupSelect) groupSelect.value = student.group; 
        }, 50);

        document.getElementById('editStudentGender').value = student.gender; 
        
        const phoneInput = document.getElementById('editStudentPhone');
        if(phoneInput) phoneInput.value = student.phone; 
        
        // 👈 ظبطنا استدعاء رقم ولي الأمر عشان يقرأ الـ ID الصح
        const parentPhoneInput = document.getElementById('editParentPhone');
        if(parentPhoneInput) parentPhoneInput.value = student.parentPhone; 
        
        if (document.getElementById('editStudentIsSpecial')) {
            document.getElementById('editStudentIsSpecial').checked = student.isSpecialCase || false;
            document.getElementById('editStudentSpecialAmountDiv').style.display = student.isSpecialCase ? 'block' : 'none';
            document.getElementById('editStudentSpecialAmount').value = student.specialAmount !== undefined ? student.specialAmount : "";
        }
        openModal('editStudentModal'); 
    } 
};

document.getElementById('editStudentForm')?.addEventListener('submit', function(e) { 
    e.preventDefault(); 
    const originalCode = document.getElementById('editStudentCodeOriginal').value;
    const newCode = document.getElementById('editStudentCode').value.trim();
    const name = document.getElementById('editStudentName').value.trim();
    
    // 🚀 الإصلاح الذكي: سحب الأرقام وتحويل الفراغات لـ "0" أوتوماتيكياً
    const phoneInput = document.getElementById('editStudentPhone') || document.querySelector('#editStudentModal input[id="studentPhone"]');
    const phone = phoneInput && phoneInput.value.trim() !== "" ? phoneInput.value.trim() : "0";
    
    const parentPhoneEl = document.getElementById('editParentPhone');
    const parentPhone = parentPhoneEl && parentPhoneEl.value.trim() !== "" ? parentPhoneEl.value.trim() : "0";

    if (!isValidEgyptianPhone(phone)) return showToast("رقم هاتف الطالب خطأ!", "error");
    if (!isValidEgyptianPhone(parentPhone)) return showToast("رقم ولي الأمر خطأ!", "error");
    if (phone !== "0" && parentPhone !== "0" && phone === parentPhone) return showToast("رقم الطالب يجب أن يختلف عن ولي الأمر", "error");

    const duplicate = students.find(s => 
        s.code !== originalCode && (
            s.code === newCode || 
            (phone !== "0" && s.phone === phone)
        )
    );
    if(duplicate) return showToast(`تنبيه! مسجل مسبقاً`, "error");

    const studentIndex = students.findIndex(s => s.code === originalCode); 
    if(studentIndex > -1) { 
        const oldPhone = students[studentIndex].phone; 
        students[studentIndex].code = newCode; 
        students[studentIndex].name = name; 
        students[studentIndex].level = document.getElementById('editStudentLevel').value; 
        students[studentIndex].track = "عام";
        students[studentIndex].gender = document.getElementById('editStudentGender').value; 
        students[studentIndex].phone = phone; 
        students[studentIndex].parentPhone = parentPhone; 
        students[studentIndex].group = document.getElementById('editStudentGroup').value; 
        let isSpecial = document.getElementById('editStudentIsSpecial').checked;
students[studentIndex].isSpecialCase = isSpecial;
students[studentIndex].specialAmount = isSpecial ? (parseFloat(document.getElementById('editStudentSpecialAmount').value) || 0) : 0;
        
        // تحديث الرقم في باقي الجداول لو اتغير
        if(oldPhone !== phone) { 
            classSessions.forEach(s => { if(s.attendance[oldPhone]) { s.attendance[phone] = s.attendance[oldPhone]; delete s.attendance[oldPhone]; }}); 
            exams.forEach(ex => { if(ex.grades[oldPhone]) { ex.grades[phone] = ex.grades[oldPhone]; delete ex.grades[oldPhone]; }}); 
            homeworks.forEach(hw => { if(hw.grades[oldPhone]) { hw.grades[phone] = hw.grades[oldPhone]; delete hw.grades[oldPhone]; }}); 
        } 
        
        localStorage.setItem("students", JSON.stringify(students)); 
        closeModal('editStudentModal'); 
        openStudentProfile(newCode); 
        showToast("تم التحديث بنجاح ✅"); 
    } 
});



function renderGroupCards() { 
    const grid = document.getElementById("groups-list"); 
    if(!grid) return;
    grid.innerHTML = ""; 
    groups.forEach((group, index) => { 
        const studentsCount = students.filter(s => s.group === group.name).length; 
        grid.innerHTML += `<div class="session-card"><div class="session-header-card"><div><div class="session-group-name">📁 ${group.name}</div><div style="font-size: 12px; color: var(--primary-color);">${group.level}</div></div><span class="status-badge status-none">👥 ${studentsCount} طالب</span></div><div class="session-actions"><button class="enter-btn" onclick="openGroupDetails('${group.name}')">إدارة المجموعة</button><button class="icon-btn admin-only" onclick="openEditGroupModal('${group.name}')">✏️</button><button class="icon-btn danger admin-only" onclick="deleteGroup(${index})" title="حذف">🗑️</button></div></div>`; 
    }); 
    document.getElementById("total-groups").innerText = groups.length; 
}

function deleteGroup(index) { 
    customConfirm("حذف هذه المجموعة نهائياً؟", () => { 
        
        // 1. طلب الرقم السري للإدارة
        const enteredPin = prompt("⚠️ الإجراء يتطلب صلاحية المدير!\nالرجاء إدخال الرقم السري للإدارة (Admin PIN) لتأكيد حذف المجموعة:");

        // 2. لو المستخدم ضغط (إلغاء / Cancel)
        if (enteredPin === null) return; 

        // 3. جلب الرقم السري الأصلي المحفوظ في النظام
        const currentAdminPin = localStorage.getItem("adminPin") || "1234";

        // 4. التحقق من صحة الرقم السري
        if (enteredPin !== currentAdminPin) {
            showToast("الرقم السري غير صحيح! تم إلغاء عملية الحذف.", "error");
            return;
        }

        // 5. لو الرقم صحيح، يتم حذف المجموعة فعلياً
        groups.splice(index, 1); 
        localStorage.setItem("groups", JSON.stringify(groups)); 
        renderGroupCards(); 
        showToast("تم حذف المجموعة بنجاح 🗑️");

        // 6. مزامنة التعديل مع السيرفر لضمان مسحها من قاعدة البيانات
        if (typeof syncDataToBot === "function") syncDataToBot();
    }); 
}



// ==========================================
// إدارة المجموعات (محدثة بنظام الدفع)
// ==========================================
document.getElementById("addGroupFormModal")?.addEventListener("submit", function(e) { 
    e.preventDefault(); 
    const groupName = document.getElementById("newGroupName").value.trim(); 
    const groupLevel = document.getElementById("newGroupLevel").value; 
    const payType = document.getElementById("newGroupPayType").value;
    const price = parseFloat(document.getElementById("newGroupPrice").value) || 0;

    if (!groupName) return showToast("يرجى كتابة اسم المجموعة!", "error");
    if(groups.some(g => g.name === groupName)) return showToast("هذه المجموعة موجودة بالفعل!", "error"); 
    
    groups.push({ name: groupName, level: groupLevel, payType: payType, price: price }); 
    localStorage.setItem("groups", JSON.stringify(groups)); 
    
    if(typeof addSystemLog === "function") addSystemLog("إنشاء مجموعة 📚", `تم إنشاء مجموعة: ${groupName} (${payType === 'month' ? 'شهري' : 'بالحصة'}) بـ ${price} ج`);

    showToast("تم الإضافة بنجاح"); 
    this.reset(); closeModal('addGroupModal'); renderGroupCards(); 
});

function openEditGroupModal(oldName) {
    const group = groups.find(g => g.name === oldName);
    if(group) {
        document.getElementById('editGroupOriginalName').value = group.name;
        document.getElementById('editGroupName').value = group.name;
        document.getElementById('editGroupLevel').value = group.level;
        document.getElementById('editGroupPayType').value = group.payType || 'session';
        document.getElementById('editGroupPrice').value = group.price || 0;
        openModal('editGroupModal');
    }
}

document.getElementById('editGroupFormModal')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const oldName = document.getElementById('editGroupOriginalName').value;
    const newName = document.getElementById('editGroupName').value.trim();
    const newLevel = document.getElementById('editGroupLevel').value;
    const newPayType = document.getElementById('editGroupPayType').value;
    const newPrice = parseFloat(document.getElementById('editGroupPrice').value) || 0;

    const groupIndex = groups.findIndex(g => g.name === oldName);
    if(groupIndex > -1) {
        if(newName !== oldName && groups.some(g => g.name === newName)) return showToast("الاسم الجديد مستخدم بالفعل!", "error");
        
        groups[groupIndex].name = newName; 
        groups[groupIndex].level = newLevel;
        groups[groupIndex].payType = newPayType;
        groups[groupIndex].price = newPrice;

        if(newName !== oldName) {
            students.forEach(s => { if(s.group === oldName) s.group = newName; });
            classSessions.forEach(s => { if(s.group === oldName) s.group = newName; });
            exams.forEach(e => { if(e.group === oldName) e.group = newName; });
            homeworks.forEach(h => { if(h.group === oldName) h.group = newName; });
            schedule.forEach(sc => { if(sc.group === oldName) sc.group = newName; });
        }
        localStorage.setItem("groups", JSON.stringify(groups));
        closeModal('editGroupModal'); renderGroupCards(); showToast("تم التعديل بنجاح");
    }
});

function openGroupDetails(groupName) { currentActiveGroup = groupName; document.getElementById("groups-overview").style.display = "none"; document.getElementById("group-details-view").style.display = "block"; document.getElementById("current-group-title").innerText = `مجموعة: ${groupName}`; renderGroupStudentsTable(); }
function backToGroups() { currentActiveGroup = null; document.getElementById("groups-overview").style.display = "block"; document.getElementById("group-details-view").style.display = "none"; renderGroupCards(); }



function removeStudentFromGroup(code) { customConfirm("إزالة هذا الطالب من المجموعة؟", () => { const student = students.find(s => s.code === code); if(student) { student.group = ""; localStorage.setItem("students", JSON.stringify(students)); renderGroupStudentsTable(); renderGroupCards(); showToast("تمت الإزالة"); } }); }

// ==========================================
// 12. الحضور والانصراف (Sessions)
// ==========================================
function toggleAutoInputs() { const eCheck = document.getElementById("autoExamCheck").checked; const hCheck = document.getElementById("autoHwCheck").checked; document.getElementById("autoExamScore").style.display = eCheck ? "block" : "none"; document.getElementById("autoHwScore").style.display = hCheck ? "block" : "none"; }
document.getElementById("addSessionForm")?.addEventListener("submit", function(e) { 
    e.preventDefault(); 
    const group = document.getElementById("sessionGroupSelect").value; 
    const date = document.getElementById("sessionDate").value; 
    const topic = document.getElementById("sessionTopic").value || "حصة"; 
    classSessions.push({ id: Date.now().toString(), group, date, topic, status: "open", attendance: {} }); 
    if(document.getElementById("autoExamCheck").checked) exams.push({ id: Date.now().toString()+"_e", group, name: `امتحان: ${topic}`, maxScore: document.getElementById("autoExamScore").value, date, status: "open", grades: {} }); 
    if(document.getElementById("autoHwCheck").checked) homeworks.push({ id: Date.now().toString()+"_h", group, name: `واجب: ${topic}`, maxScore: document.getElementById("autoHwScore").value, date, status: "open", grades: {} }); 
    localStorage.setItem("classSessions", JSON.stringify(classSessions)); localStorage.setItem("exams", JSON.stringify(exams)); localStorage.setItem("homeworks", JSON.stringify(homeworks)); 
    
    // 🔴 سطر السجل 
    if(typeof addSystemLog === "function") addSystemLog("فتح حصة 🎯", `فتح حصة جديدة لمجموعة: ${group} بموضوع: ${topic}`);

    this.reset(); toggleAutoInputs(); closeModal('addSessionModal'); renderSessionCards(); showToast("تم الإنشاء"); 
});

function renderSessionCards() { 
    const grid = document.getElementById("sessions-grid"); if(!grid) return; grid.innerHTML = ""; 
    [...classSessions].reverse().forEach(session => { 
        const presentCount = Object.values(session.attendance).filter(v => v === 'present').length; 
        const total = students.filter(s => s.group === session.group).length; 
        const isClosed = session.status === 'closed'; 
        grid.innerHTML += `<div class="session-card"><div class="session-header-card"><div><div class="session-group-name">${session.group}</div><div class="session-date">${session.date}</div></div><span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${isClosed ? 'مغلقة' : 'مفتوحة'}</span></div><div class="session-topic">${session.topic}</div><div style="font-size: 14px; color: var(--text-muted);">الحضور: <strong>${presentCount} / ${total}</strong></div><div class="session-actions"><button class="enter-btn" onclick="openSessionDetails('${session.id}')" ${isClosed?'disabled':''}>تسجيل</button><button class="icon-btn admin-only" onclick="openEditSessionModal('${session.id}')">✏️</button><button class="icon-btn admin-only" onclick="toggleSessionStatus('${session.id}')">${isClosed?'🔓':'🔒 قفل وإرسال'}</button><button class="icon-btn danger admin-only" onclick="deleteSession('${session.id}')">🗑️</button></div></div>`; 
    }); 
}

function deleteSession(id) { customConfirm("حذف الحصة؟", () => { classSessions = classSessions.filter(s => s.id !== id); localStorage.setItem("classSessions", JSON.stringify(classSessions)); renderSessionCards(); }); }
function backToSessions() { document.getElementById("sessions-overview").style.display = "block"; document.getElementById("session-details-view").style.display = "none"; renderSessionCards(); }




// ==========================================
// 4️⃣ رصد الباركود المطور (تفريغ فوري + تغيير الحالة + استماع عام للسكانر)
// ==========================================

// 1. الدالة الأساسية لمعالجة الباركود
window.processAttendanceBarcode = function(val) {
    val = val.trim();
    
    // إرجاع المؤشر (الفوكس) للخانة عشان لو هنسحب اللي بعده
    let inputEl = document.getElementById('attendanceBarcode');
    if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
    }

    if(!val) return;

    let student = findStudentByCodeOrName(val); 
    const session = classSessions.find(s => s.id === currentActiveSessionId); 
    
    if(!student) {
        let normalizedVal = window.smartArabicNormalize(val); 
        let inputWords = normalizedVal.split(' '); 
        let foundReqId = null;

        if (window.currentJoinRequests) {
            for (let id in window.currentJoinRequests) {
                let reqName = window.smartArabicNormalize(window.currentJoinRequests[id].name);
                if (reqName === normalizedVal || inputWords.every(word => reqName.includes(word))) {
                    foundReqId = id; break;
                }
            }
        }

        if (foundReqId) {
            showToast(`تم العثور عليه في طلبات الانضمام! جاري التسكين... ⏳`, "info");
            openApproveModal(foundReqId);
            setTimeout(() => {
                let groupSelect = document.getElementById("approveStGroup");
                if(groupSelect) groupSelect.value = session.group;
            }, 100);
            window.pendingAttendanceAfterAction = true;
        } else {
            showToast(`طالب غير مسجل! جاري فتح الإضافة السريعة... ➕`, "warning");
            openModal('addStudentModal');
            setTimeout(() => {
                let isNumber = /^\d+$/.test(val);
                if (isNumber) {
                    document.getElementById('studentCode').value = val;
                    document.getElementById('studentName').focus();
                } else {
                    document.getElementById('studentName').value = val;
                    let activeGroupObj = groups.find(g => g.name === session.group);
                    if(activeGroupObj) {
                        document.getElementById('studentLevel').value = activeGroupObj.level;
                        filterGroupsByLevel('studentLevel', 'studentGroup');
                        setTimeout(() => document.getElementById('studentGroup').value = session.group, 50);
                    }
                    document.getElementById('studentPhone').focus();
                }
            }, 100);
            window.pendingAttendanceAfterAction = true;
        }
        return;
    } else if (student.isSuspended) {
        showToast(`⛔ لا يمكن تحضير (${student.name}) لأنه موقوف من الإدارة!`, 'error');
        try { if(typeof errorSound !== 'undefined') { errorSound.currentTime = 0; errorSound.play(); } } catch(e){}
        return;
    } else if(student.group !== session.group) {
        openWrongGroupModal(student, session);
        return;
    } else if(session.status === 'closed') {
        showToast(`الحصة مغلقة!`, 'error');
        return;
    } else { 
        
        let isLate = document.getElementById('markAsLateCheckbox')?.checked;
        let attStatus = isLate ? 'late' : 'present';

        // 💡 فحص التكرار وتحديث الحالة
        let currentStatus = session.attendance[student.code] || session.attendance[student.phone];

        if (currentStatus) {
            // 🚀 التعديل: لو الطالب متسجل بس الحالة مختلفة (مثلاً: كان حاضر وأنت دوست "تسجيل كمتأخر" وسحبت الكود)
            if (currentStatus !== attStatus) {
                markAttendance(student.code, attStatus); // تحديث الحالة
                let newStatusText = attStatus === 'late' ? 'متأخر ⏳' : 'حاضر ✅';
                showToast(`تم تعديل حالة (${student.name}) إلى ${newStatusText}`, 'success');
                
                let autoPaymentEnabled = document.getElementById('autoPaymentCheckbox')?.checked;
                if (autoPaymentEnabled) {
                    setTimeout(() => openQuickPaymentModal(student), 500);
                }
                return;
            } else {
                // نفس الحالة بالظبط، يبقى تكرار
                let statusText = currentStatus === 'present' ? 'حاضر ✅' : currentStatus === 'late' ? 'متأخر ⏳' : 'تعويض 💻';
                showToast(`الطالب (${student.name}) مسجل بالفعل كـ ${statusText}`, 'duplicate');
                try { if(typeof errorSound !== 'undefined') { errorSound.currentTime = 0; errorSound.play(); } } catch(e){}
                return; 
            }
        }

        // الرصد العادي لأول مرة
        markAttendance(student.code, attStatus); 
        
        if (student.isSpecialCase) {
            let alertBox = document.createElement('div');
            alertBox.innerHTML = `⭐ <b>حالة خاصة:</b> ${student.name} يدفع <b>(${student.specialAmount} ج.م)</b>`;
            alertBox.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#f59e0b; color:white; padding:12px 30px; border-radius:30px; font-weight:900; font-size:16px; z-index:9999999; box-shadow:0 10px 25px rgba(245, 158, 11, 0.4); text-align:center; animation: slideInLeftToast 0.4s ease-out forwards;";
            document.body.appendChild(alertBox);
            setTimeout(() => { alertBox.style.opacity = '0'; setTimeout(()=>alertBox.remove(), 400); }, 4000);
        }
        
        let autoPaymentEnabled = document.getElementById('autoPaymentCheckbox')?.checked;
        if (autoPaymentEnabled) {
            setTimeout(() => openQuickPaymentModal(student), 500);
        }
    }
};

// ==========================================
// 🧠 محرك البحث الذكي لخانة الباركود (يدعم الأسهم واختيار أول اسم بـ Enter)
// ==========================================
let currentFocus = -1;

const attendanceInput = document.getElementById('attendanceBarcode');

if (attendanceInput) {
    // 1. عند الكتابة في الخانة (إنشاء القائمة الذكية بدقة 100%)
    attendanceInput.addEventListener('input', function(e) {
        let val = this.value.trim();
        closeAllLists();
        if (!val) return;
        currentFocus = -1;

        // إنشاء حاوية القائمة المنسدلة
        let listNode = document.createElement("DIV");
        listNode.setAttribute("id", this.id + "autocomplete-list");
        listNode.setAttribute("class", "smart-autocomplete-dropdown");
        this.parentNode.appendChild(listNode);
        listNode.style.display = "block";

        let normalizedVal = window.smartArabicNormalize(val);
        let inputWords = normalizedVal.split(' ');
        let isNumericInput = /^\d+$/.test(val); // فحص هل المدخل أرقام فقط؟

        let matches = students.filter(s => {
            let sCode = String(s.code).trim();
            let sPhone = String(s.phone || "").trim();
            let sParentPhone = String(s.parentPhone || "").trim();

            if (isNumericInput) {
                // 🎯 لو المدخل صغير (أقل من 4 أرقام مثل 72 أو 183) -> ابحث في كود الطالب فقط!
                if (val.length <= 4) {
                    return sCode === val || sCode.startsWith(val);
                } 
                // 📱 لو كتب 5 أرقام فأكثر (يبحث برقم الموبايل أو كود طويل) -> ابحث في الكود والهاتف
                else {
                    return sCode.includes(val) || sPhone.includes(val) || sParentPhone.includes(val);
                }
            } else {
                // 🔤 لو المدخل حروف أو كود مختلط (مثل GUEST أو O-1001 أو اسم طالب)
                let dbName = window.smartArabicNormalize(s.name);
                let matchCode = sCode.toLowerCase().includes(val.toLowerCase());
                let matchName = dbName.includes(normalizedVal) || inputWords.every(w => dbName.includes(w));
                return matchCode || matchName;
            }
        });

        const session = classSessions.find(s => s.id === currentActiveSessionId);
        const activeGroup = session ? session.group : "";

        // 🌟 الترتيب الذكي الصارم:
        // 1. التطابق التام مع الكود يظهر في المركز الأول دائماً (72 يظهر أول واحد فوراً)
        // 2. يليه طلاب نفس المجموعة الحالية
        // 3. يليه الترتيب التصاعدي للأكواد
        matches.sort((a, b) => {
            let aExact = String(a.code).trim().toLowerCase() === val.toLowerCase();
            let bExact = String(b.code).trim().toLowerCase() === val.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            let aSameGroup = a.group === activeGroup;
            let bSameGroup = b.group === activeGroup;
            if (aSameGroup && !bSameGroup) return -1;
            if (!aSameGroup && bSameGroup) return 1;

            return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
        });

        matches = matches.slice(0, 10); // عرض أول 10 نتائج لسرعة الأداء

        // رسم العناصر داخل القائمة
        matches.forEach((st) => {
            let itemNode = document.createElement("DIV");
            itemNode.className = "autocomplete-item";
            
            let groupBadge = st.group === activeGroup 
                ? `<span class="badge-same-group">مجموعته ✅</span>` 
                : `<span class="badge-other-group">ضيف: ${st.group}</span>`;

            itemNode.innerHTML = `
                <div><strong style="color:var(--primary-color)">${st.code}</strong> - ${st.name}</div>
                ${groupBadge}
                <input type="hidden" value="${st.code}">
            `;

            itemNode.addEventListener("click", function(e) {
                let selectedCode = this.getElementsByTagName("input")[0].value;
                attendanceInput.value = '';
                closeAllLists();
                window.processAttendanceBarcode(selectedCode);
            });

            listNode.appendChild(itemNode);
        });
    });

    // 2. عند استخدام الكيبورد (الأسهم و Enter)
    attendanceInput.addEventListener('keydown', function(e) {
        let listNode = document.getElementById(this.id + "autocomplete-list");
        let items = listNode ? listNode.getElementsByClassName("autocomplete-item") : null;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            currentFocus++;
            addActive(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            currentFocus--;
            addActive(items);
        } else if (e.key === "Enter") {
            e.preventDefault(); // منع الإرسال الافتراضي
            
            if (items && items.length > 0) {
                // 🌟 لو مداسش أسهم، يختار أول اسم في القائمة تلقائياً
                if (currentFocus === -1) currentFocus = 0;
                items[currentFocus].click(); 
            } else {
                // لو القائمة فاضية (كتب الكود كامل وضغط انتر بسرعة)
                let val = this.value.trim();
                this.value = '';
                closeAllLists();
                if(val) window.processAttendanceBarcode(val);
            }
        }
    });
}

function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0; 
    if (currentFocus < 0) currentFocus = (items.length - 1); 
    
    items[currentFocus].classList.add("autocomplete-active");
    // سكرول تلقائي لو نزل بالأسهم لتحت
    items[currentFocus].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("autocomplete-active");
    }
}

function closeAllLists(elmnt) {
    let x = document.getElementsByClassName("smart-autocomplete-dropdown");
    for (let i = 0; i < x.length; i++) {
        if (elmnt !== x[i] && elmnt !== attendanceInput) {
            x[i].parentNode.removeChild(x[i]);
        }
    }
}

document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});
// 3. 🌐 الاستماع العام للسكانر (Global Scanner Listener)
window.globalBarcodeBuffer = "";
window.globalBarcodeTimeout = null;

document.addEventListener('keypress', function(e) {
    // التأكد إننا في شاشة الرصد وإن المودال مش مفتوح فوقها (زي إضافة طالب)
    if (document.getElementById('session-details-view')?.style.display !== 'block') return;
    
    // تجاهل لو المؤشر جوه خانة الباركود (لأننا بنعالجها فوق عشان ميترصدش مرتين)
    if (e.target.id === 'attendanceBarcode') return;
    
    // تجاهل لو المستخدم بيكتب بإيده في أي خانة تانية (زي خانة البحث)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Enter') {
        if (window.globalBarcodeBuffer.length > 0) {
            e.preventDefault();
            let scannedVal = window.globalBarcodeBuffer;
            window.globalBarcodeBuffer = "";
            window.processAttendanceBarcode(scannedVal);
        }
        return;
    }

    window.globalBarcodeBuffer += e.key;

    // جهاز السكانر بيكتب الحروف بسرعة جداً، تم رفع الوقت لـ 100ms ليغطي كل أنواع السكانر
    if (window.globalBarcodeTimeout) clearTimeout(window.globalBarcodeTimeout);
    window.globalBarcodeTimeout = setTimeout(() => {
        window.globalBarcodeBuffer = "";
    }, 100);
});


// بتجيب السعر أوتوماتيك من صفحة الماليات
window.updateQpAmount = function() {
    let type = document.getElementById("qpPayType").value;
    let sessionFee = parseFloat(document.getElementById("financeStudentFee")?.value) || 50;
    let monthFee = parseFloat(document.getElementById("financeMonthlyFee")?.value) || 200;
    document.getElementById("qpAmount").value = type === 'session' ? sessionFee : monthFee;
};

// دوال شاشة الدفع السريع المحدثة
window.openQuickPaymentModal = function(student) {
    const session = classSessions.find(s => s.id === currentActiveSessionId);
    if(!session) return;

    const groupObj = groups.find(g => g.name === session.group) || {};
    const groupPayType = groupObj.payType || 'session';
    const groupPrice = groupObj.price || 0;

    // لو المدرس مخلي السعر 0، مفيش داعي نطلع شاشة الدفع أصلاً
    if(groupPrice === 0) return;

    let actualPrice = groupPrice;
let specialBadge = "";

// لو الطالب حالة خاصة، السعر يتغير للي إنت حددتهوله
if (student.isSpecialCase) {
    actualPrice = student.specialAmount;
    specialBadge = `<br><span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 10px; border-radius: 8px; font-size: 13px; font-weight: bold; border: 1px dashed #f59e0b; display: inline-block; margin-top: 5px;">⭐ حالة خاصة: يدفع ${actualPrice} ج.م</span>`;
}

document.getElementById("qpStudentName").innerHTML = student.name + specialBadge;
document.getElementById("qpAmount").value = actualPrice;
    
    // هنخفي الـ Select عشان نوع الدفع بقى ثابت من إعدادات المجموعة
    document.getElementById("qpPayType").parentElement.style.display = "none";
    document.getElementById("qpPayType").value = groupPayType;
    document.getElementById("qpAmount").value = groupPrice;
    
    let statusEl = document.getElementById("qpStudentStatus");
    const recordKey = `fin_session_${currentActiveSessionId}`;
    let alreadyPaid = financeRecords[recordKey] && financeRecords[recordKey][student.code] && financeRecords[recordKey][student.code].status === 'paid';

    if (alreadyPaid) {
        statusEl.innerText = "✅ تم الدفع مسبقاً لهذه الحصة/الشهر";
        statusEl.style.color = "var(--success-color)";
    } else if (groupPayType === 'month') {
        let monthlyStatus = getMonthlyStatus(student.code, session.date);
        if (monthlyStatus.isCovered) {
            statusEl.innerText = `✅ اشتراك ${monthlyStatus.monthName} ساري`;
            statusEl.style.color = "var(--success-color)";
        } else {
            statusEl.innerText = `🔴 محتاج يجدد اشتراك ${monthlyStatus.monthName}`;
            statusEl.style.color = "var(--danger-color)";
        }
    } else {
        statusEl.innerText = `⚠️ لم يدفع حق الحصة`;
        statusEl.style.color = "#f59e0b";
    }

    openModal("quickPaymentModal");
};

window.confirmQuickPayment = function() {
    let code = document.getElementById("qpStudentCode").value;
    const session = classSessions.find(s => s.id === currentActiveSessionId);
    
    const groupObj = groups.find(g => g.name === session.group) || {};
    const type = groupObj.payType || 'session';
    const amount = groupObj.price || 0;
    
    const recordKey = `fin_session_${currentActiveSessionId}`;
    if (!financeRecords[recordKey]) financeRecords[recordKey] = {};
    
    financeRecords[recordKey][code] = { status: 'paid', type: type, amount: amount, date: new Date().toISOString() };
    
    if (type === 'month') {
        const monthKey = session.date.substring(0, 7);
        if(!monthlyPayments[code]) monthlyPayments[code] = {};
        monthlyPayments[code][monthKey] = true;
        localStorage.setItem("monthlyPayments", JSON.stringify(monthlyPayments));
    }
    
    localStorage.setItem("financeRecords", JSON.stringify(financeRecords));
    
    if (typeof renderFinanceTable === "function") renderFinanceTable();
    showToast(`تم تحصيل ${amount} ج.م بنجاح! 💸`);
    closeModal("quickPaymentModal");
    
    setTimeout(() => document.getElementById('attendanceBarcode').focus(), 100);
};

// تخطي بدون دفع
window.skipQuickPayment = function() {
    closeModal("quickPaymentModal");
    setTimeout(() => document.getElementById('attendanceBarcode').focus(), 100);
};

// ==========================================
// 13. الامتحانات والواجبات (Exams & HW)
// ==========================================
document.getElementById("addExamForm")?.addEventListener("submit", function(e) { e.preventDefault(); exams.push({ id: Date.now().toString(), group: document.getElementById("examGroupSelect").value, name: document.getElementById("examName").value, maxScore: document.getElementById("examMaxScore").value, date: document.getElementById("examDate").value, status: "open", grades: {} }); localStorage.setItem("exams", JSON.stringify(exams)); this.reset(); closeModal('addExamModal'); renderExamCards(); showToast("تم الإنشاء"); });
function deleteExam(id) { customConfirm("حذف الامتحان؟", () => { exams = exams.filter(e => e.id !== id); localStorage.setItem("exams", JSON.stringify(exams)); renderExamCards(); }); }
function openExamDetails(id) { currentActiveExamId = id; const e = exams.find(e => e.id === id); document.getElementById("exams-overview").style.display = "none"; document.getElementById("exam-details-view").style.display = "block"; document.getElementById("current-exam-title").innerText = e.name; renderGradesTable(e, "grades-list", saveExamGrade, currentActiveExamId, 'exam'); }
function backToExams() { document.getElementById("exams-overview").style.display = "block"; document.getElementById("exam-details-view").style.display = "none"; renderExamCards(); }



// ==========================================
// ✏️ رسم كروت الامتحانات والواجبات (بإضافة زرار التعديل)
// ==========================================


function openEditExamModal(id) {
    const exam = exams.find(e => e.id === id); if(!exam) return;
    document.getElementById('editExamId').value = exam.id;
    document.getElementById('editExamName').value = exam.name;
    document.getElementById('editExamMaxScore').value = exam.maxScore;
    document.getElementById('editExamDate').value = exam.date;
    openModal('editExamModal');
}

document.getElementById('editExamForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editExamId').value;
    const examIndex = exams.findIndex(e => e.id === id);
    if(examIndex > -1) {
        exams[examIndex].name = document.getElementById('editExamName').value.trim();
        exams[examIndex].maxScore = document.getElementById('editExamMaxScore').value;
        exams[examIndex].date = document.getElementById('editExamDate').value;
        localStorage.setItem("exams", JSON.stringify(exams)); closeModal('editExamModal'); renderExamCards(); showToast("تم تعديل بيانات الامتحان بنجاح ✏️");
    }
});



function openEditHwModal(id) {
    const hw = homeworks.find(h => h.id === id); if(!hw) return;
    document.getElementById('editHwId').value = hw.id;
    document.getElementById('editHwName').value = hw.name;
    document.getElementById('editHwMaxScore').value = hw.maxScore;
    document.getElementById('editHwDate').value = hw.date;
    openModal('editHwModal');
}

document.getElementById('editHwForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editHwId').value;
    const hwIndex = homeworks.findIndex(h => h.id === id);
    if(hwIndex > -1) {
        homeworks[hwIndex].name = document.getElementById('editHwName').value.trim();
        homeworks[hwIndex].maxScore = document.getElementById('editHwMaxScore').value;
        homeworks[hwIndex].date = document.getElementById('editHwDate').value;
        localStorage.setItem("homeworks", JSON.stringify(homeworks)); closeModal('editHwModal'); renderHwCards(); showToast("تم تعديل بيانات الواجب بنجاح ✏️");
    }
});

document.getElementById("addHwForm")?.addEventListener("submit", function(e) { e.preventDefault(); homeworks.push({ id: Date.now().toString(), group: document.getElementById("hwGroupSelect").value, name: document.getElementById("hwName").value, maxScore: document.getElementById("hwMaxScore").value, date: document.getElementById("hwDate").value, status: "open", grades: {} }); localStorage.setItem("homeworks", JSON.stringify(homeworks)); this.reset(); closeModal('addHwModal'); renderHwCards(); });
function deleteHw(id) { customConfirm("حذف الواجب؟", () => { homeworks = homeworks.filter(h => h.id !== id); localStorage.setItem("homeworks", JSON.stringify(homeworks)); renderHwCards(); }); }
function openHwDetails(id) { currentActiveHwId = id; const hw = homeworks.find(h => h.id === id); document.getElementById("hw-overview").style.display = "none"; document.getElementById("hw-details-view").style.display = "block"; document.getElementById("current-hw-title").innerText = hw.name; renderGradesTable(hw, "hw-grades-list", saveHwGrade, currentActiveHwId, 'hw'); }
function backToHw() { document.getElementById("hw-overview").style.display = "block"; document.getElementById("hw-details-view").style.display = "none"; renderHwCards(); }



window.renderGradesTable = function(itemDetails, tbodyId, saveFunction, itemId, itemType) {
    const tbody = document.getElementById(tbodyId); const gStudents = students.filter(s => s.group === itemDetails.group);
    if(gStudents.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا يوجد طلاب</td></tr>`; 
    
    let prevItem = null;
    if(itemType === 'exam') { const grpItems = exams.filter(e => e.group === itemDetails.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); prevItem = grpItems[grpItems.findIndex(e=>e.id===itemDetails.id)-1]; }
    if(itemType === 'hw') { const grpItems = homeworks.filter(h => h.group === itemDetails.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); prevItem = grpItems[grpItems.findIndex(h=>h.id===itemDetails.id)-1]; }

    let htmlContent = ""; 

    gStudents.forEach(st => {
        let grade = itemDetails.grades[st.code] !== undefined ? itemDetails.grades[st.code] : (itemDetails.grades[st.phone] !== undefined ? itemDetails.grades[st.phone] : '');
        const isHw = tbodyId === 'hw-grades-list'; const btnColor = isHw ? 'var(--hw-color)' : 'var(--exam-color)';
        let pHT = `<span style="color:var(--text-muted)">--</span>`;
        if(prevItem && (prevItem.grades[st.code] !== undefined || prevItem.grades[st.phone] !== undefined)) {
            let pG = prevItem.grades[st.code] !== undefined ? prevItem.grades[st.code] : prevItem.grades[st.phone];
            pHT = `<strong style="color:${btnColor}">${pG} / ${prevItem.maxScore}</strong>`;
        }
        
        let noteIcon = st.note && st.note.trim() !== "" ? `<span style="cursor: pointer; margin-right: 8px; font-size: 16px; filter: drop-shadow(0 2px 4px rgba(139,92,246,0.4));" title="يوجد ملاحظة (اضغط للعرض)" onclick="openStudentNoteModal('${st.code}')">📝</span>` : `<span style="cursor: pointer; margin-right: 8px; font-size: 14px; opacity: 0.3;" title="إضافة ملاحظة" onclick="openStudentNoteModal('${st.code}')">📝</span>`;

        htmlContent += `<tr><td><strong>${st.code}</strong></td><td>${st.name} ${noteIcon}</td><td>${st.phone}</td><td style="direction:ltr;">${pHT}</td><td style="direction: ltr;"><span style="color:var(--text-muted);">/ ${itemDetails.maxScore}</span><input type="number" id="grade_${st.code}" class="custom-input" style="width:70px; padding:5px; text-align:center;" value="${grade}" max="${itemDetails.maxScore}"></td><td><button class="btn-present" onclick="${saveFunction.name}('${st.code}')" style="background-color: ${btnColor}; color: #fff;">حفظ</button></td></tr>`;
    });
    
    tbody.innerHTML = htmlContent; 
};

window.renderDashboardCharts = function() {
    if(typeof updateParentLinkUI === "function") updateParentLinkUI(); 
    if(sessionStorage.getItem("isLoggedIn") !== "true") return;
    
    document.getElementById("total-students").innerText = students.length;
    document.getElementById("total-groups").innerText = groups.length;
    
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#fff';
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#3b82f6';
    
    // 🚀 تسريع حساب الطلاب في كل مجموعة عشان ميهنجش
    const groupCounts = {};
    students.forEach(st => { groupCounts[st.group] = (groupCounts[st.group] || 0) + 1; });

    const ctxAtt = document.getElementById('attendanceChart')?.getContext('2d');
    if(ctxAtt) {
        if(window.attendanceChartInstance) window.attendanceChartInstance.destroy();
        const sessionsByDate = {};
        classSessions.forEach(s => {
            if(!sessionsByDate[s.date]) { sessionsByDate[s.date] = { expected: 0, attended: 0 }; }
            const groupStudentsCount = groupCounts[s.group] || 0; 
            let presentCount = 0;
            for (let key in s.attendance) {
                if(s.attendance[key] === 'present') presentCount++;
            }
            sessionsByDate[s.date].expected += groupStudentsCount;
            sessionsByDate[s.date].attended += presentCount;
        });
        const sortedDates = Object.keys(sessionsByDate).sort((a,b) => new Date(a) - new Date(b)).slice(-7);
        const sessionLabels = sortedDates.map(d => d.substring(5)); 
        const sessionData = sortedDates.map(d => { const exp = sessionsByDate[d].expected; return exp > 0 ? Math.round((sessionsByDate[d].attended / exp) * 100) : 0; });
        window.attendanceChartInstance = new Chart(ctxAtt, { type: 'line', data: { labels: sessionLabels, datasets: [{ label: 'متوسط الحضور (%)', data: sessionData, borderColor: primaryColor, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 3, fill: true, tension: 0.3 }] }, options: { plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor }, min: 0, max: 100 } } } });
    }

    const ctxGrp = document.getElementById('groupsChart')?.getContext('2d');
    if(ctxGrp) {
        if(window.groupsChartInstance) window.groupsChartInstance.destroy();
        const groupLabels = groups.map(g => g.name); 
        const groupData = groups.map(g => groupCounts[g.name] || 0); // 🚀 أسرع بكتير
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
        window.groupsChartInstance = new Chart(ctxGrp, { type: 'doughnut', data: { labels: groupLabels, datasets: [{ data: groupData, backgroundColor: colors, borderWidth: 0 }] }, options: { plugins: { legend: { position: 'bottom', labels: { color: textColor } } } } });
    }

    if(isAssistantMode) return; 

    const ctxFin = document.getElementById('financeChart')?.getContext('2d');
    if(ctxFin) {
        if(window.financeChartInstance) window.financeChartInstance.destroy();
        const monthlyData = {}; const defaultStudentFee = 50; const defaultCenterFee = 10;
        classSessions.forEach(s => { const month = s.date.substring(0, 7); if(!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, net: 0 }; });
        Object.keys(financeRecords).forEach(key => {
            if(key.startsWith('fin_session_')) {
                const sessionId = key.replace('fin_session_', ''); const session = classSessions.find(s => s.id === sessionId);
                if(session) {
                    const month = session.date.substring(0, 7); if(!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, net: 0 };
                    let paidCount = 0; Object.values(financeRecords[key]).forEach(status => { if(status === 'paid' || (status.status && status.status === 'paid')) paidCount++; });
                    monthlyData[month].income += paidCount * defaultStudentFee; monthlyData[month].expenses += paidCount * defaultCenterFee;
                }
            }
        });
        expenses.forEach(ex => {
            const session = classSessions.find(s => s.id === ex.sessionId);
            if(session) { const month = session.date.substring(0, 7); if(!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0, net: 0 }; monthlyData[month].expenses += parseFloat(ex.amount); }
        });
        Object.keys(monthlyData).forEach(m => { monthlyData[m].net = monthlyData[m].income - monthlyData[m].expenses; });
        const sortedMonths = Object.keys(monthlyData).sort();
        window.financeChartInstance = new Chart(ctxFin, { type: 'bar', data: { labels: sortedMonths, datasets: [ { label: 'الإيرادات', data: sortedMonths.map(m => monthlyData[m].income), backgroundColor: '#10b981' }, { label: 'المصروفات', data: sortedMonths.map(m => monthlyData[m].expenses), backgroundColor: '#ef4444' }, { label: 'الربح', data: sortedMonths.map(m => monthlyData[m].net), backgroundColor: '#3b82f6' } ] }, options: { plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } } });
    }
};


// ==========================================
// 15. المالية والاشتراكات الشهرية (النسخة الميلادية الذكية)
// ==========================================
function filterSessionsForFinance() {
    const group = document.getElementById('financeGroupSelect').value; 
    const finSelect = document.getElementById("financeSessionSelect");
    finSelect.innerHTML = "<option value=''>اختر الحصة...</option>";
    if(group) { [...classSessions].reverse().filter(s => s.group === group).forEach(s => { finSelect.innerHTML += `<option value="${s.id}">${s.date} - ${s.topic}</option>`; }); }
}

// المتغير بيحفظ الشهور المدفوعة لكل طالب. مثال: {'studentCode': {'2026-08': true}}
window.monthlyPayments = JSON.parse(localStorage.getItem("monthlyPayments") || "{}");

// دالة لمعرفة هل الطالب مغطى في شهر الحصة دي ولا لأ
window.getMonthlyStatus = function(studentCode, sessionDate) {
    if(!sessionDate) return { isCovered: false, monthKey: "" };
    
    // استخراج الشهر من تاريخ الحصة (مثال: 2026-08)
    const monthKey = sessionDate.substring(0, 7); 
    const mp = monthlyPayments[studentCode] || {};
    
    return {
        isCovered: mp[monthKey] === true,
        monthKey: monthKey,
        monthName: getArabicMonthName(monthKey)
    };
};

function getArabicMonthName(yyyy_mm) {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    let m = parseInt(yyyy_mm.split('-')[1]);
    return months[m - 1] + " " + yyyy_mm.split('-')[0];
}

// دالة عرض جدول الماليات
window.renderFinanceTable = function() {
    const sessionId = document.getElementById("financeSessionSelect").value;
    const tbody = document.getElementById("finance-list");

    if (!sessionId) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">يرجى اختيار الحصة أولاً</td></tr>`;

    const session = classSessions.find(s => s.id === sessionId);
    if (!session) return;

    // 💡 سحب السعر والنظام من بيانات المجموعة اللي المدرس حددها وهو بيكريت المجموعة
    const groupObj = groups.find(g => g.name === session.group) || {};
    const groupPayType = groupObj.payType || 'session';
    const groupPrice = groupObj.price || 0;

    const groupStudents = students.filter(s => s.group === session.group);
    if (groupStudents.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">لا يوجد طلاب في هذه المجموعة</td></tr>`;

    const recordKey = `fin_session_${sessionId}`;
    if (!financeRecords[recordKey]) financeRecords[recordKey] = {};

    tbody.innerHTML = "";

    let totalIncome = 0, incomeFromSessions = 0, incomeFromMonths = 0, totalAttended = 0;
    let studentsNeedPayment = 0, studentsCovered = 0;

    groupStudents.forEach(student => {
        const attendanceStatus = session.attendance[student.code] || session.attendance[student.phone] || 'none';
        let attBadge = `<span style="color:var(--text-muted)">لم يسجل</span>`;
        if (attendanceStatus === 'present' || attendanceStatus === 'late') {
            attBadge = `<span style="color:${attendanceStatus === 'present' ? 'var(--success-color)' : '#f59e0b'}; font-weight:bold;">${attendanceStatus === 'present' ? 'حاضر' : 'متأخر'}</span>`;
            totalAttended++;
        } else if (attendanceStatus === 'absent') {
            attBadge = `<span style="color:var(--danger-color); font-weight:bold;">غائب</span>`;
        }

        // فحص حالة الدفع للشهر بتاع الحصة دي
        const monthlyStatus = getMonthlyStatus(student.code, session.date);
        let studentPayment = financeRecords[recordKey][student.code];
        
        let isSessionPaid = false, payAmount = 0;
        if (typeof studentPayment === 'object' && studentPayment !== null) {
            isSessionPaid = studentPayment.status === 'paid';
            payAmount = studentPayment.amount || 0;
        } else if (studentPayment === 'paid') { // دعم السجلات القديمة
            isSessionPaid = true; payAmount = student.isSpecialCase ? student.specialAmount : groupPrice;
        }

        let isCoveredByMonthly = groupPayType === 'month' && monthlyStatus.isCovered;
        let subscriptionNeedsRenewal = groupPayType === 'month' && !monthlyStatus.isCovered && !isSessionPaid;

        if (subscriptionNeedsRenewal) studentsNeedPayment++;
        if (isCoveredByMonthly) studentsCovered++;

        if (isSessionPaid) {
            totalIncome += payAmount;
            if (studentPayment.type === 'month') incomeFromMonths += payAmount;
            else incomeFromSessions += payAmount;
        }

        const nameStyle = subscriptionNeedsRenewal ? 'color: var(--danger-color); font-weight: bold; font-size: 15px;' : '';
        let subBadge = '';
        if (isCoveredByMonthly) {
            subBadge = `<div style="font-size: 11px; color: var(--success-color); margin-top: 3px;">✅ اشتراك ${monthlyStatus.monthName} ساري</div>`;
        } else if (subscriptionNeedsRenewal) {
            subBadge = `<div style="font-size: 11px; color: var(--danger-color); margin-top: 3px; font-weight: bold;">🔴 غير مسدد لاشتراك ${monthlyStatus.monthName}</div>`;
        }

        let actionBtn = "";
        if (isSessionPaid) {
            actionBtn = `<div style="display: flex; gap: 10px; align-items: center; justify-content: flex-end;">
                <span style="color: var(--success-color); font-weight: bold; font-size: 13px;">مُحصل (${payAmount} ج)</span>
                <button class="icon-btn danger" style="padding: 5px 10px;" onclick="cancelPayment('${recordKey}', '${student.code}', '${session.date}')" title="إلغاء التحصيل">إلغاء ❌</button>
            </div>`;
        } else if (isCoveredByMonthly) {
            actionBtn = `<span style="color: var(--success-color); font-weight: bold; font-size: 13px;">✅ مغطى بالشهر</span>`;
        } else {
            // لو السعر 0 (يعني المدرس مش مهتم بالحسابات)، مانطلعش زراير دفع
            if (groupPrice > 0) {
                let btnText = subscriptionNeedsRenewal ? `تجديد ${monthlyStatus.monthName} 💰` : "استلام نقدية 💰";
                let btnColor = subscriptionNeedsRenewal ? "var(--danger-color)" : "var(--primary-color)";
                let btnAnimation = subscriptionNeedsRenewal ? "animation: pulse-red 1.5s infinite;" : "";
                actionBtn = `<button class="save-btn" style="margin: 0; background: ${btnColor}; padding: 8px 15px; width: auto; ${btnAnimation}" onclick="confirmPayment('${recordKey}', '${student.code}', '${session.date}', ${(student.isSpecialCase ? student.specialAmount : groupPrice)}, '${groupPayType}')">${btnText}</button>`;
            } else {
                actionBtn = `<span style="color: var(--text-muted); font-size: 12px;">تسعير مجاني</span>`;
            }
        }

        let rowBg = '';
        if (isSessionPaid) rowBg = 'background: rgba(16, 185, 129, 0.05);';
        else if (isCoveredByMonthly) rowBg = 'background: rgba(16, 185, 129, 0.02);';
        else if (subscriptionNeedsRenewal) rowBg = 'background: rgba(239, 68, 68, 0.08);';

        tbody.innerHTML += `
            <tr style="${rowBg}">
                <td style="font-weight: bold; color: var(--primary-color);">${student.code}</td>
                <td style="${nameStyle}">${student.name}${subBadge}</td>
                <td>${attBadge}</td>
                <td><span class="badge" style="background: var(--bg-color); color:var(--text-muted);">${groupPayType === 'month' ? 'بالشهر' : 'بالحصة'}</span></td>
                <td style="text-align: left;">${actionBtn}</td>
            </tr>`;
    });

    renderSessionExpensesList(sessionId);
    const totalExtraExpenses = expenses.filter(e => e.sessionId === sessionId).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netProfit = totalIncome - totalExtraExpenses; // تم إزالة خصم السنتر لأنه بيتحسب مانيوال في المصروفات الإضافية

    document.getElementById("total-income").innerText = `${totalIncome} ج.م`;
    document.getElementById("income-details").innerText = groupPayType === 'month' ? `تجديدات الشهر: ${incomeFromMonths} ج` : `تحصيل الحصة: ${incomeFromSessions} ج`;
    
    let centerCutBox = document.getElementById("total-center-cut");
    if(centerCutBox) centerCutBox.parentElement.style.display = "none";
    
    document.getElementById("total-expenses").innerText = `${totalExtraExpenses} ج.م`;
    
    let profitEl = document.getElementById("net-profit");
    if(profitEl) {
        profitEl.innerText = `${netProfit} ج.م`;
        profitEl.style.color = netProfit >= 0 ? "var(--primary-color)" : "var(--danger-color)";
    }

    let subSummaryEl = document.getElementById("subscription-summary");
    if (subSummaryEl && groupPayType === 'month') {
        subSummaryEl.style.display = "flex";
        subSummaryEl.innerHTML = `<span style="color: var(--success-color);">✅ مسدد للشهر: ${studentsCovered}</span><span style="margin: 0 10px; color: var(--text-muted);">|</span><span style="color: var(--danger-color);">🔴 غير مسدد: ${studentsNeedPayment}</span>`;
    } else if (subSummaryEl) {
        subSummaryEl.style.display = "none";
    }
};

window.confirmPayment = function(recordKey, studentCode, sessionDate, amount, payType) {
    const monthKey = sessionDate.substring(0, 7);

    financeRecords[recordKey][studentCode] = { status: 'paid', type: payType, amount: amount, date: new Date().toISOString() };

    if (payType === 'month') {
        if(!monthlyPayments[studentCode]) monthlyPayments[studentCode] = {};
        monthlyPayments[studentCode][monthKey] = true; // تسجيل إن الشهر ده اتدفع
        localStorage.setItem("monthlyPayments", JSON.stringify(monthlyPayments));
        showToast(`تم تجديد اشتراك ${getArabicMonthName(monthKey)} بنجاح! 💸`);
    } else {
        showToast(`تم تحصيل ${amount} ج.م - دفع بالحصة 💸`);
    }

    localStorage.setItem("financeRecords", JSON.stringify(financeRecords));
    renderFinanceTable();
};

window.cancelPayment = function(recordKey, studentCode, sessionDate) {
    if (!confirm("هل أنت متأكد من إلغاء تحصيل هذا المبلغ؟")) return;
    const oldPayment = financeRecords[recordKey][studentCode];

    if (oldPayment && oldPayment.type === 'month') {
        const monthKey = sessionDate.substring(0, 7);
        if(monthlyPayments[studentCode]) {
            delete monthlyPayments[studentCode][monthKey];
        }
        localStorage.setItem("monthlyPayments", JSON.stringify(monthlyPayments));
        showToast("تم إلغاء تجديد الشهر ❌");
    } else {
        showToast("تم إلغاء الدفع");
    }

    delete financeRecords[recordKey][studentCode];
    localStorage.setItem("financeRecords", JSON.stringify(financeRecords));
    renderFinanceTable();
};

window.addSessionExpense = function() {
    const sessionId = document.getElementById("financeSessionSelect").value;
    if (!sessionId) return showToast("اختر الحصة أولاً!", "error");

    const desc = document.getElementById("expDesc").value.trim();
    const amount = parseFloat(document.getElementById("expAmount").value);

    if (!desc || !amount || amount <= 0) return showToast("أدخل بند ومبلغ صحيح!", "error");

    expenses.push({ id: "exp_" + Date.now(), sessionId, desc, amount });
    localStorage.setItem("expenses", JSON.stringify(expenses));
    document.getElementById("expDesc").value = "";
    document.getElementById("expAmount").value = "";
    renderFinanceTable();
    showToast("تمت إضافة المصروف 📉");
};

window.renderSessionExpensesList = function(sessionId) {
    const tbody = document.getElementById("expenses-list");
    if (!tbody) return;
    const sessionExpenses = expenses.filter(e => e.sessionId === sessionId);
    tbody.innerHTML = "";

    if (sessionExpenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">لا توجد مصروفات إضافية</td></tr>`;
        return;
    }

    sessionExpenses.forEach(exp => {
        tbody.innerHTML += `<tr><td>${exp.desc}</td><td style="color: var(--danger-color); font-weight: bold;">${exp.amount} ج</td><td><button class="icon-btn danger" onclick="deleteExpense('${exp.id}')">🗑️</button></td></tr>`;
    });
};

window.deleteExpense = function(expId) {
    if (!confirm("حذف هذا المصروف؟")) return;
    expenses = expenses.filter(e => e.id !== expId);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    renderFinanceTable();
};

function togglePayment(recordKey, studentCode, status) { 
    financeRecords[recordKey][studentCode] = status; 
    localStorage.setItem("financeRecords", JSON.stringify(financeRecords)); 
    renderFinanceTable(); 
}

window.renderAtRiskStudents = function() {
    const tbody = document.getElementById("atrisk-list"); 
    if (!tbody) return;
    
    if(students.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">لا يوجد طلاب</td></tr>`;
    }

    // 🚀 تسريع الخوارزمية: تجميع الحصص والامتحانات حسب المجموعة الأول بدل ما نفلتر لكل طالب من الـ 800
    let groupSessionsCache = {};
    let groupExamsCache = {};
    
    groups.forEach(g => {
        groupSessionsCache[g.name] = classSessions.filter(s => s.group === g.name).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 2);
        groupExamsCache[g.name] = exams.filter(e => e.group === g.name).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 2);
    });

    let atRiskCount = 0;
    let htmlContent = "";

    students.forEach(student => {
        let reasons = [];
        const gSessions = groupSessionsCache[student.group] || [];
        
        if(gSessions.length === 2) {
            let a1 = gSessions[0].attendance[student.code] || gSessions[0].attendance[student.phone];
            let a2 = gSessions[1].attendance[student.code] || gSessions[1].attendance[student.phone];
            if(a1 === 'absent' && a2 === 'absent') reasons.push("غياب آخر حصتين"); 
        }

        const gExams = groupExamsCache[student.group] || [];
        let failCount = 0; 
        gExams.forEach(ex => { 
            let grade = ex.grades[student.code] !== undefined ? ex.grades[student.code] : ex.grades[student.phone]; 
            if(grade !== undefined && parseFloat(grade) < (parseFloat(ex.maxScore) / 2)) failCount++; 
        });
        
        if(failCount === 2) reasons.push("رسوب في آخر امتحانين");
        
        if(reasons.length > 0) {
            atRiskCount++; 
            const msg = encodeURIComponent(`تحذير من الإدارة: مستوى ${student.name} متراجع بسبب ${reasons.join(" و ")}.`); 
            const waUrl = `https://wa.me/20${(student.parentPhone||"").replace(/^0+/, '')}?text=${msg}`;
            
            htmlContent += `<tr>
                <td><strong>${student.code}</strong></td>
                <td>${student.name}</td>
                <td>${student.group}</td>
                <td style="color:var(--danger-color); font-weight:bold;">${reasons.join("<br>")}</td>
                <td><button class="icon-btn" style="background-color:#128C7E; color:white;" onclick="window.open('${waUrl}','_blank')">إنذار</button></td>
            </tr>`;
        }
    });

    if(atRiskCount === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--success-color); font-weight:bold;">الطلاب في مستوى أمان!</td></tr>`;
    } else {
        tbody.innerHTML = htmlContent;
    }
};

function generateLeaderboard() {
    const group = document.getElementById("leaderboardGroup").value; const container = document.getElementById("leaderboard-results");
    if(!group) return container.innerHTML = `<p style="text-align: center; color: var(--text-muted);">اختر المجموعة</p>`;
    const groupStudents = students.filter(s => s.group === group); if(groupStudents.length === 0) return container.innerHTML = `<p style="text-align: center;">لا طلاب هنا</p>`;
    let leaderboard = groupStudents.map(student => {
        let score = 0; classSessions.filter(s => s.group === group).forEach(session => { if(session.attendance[student.phone] === 'present') score += 10; }); exams.filter(e => e.group === group).forEach(exam => { if(exam.grades[student.phone]) { score += (parseFloat(exam.grades[student.phone]) / parseFloat(exam.maxScore)) * 50; } }); homeworks.filter(h => h.group === group).forEach(hw => { if(hw.grades[student.phone]) { score += (parseFloat(hw.grades[student.phone]) / parseFloat(hw.maxScore)) * 20; } }); score += (student.behaviorPoints || 0); return { name: student.name, code: student.code, score: Math.round(score) };
    });
    leaderboard.sort((a, b) => b.score - a.score); const top5 = leaderboard.slice(0, 5); container.innerHTML = ""; const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
    top5.forEach((st, index) => { container.innerHTML += `<div class="stat-card" style="display:flex; justify-content:space-between; align-items:center; border-left: 5px solid var(--exam-color);"><div style="display:flex; gap:15px; align-items:center;"><span style="font-size:30px;">${medals[index] || "🏅"}</span><div><h3 style="margin-bottom:5px;">${st.name}</h3><p style="color:var(--primary-color);">الكود: ${st.code}</p></div></div><div style="text-align:center;"><p style="color:var(--text-muted); font-size:12px;">مجموع النقاط</p><p style="font-size:24px; font-weight:bold; color:var(--exam-color);">${st.score}</p></div></div>`; });
}



// =========================================================
// 🔍 2. نظام القراءة والاستعراض قبل الاسترجاع
// =========================================================
window.pendingBackupData = null; // متغير لحفظ الداتا مؤقتاً

window.previewBackupFile = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imp = JSON.parse(e.target.result);

            const importedStudents = imp.students || (imp.data && imp.data.students);
            const importedGroups = imp.groups || (imp.data && imp.data.groups);

            if (!importedStudents || !importedGroups) {
                if (typeof showToast === "function") showToast("❌ ملف غير صالح أو لا يحتوي على بيانات النظام الأساسية!", "error");
                event.target.value = "";
                return;
            }

            // استخراج الأرقام للعرض
            let stCount = importedStudents ? importedStudents.length : 0;
            let grpCount = importedGroups ? importedGroups.length : 0;
            let lecCount = 0;
            let codesCount = 0;

            if (imp.firebaseCloud) {
                if (imp.firebaseCloud.lectures) lecCount = Object.keys(imp.firebaseCloud.lectures).length;
                if (imp.firebaseCloud.chargeCodes) codesCount = Object.keys(imp.firebaseCloud.chargeCodes).length;
            }

            // تعبئة الأرقام في النافذة
            document.getElementById('prev-st-count').innerText = stCount;
            document.getElementById('prev-grp-count').innerText = grpCount;
            document.getElementById('prev-lec-count').innerText = lecCount;
            document.getElementById('prev-code-count').innerText = codesCount;

            // حفظ الداتا مؤقتاً
            window.pendingBackupData = imp;

            // إظهار نافذة التأكيد
            openModal('backupPreviewModal');

        } catch (err) {
            console.error(err);
            if (typeof showToast === "function") showToast("❌ حدث خطأ أثناء قراءة الملف!", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = ""; // تصفير حقل الإدخال عشان لو حب يختار نفس الملف تاني
};

window.cancelBackupRestore = function() {
    window.pendingBackupData = null;
    closeModal('backupPreviewModal');
};

// 1. دالة التصدير الشاملة (تم حل مشكلة فقدان الامتحانات الإلكترونية)
window.exportData = async function() {
    const uid = typeof getSafeUid === "function" ? getSafeUid() : "AlQaisar_System";
    const dbBaseUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}`;
    
    const exportBtn = document.querySelector('button[onclick="exportData()"]');
    const origBtnHtml = exportBtn ? exportBtn.innerHTML : "";
    if (exportBtn) {
        exportBtn.innerHTML = `<span>⏳</span> جاري سحب جميع البيانات...`;
        exportBtn.disabled = true;
    }
    if (typeof showToast === "function") showToast("جاري تجميع الكورسات والامتحانات وبيانات السحابة... ⏳", "info");

    let cloudSnapshot = {};
    try {
        let res = await fetch(`${dbBaseUrl}.json`);
        if (res.ok) {
            cloudSnapshot = await res.json() || {};
        }
    } catch (e) {
        console.warn("تعذر الاتصال بالسحابة، سيتم أخذ النسخة من البيانات المحلية:", e);
    }

    // 🔥 التعديل السحري: سحب الامتحانات الإلكترونية من السحابة مباشرة
    let safeOnlineExams = [];
    if (cloudSnapshot.data && cloudSnapshot.data.onlineExams) {
        safeOnlineExams = cloudSnapshot.data.onlineExams;
    } else if (window.fetchedOnlineExams && window.fetchedOnlineExams.length > 0) {
        safeOnlineExams = window.fetchedOnlineExams;
    }

    const localData = {
        students: students || [],
        groups: groups || [],
        classSessions: classSessions || [],
        exams: exams || [],
        homeworks: homeworks || [],
        financeRecords: financeRecords || {},
        expenses: expenses || [],
        schedule: schedule || [],
        books: books || [],
        onlineExams: safeOnlineExams, // 👈 هنا تم حل المشكلة
        monthlyPayments: window.monthlyPayments || JSON.parse(localStorage.getItem("monthlyPayments")) || {},
        systemLogs: typeof systemLogs !== "undefined" ? systemLogs : (JSON.parse(localStorage.getItem("systemLogs")) || []),
        activeLevels: window.activeLevels || JSON.parse(localStorage.getItem("activeLevels")) || ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"],
        settings: {
            teacherName: localStorage.getItem("teacherName") || "بدر على",
            centerName: localStorage.getItem("centerName") || "القيصر",
            adminUser: localStorage.getItem("adminUser") || "admin",
            adminPass: localStorage.getItem("adminPass") || "12345",
            adminPin: localStorage.getItem("adminPin") || "1234",
            phoneNumbers: localStorage.getItem("teacherPhones") || "",
            parentMsgTemplate: localStorage.getItem("parentMsgTemplate") || "",
            studentMsgTemplate: localStorage.getItem("studentMsgTemplate") || "",
            botEnabled: localStorage.getItem("botEnabled") || "false",
            botName: localStorage.getItem("botName") || "أوكتو",
            botInstructions: localStorage.getItem("botInstructions") || ""
        }
    };

    const fullBackupPayload = {
        backupVersion: "AlQaisar_System_FULL_V3",
        exportedAt: new Date().toISOString(),
        students: localData.students,
        groups: localData.groups,
        classSessions: localData.classSessions,
        exams: localData.exams,
        homeworks: localData.homeworks,
        financeRecords: localData.financeRecords,
        expenses: localData.expenses,
        schedule: localData.schedule,
        books: localData.books,
        onlineExams: localData.onlineExams,
        monthlyPayments: localData.monthlyPayments,
        systemLogs: localData.systemLogs,
        activeLevels: localData.activeLevels,
        settings: localData.settings,
        firebaseCloud: {
            lectures: cloudSnapshot.lectures || {},
            chargeCodes: cloudSnapshot.chargeCodes || {},
            student_vault: cloudSnapshot.student_vault || {},
            course_tracking: cloudSnapshot.course_tracking || {},
            onlineSubmissions: cloudSnapshot.onlineSubmissions || {}, // 👈 إجابات الطلاب للامتحانات الإلكترونية
            notifications: cloudSnapshot.notifications || {},
            store: cloudSnapshot.store || {},
            forum: cloudSnapshot.forum || {},
            assistants: cloudSnapshot.assistants || {},
            join_requests: cloudSnapshot.join_requests || {},
            wallet_requests: cloudSnapshot.wallet_requests || {}
        }
    };

    const blob = new Blob([JSON.stringify(fullBackupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `AlQaisar_System_Master_Backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (exportBtn) {
        exportBtn.innerHTML = origBtnHtml;
        exportBtn.disabled = false;
    }
    if (typeof showToast === "function") {
        showToast("✅ تم تحميل النسخة الاحتياطية الشاملة بنجاح!", "success");
    }
};

// 2. دالة التأكيد والاسترجاع الفعلي ورفع البيانات للسحابة
window.confirmBackupRestore = async function() {
    if (!window.pendingBackupData) return;
    
    let btn = document.getElementById("confirmRestoreBtn");
    let origText = btn.innerHTML;
    btn.innerHTML = "جاري الكتابة والرفع للسحابة... ⏳";
    btn.disabled = true;

    if (typeof showToast === "function") showToast("⏳ جاري استرجاع البيانات ورفع الكورسات والامتحانات للسحابة...", "info");
    window.isIncomingSync = true; // إيقاف المزامنة التلقائية مؤقتاً

    try {
        const imp = window.pendingBackupData;
        const importedStudents = imp.students || (imp.data && imp.data.students) || [];
        const importedGroups = imp.groups || (imp.data && imp.data.groups) || [];

        // أ. استرجاع البيانات المحلية في LocalStorage
        localStorage.setItem("students", JSON.stringify(importedStudents));
        localStorage.setItem("groups", JSON.stringify(importedGroups));
        localStorage.setItem("classSessions", JSON.stringify(imp.classSessions || []));
        localStorage.setItem("exams", JSON.stringify(imp.exams || []));
        localStorage.setItem("homeworks", JSON.stringify(imp.homeworks || []));
        localStorage.setItem("financeRecords", JSON.stringify(imp.financeRecords || {}));
        localStorage.setItem("expenses", JSON.stringify(imp.expenses || []));
        localStorage.setItem("schedule", JSON.stringify(imp.schedule || []));
        localStorage.setItem("books", JSON.stringify(imp.books || []));
        localStorage.setItem("onlineExams", JSON.stringify(imp.onlineExams || []));
        localStorage.setItem("monthlyPayments", JSON.stringify(imp.monthlyPayments || {}));
        
        if (imp.systemLogs) localStorage.setItem("systemLogs", JSON.stringify(imp.systemLogs));
        if (imp.activeLevels) localStorage.setItem("activeLevels", JSON.stringify(imp.activeLevels));

        if (imp.settings) {
            if (imp.settings.teacherName) localStorage.setItem("teacherName", imp.settings.teacherName);
            if (imp.settings.centerName) localStorage.setItem("centerName", imp.settings.centerName);
            if (imp.settings.adminUser) localStorage.setItem("adminUser", imp.settings.adminUser);
            if (imp.settings.adminPass) localStorage.setItem("adminPass", imp.settings.adminPass);
            if (imp.settings.adminPin) localStorage.setItem("adminPin", imp.settings.adminPin);
            if (imp.settings.phoneNumbers !== undefined) localStorage.setItem("teacherPhones", imp.settings.phoneNumbers);
            if (imp.settings.parentMsgTemplate) localStorage.setItem("parentMsgTemplate", imp.settings.parentMsgTemplate);
            if (imp.settings.studentMsgTemplate) localStorage.setItem("studentMsgTemplate", imp.settings.studentMsgTemplate);
            if (imp.settings.botEnabled) localStorage.setItem("botEnabled", imp.settings.botEnabled);
            if (imp.settings.botName) localStorage.setItem("botName", imp.settings.botName);
            if (imp.settings.botInstructions) localStorage.setItem("botInstructions", imp.settings.botInstructions);
        }

        // ب. تحديث المتغيرات في الذاكرة لتجهيز الرفع
        students = importedStudents;
        groups = importedGroups;
        classSessions = imp.classSessions || [];
        exams = imp.exams || [];
        homeworks = imp.homeworks || [];
        financeRecords = imp.financeRecords || {};
        expenses = imp.expenses || [];
        schedule = imp.schedule || [];
        books = imp.books || [];
        // 👈 التأكد من سحب الامتحانات الإلكترونية في حالة النسخ القديمة
        window.fetchedOnlineExams = imp.onlineExams || (imp.data && imp.data.onlineExams) || []; 
        window.monthlyPayments = imp.monthlyPayments || {};

        // ج. رفع واسترجاع جميع أقسام الفايربيز السحابية دفعة واحدة
        const uid = typeof getSafeUid === "function" ? getSafeUid() : "AlQaisar_System";
        const dbBaseUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}`;

        const cloudRestorePayload = {
            data: {
                students: students,
                groups: groups,
                classSessions: classSessions,
                exams: exams,
                homeworks: homeworks,
                financeRecords: financeRecords,
                expenses: expenses,
                schedule: schedule,
                books: books,
                onlineExams: window.fetchedOnlineExams,
                monthlyPayments: window.monthlyPayments,
                settings: imp.settings || {}
            }
        };

        if (imp.firebaseCloud) {
            Object.keys(imp.firebaseCloud).forEach(cloudKey => {
                if (imp.firebaseCloud[cloudKey] !== undefined) {
                    cloudRestorePayload[cloudKey] = imp.firebaseCloud[cloudKey];
                }
            });
        }

        await fetch(`${dbBaseUrl}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudRestorePayload)
        });

        window.isIncomingSync = false;
        
        window.pendingBackupData = null;
        closeModal('backupPreviewModal');

        alert("🎉 تم استرجاع النسخة الشاملة (بيانات السنتر + الكورسات + الامتحانات الإلكترونية) بنجاح!");
        location.reload();

    } catch (err) {
        window.isIncomingSync = false;
        console.error("Backup Restore Error:", err);
        btn.innerHTML = origText;
        btn.disabled = false;
        if (typeof showToast === "function") showToast("❌ حدث خطأ أثناء رفع بيانات النسخة الاحتياطية!", "error");
    }
};

function downloadExcelTemplate() { const headers = [["الاسم", "الصف", "المجموعة", "هاتف الطالب", "هاتف ولي الأمر", "الجنس"]]; const worksheet = XLSX.utils.aoa_to_sheet(headers); worksheet['!cols'] = [{wch: 25}, {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 10}]; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب"); XLSX.writeFile(workbook, "نموذج_إضافة_الطلاب.xlsx"); showToast("تم تحميل النموذج!"); }

function importStudentsFromExcel(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
            const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            let addedCount = 0, errorCount = 0;
            
            excelData.forEach(row => {
                const name = row['الاسم'], level = row['الصف'], group = row['المجموعة'], phone = row['هاتف الطالب'] || '', parentPhone = row['هاتف ولي الأمر'] || '', gender = row['الجنس'] || 'ذكر';
                
                if(name && level && group) {
                   const duplicate = students.find(s => 
        s.code === code || 
        (phone !== "0" && s.phone === phone)
    );
                    if(!duplicate) { 
                        // --- 🚀 الذكاء هنا: تنظيف اسم المجموعة ومطابقته بالسيستم ---
                        let excelGroup = group.toString().trim();
                        // بندور في المجموعات بتاعتك على اسم مشابه حتى لو فيه مسافات زيادة
                        let matchedGroup = groups.find(g => normalizeArabicName(g.name) === normalizeArabicName(excelGroup));
                        // لو لقاها بياخد الاسم الأصلي النظيف بتاع السيستم، لو ملقاهاش بياخد اللي في الإكسيل
                        let finalGroup = matchedGroup ? matchedGroup.name : excelGroup;

                        students.push({ 
                            code: generateStudentCode(), 
                            name: name.toString().trim(), 
                            level: level.toString().trim(), 
                            group: finalGroup, 
                            phone: phone.toString().trim(), 
                            parentPhone: parentPhone.toString().trim(), 
                            gender: gender.toString().trim(), 
                            behaviorPoints: 0 
                        }); 
                        addedCount++; 
                    } else { 
                        errorCount++; 
                    }
                }
            });
            localStorage.setItem("students", JSON.stringify(students)); 
            renderTable(); 
            showToast(`تم استيراد ${addedCount} بنجاح، وتجاهل ${errorCount} مكرر.`);
            
            // رفع البيانات على السحابة أوتوماتيك بعد الاستيراد
            if (typeof syncDataToBot === "function") syncDataToBot();
            
        } catch(err) { 
            showToast("خطأ أثناء قراءة الملف!", "error"); 
        }
    };
    reader.readAsArrayBuffer(file); event.target.value = "";
}

// ==========================================
// 17. الرصد الصوتي (EduVoice)
// ==========================================
let isListening = false; let speechRecog = null;
function toggleVoiceRecognition(mode, inputId) {
    if (navigator.brave && navigator.brave.isBrave) return showToast("Brave يمنع الرصد الصوتي. استخدم Chrome", "error");
    const btn = document.getElementById(`voiceBtn_${mode}`); const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("متصفحك لا يدعم الرصد الصوتي.", "error");
    if (isListening) { isListening = false; if(speechRecog) speechRecog.stop(); btn.classList.remove('pulse-mic'); btn.innerText = "🎙️ رصد بالصوت"; return; }
    
    speechRecog = new SpeechRecognition(); speechRecog.lang = 'ar-EG'; speechRecog.continuous = true;
    speechRecog.onstart = function() { isListening = true; btn.classList.add('pulse-mic'); btn.innerText = "يستمع الآن..."; };
    speechRecog.onresult = function(event) { const transcript = event.results[event.results.length - 1][0].transcript.trim(); processVoiceCommand(transcript, mode, inputId); };
    speechRecog.onerror = function(event) { isListening = false; btn.classList.remove('pulse-mic'); btn.innerText = "🎙️ رصد بالصوت"; };
    speechRecog.onend = function() { if (isListening) { try { speechRecog.start(); } catch(e) {} } else { btn.classList.remove('pulse-mic'); btn.innerText = "🎙️ رصد بالصوت"; } };
    try { speechRecog.start(); } catch(e) {}
}

function processVoiceCommand(text, mode, inputId) {
    let activeGroupId = mode === 'attendance' ? classSessions.find(s => s.id === currentActiveSessionId)?.group : (mode === 'exam' ? exams.find(e => e.id === currentActiveExamId)?.group : homeworks.find(h => h.id === currentActiveHwId)?.group);
    if(!activeGroupId) return;
    let matchedStudent = null;
    for(let st of students.filter(s => s.group === activeGroupId)) {
        const nameParts = normalizeArabicName(st.name).split(' ');
        if(nameParts.length >= 2 && normalizeArabicName(text).includes(nameParts[0]) && normalizeArabicName(text).includes(nameParts[nameParts.length-1])) { matchedStudent = st; break; } 
        else if(normalizeArabicName(text).includes(nameParts[0])) { matchedStudent = st; break; }
    }
    if(!matchedStudent) return showToast(`لم أتعرف على الطالب!`, "error");

    if(mode === 'attendance') {
        if(text.includes('غايب')) { markAttendance(matchedStudent.phone, 'absent'); showToast(`🎙️ غياب: ${matchedStudent.name}`); } 
        else { markAttendance(matchedStudent.phone, 'present'); showToast(`🎙️ حضور: ${matchedStudent.name}`); }
    } else {
        let gradeMatch = text.match(/\d+/); let finalGrade = gradeMatch ? gradeMatch[0] : null;
        if(finalGrade !== null) { document.getElementById(inputId).value = matchedStudent.code; if(mode === 'exam') { document.getElementById('examBarcodeGrade').value = finalGrade; submitExamBarcodeGrade(); } else { document.getElementById('hwBarcodeGrade').value = finalGrade; submitHwBarcodeGrade(); } }
    }
}

// ==========================================
// 18. الواتساب والإرسال الجماعي (الخلفية)
// ==========================================
function getRandomGreeting() { const greetings = ["أهلاً بحضرتك", "مرحباً بك", "السلام عليكم"]; return greetings[Math.floor(Math.random() * greetings.length)]; }

async function sendAutoWhatsApp(phone, message) {
    // لو الرقم 0، بلاش يبعت واتساب خالص
    if (!phone || String(phone).trim() === "" || String(phone).trim() === "0") return false;
    if (!phone || String(phone).trim() === "") return false;
    let fPhone = String(phone).trim(); if (fPhone.startsWith("0") && fPhone.length === 11) fPhone = "20" + fPhone.substring(1);
    try {
        // 🔥 استخدام المتغير الجديد للاتصال بالسيرفر
        let response = await fetch(`${WHATSAPP_SERVER_URL}/send`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ clientId: getSafeUid(), phone: fPhone, message: message }) 
});
        return (await response.json()).success === true; 
    } catch(e) { return false; }
}

function toggleSessionStatus(id) { 
    const session = classSessions.find(s => s.id === id); 
    if(!session) return;
    if(session.status === 'open') { 
        document.getElementById('closeSessionId').value = id;
        document.getElementById('sendExamCheck').parentElement.style.display = exams.some(e => e.group === session.group && e.date === session.date) ? 'flex' : 'none';
        document.getElementById('sendHwCheck').parentElement.style.display = homeworks.some(h => h.group === session.group && h.date === session.date) ? 'flex' : 'none';
        openModal('closeSessionModal');
    } else {
        session.status = 'open'; localStorage.setItem("classSessions", JSON.stringify(classSessions)); renderSessionCards(); showToast("تم فتح الحصة");
    }
}

function updateBroadcastCount() { const target = document.getElementById('broadcastTarget').value; document.getElementById('targetCount').innerText = target === 'all' ? students.length : students.filter(s => s.group === target).length; }





// ==========================================
// وظائف نافذة إضافة طالب من داخل المجموعة
// ==========================================

// 1. فتح نافذة إضافة طالب للمجموعة الحالية
window.openAddStudentToGroupModal = function() {
    if(!currentActiveGroup) return;
    
    const select = document.getElementById("existingStudentSelect");
    if(select) {
        select.innerHTML = '<option value="">اختر طالب مسجل...</option>';
        const activeGroupObj = groups.find(g => g.name === currentActiveGroup);
        const groupLevel = activeGroupObj ? activeGroupObj.level : null;
        
        // عرض الطلاب في نفس الصف لكن مش في المجموعة دي
        students.filter(s => s.group !== currentActiveGroup && (!groupLevel || s.level === groupLevel))
                .forEach(s => {
                    select.innerHTML += `<option value="${s.code}">${s.name} (${s.code})</option>`;
                });
    }
    
    switchAddStudentTab('existing');
    openModal("addStudentToGroupModal");
};

// 2. التبديل بين إضافة "طالب مسجل" و "طالب جديد"
window.switchAddStudentTab = function(tab) {
    if(tab === 'existing') {
        document.getElementById("addExistingStudentForm").style.display = "block";
        document.getElementById("newStudentTabContent").style.display = "none";
    } else {
        document.getElementById("addExistingStudentForm").style.display = "none";
        document.getElementById("newStudentTabContent").style.display = "block";
    }
};

// 3. الانتقال لتسجيل طالب جديد مع تحديد المجموعة والصف أوتوماتيكياً
window.goToNewStudentForm = function() {
    closeModal("addStudentToGroupModal");
    openModal("addStudentModal");
    
    const activeGroupObj = groups.find(g => g.name === currentActiveGroup);
    if(activeGroupObj) {
        const levelSelect = document.getElementById("studentLevel");
        if(levelSelect) {
            levelSelect.value = activeGroupObj.level;
            filterGroupsByLevel('studentLevel', 'studentGroup');
            setTimeout(() => {
                const groupSelect = document.getElementById("studentGroup");
                if(groupSelect) groupSelect.value = currentActiveGroup;
            }, 50);
        }
    }
};

// 4. حفظ وتسجيل الطالب الحالي في المجموعة
document.getElementById("addExistingStudentForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const code = document.getElementById("existingStudentSelect").value;
    
    if(!code) return showToast("يرجى اختيار طالب!", "error");
    
    const studentIndex = students.findIndex(s => s.code === code);
    if(studentIndex > -1) {
        students[studentIndex].group = currentActiveGroup;
        localStorage.setItem("students", JSON.stringify(students));
        
        closeModal("addStudentToGroupModal");
        renderGroupStudentsTable();
        renderGroupCards(); // لتحديث عدد طلاب المجموعة في الكروت الخارجية
        showToast("تم إضافة الطالب للمجموعة بنجاح ✅");
    }
});


// ==========================================
// 2. نظام الإرسال الجماعي المطور (حظر الزر والأنيميشن)
// ==========================================
// دالة مساعدة للتأخير الزمني العشوائي (لحماية الرقم من الحظر)
window.randomSleep = function(min = 2000, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
};



// ==========================================
// 🧠 معالج قوالب الرسائل الذكي (المطور بالترحيب العشوائي)
// ==========================================
window.processMessageTemplate = function(template, student, session, reportData) {
    let tName = localStorage.getItem("teacherName") || "المدير";
    let cName = localStorage.getItem("centerName") || "السنتر";
    let nowTime = new Date().toLocaleTimeString('ar-EG');
    
    // 🎲 1. قاموس الترحيبات العشوائية
    const parentGreetings = [
        "أهلاً بحضرتك",
        "مرحباً بك",
        "السلام عليكم ورحمة الله،",
        "تحياتنا لحضرتك",
        "أهلاً وسهلاً بك",
        "طاب يومك"
    ];

    const studentGreetings = [
        "أهلاً بيك يا بطل",
        "عاش يا وحش",
        "أخبار المذاكرة إيه يا",
        "شد حيلك يا نجم",
        "يا هلا بالبطل",
        "مستعد للقمة يا",
        "إيه الأخبار يا"
    ];

    // اختيار ترحيب عشوائي لكل رسالة
    let randomParentGreeting = parentGreetings[Math.floor(Math.random() * parentGreetings.length)];
    let randomStudentGreeting = studentGreetings[Math.floor(Math.random() * studentGreetings.length)];
    
    let finalTemplate = template;
    
    // 🛡️ حماية ذكية: لو المدرس نسي يكتب {تفاصيل_التقرير} في الإعدادات، السيستم هيضيفه إجبارياً
    if (!finalTemplate.includes('{تفاصيل_التقرير}')) {
        finalTemplate += "\n\n{تفاصيل_التقرير}";
    }

    // 2. استبدال المتغيرات الثابتة ومتغيرات الترحيب العشوائي
    let msg = finalTemplate
        .replace(/{ترحيب_ولي_الأمر}/g, randomParentGreeting) // يعطي ترحيب عشوائي لولي الأمر
        .replace(/{ترحيب_الطالب}/g, randomStudentGreeting)    // يعطي ترحيب عشوائي للطالب
        .replace(/{اسم_الطالب}/g, student.name || "")
        .replace(/{كود_الطالب}/g, student.code || "")
        .replace(/{رقم_الطالب}/g, (student.phone && student.phone !== "0") ? student.phone : "غير مسجل")
        .replace(/{رقم_ولي_الأمر}/g, (student.parentPhone && student.parentPhone !== "0") ? student.parentPhone : "غير مسجل")
        .replace(/{المجموعة}/g, student.group || "")
        .replace(/{الموضوع}/g, session.topic || 'حصة عادية')
        .replace(/{تفاصيل_التقرير}/g, reportData)
        .replace(/{اسم_السنتر}/g, cName)
        .replace(/{اسم_المدير}/g, tName)
        .replace(/{وقت_الرسالة}/g, nowTime);

    // 3. معالجة الـ Spintax اليدوي لو المدرس استخدمه {كلمة1|كلمة2}
    msg = msg.replace(/\{([^{}]*)\}/g, function(match, contents) {
        if (contents.includes('|')) {
            let options = contents.split('|');
            return options[Math.floor(Math.random() * options.length)];
        }
        return contents; 
    });
    
    return msg;
};


// ==========================================
// 🖱️ نظام إدراج المتغيرات التفاعلي في مكان المؤشر (Cursor Tracking)
// ==========================================
let lastFocusedMsgBox = null;

// تتبع المربع الذي يقف فيه المستخدم حالياً
document.addEventListener('DOMContentLoaded', () => {
    const parentBox = document.getElementById('settingParentMsg');
    const studentBox = document.getElementById('settingStudentMsg');
    
    if(parentBox) {
        parentBox.addEventListener('focus', () => lastFocusedMsgBox = parentBox);
        parentBox.addEventListener('blur', () => { /* لا نفرغ المتغير لنحتفظ بآخر مربع */ });
    }
    if(studentBox) {
        studentBox.addEventListener('focus', () => lastFocusedMsgBox = studentBox);
        studentBox.addEventListener('blur', () => { /* لا نفرغ المتغير لنحتفظ بآخر مربع */ });
    }
});

// دالة زرع المتغير في النص
window.insertVariable = function(variableText) {
    let targetBox = lastFocusedMsgBox;
    
    // لو المدرس مضغطش على أي مربع، نختار مربع ولي الأمر كافتراضي
    if (!targetBox) {
        targetBox = document.getElementById('settingParentMsg');
        if(!targetBox) return;
        showToast("💡 تم الإدراج في رسالة ولي الأمر (اضغط على مربع الطالب إذا أردت الإدراج هناك).", "info");
    }

    // تحديد مكان المؤشر الحالي
    const startPos = targetBox.selectionStart;
    const endPos = targetBox.selectionEnd;
    const text = targetBox.value;

    // دمج المتغير في النص
    targetBox.value = text.substring(0, startPos) + variableText + text.substring(endPos);
    
    // إعادة المؤشر بعد المتغير مباشرة عشان يقدر يكمل كتابة
    const newCursorPos = startPos + variableText.length;
    targetBox.setSelectionRange(newCursorPos, newCursorPos);
    targetBox.focus();

    // تشغيل أنيميشن خفيف للمربع عشان يلفت انتباهه إن الإضافة تمت
    targetBox.style.transition = "all 0.2s";
    targetBox.style.backgroundColor = "#f0fdf4"; // أخضر فاتح
    targetBox.style.borderColor = "#10b981";
    setTimeout(() => {
        targetBox.style.backgroundColor = "";
        targetBox.style.borderColor = "";
    }, 300);
};

// دالة مساعدة للتأخير الزمني العشوائي (لحماية الرقم من الحظر)
window.randomSleep = function(min = 2000, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
};



// ==========================================
// 🚀 إغلاق الحصة، وإرسال التقارير (مع الحماية الدقيقة من الحظر)
// ==========================================
window.confirmCloseSession = async function(sendMessages) {
    const session = classSessions.find(s => s.id === document.getElementById('closeSessionId').value); 
    if(!session) return;
    
    // تحديث الغياب للمتغيبين
    students.filter(s => s.group === session.group).forEach(st => {
        if (!session.attendance[st.code] && !session.attendance[st.phone]) {
            session.attendance[st.code] = 'absent';
            if(typeof notifyParentApp === 'function') notifyParentApp(st.code, "غياب عن الحصة ❌", `تنبيه: الطالب/ة ${st.name} غائب عن حصة (${session.topic || 'اليوم'}).`);
        }
    });
    
    session.status = 'closed'; 
    closeModal('closeSessionModal'); 

    if(!sendMessages) { 
        localStorage.setItem("classSessions", JSON.stringify(classSessions)); 
        renderSessionCards(); 
        return showToast("تم الإغلاق وتسجيل الغياب للباقين (بدون رسائل)."); 
    }
    
    let targetStudents = students.filter(s => s.group === session.group); 
    if(targetStudents.length === 0) return showToast("لا يوجد طلاب في هذه المجموعة!", "error");
    
    session.isSending = true; 
    session.sentProgress = 0; 
    session.sentTotal = targetStudents.length; 
    session.reportData = { success: [], failed: [] };
    
    localStorage.setItem("classSessions", JSON.stringify(classSessions)); 
    renderSessionCards();
    
    const sessionExam = exams.find(e => e.group === session.group && e.date === session.date);
    const sessionHw = homeworks.find(h => h.group === session.group && h.date === session.date);
    
    (async () => {
        let messagesSentForBatch = 0; // 🌟 عداد الاستراحة الطويلة
        let currentStudentIndex = 0;

        for (let st of targetStudents) {
            currentStudentIndex++;
            let reportData = ``;
            let att = session.attendance[st.code] || session.attendance[st.phone];
            let ex = sessionExam ? (sessionExam.grades[st.code] !== undefined ? sessionExam.grades[st.code] : sessionExam.grades[st.phone]) : undefined;
            let hw = sessionHw ? (sessionHw.grades[st.code] !== undefined ? sessionHw.grades[st.code] : sessionHw.grades[st.phone]) : undefined;
            
            if(document.getElementById('sendAttCheck').checked) reportData += `📋 *الحضور:* ${att === 'present' ? 'حاضر ✅' : (att === 'late' ? 'متأخر ⏳' : 'غائب ❌')}\n`;
            if(document.getElementById('sendExamCheck').checked && sessionExam) reportData += `📝 *الامتحان:* ${ex !== undefined ? ex + ' / ' + sessionExam.maxScore + ' ⭐' : 'لم يمتحن ⚠️'}\n`;
            if(document.getElementById('sendHwCheck').checked && sessionHw) reportData += `📚 *الواجب:* ${hw !== undefined ? hw + ' / ' + sessionHw.maxScore + ' 📚' : 'لم يسلم ⚠️'}\n`;
            
            let defParent = "{أهلاً بحضرتك|مرحباً بك|السلام عليكم} ولي أمر الطالب/ة: *{اسم_الطالب}*،\nنحيطكم علماً بتقرير حصة ({الموضوع}).\n\n{تفاصيل_التقرير}\n\nمع تحيات إدارة {اسم_السنتر}\n⏱️ {وقت_الرسالة}";
            let defStudent = "{أهلاً بيك يا بطل|عاش يا وحش|أخبار المذاكرة إيه يا} *{اسم_الطالب}* 👑\nده تقرير حصتك النهاردة ({الموضوع}):\n\n{تفاصيل_التقرير}\n\nبالتوفيق! 💪\nإدارة {اسم_السنتر}";
            
            let pTemplate = localStorage.getItem("parentMsgTemplate") || defParent;
            let sTemplate = localStorage.getItem("studentMsgTemplate") || defStudent;

            let parentMsg = processMessageTemplate(pTemplate, st, session, reportData);
            let studentMsg = processMessageTemplate(sTemplate, st, session, reportData);

            // إرسال لولي الأمر
            if (st.parentPhone) {
                let isOk = await sendAutoWhatsApp(st.parentPhone, parentMsg);
                if (isOk) session.reportData.success.push({ name: st.name, code: st.code, target: 'ولي الأمر', phone: st.parentPhone });
                else session.reportData.failed.push({ name: st.name, code: st.code, target: 'ولي الأمر', phone: st.parentPhone });
                messagesSentForBatch++;
            }

            // 🌟 تطبيق الاستراحة الطويلة لو وصلنا 20 رسالة
            if (messagesSentForBatch >= 20) {
                let pText = document.getElementById(`prog-text-${session.id}`); 
                if(pText) pText.innerText = "☕ استراحة أمان...";
                await window.randomSleep(30000, 60000); // استراحة من 30 لـ 60 ثانية
                messagesSentForBatch = 0;
            }
            
            // إرسال للطالب
            if (st.phone && st.phone !== st.parentPhone) {
                if (st.parentPhone) await window.randomSleep(2000, 4000); // 🌟 فاصل صغير بين رسالة الأب والابن
                let isOk = await sendAutoWhatsApp(st.phone, studentMsg);
                if (isOk) session.reportData.success.push({ name: st.name, code: st.code, target: 'الطالب', phone: st.phone });
                else session.reportData.failed.push({ name: st.name, code: st.code, target: 'الطالب', phone: st.phone });
                messagesSentForBatch++;
            }

            // 🌟 تطبيق الاستراحة الطويلة لو وصلنا 20 رسالة
            if (messagesSentForBatch >= 20) {
                let pText = document.getElementById(`prog-text-${session.id}`); 
                if(pText) pText.innerText = "☕ استراحة أمان...";
                await window.randomSleep(30000, 60000);
                messagesSentForBatch = 0;
            }

            // تحديث شريط التحميل خطوة بخطوة بعد الإرسال الفعلي
            session.sentProgress++;
            let pText = document.getElementById(`prog-text-${session.id}`); 
            let pBar = document.getElementById(`prog-bar-${session.id}`);
            if(pText) pText.innerText = `${session.sentProgress}/${session.sentTotal}`; 
            if(pBar) pBar.style.width = `${(session.sentProgress/session.sentTotal)*100}%`;

            // 🌟 استراحة عشوائية بين كل طالب والتاني عشان الواتساب ميقفلش الرقم
            if (currentStudentIndex < targetStudents.length) {
                await window.randomSleep(3000, 6000); 
            }
        }
        
        session.isSending = false; 
        localStorage.setItem("classSessions", JSON.stringify(classSessions)); 
        renderSessionCards(); 
        showToast(`✅ اكتمل إرسال تقارير حصة: ${session.topic}`);
    })();
};



// ==========================================
// 🚀 نظام الإرسال الجماعي المطور (الإعلانات)
// ==========================================
window.startBroadcast = async function() {
    const btn = document.getElementById('startBroadcastBtn');
    const target = document.getElementById('broadcastTarget').value;
    const msg = document.getElementById('broadcastMessage').value.trim();
    const recipientType = document.querySelector('input[name="recipientType"]:checked').value; 

    if(!msg) return showToast("اكتب الرسالة أولاً!", "error");

    let validTasks = [];
    (target === 'all' ? students : students.filter(s => s.group === target)).forEach(st => {
        if ((recipientType === 'parent' || recipientType === 'both') && st.parentPhone) validTasks.push(st.parentPhone);
        if ((recipientType === 'student' || recipientType === 'both') && st.phone) validTasks.push(st.phone);
    });

    if(validTasks.length === 0) return showToast("لا توجد أرقام صالحة للإرسال!", "error");

    btn.disabled = true;
    btn.innerText = "⏳ جاري الإرسال، لا تغلق الصفحة...";
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";

    document.getElementById('broadcastProgressContainer').style.display = 'block'; 
    let sent = 0;
    let successCount = 0;
    let messagesSentForBatch = 0; // 🌟 عداد الاستراحة الطويلة
    
    for (let phoneNum of validTasks) {
        const finalMsg = `📢 *إعلان هام*\n${msg}`;
        
        // انتظار السيرفر حتى يرسل الرسالة
        let isOk = await sendAutoWhatsApp(phoneNum, finalMsg);
        if (isOk) successCount++;
        
        sent++;
        messagesSentForBatch++;
        
        let percent = Math.round((sent / validTasks.length) * 100);
        document.getElementById('broadcastProgressBar').style.width = percent + '%';
        document.getElementById('broadcastProgressText').innerText = `تم إرسال ${sent} من ${validTasks.length} (نجح: ${successCount})`;

        // 🌟 تطبيق الاستراحة الطويلة أو العادية
        if (messagesSentForBatch >= 20 && sent < validTasks.length) {
            document.getElementById('broadcastProgressText').innerText = "☕ استراحة أمان لتجنب الحظر...";
            await window.randomSleep(30000, 60000);
            messagesSentForBatch = 0;
        } else if (sent < validTasks.length) {
            await window.randomSleep(3000, 6000);
        }
    }
    
    document.getElementById('broadcastProgressContainer').style.display = 'none';
    document.getElementById('broadcastMessage').value = '';
    
    btn.disabled = false;
    btn.innerText = "بدء الحملة الإعلانية 🚀";
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    
    if(typeof addSystemLog === "function" && successCount > 0) {
        addSystemLog("إرسال جماعي 📢", `تم إرسال إعلان بنجاح لعدد ${successCount} شخص. محتوى الرسالة: ${msg.substring(0, 20)}...`);
    }
    if (typeof showSuccessAnimation === "function") showSuccessAnimation(successCount, validTasks.length);
};

function showSuccessAnimation(successCount, total) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(16, 185, 129, 0.95); z-index: 9999999; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: 'Cairo', sans-serif; animation: fadeIn 0.3s ease-out; backdrop-filter: blur(5px);`;
    overlay.innerHTML = `<div style="font-size: 100px; animation: bounceIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;">🎉</div><h1 style="margin: 20px 0 10px 0; font-size: 45px;">اكتملت الحملة بنجاح!</h1><p style="font-size: 22px; background: rgba(0,0,0,0.2); padding: 12px 30px; border-radius: 50px;">تم إرسال <strong style="font-size:28px;">${successCount}</strong> من أصل ${total} رسالة</p>`;
    document.body.appendChild(overlay);

    if (!document.getElementById('success-anim-styles')) {
        const style = document.createElement('style'); style.id = 'success-anim-styles';
        style.innerHTML = `@keyframes bounceIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`;
        document.head.appendChild(style);
    }
    setTimeout(() => { overlay.style.transition = 'opacity 0.5s'; overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 500); }, 4000);
}


// ==========================================
// إدارة الكتب والسناتر 📚
// ==========================================
function renderBooksTable() {
    const tbody = document.getElementById("books-list");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    // جلب كلمة البحث (لو موجودة)
    const searchInput = document.getElementById("searchBooksInput");
    const filterText = searchInput ? searchInput.value.toLowerCase() : "";

    let totalExpected = 0, totalReceived = 0, totalRemaining = 0;

    books.forEach(book => {
        // فلترة البيانات بناءً على البحث
        const searchString = (book.bookName + " " + book.centerName).toLowerCase();
        if (filterText && !searchString.includes(filterText)) return; // لو مش مطابق للبحث، اتخطاه ومتحسبوش

        // حسابات الفلوس
        let commission = book.commissionType === 'percentage' ? (book.price * book.commissionValue / 100) : book.commissionValue;
        let netPrice = book.price - commission;
        let expected = netPrice * book.quantity;
        let received = book.receivedAmount || 0;
        let remaining = expected - received;

        totalExpected += expected; totalReceived += received; totalRemaining += remaining;

        let commText = book.commissionType === 'percentage' ? `${book.commissionValue}%` : `${book.commissionValue} ج`;
        let remainingStyle = remaining === 0 ? `color: var(--success-color); font-weight: bold;` : (remaining < 0 ? `color: var(--primary-color);` : `color: var(--danger-color); font-weight: bold;`);

        tbody.innerHTML += `
            <tr>
                <td><strong>${book.bookName}</strong></td>
                <td><span style="color: #0ea5e9; font-weight: bold;">${book.centerName}</span></td>
                <td>${book.quantity}</td>
                <td>${book.price} ج</td>
                <td>${commText}</td>
                <td>${expected} ج</td>
                <td style="color: var(--success-color); font-weight: bold;">${received} ج</td>
                <td style="${remainingStyle}">${remaining} ج</td>
                <td>
                    <button class="btn-present" style="background-color: var(--success-color);" onclick="openReceivePaymentModal('${book.id}')">استلام 💰</button>
                    <button class="icon-btn admin-only" style="margin-right: 5px;" onclick="openEditBookModal('${book.id}')">✏️</button>
                    <button class="icon-btn danger admin-only" onclick="deleteBookRecord('${book.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });

    if (document.getElementById("books-total-expected")) {
        document.getElementById("books-total-expected").innerText = totalExpected + " ج.م";
        document.getElementById("books-total-received").innerText = totalReceived + " ج.م";
        document.getElementById("books-total-remaining").innerText = totalRemaining + " ج.م";
    }
}

// دالة تشغيل البحث
function searchBooks() {
    renderBooksTable();
}
document.getElementById("addBookForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    books.push({
        id: Date.now().toString() + "_b",
        bookName: document.getElementById("bookNameInput").value.trim(),
        centerName: document.getElementById("bookCenterInput").value.trim(),
        quantity: parseFloat(document.getElementById("bookQuantityInput").value),
        price: parseFloat(document.getElementById("bookPriceInput").value),
        commissionValue: parseFloat(document.getElementById("bookCommissionValue").value),
        commissionType: document.getElementById("bookCommissionType").value,
        receivedAmount: 0
    });
    localStorage.setItem("books", JSON.stringify(books));
    closeModal('addBookModal'); this.reset(); renderBooksTable(); showToast("تم تسجيل عهدة الكتب بنجاح!");
});

function openReceivePaymentModal(id) {
    document.getElementById("receiveBookId").value = id;
    document.getElementById("receiveBookAmount").value = "";
    openModal("receiveBookPaymentModal");
}

document.getElementById("receiveBookPaymentForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const id = document.getElementById("receiveBookId").value;
    const amount = parseFloat(document.getElementById("receiveBookAmount").value);
    const book = books.find(b => b.id === id);
    if (book) {
        book.receivedAmount += amount;
        localStorage.setItem("books", JSON.stringify(books));
        
        // 🔴 سطر السجل 
        if(typeof addSystemLog === "function") addSystemLog("استلام نقدية 💰", `تم استلام مبلغ ${amount} ج.م من سنتر ${book.centerName} عن كتاب: ${book.bookName}`);

        closeModal("receiveBookPaymentModal"); renderBooksTable(); showToast(`تم استلام ${amount} ج.م بنجاح!`);
    }
});

function deleteBookRecord(id) {
    customConfirm("حذف سجل الكتب هذا نهائياً؟", () => {
        books = books.filter(b => b.id !== id);
        localStorage.setItem("books", JSON.stringify(books)); renderBooksTable(); showToast("تم الحذف!");
    });
}


// فتح نافذة تعديل الكتب
function openEditBookModal(id) {
    const book = books.find(b => b.id === id);
    if(book) {
        document.getElementById('editBookId').value = book.id;
        document.getElementById('editBookName').value = book.bookName;
        document.getElementById('editBookCenter').value = book.centerName;
        document.getElementById('editBookQuantity').value = book.quantity;
        document.getElementById('editBookPrice').value = book.price;
        document.getElementById('editBookCommissionValue').value = book.commissionValue;
        document.getElementById('editBookCommissionType').value = book.commissionType;
        openModal('editBookModal');
    }
}

// حفظ التعديلات
document.getElementById('editBookForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const bookIndex = books.findIndex(b => b.id === id);
    
    if(bookIndex > -1) {
        books[bookIndex].bookName = document.getElementById('editBookName').value.trim();
        books[bookIndex].centerName = document.getElementById('editBookCenter').value.trim();
        books[bookIndex].quantity = parseFloat(document.getElementById('editBookQuantity').value);
        books[bookIndex].price = parseFloat(document.getElementById('editBookPrice').value);
        books[bookIndex].commissionValue = parseFloat(document.getElementById('editBookCommissionValue').value);
        books[bookIndex].commissionType = document.getElementById('editBookCommissionType').value;
        
        // إعادة حساب الفلوس المستلمة لو حصل تغيير جذري (اختياري، بس هنا بنسيب المستلم زي ما هو)
        localStorage.setItem("books", JSON.stringify(books));
        closeModal('editBookModal');
        renderBooksTable();
        showToast("تم تعديل بيانات العهدة بنجاح! ✏️");
    }
});



// 🌐 عنوان سيرفر الواتساب (الافتراضي: لوكال على جهاز المدرس لسرعة وثبات 100%)
let WHATSAPP_SERVER_URL = localStorage.getItem("wa_server_url") || "http://localhost:3000";

// التبديل بين السيرفر المحلي على الكمبيوتر وسيرفر الـ VPS
window.switchWaServerMode = function(mode) {
    if (mode === 'local') {
        WHATSAPP_SERVER_URL = "http://localhost:3000";
    } else {
        WHATSAPP_SERVER_URL = "https://edutrack-api.duckdns.org";
    }
    localStorage.setItem("wa_server_url", WHATSAPP_SERVER_URL);
    updateServerModeButtonsUI();
    checkWaServerStatusNow();
    showToast(mode === 'local' ? "تم التبديل إلى السيرفر المحلي (Localhost) 💻" : "تم التبديل إلى سيرفر الاستضافة (VPS) ☁️", "info");
};

function updateServerModeButtonsUI() {
    const isLocal = WHATSAPP_SERVER_URL.includes("localhost") || WHATSAPP_SERVER_URL.includes("127.0.0.1");
    const localBtn = document.getElementById("modeLocalBtn");
    const vpsBtn = document.getElementById("modeVpsBtn");
    if (!localBtn || !vpsBtn) return;

    if (isLocal) {
        localBtn.style.background = "var(--hero-gradient)";
        localBtn.style.color = "#ffffff";
        vpsBtn.style.background = "transparent";
        vpsBtn.style.color = "var(--text-muted)";
    } else {
        vpsBtn.style.background = "var(--hero-gradient)";
        vpsBtn.style.color = "#ffffff";
        localBtn.style.background = "transparent";
        localBtn.style.color = "var(--text-muted)";
    }
}

window.launchLocalTerminalServer = function() {
    window.switchWaServerMode('local');
    
    // فتح البروتوكول عبر نافذة مخفية لضمان سماح متصفح Brave و Chrome بفتحه
    let launcherLink = document.createElement('a');
    launcherLink.href = "historia-wa://start";
    document.body.appendChild(launcherLink);
    launcherLink.click();
    document.body.removeChild(launcherLink);

    showToast("جاري فتح التيرمينال وتشغيل السيرفر المحلي... ⚡", "info");
    setTimeout(checkWaServerStatusNow, 3000);
};

// 🔄 ريستارت المحرك أو تغيير الرقم
window.restartWaEngine = async function(logout = false) {
    if (logout && !confirm("هل تريد فصل رقم الواتساب الحالي تماماً لربط رقم جديد؟")) return;
    try {
        showToast("جاري إعادة تهيئة محرك الواتساب... ⏳", "info");
        await fetch(`${WHATSAPP_SERVER_URL}/restart-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: getSafeUid(), logout: logout })
        });
        document.getElementById("pairingCodeDisplay").style.display = "none";
        document.getElementById("requestPairBtn").style.display = "inline-block";
        document.getElementById("requestPairBtn").disabled = false;
        setTimeout(checkWaServerStatusNow, 1500);
    } catch (e) {
        showToast("تأكد من تشغيل السيرفر أولاً!", "error");
    }
};

// 📡 دالة فحص حالة السيرفر الفورية
window.checkWaServerStatusNow = async function() {
    updateServerModeButtonsUI();
    const nodeStatus = document.getElementById("nodeStatus");
    const waStatus = document.getElementById("waStatus");
    const phonePairingContainer = document.getElementById("phonePairingContainer");
    if (!nodeStatus) return;

    try {
        const response = await fetch(`${WHATSAPP_SERVER_URL}/status?clientId=${getSafeUid()}`);
        const data = await response.json();
        
        nodeStatus.innerHTML = '<span style="color: var(--success-color);">● متصل يعمل (Online)</span>';
        
        if (data.status === 'connected') {
            let phoneBadge = data.phone ? ` (+${data.phone})` : '';
            waStatus.innerHTML = `<span style="color: var(--success-color);">متصل وجاهز ✅${phoneBadge}</span>`;
            if (phonePairingContainer) phonePairingContainer.style.display = "none";
        } else if (data.status === 'need_scan') {
            waStatus.innerHTML = '<span style="color: var(--exam-color);">بانتظار ربط الهاتف 📱</span>';
            if (phonePairingContainer) phonePairingContainer.style.display = "block";
        } else {
            waStatus.innerHTML = '<span style="color: #3b82f6;">جاري تهيئة المحرك... ⏳</span>';
            if (phonePairingContainer) phonePairingContainer.style.display = "none";
        }
    } catch (e) {
        nodeStatus.innerHTML = '<span style="color: var(--danger-color);">● متوقف (Offline)</span>';
        waStatus.innerHTML = '<span style="color: var(--text-muted);">---</span>';
        if (phonePairingContainer) phonePairingContainer.style.display = "none";
    }
};

setInterval(window.checkWaServerStatusNow, 4000);

// 🔢 توليد وعرض كود الربط (8 خانات OTP مضيئة)
window.lastGeneratedPairingCode = "";
window.requestWaPairingCode = async function() {
    let phone = document.getElementById("waPairPhone").value.trim();
    let btn = document.getElementById("requestPairBtn");
    let displayBox = document.getElementById("pairingCodeDisplay");
    let codeContainer = document.getElementById("thePairingCode");

    if (!phone || phone.length < 10) {
        return showToast("يرجى إدخال رقم واتساب صحيح!", "error");
    }

    btn.innerText = "جاري التوليد... ⏳";
    btn.disabled = true;

    try {
        let response = await fetch(`${WHATSAPP_SERVER_URL}/pair-phone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: getSafeUid(), phone: phone })
        });
        
        let data = await response.json();
        
        if (data.success && data.code) {
            window.lastGeneratedPairingCode = data.code;
            let chars = String(data.code).replace(/[^A-Z0-9]/gi, '').split('');
            
            // رسم 8 مربعات OTP نيون فخمة مع فاصل في المنتصف
            let boxesHtml = "";
            chars.forEach((ch, idx) => {
                if (idx === 4) {
                    boxesHtml += `<span style="font-size: 22px; font-weight: 900; color: var(--primary-color); margin: 0 4px;">-</span>`;
                }
                boxesHtml += `
                <div style="width: 42px; height: 50px; border-radius: 12px; background: var(--bg-color); border: 2px solid var(--primary-color); box-shadow: var(--primary-glow); display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 22px; font-weight: 900; color: var(--text-main);">
                    ${ch}
                </div>`;
            });

            codeContainer.innerHTML = boxesHtml;
            displayBox.style.display = "block";
            btn.innerText = "تحديث الرمز 🔄";
            btn.disabled = false;
            showToast("تم توليد رمز الربط بنجاح! أدخله في هاتفك الآن 📲", "success");
        } else {
            showToast(data.error || "انتظر ثواني حتى يجهز المحرك ثم حاول مجدداً", "error");
            btn.innerText = "توليد الكود 📲";
            btn.disabled = false;
        }
    } catch (e) {
        showToast("تأكد من تشغيل السيرفر المحلي أولاً!", "error");
        btn.innerText = "توليد الكود 📲";
        btn.disabled = false;
    }
};

window.copyPairingOtpCode = function() {
    if (!window.lastGeneratedPairingCode) return;
    navigator.clipboard.writeText(window.lastGeneratedPairingCode);
    showToast("تم نسخ رمز الربط! 📋", "success");
};


// ==========================================
// 🚀 تسريع الرصد (الانتقال بزر Enter مع التحقق)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. قسم الامتحانات ---
    document.getElementById('examBarcodeCode')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            let val = this.value.trim();
            if (val === "") return;
            
            let student = findStudentByCodeOrName(val);
            const ex = exams.find(e => e.id === currentActiveExamId);
            
            // التحقق من وجود الطالب
            if (!student) {
                showToast("الطالب غير موجود!", "error");
                this.value = ''; // تفريغ الخانة
                return;
            }
            // التحقق من إن الطالب في نفس المجموعة
            if (ex && student.group !== ex.group) {
                showToast("الطالب ليس في هذه المجموعة!", "error");
                this.value = ''; // تفريغ الخانة
                return;
            }
            
            // لو الطالب سليم 100%، انط لخانة الدرجة
            document.getElementById('examBarcodeGrade')?.focus();
        }
    });

    document.getElementById('examBarcodeGrade')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if(typeof submitExamBarcodeGrade === 'function') submitExamBarcodeGrade();
        }
    });

    // --- 2. قسم الواجبات ---
    document.getElementById('hwBarcodeCode')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            let val = this.value.trim();
            if (val === "") return;
            
            let student = findStudentByCodeOrName(val);
            const hw = homeworks.find(h => h.id === currentActiveHwId);
            
            // التحقق من وجود الطالب
            if (!student) {
                showToast("الطالب غير موجود!", "error");
                this.value = ''; // تفريغ الخانة
                return;
            }
            // التحقق من إن الطالب في نفس المجموعة
            if (hw && student.group !== hw.group) {
                showToast("الطالب ليس في هذه المجموعة!", "error");
                this.value = ''; // تفريغ الخانة
                return;
            }

            // لو الطالب سليم 100%، انط لخانة الدرجة
            document.getElementById('hwBarcodeGrade')?.focus();
        }
    });

    document.getElementById('hwBarcodeGrade')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if(typeof submitHwBarcodeGrade === 'function') submitHwBarcodeGrade();
        }
    });

});

// ==========================================
// 🔗 توليد ونسخ رابط بوابة أولياء الأمور
// ==========================================
function updateParentLinkUI() {
    const linkInput = document.getElementById("parentPortalLink");
    if (linkInput) {
        linkInput.value = "https://ma9248290-collab.github.io/historya-systtem/parent";
    }
}

function copyParentLink() {
    const linkInput = document.getElementById("parentPortalLink");
    if (!linkInput || !linkInput.value) return;
    
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value).then(() => {
        showToast("تم نسخ الرابط بنجاح! تقدر تبعته دلوقتي 🚀", "success");
    }).catch(err => {
        showToast("فشل النسخ، يرجى نسخه يدوياً", "error");
    });
}

// ==========================================
// 🛠️ أدوات لوحة الإدارة وتنظيف البيانات المؤمنة
// ==========================================
function manageClearAction(type) {
    // نافذة تأكيد وطلب الرقم السري كأمان لمنع الأخطاء غير المقصودة
    const enteredPin = prompt("⚠️ تنبيه أمني حساس!\nهذه العملية ستؤدي لحذف البيانات نهائياً.\nالرجاء إدخال الرقم السري للإدارة (Admin PIN) لتأكيد الحذف:");
    
    if (enteredPin === null) return; // تم إلغاء الأمر من المستخدم
    
    const currentAdminPin = localStorage.getItem("adminPin") || "1234";
    if (enteredPin !== currentAdminPin) {
        showToast("الرقم السري للإدارة غير صحيح! تم كنسل العملية.", "error");
        return;
    }

    if (type === 'students') {
        students = [];
        localStorage.setItem("students", JSON.stringify(students));
        renderTable();
        showToast("تم حذف سجلات جميع الطلاب بنجاح 🗑️");
    } 
    else if (type === 'groups') {
        groups = [];
        localStorage.setItem("groups", JSON.stringify(groups));
        // تفريغ حقل المجموعة من الطلاب لمنع تعليق النظام
        students.forEach(s => s.group = "");
        localStorage.setItem("students", JSON.stringify(students));
        renderTable();
        if (typeof renderGroupCards === "function") renderGroupCards();
        showToast("تم مسح المجموعات وتفريغ الطلاب التابعين لها 🗑️");
    } 
    else if (type === 'level') {
        const levelVal = document.getElementById("clearLevelSelect").value;
        if (!levelVal) {
            showToast("الرجاء اختيار المرحلة المراد مسحها أولاً!", "error");
            return;
        }
        students = students.filter(s => s.level !== levelVal);
        localStorage.setItem("students", JSON.stringify(students));
        renderTable();
        showToast(`تم مسح جميع طلاب مرحلة [${levelVal}] بنجاح 🗑️`);
    } 
    else if (type === 'behavior') {
        students.forEach(s => s.behaviorPoints = 0);
        localStorage.setItem("students", JSON.stringify(students));
        renderTable();
        showToast("تم تصفير نقاط السلوك والتميز لجميع الطلاب 🌟");
    } 
    else if (type === 'all') {
        // تدمير شامل وعودة لضبط المصنع
        students = [];
        groups = [];
        classSessions = [];
        exams = [];
        homeworks = [];
        financeRecords = {};
        expenses = [];
        schedule = [];
        books = [];
        
        localStorage.setItem("students", JSON.stringify(students));
        localStorage.setItem("groups", JSON.stringify(groups));
        localStorage.setItem("classSessions", JSON.stringify(classSessions));
        localStorage.setItem("exams", JSON.stringify(exams));
        localStorage.setItem("homeworks", JSON.stringify(homeworks));
        localStorage.setItem("financeRecords", JSON.stringify(financeRecords));
        localStorage.setItem("expenses", JSON.stringify(expenses));
        localStorage.setItem("schedule", JSON.stringify(schedule));
        localStorage.setItem("books", JSON.stringify(books));
        
        // إعادة بناء الواجهات كلها على بياض
        renderTable();
        if (typeof renderGroupCards === "function") renderGroupCards();
        if (typeof renderSchedule === "function") renderSchedule();
        if (typeof renderBooksTable === "function") renderBooksTable();
        if (typeof renderSessionCards === "function") renderSessionCards();
        if (typeof renderExamCards === "function") renderExamCards();
        if (typeof renderHwCards === "function") renderHwCards();
        
        showToast("💥 تم تنفيذ تصفير شامل بنجاح (عودة لضبط المصنع الأصلي)");
    }

    // 🔄 رفع البيانات وحذفها من السحابة فوراً لتتطابق مع قاعدة البيانات المحلية
    if (typeof syncDataToBot === "function") syncDataToBot();
}

// ==========================================
// 🚀 إرسال وحفظ بيانات عميل الديمو
// ==========================================
document.getElementById('demoRegistrationForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('demoTeacherName').value.trim();
    const phone = document.getElementById('demoTeacherPhone').value.trim();

    if (!isValidEgyptianPhone(phone)) {
        showToast("يرجى إدخال رقم واتساب مصري صحيح!", "error"); return;
    }

    let now = new Date().getTime();
    let demoId = "device_" + Date.now(); // 🔒 توليد معرف فريد للجهاز
    
    // حفظ البيانات محلياً
    localStorage.setItem("demo_registered", "true");
    localStorage.setItem("demo_start_date", now);
    localStorage.setItem("is_demo_mode", "true");
    localStorage.setItem("teacherName", name);
    localStorage.setItem("demo_device_id", demoId); // حفظ البصمة

    // رفع بيانات العميل للوحة الإدارة (الفايربيز) بالحالة نشط
    fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/demo_users/${demoId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            teacherName: name,
            whatsapp: phone,
            timestamp: new Date().toISOString(), 
            startDate: now,
            status: 'active' // 👈 الحالة الافتراضية
        })
    });

    document.getElementById('demoRegistrationModal').style.display = 'none';
    showToast(`أهلاً بك يا مستر ${name}! بدأت تجربتك المجانية ⏳`);
    setTimeout(() => { location.reload(); }, 1000);
});


// ==========================================
// 💳 إرسال وحفظ طلبات كروت الـ ID البلاستيكية
// ==========================================
document.getElementById('requestIdCardsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const teacherName = document.getElementById('idCardTeacherName').value.trim();
    const phone = document.getElementById('idCardTeacherPhone').value.trim();
    const address = document.getElementById('idCardAddress').value.trim();
    const fromCode = document.getElementById('idCardFrom').value;
    const toCode = document.getElementById('idCardTo').value;
    
    if (!isValidEgyptianPhone(phone)) {
        showToast("يرجى إدخال رقم واتساب مصري صحيح!", "error"); return;
    }

    // رفع الطلب لقاعدة بيانات الإدارة العليا (dashb.html)
    fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/id_orders/${Date.now()}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            teacherName: teacherName,
            phone: phone,
            address: address,
            fromCode: fromCode,
            toCode: toCode,
            timestamp: new Date().toISOString()
        })
    });

    closeModal('requestIdCardsModal');
    this.reset();
    
    // إشعار التأكيد الداخلي
    showToast("تم إتمام الطلب وسيتم التواصل معك قريبا لاستلام الشحنه 🚚");
});

// ==========================================
// 💸 نظام الإحالات المتكامل (Stats & Checkout)
// ==========================================

const DB_URL = "https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app";
window.availableAffiliateBalance = 0; // متغير جلوبال لتخزين الرصيد المتاح للسحب

// 1. توليد كود إحالة عشوائي وفريد ومستحيل يتكرر
function getMyAffiliateCode() {
    let savedPromo = localStorage.getItem("my_promo_code");
    if (savedPromo) return savedPromo; // لو ليه كود قبل كده هيفضل ثابت معاه

    // لو معندوش، هنولد كود عشوائي من 8 حروف وأرقام
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    let uniqueCode = "REF-" + randomPart;
    localStorage.setItem("my_promo_code", uniqueCode); // حفظه في جهازه
    
    return uniqueCode;
}

// 2. تحديث الشاشة وجلب الإحصائيات الحقيقية من الفايربيز (محمية ومربوطة بتأكيد الإدارة)
async function fetchAffiliateStats() {
    const myCode = getMyAffiliateCode();
    
    try {
        let [ordRes, wdRes] = await Promise.all([
            fetch(`${DB_URL}/orders.json`),
            fetch(`${DB_URL}/withdraw_requests.json`)
        ]);

        let orders = await ordRes.json() || {};
        let withdraws = await wdRes.json() || {};

        let confirmedEarned = 0; // العمولات المؤكدة (العميل دفع والإدارة أكدت)
        let pendingEarned = 0;   // العمولات المعلقة (العميل سجل ولسه مدفعش)
        let purchasesCount = 0;  // عدد عمليات الشراء الناجحة
        
        let tbody = document.getElementById("affiliate-transactions");
        if(tbody) tbody.innerHTML = "";

        Object.keys(orders).reverse().forEach(key => {
            let o = orders[key];
            
            // لو الكود المستخدم هو كود المدرس ده
            if (o.promoCodeUsed === myCode) {
                let comm = parseFloat(o.commissionForAffiliate) || 0;
                let date = new Date(o.timestamp).toLocaleDateString('ar-EG');
                let maskedName = o.teacherName.substring(0, 3) + "***"; // تشفير الاسم
                
                // لو الإدارة أكدت الدفع (مؤكدة ✅)
                if (o.status && o.status.includes('تم')) {
                    confirmedEarned += comm;
                    purchasesCount++;
                    if(tbody) tbody.innerHTML += `<tr><td>${date}</td><td>${maskedName}</td><td>${o.plan}</td><td><span class="badge" style="background: rgba(16, 185, 129, 0.1); color:var(--success); font-weight:bold;">مؤكدة ✅</span></td><td style="color:var(--success); font-weight:bold;">${comm} ج</td></tr>`;
                } 
                // لو لسه قيد الانتظار (معلقة ⏳)
                else {
                    pendingEarned += comm;
                    if(tbody) tbody.innerHTML += `<tr><td>${date}</td><td>${maskedName}</td><td>${o.plan}</td><td><span class="badge" style="background: rgba(245, 158, 11, 0.1); color:#f59e0b; font-weight:bold;">منتظرة دفع العميل ⏳</span></td><td style="color:#f59e0b; font-weight:bold;">${comm} ج</td></tr>`;
                }
            }
        });

        if (tbody && tbody.innerHTML === "") {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">لا توجد إحالات حتى الآن. شارك كودك للبدء!</td></tr>`;
        }

        // حساب المسحوبات (اللي المدرس سحبها أو طلب سحبها)
        let totalWithdrawnPaid = 0;
        let totalWithdrawnPending = 0;

        Object.keys(withdraws).forEach(key => {
            let w = withdraws[key];
            if (w.promoCode === myCode) {
                if (w.status === 'paid') totalWithdrawnPaid += parseFloat(w.amount);
                else totalWithdrawnPending += parseFloat(w.amount);
            }
        });

        // 🛑 السحر هنا: الرصيد المتاح للسحب بيتحسب من (العمولات المؤكدة فقط) ناقص المسحوبات
        window.availableAffiliateBalance = confirmedEarned - (totalWithdrawnPaid + totalWithdrawnPending);

        // تحديث المربعات الملونة في الشاشة
        if(document.getElementById("affPending")) document.getElementById("affPending").innerText = `${pendingEarned} ج`;
        if(document.getElementById("affReceived")) document.getElementById("affReceived").innerText = `${totalWithdrawnPaid} ج`;
       if(document.getElementById("affAvailable")) document.getElementById("affAvailable").innerText = `${window.availableAffiliateBalance} ج`;
        if(document.getElementById("affPurchases")) document.getElementById("affPurchases").innerText = purchasesCount;

    } catch (e) {
        console.log("Error fetching stats:", e);
    }
}

// 3. دالة تهيئة صفحة الإحالة عند فتحها
function initAffiliatePage() {
    document.getElementById("myAffiliateCode").value = getMyAffiliateCode();
    
    let savedSettings = JSON.parse(localStorage.getItem("affiliateSettings"));
    if (savedSettings) {
        document.getElementById("withdrawMethod").value = savedSettings.method;
        document.getElementById("withdrawNumber").value = savedSettings.number;
    }
    
    // تشغيل جلب الداتا لايف
    fetchAffiliateStats();
}

function copyAffiliateCode() {
    const codeInput = document.getElementById("myAffiliateCode");
    codeInput.select();
    navigator.clipboard.writeText(codeInput.value).then(() => {
        showToast("تم نسخ كود الإحالة بنجاح! 📋");
    });
}

function saveAffiliateSettings() {
    const method = document.getElementById("withdrawMethod").value;
    const number = document.getElementById("withdrawNumber").value;
    
    if (method !== 'free_month' && !number) {
        return showToast("يرجى إدخال رقم الحساب للسحب!", "error");
    }

    localStorage.setItem("affiliateSettings", JSON.stringify({ method, number }));
    showToast("تم حفظ إعدادات السحب بنجاح ✅");
}


// 4. طلب السحب المحكوم بالرصيد المتاح
window.requestAffiliateWithdrawal = async function() {
    let savedSettings = JSON.parse(localStorage.getItem("affiliateSettings"));
    if (!savedSettings || (!savedSettings.number && savedSettings.method !== 'free_month')) {
        return showToast("يجب حفظ إعدادات السحب (رقم المحفظة) أولاً!", "error");
    }

    if (window.availableAffiliateBalance < 150) {
        return showToast("عفواً، رصيدك المتاح أقل من الحد الأدنى للسحب (150 ج.م).", "error");
    }

    // إظهار الرصيد المتاح وسؤاله هيسحب كام
    let amountToWithdraw = prompt(`رصيدك المتاح للسحب هو ${window.availableAffiliateBalance} ج.م\nأدخل المبلغ المراد سحبه:`, window.availableAffiliateBalance);
    
    if (!amountToWithdraw) return; // لو داس كنسل

    amountToWithdraw = parseFloat(amountToWithdraw);

    if (isNaN(amountToWithdraw) || amountToWithdraw < 150) {
        return showToast("المبلغ غير صالح أو أقل من الحد الأدنى!", "error");
    }

    // الفلترة الذكية (لو طلب أكتر من اللي حيلته)
    if (amountToWithdraw > window.availableAffiliateBalance) {
        return showToast(`رصيدك المتاح لا يكفي! أقصى مبلغ يمكنك سحبه هو ${window.availableAffiliateBalance} ج.م`, "error");
    }

    const requestData = {
        promoCode: getMyAffiliateCode(),
        method: savedSettings.method,
        number: savedSettings.number,
        amount: amountToWithdraw,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    try {
        await fetch(`${DB_URL}/withdraw_requests.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        showToast("تم إرسال طلب السحب للإدارة بنجاح! 💸");
        
        // خصم المبلغ وهمياً من الشاشة لتجنب طلب السحب مرتين ورا بعض
        window.availableAffiliateBalance -= amountToWithdraw;
        document.getElementById("affPending").innerText = `${window.availableAffiliateBalance} ج`;

    } catch (e) {
        showToast("حدث خطأ أثناء الإرسال", "error");
    }
};

// 🛒 دوال الـ Checkout زي ما هي شغالة مفيش تغيير فيها
const PRICING = {
    lifetime: { base: 2500, discount: 500 },
    monthly: { base: 350, discount: 100 }
};

let currentPromoApplied = false;

function calculateCheckout() {
    const plan = document.getElementById("checkoutPlan").value;
    const basePrice = PRICING[plan].base;
    let discount = 0;

    if (currentPromoApplied) discount = PRICING[plan].discount;
    const finalPrice = basePrice - discount;

    document.getElementById("checkoutBasePrice").innerText = `${basePrice} ج.م`;
    document.getElementById("checkoutDiscount").innerText = `${discount} ج.م`;
    document.getElementById("checkoutFinalPrice").innerText = `${finalPrice} ج.م`;
}

function applyPromoCode() {
    const code = document.getElementById("promoCodeInput").value.trim().toUpperCase();
    const msgLabel = document.getElementById("promoMsg");
    const plan = document.getElementById("checkoutPlan").value;

    if (code.startsWith("REF-") && code.length >= 8) {
        if (code === getMyAffiliateCode()) {
            currentPromoApplied = false;
            msgLabel.style.color = "var(--danger-color)";
            msgLabel.innerText = "❌ لا يمكنك استخدام كود الإحالة الخاص بك!";
            calculateCheckout();
            return;
        }

        currentPromoApplied = true;
        let discountVal = PRICING[plan].discount;
        msgLabel.style.color = "var(--success-color)";
        
        if (plan === 'monthly') {
            msgLabel.innerText = `✅ كود صحيح! تم خصم ${discountVal}ج من اشتراك الشهر الأول.`;
        } else {
            msgLabel.innerText = `✅ كود صحيح! تم خصم ${discountVal}ج على اشتراك مدى الحياة.`;
        }
    } else {
        currentPromoApplied = false;
        msgLabel.style.color = "var(--danger-color)";
        msgLabel.innerText = "❌ الكود غير صحيح أو منتهي الصلاحية.";
    }
    
    calculateCheckout();
}

function openCheckout() {
    currentPromoApplied = false;
    document.getElementById("promoCodeInput").value = "";
    document.getElementById("promoMsg").innerText = "";
    calculateCheckout();
    openModal('checkoutModal');
}

// رسم كروت الواجبات (بزرار التعديل الجديد)
function renderHwCards() { 
    const grid = document.getElementById("hw-grid"); if(!grid) return; grid.innerHTML = ""; 
    [...homeworks].reverse().forEach(hw => { 
        const isClosed = hw.status === 'closed'; 
        grid.innerHTML += `
        <div class="session-card hw-card">
            <div class="session-header-card">
                <div><div class="hw-group-name">${hw.name}</div><div class="session-date">${hw.group} | ${hw.date}</div></div>
                <span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${isClosed?'مغلق':'مفتوح'}</span>
            </div>
            <div class="session-actions">
                <button class="enter-btn enter-hw-btn" onclick="openHwDetails('${hw.id}')" ${isClosed?'disabled':''}>تقييم</button>
                <button class="icon-btn admin-only" style="background-color: #ffffff; color: black;" onclick="openEditHwModal('${hw.id}')" title="تعديل">✏️ تعديل</button>
                <button class="icon-btn danger admin-only" onclick="deleteHw('${hw.id}')">🗑️</button>
            </div>
        </div>`; 
    }); 
}

// رسم كروت الامتحانات (بزرار التعديل الجديد)
function renderExamCards() { 
    const grid = document.getElementById("exams-grid"); if(!grid) return; grid.innerHTML = ""; 
    [...exams].reverse().forEach(exam => { 
        const isClosed = exam.status === 'closed'; 
        grid.innerHTML += `
        <div class="session-card exam-card">
            <div class="session-header-card">
                <div><div class="exam-group-name">${exam.name}</div><div class="session-date">${exam.group} | ${exam.date}</div></div>
                <span class="status-badge ${isClosed ? 'status-closed' : 'status-open'}">${isClosed?'مغلق':'مفتوح'}</span>
            </div>
            <div class="session-actions">
                <button class="enter-btn enter-exam-btn" onclick="openExamDetails('${exam.id}')" ${isClosed?'disabled':''}>رصد</button>
                <button class="icon-btn admin-only" style="background-color: #ffffff; color: black;" onclick="openEditExamModal('${exam.id}')" title="تعديل">✏️ تعديل</button>
                <button class="icon-btn danger admin-only" onclick="deleteExam('${exam.id}')">🗑️</button>
            </div>
        </div>`; 
    }); 
}



// ==========================================
// 🌟 1. إدارة بيانات الحساب والسيرفر (الاسم، اليوزر، الباسورد)
// ==========================================
window.saveAccountSettings = function() {
    const tName = document.getElementById('settingTeacherName').value.trim();
    const cName = document.getElementById('settingCenterName').value.trim();
    const aUser = document.getElementById('settingAdminUser').value.trim();
    const aPass = document.getElementById('settingAdminPass').value.trim();
    const aPin = document.getElementById('settingAdminPin').value.trim();
    const phoneNumbers = document.getElementById('settingPhoneNumbers').value.trim();
    
    // سحب قوالب الرسائل
    const parentMsg = document.getElementById('settingParentMsg').value.trim();
    const studentMsg = document.getElementById('settingStudentMsg').value.trim();
    
    if (!tName || !aUser || !aPass || !aPin) {
        return showToast("يرجى ملء جميع البيانات الأساسية!", "error");
    }

    localStorage.setItem('teacherName', tName);
    localStorage.setItem('centerName', cName);
    localStorage.setItem('adminUser', aUser);
    localStorage.setItem('adminPass', aPass);
    localStorage.setItem('adminPin', aPin);
    localStorage.setItem('teacherPhones', phoneNumbers);
    
    // حفظ القوالب
    localStorage.setItem('parentMsgTemplate', parentMsg);
    localStorage.setItem('studentMsgTemplate', studentMsg);

    window.adminPin = aPin; 
    
    const titleElement = document.getElementById('page-title');
    if (titleElement && titleElement.innerText.includes('أهلاً بك')) {
        titleElement.innerText = `أهلاً بك مستر ${tName} 👋`;
    }
    
    showToast("تم تحديث بيانات الحساب والقوالب بنجاح! 💾");
    if (typeof syncDataToBot === "function") syncDataToBot();
};


// ==========================================
// 🌟 2. تخصيص المراحل الدراسية (القائمة المنسدلة الذكية)
// ==========================================
const ALL_LEVELS = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي",
    "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
];

let safeLevels = ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"];
try {
    let stored = JSON.parse(localStorage.getItem("activeLevels"));
    if (Array.isArray(stored) && stored.length > 0) safeLevels = stored;
} catch(e) {}
window.activeLevels = safeLevels;

window.renderAdminLevels = function() {
    const dropdown = document.getElementById("levelsDropdown");
    const tagsContainer = document.getElementById("selectedLevelsTags");
    if(!dropdown || !tagsContainer) return;

    let dropdownHTML = "";
    ALL_LEVELS.forEach(level => {
        let isChecked = (Array.isArray(window.activeLevels) && window.activeLevels.includes(level)) ? "checked" : "";
        dropdownHTML += `
            <label class="level-item" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--hover-bg); border-radius: 6px; cursor: pointer; transition: 0.2s; color: var(--text-main); font-weight: bold; margin-bottom: 3px; border-bottom: 1px solid var(--border-color);">
                <input type="checkbox" value="${level}" class="level-checkbox" ${isChecked} onchange="updateActiveLevels()" style="width: 18px; height: 18px; accent-color: var(--primary-color); cursor: pointer;">
                <span style="flex: 1;">${level}</span>
            </label>`;
    });
    dropdown.innerHTML = dropdownHTML;

    let tagsHTML = "";
    if(Array.isArray(window.activeLevels)) {
        window.activeLevels.forEach(level => {
            tagsHTML += `<span class="tag" style="background: var(--primary-color); color: white; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">🎓 ${level}</span>`;
        });
    }
    tagsContainer.innerHTML = tagsHTML;
};

window.updateActiveLevels = function() {
    const checkboxes = document.querySelectorAll(".level-checkbox:checked");
    let selected = Array.from(checkboxes).map(cb => cb.value);

    if(selected.length === 0) {
        showToast("يجب اختيار مرحلة دراسية واحدة على الأقل!", "error");
        selected = ["الصف الأول الثانوي"];
        setTimeout(renderAdminLevels, 50); 
    } else {
        window.activeLevels = selected;
        const tagsContainer = document.getElementById("selectedLevelsTags");
        if(tagsContainer) {
            let tagsHTML = "";
            window.activeLevels.forEach(level => {
                tagsHTML += `<span class="tag" style="background: var(--primary-color); color: white; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">🎓 ${level}</span>`;
            });
            tagsContainer.innerHTML = tagsHTML;
        }
    }
    localStorage.setItem("activeLevels", JSON.stringify(window.activeLevels));
    if (typeof populateLevelDropdowns === "function") populateLevelDropdowns();
    if (typeof syncDataToBot === "function") syncDataToBot();
};

window.populateLevelDropdowns = function() {
    const levelSelectIds = [
        "studentLevel", "editStudentLevel", "sessionLevelSelect", "hwLevelSelect", 
        "examLevelSelect", "financeLevelSelect", "leaderboardLevel", "schedLevel", 
        "newGroupLevel", "editGroupLevel", "clearLevelSelect"
    ];
    
    levelSelectIds.forEach(id => {
        const select = document.getElementById(id);
        if(select) {
            const firstOption = select.options[0]?.text.includes("اختر") ? select.options[0].outerHTML : '<option value="">اختر المرحلة...</option>';
            let selectHTML = firstOption;
            if(Array.isArray(window.activeLevels)){
                window.activeLevels.forEach(level => { selectHTML += `<option value="${level}">${level}</option>`; });
            }
            select.innerHTML = selectHTML;
        }
    });
};

// قفل القائمة لو المدرس ضغط في أي مكان بره الصندوق
document.addEventListener('click', function(e) {
    const container = document.querySelector('.multi-select-container');
    const dropdown = document.getElementById('levelsDropdown');
    if (container && dropdown && !container.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});


// ==========================================
// 🌟 3. تشغيل الأكواد تلقائياً وربطها بلوحة الإدارة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof renderAdminLevels === "function") renderAdminLevels();
        if (typeof populateLevelDropdowns === "function") populateLevelDropdowns();
    }, 500);
});

const originalSwitchPage = window.switchPage;
window.switchPage = function(pageId) {
    if (originalSwitchPage) originalSwitchPage(pageId);
    
    if (pageId === "backup") { 
        // 1. ارسم المراحل
        if (typeof renderAdminLevels === "function") renderAdminLevels();
        
        // 2. املأ بيانات المدرس في الخانات أول ما يفتح التاب
        if(document.getElementById('settingTeacherName')) {
            document.getElementById('settingTeacherName').value = localStorage.getItem('teacherName') || 'القيصر';
            document.getElementById('settingCenterName').value = localStorage.getItem('centerName') || 'القيصر';
            document.getElementById('settingAdminUser').value = localStorage.getItem('adminUser') || '';
            document.getElementById('settingAdminPass').value = localStorage.getItem('adminPass') || '';
            document.getElementById('settingAdminPin').value = localStorage.getItem('adminPin') || '';
            document.getElementById('settingPhoneNumbers').value = localStorage.getItem('teacherPhones') || '';
            // القوالب الافتراضية الذكية
            let defParent = "{أهلاً بحضرتك|مرحباً بك|السلام عليكم} ولي أمر الطالب/ة: *{اسم_الطالب}*،\nنحيطكم علماً بتقرير حصة ({الموضوع}).\n\n{تفاصيل_التقرير}\n\nمع تحيات إدارة {اسم_السنتر}\n⏱️ {وقت_الرسالة}";
            let defStudent = "{أهلاً بيك يا بطل|عاش يا وحش|أخبار المذاكرة إيه يا} *{اسم_الطالب}* 👑\nده تقرير حصتك النهاردة ({الموضوع}):\n\n{تفاصيل_التقرير}\n\nبالتوفيق! 💪\nإدارة {اسم_السنتر}";
            
            document.getElementById('settingParentMsg').value = localStorage.getItem('parentMsgTemplate') || defParent;
            document.getElementById('settingStudentMsg').value = localStorage.getItem('studentMsgTemplate') || defStudent;
        }
    }
};


// ==========================================
// 🕵️‍♂️ 1. نظام السجل والمراقبة (Audit Trail)
// ==========================================
let systemLogs = JSON.parse(localStorage.getItem("systemLogs")) || [];

// دالة تسجيل أي حركة (بتحتفظ بآخر 500 حركة بس)
window.addSystemLog = function(actionType, details) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ar-EG') + " - " + formatTime12(`${now.getHours()}:${now.getMinutes()}`);
    
    // إضافة الحركة الجديدة في أول المصفوفة
    systemLogs.unshift({
        date: formattedDate,
        type: actionType,
        details: details
    });

    // قص المصفوفة لو زادت عن 500 عشان السيستم ميهنجش
    if (systemLogs.length > 500) {
        systemLogs = systemLogs.slice(0, 500);
    }
    
    localStorage.setItem("systemLogs", JSON.stringify(systemLogs));
    if (document.getElementById("logs-view").style.display === "block") renderSystemLogs();
};

window.renderSystemLogs = function() {
    const tbody = document.getElementById("system-logs-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (systemLogs.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">السجل فارغ تماماً</td></tr>`;
    }

    systemLogs.forEach(log => {
        // تلوين نوع الحركة عشان تكون مريحة للعين
        let typeColor = "#3b82f6"; // أزرق افتراضي
        if (log.type.includes("إضافة") || log.type.includes("فتح") || log.type.includes("استلام")) typeColor = "#10b981"; // أخضر
        if (log.type.includes("حذف") || log.type.includes("مسح") || log.type.includes("إلغاء")) typeColor = "#ef4444"; // أحمر
        if (log.type.includes("تعديل") || log.type.includes("قفل") || log.type.includes("رصد")) typeColor = "#f59e0b"; // برتقالي

        tbody.innerHTML += `
            <tr>
                <td style="font-size: 13px; color: var(--text-muted);">${log.date}</td>
                <td><span style="background: ${typeColor}20; color: ${typeColor}; padding: 5px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; border: 1px solid ${typeColor}50;">${log.type}</span></td>
                <td style="font-weight: bold;">${log.details}</td>
            </tr>
        `;
    });
};

window.clearSystemLogs = function() {
    customConfirm("هل أنت متأكد من مسح سجل الحركات بالكامل؟", () => {
        systemLogs = [];
        localStorage.setItem("systemLogs", JSON.stringify(systemLogs));
        renderSystemLogs();
        showToast("تم تفريغ السجل بنجاح 🗑️");
    });
};


// ==========================================
// 📈 2. نظام التقارير الشاملة وتصدير الإكسيل
// ==========================================
window.generateAdvancedReport = function() {
    const type = document.getElementById("reportType").value;
    const groupFilter = document.getElementById("reportGroup").value;
    const fromDate = document.getElementById("reportDateFrom").value;
    const toDate = document.getElementById("reportDateTo").value;
    
    const thead = document.getElementById("report-table-head");
    const tbody = document.getElementById("report-table-body");
    
    thead.innerHTML = ""; tbody.innerHTML = "";

    // 1. تحديد الداتا بناءً على النوع المختار (حصص ولا امتحانات ولا واجبات)
    let sourceData = [];
    if (type === 'attendance') { sourceData = classSessions; }
    else if (type === 'exams') { sourceData = exams; }
    else if (type === 'homework') { sourceData = homeworks; }

    // 2. فلترة الداتا بالتاريخ والجغرافيا والمجموعة
    let filteredItems = sourceData.filter(item => {
        let matchGroup = (groupFilter === 'all') || (item.group === groupFilter);
        let matchDate = true;
        if (fromDate) matchDate = matchDate && (new Date(item.date) >= new Date(fromDate));
        if (toDate) matchDate = matchDate && (new Date(item.date) <= new Date(toDate));
        return matchGroup && matchDate;
    }).sort((a,b) => new Date(a.date) - new Date(b.date)); 

    if (filteredItems.length === 0) {
        thead.innerHTML = `<tr><th>لا توجد بيانات مطابقة لهذه الفلاتر</th></tr>`;
        return;
    }

    // 3. فلترة الطلاب
    let targetStudents = students;
    if (groupFilter !== 'all') targetStudents = students.filter(s => s.group === groupFilter);

    // 4. رسم رأس الجدول (تم إضافة أرقام الهواتف هنا 👇)
    let headHtml = `<tr>
        <th>كود الطالب</th>
        <th>الاسم</th>
        <th>رقم الطالب</th>
        <th>رقم ولي الأمر</th>
        <th>المجموعة</th>`;
        
    filteredItems.forEach(item => {
        let title = type === 'attendance' ? item.date : `${item.name} (${item.date})`;
        headHtml += `<th>${title}</th>`;
    });
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    // 5. رسم جسم الجدول (الطلاب ونتائجهم وأرقامهم)
    targetStudents.forEach(st => {
        let rowHtml = `<tr>
            <td style="font-weight: bold; color: var(--primary-color);">${st.code}</td>
            <td>${st.name}</td>
            <td style="direction: ltr;">${st.phone && st.phone !== "0" ? st.phone : "--"}</td>
            <td style="direction: ltr;">${st.parentPhone && st.parentPhone !== "0" ? st.parentPhone : "--"}</td>
            <td>${st.group}</td>`;
        
        filteredItems.forEach(item => {
            let cellValue = "--";
            
            if (type === 'attendance') {
                let stat = item.attendance[st.code] || item.attendance[st.phone];
                if (stat === 'present') cellValue = "حاضر";
                else if (stat === 'late') cellValue = "متأخر";
                else if (stat === 'absent') cellValue = "غائب";
            } 
            else if (type === 'exams' || type === 'homework') {
                if (item.grades && (item.grades[st.code] !== undefined || item.grades[st.phone] !== undefined)) {
                    let g = item.grades[st.code] !== undefined ? item.grades[st.code] : item.grades[st.phone];
                    cellValue = `${g} / ${item.maxScore}`;
                } else {
                    cellValue = "لم يُمتحن/لم يُسلم";
                }
            }
            rowHtml += `<td>${cellValue}</td>`;
        });
        
        rowHtml += `</tr>`;
        tbody.innerHTML += rowHtml;
    });
    
    if (typeof showToast === "function") showToast("تم استخراج التقرير بنجاح! 📊");
};

// 📥 دالة تصدير الجدول لإكسيل باستخدام مكتبة XLSX الموجودة عندك
window.exportReportToExcel = function() {
    const table = document.getElementById("advanced-report-table");
    if (!table || table.rows.length <= 1) {
        return showToast("لا يوجد تقرير لتصديره! قم باستخراج تقرير أولاً.", "error");
    }
    
    // تحويل الـ HTML Table لـ شيت إكسيل
    const wb = XLSX.utils.table_to_book(table, {sheet: "التقرير"});
    
    // تسمية الملف بالتاريخ والجغرافيا
    const dateStr = new Date().toLocaleDateString('ar-EG').replace(/\//g, '-');
    const typeStr = document.getElementById("reportType").options[document.getElementById("reportType").selectedIndex].text;
    const fileName = `EduTrack_${typeStr}_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast("تم تحميل شيت الإكسيل بنجاح! 📥");
};


// ==========================================
// 🔧 3. دمج الصفحات الجديدة مع نظام التنقل
// ==========================================
// دي عشان لما تفتح صفحة التقارير، يملأ قائمة المجموعات أوتوماتيك
const oldSwitchPageForReports = window.switchPage;
window.switchPage = function(pageId) {
    if (oldSwitchPageForReports) oldSwitchPageForReports(pageId);
    
    if (pageId === "reports") {
        document.getElementById("page-title").innerText = "التقارير الشاملة 📈";
        document.getElementById("page-desc").innerText = "استخراج فلاتر وتصدير شيتات الإكسيل";
        
        // ملء قائمة المجموعات في الفلتر
        const groupSelect = document.getElementById("reportGroup");
        groupSelect.innerHTML = '<option value="all">جميع المجموعات</option>';
        groups.forEach(g => { groupSelect.innerHTML += `<option value="${g.name}">${g.name}</option>`; });
    }
    
    if (pageId === "logs") {
        document.getElementById("page-title").innerText = "سجل حركات النظام 🕵️‍♂️";
        document.getElementById("page-desc").innerText = "مراقبة كل صغيرة وكبيرة تحدث في النظام";
        renderSystemLogs();
    }
};

// ==========================================
// 🔗 تشغيل صفحة الإحالات وجلب الكود والإحصائيات
// ==========================================
const checkAffiliateSwitch = window.switchPage;
window.switchPage = function(pageId) {
    if (checkAffiliateSwitch) checkAffiliateSwitch(pageId);
    
    // أول ما يفتح صفحة الإحالات، شغل الدالة اللي بتجيب الكود والداتا
    if (pageId === "affiliate") {
        if (typeof initAffiliatePage === "function") {
            initAffiliatePage();
        }
    }
};
// ==========================================
// 💻 إدارة المنصة الشاملة (أكواد - محاضرات - امتحانات)
// ==========================================

window.fetchedOnlineExams = [];
let currentGradingExamId = null;
let currentGradingStudentPhone = null;
let currentQuestions = [];

window.getSafeUid = function() {
    return "AlQaisar_System"; // 🔒 التثبيت النهائي لمسار الداتا في كل الـ Fetches
};

// 1. تعديل دالة switchPlatformTab (عشان تعبي قائمة الصفوف بدل المجموعات)


// ==========================================
// 💳 إدارة المحفظة وأكواد الشحن (النسخة المطورة)
// ==========================================

window.latestGeneratedCodes = []; // مصفوفة مؤقتة عشان نحفظ فيها الأكواد الجديدة بس للنافذة



// 📋 نسخ الأكواد الجديدة للذاكرة
window.copyNewCodes = function() {
    if(window.latestGeneratedCodes.length === 0) return;
    let textToCopy = window.latestGeneratedCodes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("تم نسخ الأكواد بنجاح! 📋");
    });
};

// 📥 تحميل الأكواد الجديدة فقط في ملف إكسيل
window.downloadNewCodesExcel = function() {
    if(window.latestGeneratedCodes.length === 0) return;
    let data = window.latestGeneratedCodes.map(c => ({ "كود الشحن": c.code, "القيمة (ج.م)": c.amount }));
    let ws = XLSX.utils.json_to_sheet(data);
    
    // تظبيط عرض العواميد
    ws['!cols'] = [{wch: 25}, {wch: 15}];
    
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أكواد الشحن");
    XLSX.writeFile(wb, `أكواد_شحن_جديدة_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("تم تحميل الإكسيل بنجاح! 📥");
};

// 📥 تحميل جميع أكواد السنتر في ملف إكسيل
window.exportAllCodesToExcel = async function() {
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/chargeCodes.json`);
        let codes = await res.json() || {};
        let data = Object.keys(codes).map(codeStr => ({
            "كود الشحن": codeStr,
            "القيمة (ج.م)": codes[codeStr].amount,
            "الحالة": codes[codeStr].status === 'unused' ? 'متاح' : 'تم الاستخدام',
            "تاريخ الإنشاء": codes[codeStr].createdAt
        }));
        
        if(data.length === 0) return showToast("لا توجد أكواد لتصديرها!", "error");
        
        let ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}]; // تظبيط العرض
        
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "كل الأكواد");
        XLSX.writeFile(wb, `سجل_أكواد_الشحن_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("تم تصدير سجل الأكواد بالكامل! 📥");
    } catch(e) { showToast("خطأ في الاتصال أثناء التحميل!", "error"); }
};

// =========================================================
// 💳 توليد أكواد شحن رقمية من 16 رقماً (بنك القيصر VIP)
// =========================================================

// دالة مساعدة لتوليد 16 رقماً عشوائياً فريداً (لا يبدأ بصفر)
window.generate16DigitCardNumber = function() {
    let num = String(Math.floor(1 + Math.random() * 9)); // أول رقم من 1 إلى 9
    for (let i = 0; i < 15; i++) {
        num += String(Math.floor(Math.random() * 10));
    }
    return num;
};

// دالة لتنسيق الـ 16 رقماً للعرض البصري (XXXX XXXX XXXX XXXX)
window.format16DigitDisplay = function(codeStr) {
    return String(codeStr).replace(/(\d{4})(?=\d)/g, '$1 ');
};

window.generateChargeCodes = async function() {
    let uid = getSafeUid();
    let amount = parseInt(document.getElementById("codeAmount").value);
    let count = parseInt(document.getElementById("codeCount").value);
    let linkedCourseId = document.getElementById("codeLinkedCourse").value;
    
    if (!amount || !count || count <= 0) {
        if (typeof showToast === 'function') showToast("يرجى إدخال القيمة والعدد بشكل صحيح!", "error");
        else alert("يرجى إدخال القيمة والعدد بشكل صحيح!");
        return;
    }

    let newCodes = {};
    window.latestGeneratedCodes = []; 
    
    let btn = document.querySelector('#platform-codes .save-btn');
    let originalText = btn ? btn.innerText : "توليد الأكواد 🚀";
    if (btn) { btn.innerText = "جاري التوليد... ⏳"; btn.disabled = true; }

    for (let i = 0; i < count; i++) {
        // توليد كود من 16 رقماً صافياً
        let codeStr = window.generate16DigitCardNumber();
        let codeObj = { 
            amount: amount, 
            status: "unused", 
            createdAt: new Date().toISOString().split('T')[0] 
        };
        
        if (linkedCourseId) codeObj.linkedCourseId = linkedCourseId; 
        
        newCodes[codeStr] = codeObj;
        window.latestGeneratedCodes.push({ code: codeStr, amount: amount });
    }

    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/chargeCodes.json`, {
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(newCodes)
        });
        
        document.getElementById("codeAmount").value = "";
        document.getElementById("codeCount").value = "";
        renderChargeCodes(); 
        
        document.getElementById("newCodesCountDisplay").innerText = count;
        document.getElementById("newCodesAmountDisplay").innerText = amount;
        document.getElementById("newCodesListDisplay").innerHTML = window.latestGeneratedCodes
            .map(c => `<div style="padding: 6px 0; border-bottom: 1px dashed var(--border-color);">${window.format16DigitDisplay(c.code)}</div>`)
            .join('');
        openModal('newCodesModal');

    } catch(e) { 
        alert("حدث خطأ أثناء توليد الأكواد!"); 
    }
    
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
};

// عرض الأكواد في جدول المدرس بتنسيق البطاقات البنكية (4 × 4)
window.renderChargeCodes = async function() {
    let table = document.getElementById("codes-table");
    if (!table) return;
    
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width:30%;">رقم كارت الشحن (16 رقماً)</th>
                <th style="width:15%;">القيمة</th>
                <th style="width:25%;">الحالة / المستخدم</th>
                <th style="width:15%;">تاريخ الإنشاء</th>
                <th style="width:15%;">إجراء</th>
            </tr>
        </thead>
        <tbody id="codes-tbody">
            <tr><td colspan="5" style="text-align:center;">جاري التحميل... ⏳</td></tr>
        </tbody>`;
        
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/chargeCodes.json`);
        let codes = await res.json() || {};
        let tbody = document.getElementById("codes-tbody");
        tbody.innerHTML = "";
        let keys = Object.keys(codes).reverse();
        
        if (keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); font-weight: bold; padding: 30px;">لم تقم بإنشاء أي كروت شحن حتى الآن. 💳</td></tr>`;
            return;
        }

        keys.forEach(codeStr => {
            let data = codes[codeStr];
            let isUsed = data.status === 'used';
            let usedByInfo = data.usedBy ? `<div style="font-size:11px; color:var(--text-main); margin-top:4px;">👤 ${data.usedBy}</div>` : '';
            
            let statusBadge = !isUsed 
                ? '<span class="status-badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 5px 12px;">متاح ✅</span>' 
                : `<span class="status-badge" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 5px 12px;">مستخدم ❌</span>${usedByInfo}`;
            
            let reactivateBtn = isUsed 
                ? `<button class="icon-btn" style="background:#f59e0b; color:white; border:none; padding:5px 10px; font-size:12px;" onclick="reactivateChargeCode('${codeStr}')">🔄 تفعيل</button>` 
                : '';

            let formattedCardNum = window.format16DigitDisplay(codeStr);

            tbody.innerHTML += `
            <tr style="${isUsed ? 'background: rgba(239,68,68,0.02);' : ''}">
                <td style="direction: ltr; text-align: right;">
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                        <span style="color: var(--primary-color); font-family: monospace; font-size: 16px; font-weight: 900; letter-spacing: 2px;">${formattedCardNum}</span>
                        <button onclick="navigator.clipboard.writeText('${codeStr}'); showToast('تم نسخ رقم الكارت (16 رقماً)! 📋');" style="background:var(--hover-bg); border:1px solid var(--border-color); border-radius:6px; cursor:pointer; font-size:14px; padding:4px 8px;" title="نسخ الرقم">📋</button>
                    </div>
                </td>
                <td><strong style="color: #f59e0b; font-size: 17px;">${data.amount} ج.م</strong></td>
                <td>${statusBadge}</td>
                <td style="font-size:13px; color:var(--text-muted); font-weight: bold;">${data.createdAt}</td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        ${reactivateBtn}
                        <button class="icon-btn danger" onclick="deleteChargeCode('${codeStr}')" title="حذف">🗑️</button>
                    </div>
                </td>
            </tr>`;
        });
    } catch(e) { 
        let tbody = document.getElementById("codes-tbody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red; font-weight: bold;">حدث خطأ في تحميل الأكواد!</td></tr>`;
    }
};

// 🔄 دالة إعادة تفعيل الكود لو حصلت مشكلة مع طالب
window.reactivateChargeCode = async function(codeStr) {
    if(!confirm(`هل تريد إعادة تفعيل الكود (${codeStr}) ليصبح متاحاً للشحن مرة أخرى؟`)) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/chargeCodes/${codeStr}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "unused", usedBy: null, usedAt: null })
        });
        renderChargeCodes();
        showToast("تم إعادة تفعيل الكود بنجاح! ✅");
    } catch(e) { alert("حدث خطأ أثناء التفعيل"); }
};

window.deleteChargeCode = async function(codeStr) {
    if(!confirm("⚠️ هل أنت متأكد من حذف هذا الكود نهائياً؟")) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/chargeCodes/${codeStr}.json`, { method: 'DELETE' });
        renderChargeCodes();
        showToast("تم حذف الكود بنجاح 🗑️");
    } catch(e) { alert("حدث خطأ"); }
};


// ==========================================
// 🧠 دالة فلترة حصص الكورس بناءً على الصف المختار
// ==========================================
window.filterCourseSessions = function(levelSelectId, containerId, selectedIds = []) {
    let selectEl = document.getElementById(levelSelectId);
    let container = document.getElementById(containerId);
    if (!container || !selectEl) return;

    let level = selectEl.value;
    container.innerHTML = "";

    let validGroups = [];
    if(typeof groups !== 'undefined') {
        validGroups = groups.filter(g => level === 'all' || g.level === level).map(g => g.name);
    }

    let validSessions = [];
    if(typeof classSessions !== 'undefined') {
        validSessions = classSessions.filter(s => validGroups.includes(s.group)).reverse();
    }

    if (validSessions.length === 0) {
        container.innerHTML = `<span style="color: var(--danger-color); font-size: 13px; font-weight: bold;">لا توجد حصص مسجلة لهذا الصف!</span>`;
        return;
    }

    validSessions.forEach(s => {
        let isChecked = selectedIds.includes(s.id) ? "checked" : "";
        container.innerHTML += `
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--card-bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-weight: bold; transition: 0.2s;" onmouseover="this.style.borderColor='var(--success-color)'" onmouseout="this.style.borderColor='var(--border-color)'">
            <input type="checkbox" value="${s.id}" ${isChecked} style="accent-color: var(--success-color); width: 18px; height: 18px;">
            ${s.date} - ${s.topic || 'حصة'} (${s.group})
        </label>`;
    });
};


// ==========================================
// 📢 مركز الإشعارات المطور (يدعم الفلترة بالاختيار المتعدد)
// ==========================================

window.toggleNotifTargetOptions = function() {
    let type = document.getElementById("notif-target-type").value;
    let groupContainer = document.getElementById("notif-group-container");
    let levelContainer = document.getElementById("notif-level-container");
    
    let groupCheckboxesBox = document.getElementById("notif-groups-checkboxes");
    let levelCheckboxesBox = document.getElementById("notif-levels-checkboxes");

    // إخفاء الحاويات أولاً
    if(groupContainer) groupContainer.style.display = "none";
    if(levelContainer) levelContainer.style.display = "none";

    if(type === "group" && groupCheckboxesBox) {
        groupContainer.style.display = "block";
        // سحب المجموعات المسجلة عندك في السيستم
        let uniqueGroups = [...new Set(students.map(s => s.group))].filter(g => g && g.trim() !== '');
        
        if(uniqueGroups.length === 0) {
            groupCheckboxesBox.innerHTML = `<span style="color:var(--danger-color); font-size:13px; font-weight:bold;">⚠️ لا توجد مجموعات مسجلة حالياً!</span>`;
        } else {
            groupCheckboxesBox.innerHTML = uniqueGroups.map(g => `
                <label style="display: flex; align-items: center; gap: 6px; background: white; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-weight: bold; cursor: pointer; user-select: none;">
                    <input type="checkbox" name="notif_selected_groups" value="${g}" style="accent-color: var(--success-color); width: 16px; height: 18px; cursor:pointer;">
                    ${g}
                </label>
            `).join('');
        }
    } 
    else if(type === "level" && levelCheckboxesBox) {
        levelContainer.style.display = "block";
        // سحب الصفوف النشطة حالياً في حساب المدرس من الـ activeLevels المبرمجة بالسيستم
        let currentActiveLevels = window.activeLevels || JSON.parse(localStorage.getItem("activeLevels")) || ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"];
        
        levelCheckboxesBox.innerHTML = currentActiveLevels.map(lvl => `
            <label style="display: flex; align-items: center; gap: 6px; background: white; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-weight: bold; cursor: pointer; user-select: none;">
                <input type="checkbox" name="notif_selected_levels" value="${lvl}" style="accent-color: var(--primary-color); width: 16px; height: 18px; cursor:pointer;">
                🎓 ${lvl}
            </label>
        `).join('');
    }
};

window.submitCustomNotification = async function() {
            let title = document.getElementById("notif-title").value.trim();
            let msg = document.getElementById("notif-message").value.trim();
            let type = document.getElementById("notif-target-type").value;

            if(!title || !msg) return showToast("⚠️ يرجى كتابة عنوان ورسالة الإشعار!", "error");

            let targetsArray = [];

            if(type === "all") {
                targetsArray.push("all");
            } 
            else if(type === "group") {
                let checkedGroups = Array.from(document.querySelectorAll('input[name="notif_selected_groups"]:checked')).map(cb => cb.value);
                if(checkedGroups.length === 0) return showToast("⚠️ يرجى اختيار مجموعة واحدة على الأقل!", "error");
                targetsArray = checkedGroups;
            } 
            else if(type === "level") {
                let checkedLevels = Array.from(document.querySelectorAll('input[name="notif_selected_levels"]:checked')).map(cb => cb.value);
                if(checkedLevels.length === 0) return showToast("⚠️ يرجى اختيار صف دراسي واحد على الأقل!", "error");
                targetsArray = checkedLevels;
            }

            let btn = document.querySelector("button[onclick='submitCustomNotification()']");
            let originalText = btn.innerHTML;
            btn.innerHTML = "جاري بث الإشعارات... ⏳";
            btn.disabled = true;

            try {
                // إرسال الإشعار لكل هدف على حدة لضمان قراءته بشكل سليم عند الطالب
                for(let target of targetsArray) {
                    await sendPlatformNotification(target, title, msg);
                }
                
                document.getElementById("notif-title").value = "";
                document.getElementById("notif-message").value = "";
                document.querySelectorAll('input[name="notif_selected_groups"], input[name="notif_selected_levels"]').forEach(cb => cb.checked = false);
                
                showToast("تم بث الإشعار للمستهدفين بنجاح! 🚀", "success");
                loadSentNotifications();
            } catch (e) {
                showToast("حدث خطأ أثناء الإرسال!", "error");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };

window.loadSentNotifications = async function() {
    let container = document.getElementById("sent-notifs-history");
    if(!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري جلب الإشعارات من السيرفر... ⏳</div>`;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/notifications.json`);
        let data = await res.json() || {};
        let notifs = Object.values(data).reverse(); 
        
        if(notifs.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background: var(--bg-color); border-radius: 12px; border: 2px dashed var(--border-color);">لا توجد إشعارات سابقة مسجلة. 📭</div>`;
            return;
        }

        container.innerHTML = notifs.map(n => {
            let targetName = 'غير معروف';
            if(n.target === 'all') targetName = '<span style="color:#10b981; font-weight:bold;">جميع الطلاب 🌍</span>';
            else if(window.activeLevels && window.activeLevels.includes(n.target)) {
                targetName = `<span style="color:#3b82f6; font-weight:bold;">المرحلة: ${n.target} 🎓</span>`;
            } else {
                targetName = `<span style="color:#f59e0b; font-weight:bold;">مجموعة: ${n.target} 👥</span>`;
            }

            return `
            <div style="background: var(--bg-color); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); border-right: 4px solid #f59e0b; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); gap: 15px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; color: var(--secondary-color); font-size: 16px;">${n.title}</h4>
                    <p style="margin: 0; font-size: 14px; color: var(--text-muted); line-height: 1.6;">${n.message}</p>
                </div>
                <div style="text-align: left; min-width: 150px; border-right: 1px solid var(--border-color); padding-right: 15px;">
                    <span style="display: block; font-size: 12px; background: var(--hover-bg); padding: 6px 10px; border-radius: 6px; margin-bottom: 8px;">إلى: ${targetName}</span>
                    <span style="display: block; font-size: 12px; color: #94a3b8; font-weight: bold;">🕒 ${n.date}</span>
                </div>
            </div>`;
        }).join('');
    } catch(e) { 
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger-color); font-weight:bold;">حدث خطأ في تحميل السجل!</div>`;
    }
};


window.openEditCourseModal = function(id) {
    let lec = window.fetchedLectures.find(l => l.id === id);
    if(!lec) return;

    document.getElementById("editLecId").value = lec.id;
    document.getElementById("editLecTitle").value = lec.title;
    document.getElementById("editLecDesc").value = lec.desc || "";
    document.getElementById("editLecMaxViews").value = lec.maxViews || 0;
    document.getElementById("editLecImageBase64").value = lec.image || "";
    document.getElementById("editLecImageFile").value = ""; 
    document.getElementById("editLecVisibility").value = lec.isHidden ? "hidden" : "visible";

    let selectLevel = document.getElementById("editLecLevel");
    document.getElementById("editLecTrack").value = lec.track || 'all';
    let activeLevels = JSON.parse(localStorage.getItem("activeLevels")) || ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"];
    selectLevel.innerHTML = '<option value="all">كل الصفوف (عام)</option>';
    activeLevels.forEach(lvl => { selectLevel.innerHTML += `<option value="${lvl}" ${lec.level === lvl ? 'selected' : ''}>${lvl}</option>`; });

    let savedSessions = lec.linkedSessions || [];
    if(lec.linkedSession && !savedSessions.includes(lec.linkedSession)) savedSessions.push(lec.linkedSession); 
    
    filterCourseSessions('editLecLevel', 'editLecSessionsContainer', savedSessions);

    let vContainer = document.getElementById("editCourseVideosContainer");
    vContainer.innerHTML = "";
    if(lec.videos && lec.videos.length > 0) {
        lec.videos.forEach(v => addEditCourseVideoRow(v.title, v.url, v.linkedSessions || v.linkedSession, v.requiredExam, v.type, v.price));
    } else if (lec.url) {
        addEditCourseVideoRow("المحاضرة كاملة", lec.url); 
    } else {
        addEditCourseVideoRow();
    }

    openModal("editCourseModal");
};








window.switchPlatformTab = function(tabName) {
    document.querySelectorAll('.platform-section').forEach(sec => sec.style.display = 'none');
    
    // إزالة اللون النشط من كل الأزرار
    document.querySelectorAll('[id^="tab-btn-"]').forEach(btn => {
        btn.style.background = '#ffffff';
        btn.style.color = '#0f172a';
        btn.style.borderColor = '#cbd5e1';
    });
    
    let targetSec = document.getElementById(`platform-${tabName}`);
    let targetBtn = document.getElementById(`tab-btn-${tabName}`);
    
    if(targetSec) targetSec.style.display = 'block';
    
    // تمييز الزر النشط بالأحمر الملكي الخاص بهوية القيصر
    if(targetBtn) {
        targetBtn.style.background = 'linear-gradient(135deg, #b91c1c, #980000)';
        targetBtn.style.color = '#ffffff';
        targetBtn.style.borderColor = 'transparent';
    }

    if(tabName === 'codes') {
        renderChargeCodes();
        fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/lectures.json`)
        .then(res => res.json())
        .then(data => {
            let select = document.getElementById("codeLinkedCourse");
            if(!select) return;
            select.innerHTML = '<option value="">بدون ربط (جميع الكورسات متاحة للطالب)</option>';
            if(data) {
                Object.values(data).forEach(lec => {
                    if(lec) select.innerHTML += `<option value="${lec.id}">${lec.title} (${lec.level})</option>`;
                });
            }
        }).catch(e => console.log(e));
    }
    
    if(tabName === 'lectures') {
        renderLectures();
        let selectLevel = document.getElementById("lecLevel");
        if(selectLevel) {
            let activeLevels = JSON.parse(localStorage.getItem("activeLevels")) || ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"];
            selectLevel.innerHTML = '<option value="all">كل الصفوف (عام)</option>';
            activeLevels.forEach(lvl => { selectLevel.innerHTML += `<option value="${lvl}">${lvl}</option>`; });
        }
        let vContainer = document.getElementById("courseVideosContainer");
        if (vContainer && vContainer.innerHTML.trim() === "") addCourseVideoRow();
    }
    
    if(tabName === 'exams') renderOnlineExams();
    if(tabName === 'notifications') { toggleNotifTargetOptions(); loadSentNotifications(); }
    if(tabName === 'store') loadStoreData();
    if(tabName === 'forum') loadPlatformForumQuestions();
};

// 🔥 4. تحديث حدث الـ onChange بتاع تغيير الصف عشان يحدث قائمة الحصص جوه الفيديوهات
document.getElementById("lecLevel")?.addEventListener("change", function() {
    // تحديث كل قوائم الحصص الموجودة حالياً في الفيديوهات
    let level = this.value;
    let validGroups = groups.filter(g => level === 'all' || g.level === level).map(g => g.name);
    let validSessions = classSessions.filter(s => validGroups.includes(s.group)).reverse();
    
    let sessionOpts = '<option value="">بدون ربط (متاح للكل بناءً على شراء الكورس)</option>';
    validSessions.forEach(s => {
        sessionOpts += `<option value="${s.id}">${s.date} - ${s.topic || 'حصة'} (${s.group})</option>`;
    });

    document.querySelectorAll('.vid-session').forEach(select => {
        let currentVal = select.value; // حفظ القيمة لو كان مختار حاجة
        select.innerHTML = sessionOpts;
        select.value = currentVal; 
    });
});



// --- 🎬 عرض الكورسات (مع زراير التعديل والإحصائيات) ---
// --- 🎬 عرض الكورسات (تعديل الزرار الخارجي لـ المحتوى) ---
window.renderLectures = async function() {
    let list = document.getElementById("lectures-list"); if(!list) return;
    list.innerHTML = `<div style="grid-column: 1/-1; text-align:center;">جاري التحميل...</div>`;
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/lectures.json`);
        let lectures = await res.json() || {};
        list.innerHTML = ""; let keys = Object.keys(lectures).reverse();
        if(keys.length === 0) return list.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">لا توجد كورسات منشورة.</div>`;
        
        window.fetchedLectures = []; 

        keys.forEach(key => {
            let lec = lectures[key];
            window.fetchedLectures.push(lec);
            let priceBadge = lec.type === 'paid' ? `<span style="background:#fee2e2; color:#ef4444; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${lec.price} ج.م</span>` : `<span style="background:#d1fae5; color:#059669; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">مجاني</span>`;
            let targetText = lec.level === 'all' || lec.group === 'all' ? 'جميع الصفوف' : (lec.level || lec.group);
            let linkBadge = lec.linkedSession ? `<span style="display:block; margin-top:5px; font-size:11px; color:#f59e0b;">🔗 مربوط بحصة</span>` : '';

            list.innerHTML += `
            <div style="background: var(--card-bg); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                <img src="${lec.image}" style="width: 100%; height: 160px; object-fit: cover; border-bottom: 3px solid var(--primary-color);">
                <div style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h4 style="margin:0; color:var(--secondary-color); font-size: 16px;">${lec.title}</h4> ${priceBadge}
                    </div>
                    <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted); font-weight: bold;">المستهدف: ${targetText} ${linkBadge}</p>
                    <div style="display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap;">
                        <button onclick="openEditCourseModal('${lec.id}')" style="flex:1; background:#f59e0b; color:white; border:none; border-radius:6px; padding:8px; cursor:pointer; font-weight: bold;">تعديل ✏️</button>
                        
                        <button onclick="openCourseContent('${lec.id}')" style="flex:1; background:#3b82f6; color:white; border:none; border-radius:6px; padding:8px; cursor:pointer; font-weight: bold;">المحتوى 📜</button>
                        
                        <button onclick="deleteLecture('${lec.id}')" style="width:100%; background:#ef4444; color:white; border:none; border-radius:6px; padding:8px; cursor:pointer; font-weight: bold; margin-top:5px;">حذف 🗑️</button>
                    </div>
                </div>
            </div>`;
        });
    } catch(e) {}
};

// ==========================================
// 📜 فتح محتوى الكورس (تصميم Premium زي Edutrack)
// ==========================================
window.openCourseContent = function(courseId) {
    let lec = window.fetchedLectures.find(l => l.id === courseId);
    if(!lec) return;

    document.getElementById("contentCourseTitle").innerText = `📜 محتوى: ${lec.title}`;
    let list = document.getElementById("courseVideosList");
    list.innerHTML = "";

    let vids = lec.videos || [];
    if(vids.length === 0 && lec.url) vids.push({title: "المحاضرة كاملة", url: lec.url, type: 'free'});

    if(vids.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding: 30px; color:var(--text-muted); font-weight:bold; background: var(--hover-bg); border-radius: 12px; border: 2px dashed var(--border-color);">لا توجد فيديوهات في هذا الكورس.</div>`;
    } else {
        vids.forEach((v, idx) => {
            // شياكة البادجات: توضح نوع الفيديو وسعره والامتحانات
            let typeBadge = (v.type === 'paid') ? `<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: bold;">مدفوع (${v.price || 0} ج) 💰</span>` : `<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: bold;">مجاني 🎁</span>`;
            let examBadge = v.requiredExam ? `<span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: bold;">مربوط بامتحان 📝</span>` : '';
            
            list.innerHTML += `
            <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02); transition: 0.3s; margin-bottom: 12px;" onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='#8b5cf6'; this.style.boxShadow='0 10px 20px rgba(139, 92, 246, 0.1)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border-color)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.02)';">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; width: 50px; height: 50px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 22px;">
                        ▶️
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <span style="font-weight: 900; color: var(--secondary-color); font-size: 17px;">${v.title}</span>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${typeBadge}
                            ${examBadge}
                        </div>
                    </div>
                </div>
                <button onclick="openVideoAnalytics('${courseId}', ${idx}, '${v.title}')" style="background: linear-gradient(45deg, #8b5cf6, #6d28d9); color: white; border: none; border-radius: 10px; padding: 10px 20px; cursor: pointer; font-weight: 900; font-size: 14px; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.3); transition: 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    الإحصائيات 📊
                </button>
            </div>
            `;
        });
    }
    openModal("courseContentModal");
};

// ==========================================
// 📊 إحصائيات الفيديو (مع بحث وإحصائيات علوية)
// ==========================================
window.openVideoAnalytics = async function(courseId, videoIndex, videoTitle) {
    let tbody = document.getElementById("course-analytics-list");
    
    // حقن هيدر الإحصائيات والبحث ديناميكياً جوه المودال لو مش موجود
    let searchBoxId = "analyticsSearchBox";
    if (!document.getElementById(searchBoxId)) {
        let statsHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--hover-bg); padding: 15px 20px; border-radius: 16px; border: 1px dashed var(--border-color);">
                <div style="display: flex; gap: 30px;">
                    <div style="text-align: center;">
                        <span style="display: block; font-size: 12px; color: var(--text-muted); font-weight: bold; margin-bottom: 5px;">إجمالي المشاهدين</span>
                        <strong id="analyticsTotalViewers" style="font-size: 24px; color: #8b5cf6;">0</strong>
                    </div>
                    <div style="width: 2px; background: var(--border-color); border-radius: 2px;"></div>
                    <div style="text-align: center;">
                        <span style="display: block; font-size: 12px; color: var(--text-muted); font-weight: bold; margin-bottom: 5px;">إجمالي المشاهدات</span>
                        <strong id="analyticsTotalViews" style="font-size: 24px; color: #10b981;">0</strong>
                    </div>
                </div>
                <input type="text" id="${searchBoxId}" class="custom-input" placeholder="🔍 بحث بالاسم أو الكود..." style="width: 300px; margin: 0; border-radius: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);" onkeyup="filterAnalyticsTable()">
            </div>
        `;
        tbody.closest('.table-container').insertAdjacentHTML('beforebegin', statsHtml);
    }

    document.getElementById("analyticsVideoTitle").innerText = `📊 إحصائيات: ${videoTitle}`;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px;">جاري جلب البيانات... ⏳</td></tr>`;
    
    // تصفير الخانات القديمة
    if (document.getElementById("analyticsTotalViewers")) document.getElementById("analyticsTotalViewers").innerText = "0";
    if (document.getElementById("analyticsTotalViews")) document.getElementById("analyticsTotalViews").innerText = "0";
    if (document.getElementById(searchBoxId)) document.getElementById(searchBoxId).value = "";

    openModal("courseAnalyticsModal");

    let course = window.fetchedLectures ? window.fetchedLectures.find(c => c.id === courseId) : null;
    let defaultMaxViews = course ? (parseInt(course.maxViews) || 0) : 0;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/course_tracking/${courseId}.json`);
        let trackingData = await res.json() || {};
        
        tbody.innerHTML = ""; 
        let hasData = false;
        let totalViewersCount = 0;
        let totalViewsCount = 0;

        Object.keys(trackingData).forEach(key => {
            if (key === "0" || key === "") return;

            let studentVids = trackingData[key];
            if(studentVids[videoIndex]) { 
                hasData = true;
                totalViewersCount++;
                let vData = studentVids[videoIndex];
                totalViewsCount += (vData.views || 0);

                let st = typeof students !== 'undefined' ? students.find(s => s.code === key || (s.phone && String(s.phone).trim() !== "0" && s.phone === key)) : null;
                let name = st ? st.name : "طالب غير معروف";
                let code = st ? st.code : key;
                
                let extraViews = parseInt(vData.extraViews) || 0;
                let totalAllowed = defaultMaxViews > 0 ? defaultMaxViews + extraViews : "∞";
                let isBlocked = defaultMaxViews > 0 && vData.views >= totalAllowed;

                let viewsDisplay = defaultMaxViews > 0 ? `${vData.views} / ${totalAllowed}` : vData.views;
                let badgeBg = isBlocked ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";
                let badgeColor = isBlocked ? "#ef4444" : "#10b981";

                tbody.innerHTML += `<tr class="analytics-row">
                    <td class="st-code"><strong style="color: var(--primary-color);">${code}</strong></td>
                    <td class="st-name" style="font-weight: bold; font-size: 15px;">${name}</td>
                    <td style="direction: ltr;"><span style="background:${badgeBg}; color:${badgeColor}; border: 1px solid ${badgeColor}; padding:4px 12px; border-radius:12px; font-weight:900; font-size:14px;">👁️ ${viewsDisplay}</span></td>
                    <td style="font-size: 13px; color: var(--text-muted); font-weight:bold;">${vData.lastSeen}</td>
                    <td>
                        ${defaultMaxViews > 0 ? `<button class="save-btn" style="width: auto; padding: 6px 15px; margin: 0; font-size: 12px; background: #3b82f6; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(59,130,246,0.2);" onclick="addExtraViews('${courseId}', ${videoIndex}, '${key}', ${extraViews}, '${name}', '${videoTitle}')">➕ زيادة</button>` : `<span style="color:var(--text-muted); font-size:12px; font-weight:bold; background: var(--hover-bg); padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border-color);">غير محدود</span>`}
                    </td>
                </tr>`;
            }
        });

        if(!hasData) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; font-weight:bold; color:var(--text-muted);">لم يقم أي طالب بمشاهدة هذا الفيديو حتى الآن. 📭</td></tr>`;
        
        // تحديث الأرقام العلوية
        if (document.getElementById("analyticsTotalViewers")) document.getElementById("analyticsTotalViewers").innerText = totalViewersCount;
        if (document.getElementById("analyticsTotalViews")) document.getElementById("analyticsTotalViews").innerText = totalViewsCount;

    } catch(e) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding: 20px; font-weight: bold;">خطأ في الاتصال بالإنترنت! ❌</td></tr>`; 
    }
};

// دالة فلترة جدول الإحصائيات أثناء الكتابة
window.filterAnalyticsTable = function() {
    let input = document.getElementById("analyticsSearchBox").value.toLowerCase();
    let rows = document.querySelectorAll(".analytics-row");
    rows.forEach(row => {
        let code = row.querySelector(".st-code").innerText.toLowerCase();
        let name = row.querySelector(".st-name").innerText.toLowerCase();
        if (code.includes(input) || name.includes(input)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
};





// ==========================================
// 🖼️ دالة ذكية لضغط الصور قبل الرفع (تمنع بطء السيستم)
// ==========================================
window.readFileAsBase64 = function(fileInputId) {
    return new Promise((resolve, reject) => {
        let fileInput = document.getElementById(fileInputId);
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            resolve(null); 
            return;
        }
        
        let file = fileInput.files[0];
        
        // التأكد إن الملف صورة
        if (!file.type.match(/image.*/)) {
            resolve(null);
            return;
        }

        let reader = new FileReader();
        reader.onload = function(readerEvent) {
            let image = new Image();
            image.onload = function() {
                // عمل لوحة رسم (Canvas) لضغط الصورة
                let canvas = document.createElement('canvas');
                let MAX_SIZE = 500; // أقصى عرض أو طول للصورة (عشان تبقى خفيفة جداً)
                let width = image.width;
                let height = image.height;

                // حساب الأبعاد الجديدة مع الحفاظ على نسبة العرض للطول
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                let ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, width, height);

                // ضغط الصورة لصيغة JPEG بجودة 50% (هتفضل واضحة بس حجمها هيقل جداً)
                let compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                resolve(compressedBase64);
            };
            image.src = readerEvent.target.result;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};






// الدالة الجديدة لمنح مشاهدات إضافية للطالب
window.addExtraViews = async function(courseId, videoIndex, studentKey, currentExtra, studentName, videoTitle) {
    let extra = prompt(`الطالب: ${studentName}\nكم عدد المشاهدات الإضافية التي تريد منحها لهذا الطالب (لهذا الفيديو فقط)؟\n\nاكتب رقماً (مثلاً: 1 لإعطائه فرصة مشاهدة واحدة إضافية):`);
    
    if (!extra) return;
    extra = parseInt(extra);
    if (isNaN(extra) || extra <= 0) {
        if(typeof showToast === 'function') showToast("يرجى إدخال رقم صحيح!", "error");
        else alert("يرجى إدخال رقم صحيح!");
        return;
    }

    let newExtraTotal = currentExtra + extra;
    let btn = event.currentTarget;
    let origText = btn.innerText;
    btn.innerText = "جاري...⏳";
    btn.disabled = true;

    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/course_tracking/${courseId}/${studentKey}/${videoIndex}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ extraViews: newExtraTotal })
        });
        
        if(typeof showToast === 'function') showToast(`تم إضافة ${extra} مشاهدات للطالب بنجاح! ✅`, "success");
        else alert("تم الإضافة بنجاح!");
        
        // إعادة فتح النافذة لتحديث الأرقام
        window.openVideoAnalytics(courseId, videoIndex, videoTitle); 
    } catch(e) {
        alert("حدث خطأ في الاتصال!");
        btn.innerText = origText;
        btn.disabled = false;
    }
};

window.openCourseAnalytics = async function(courseId) {
    let tbody = document.getElementById("course-analytics-list");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">جاري جلب البيانات... ⏳</td></tr>`;
    openModal("courseAnalyticsModal");

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/course_tracking/${courseId}.json`);
        let trackingData = await res.json() || {};
        
        tbody.innerHTML = ""; let hasData = false;

        Object.keys(trackingData).forEach(key => {
            // 🔥 مسح الداتا الوهمية
            if (key === "0" || key === "") return;

            let st = typeof students !== 'undefined' ? students.find(s => s.code === key || (s.phone && String(s.phone).trim() !== "0" && s.phone === key)) : null;
            let name = st ? st.name : "طالب غير معروف";
            let code = st ? st.code : key;

            let studentVids = trackingData[key];
            Object.keys(studentVids).forEach(vIdx => {
                hasData = true;
                let vData = studentVids[vIdx];
                tbody.innerHTML += `<tr>
                    <td><strong>${code}</strong></td>
                    <td>${name}</td>
                    <td>${vData.videoTitle || 'فيديو'}</td>
                    <td><span style="background:var(--primary-color); color:#fff; padding:2px 8px; border-radius:10px; font-weight:bold;">${vData.views}</span></td>
                    <td style="font-size: 13px; color: var(--text-muted);">${vData.lastSeen}</td>
                </tr>`;
            });
        });

        if(!hasData) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">لم يقم أي طالب بمشاهدة الكورس حتى الآن.</td></tr>`;
    } catch(e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">خطأ في الاتصال!</td></tr>`; }
};



window.deleteLecture = async function(id) {
    if(!confirm("هل تريد حذف المحاضرة نهائياً؟")) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/lectures/${id}.json`, { method: 'DELETE' });
        renderLectures();
    } catch(e) {}
};

// --- 📝 الامتحانات الإلكترونية ---

window.openOnlineExamBuilder = function() {
    document.getElementById("editingOnlineExamId").value = ""; // تصفير الـ ID عشان نكريت جديد
    document.getElementById("onlineExamTitle").value = "";
    document.getElementById("onlineExamDuration").value = "60";
    document.getElementById("onlineExamPassScore").value = "";
    document.getElementById("onlineExamAutoShowResult").checked = true;
    
    // إرجاع اسم الزر لشكله الطبيعي
    let submitBtn = document.querySelector("#buildOnlineExamModal .save-btn");
    if(submitBtn) submitBtn.innerText = "🚀 نشر الامتحان الإلكتروني";

    let groupContainer = document.getElementById("onlineExamGroupsContainer");
    if(groupContainer && typeof groups !== 'undefined') {
        groupContainer.innerHTML = groups.map(g => `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--hover-bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-weight: bold;"><input type="checkbox" name="examGroup" value="${g.name}" style="accent-color: var(--primary-color); width: 18px; height: 18px;">${g.name}</label>`).join('');
    }
    
    currentQuestions = [];
    document.getElementById("examQuestionsContainer").innerHTML = "";
    addQuestionBlock('mcq'); 
    openModal('buildOnlineExamModal');
};

// ✏️ الدالة الجديدة لفتح الامتحان القديم وتعديله
window.openEditOnlineExam = function(examId) {
    let exam = window.fetchedOnlineExams.find(e => e.id === examId);
    if (!exam) return;

    // تعبئة البيانات الأساسية
    document.getElementById("editingOnlineExamId").value = exam.id;
    document.getElementById("onlineExamTitle").value = exam.title;
    document.getElementById("onlineExamDuration").value = exam.duration;
    document.getElementById("onlineExamPassScore").value = exam.passScore || "";
    document.getElementById("onlineExamTrack").value = exam.track || "all";
    document.getElementById("onlineExamAutoShowResult").checked = exam.autoShowResult;
    
    // تغيير اسم الزر ليدل على التعديل
    let submitBtn = document.querySelector("#buildOnlineExamModal .save-btn");
    if(submitBtn) submitBtn.innerText = "💾 حفظ تعديلات الامتحان";

    // تعبئة المجموعات المستهدفة
    let groupContainer = document.getElementById("onlineExamGroupsContainer");
    if(groupContainer && typeof groups !== 'undefined') {
        let examGroups = Array.isArray(exam.group) ? exam.group : [exam.group];
        groupContainer.innerHTML = groups.map(g => {
            let isChecked = examGroups.includes(g.name) || examGroups.includes('all') ? "checked" : "";
            return `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--hover-bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-weight: bold;"><input type="checkbox" name="examGroup" value="${g.name}" ${isChecked} style="accent-color: var(--primary-color); width: 18px; height: 18px;">${g.name}</label>`;
        }).join('');
    }

    // جلب الأسئلة القديمة وعرضها
    currentQuestions = JSON.parse(JSON.stringify(exam.questions || [])); 
    renderQuestionBlocks();
    
    openModal('buildOnlineExamModal');
};

window.saveOnlineExam = async function() {
    let editId = document.getElementById("editingOnlineExamId").value; // لو فيه ID معناه إننا بنعدل
    let title = document.getElementById("onlineExamTitle").value.trim();
    let duration = document.getElementById("onlineExamDuration").value;
    let autoResult = document.getElementById("onlineExamAutoShowResult").checked;
    let selectedGroups = []; 
    document.querySelectorAll('input[name="examGroup"]:checked').forEach(cb => selectedGroups.push(cb.value));

    if(!title || !duration || currentQuestions.length === 0 || selectedGroups.length === 0) {
        if(typeof showToast === 'function') showToast("⚠️ يرجى إكمال بيانات الامتحان واختيار مجموعة وإضافة أسئلة!", "error");
        else alert("⚠️ يرجى إكمال بيانات الامتحان!");
        return;
    }

    let passScore = document.getElementById("onlineExamPassScore").value;
    let totalScore = currentQuestions.reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);
    let trackElement = document.getElementById("onlineExamTrack");

    // زر التحميل
    let btn = document.querySelector("#buildOnlineExamModal .save-btn");
    let origText = btn.innerText;
    btn.innerText = "جاري الحفظ... ⏳";
    btn.disabled = true;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/data/onlineExams.json`);
        let existingExams = await res.json() || [];
        existingExams = Array.isArray(existingExams) ? existingExams : Object.values(existingExams).filter(e => e !== null);

        if (editId) {
            // 📝 حفظ التعديلات على امتحان موجود
            let examIndex = existingExams.findIndex(e => e.id === editId);
            if (examIndex > -1) {
                existingExams[examIndex].title = title;
                existingExams[examIndex].duration = parseInt(duration);
                existingExams[examIndex].group = selectedGroups;
                existingExams[examIndex].autoShowResult = autoResult;
                existingExams[examIndex].totalScore = totalScore;
                existingExams[examIndex].passScore = parseInt(passScore) || (totalScore / 2);
                existingExams[examIndex].track = trackElement ? trackElement.value : "all";
                existingExams[examIndex].questions = currentQuestions;
            }
        } else {
            // 🚀 نشر امتحان جديد
            let newExam = { 
                id: "exam_" + Date.now(), 
                title: title, 
                duration: parseInt(duration), 
                group: selectedGroups, 
                autoShowResult: autoResult, 
                totalScore: totalScore, 
                passScore: parseInt(passScore) || (totalScore / 2), 
                track: trackElement ? trackElement.value : "all", 
                status: "open", 
                date: new Date().toISOString().split('T')[0], 
                questions: currentQuestions 
            };
            existingExams.push(newExam);
        }

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/data/onlineExams.json`, { 
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(existingExams) 
        });

        if(typeof showToast === 'function') showToast(editId ? "تم تعديل الامتحان بنجاح! ✏️" : "تم نشر الامتحان للطلاب بنجاح! 🚀");
        
        closeModal('buildOnlineExamModal'); 
        renderOnlineExams();
    } catch(e) { 
        alert("حدث خطأ أثناء حفظ الامتحان."); 
    } finally {
        btn.innerText = origText;
        btn.disabled = false;
    }
};

// ==========================================
// 💳 رسم كروت الامتحانات (تصميم VIP المطور والمجمع)
// ==========================================
window.renderOnlineExams = async function() {
    let container = document.getElementById("online-exams-container");
    if(!container) return;
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل... ⏳</div>`;
    
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/data/onlineExams.json`);
        let exams = await res.json() || [];
        window.fetchedOnlineExams = Array.isArray(exams) ? exams : Object.values(exams).filter(e => e !== null);
        
        if(window.fetchedOnlineExams.length === 0) return container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 12px;">لا توجد امتحانات إلكترونية حتى الآن.</div>`;

        container.innerHTML = "";
        [...window.fetchedOnlineExams].reverse().forEach((exam) => {
            let statusColor = exam.status === 'open' ? '#10b981' : '#ef4444';
            let statusText = exam.status === 'open' ? 'متاح للطلاب ✅' : 'مغلق ❌';
            let originalIndex = window.fetchedOnlineExams.findIndex(e => e.id === exam.id);
            let groupsText = Array.isArray(exam.group) ? exam.group.join('، ') : (exam.group === 'all' ? 'الكل' : exam.group);

            container.innerHTML += `
            <div class="card" style="background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border-color); padding: 22px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border-top: 4px solid ${statusColor}; transition: 0.3s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.03)';">
                
                <!-- الهيدر والحالة -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap: 10px;">
                    <h3 style="margin: 0; color: var(--secondary-color); font-size: 18px; font-weight: 900; line-height: 1.4; flex: 1;">${exam.title}</h3>
                    <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 900; border: 1px solid ${statusColor}40; white-space: nowrap;">${statusText}</span>
                </div>

                <!-- تفاصيل الامتحان -->
                <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;">
                    <span style="font-size: 13px; font-weight: bold; color: var(--text-main);">🎯 المجموع: <strong style="color: var(--primary-color);">${exam.totalScore} درجة</strong></span>
                    <span style="font-size: 13px; font-weight: bold; color: var(--text-main);">⏱️️ المدة: <strong>${exam.duration} دقيقة</strong></span>
                    <span style="font-size: 13px; font-weight: bold; color: var(--text-main);">👥 المستهدف: <strong style="color: #3b82f6;">${groupsText}</strong></span>
                </div>

                <!-- الأزرار السفلية المجمعة -->
                <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
                    <button class="save-btn" style="width: 100%; background: #3b82f6; margin: 0; font-size: 14px; padding: 12px; border-radius: 10px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2); transition: 0.2s;" onclick="openOnlineExamDetails('${exam.id}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">📊 عرض الدرجات والتسليمات</button>
                    
                    <div style="display: flex; gap: 8px;">
                        <button onclick="openEditOnlineExam('${exam.id}')" style="flex: 1; background: #f8fafc; color: var(--text-main); border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0';">✏️ تعديل</button>
                        
                        <button onclick="toggleExamStatus(${originalIndex}, '${exam.status}')" style="flex: 1; background: ${exam.status === 'open' ? '#fef3c7' : '#d1fae5'}; color: ${exam.status === 'open' ? '#d97706' : '#059669'}; border: 1px solid ${exam.status === 'open' ? '#fcd34d' : '#6ee7b7'}; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.filter='brightness(0.95)';">${exam.status === 'open' ? '🔒 قفل' : '🔓 فتح'}</button>
                        
                        <button onclick="deleteOnlineExam(${originalIndex})" style="flex: 1; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#fecaca';">🗑️ حذف</button>
                    </div>
                </div>
            </div>`;
        });
    } catch(e) { container.innerHTML = `<div style="grid-column: 1/-1; color:red; text-align:center;">حدث خطأ في جلب الامتحانات</div>`; }
};

// ==========================================
// 📄 1. تطوير إضافة وتعديل الفيديوهات لدعم ملازم الـ PDF
// ==========================================
window.addCourseVideoRow = function(title = "", url = "", linkedSessions = [], requiredExam = "", type = "free", price = "", pdfUrl = "") {
    let container = document.getElementById("courseVideosContainer");
    let level = document.getElementById("lecLevel").value;
    let validGroups = groups.filter(g => level === 'all' || g.level === level).map(g => g.name);
    let validSessions = classSessions.filter(s => validGroups.includes(s.group)).reverse();
    
    if (!Array.isArray(linkedSessions)) linkedSessions = linkedSessions ? [linkedSessions] : [];

    let sessionsCheckboxes = validSessions.length === 0 
        ? `<span style="color: var(--danger-color); font-size: 12px; font-weight: bold;">لا توجد حصص مسجلة لهذا الصف!</span>`
        : validSessions.map(s => `
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; background: white; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                <input type="checkbox" value="${s.id}" ${linkedSessions.includes(s.id) ? "checked" : ""} class="vid-session-cb" style="accent-color: var(--success-color); width: 16px; height: 16px;">
                ${s.date} - ${s.topic || 'حصة'} (${s.group})
            </label>`).join('');

    let examsToSelect = JSON.parse(localStorage.getItem("onlineExams")) || [];
    let examOpts = '<option value="">بدون شرط امتحان</option>' + examsToSelect.map(e => `<option value="${e.id}" ${requiredExam === e.id ? 'selected' : ''}>${e.title}</option>`).join('');

    let div = document.createElement("div"); 
    div.className = "video-row";
    div.style.cssText = "background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 15px; position: relative;";
    
    div.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 15px; left: 15px; background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; width: 35px; height: 35px; cursor: pointer;">🗑️</button>
        <div style="display: flex; gap: 15px; margin-bottom: 15px; padding-left: 45px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 180px;"><label style="font-size: 12px; font-weight: bold;">عنوان المحاضرة</label><input type="text" class="custom-input vid-title" value="${title}" style="margin: 0; background: #f8fafc;"></div>
            <div style="flex: 1; min-width: 180px;"><label style="font-size: 12px; font-weight: bold;">رابط الفيديو (YouTube)</label><input type="url" class="custom-input vid-url" value="${url}" style="margin: 0; background: #f8fafc; direction: ltr;"></div>
            <div style="flex: 1; min-width: 180px;"><label style="font-size: 12px; font-weight: bold; color: #8b5cf6;">📄 رابط الملزمة PDF (اختياري)</label><input type="url" class="custom-input vid-pdf" placeholder="رابط Google Drive أو PDF..." value="${pdfUrl || ''}" style="margin: 0; background: #f8fafc; direction: ltr; border-color: #c4b5fd;"></div>
        </div>
        <div style="display: flex; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 150px;">
                <label style="font-size: 12px; color: #3b82f6; font-weight: bold;">نوع المحاضرة:</label>
                <select class="custom-input vid-type" style="margin: 0;" onchange="this.nextElementSibling.style.display = this.value === 'paid' ? 'block' : 'none'">
                    <option value="free" ${type === 'free' ? 'selected' : ''}>محتوى مجاني</option>
                    <option value="paid" ${type === 'paid' ? 'selected' : ''}>محتوى مدفوع</option>
                </select>
                <input type="number" class="custom-input vid-price" placeholder="السعر (ج.م)" value="${price}" style="margin-top: 5px; display: ${type === 'paid' ? 'block' : 'none'};">
            </div>
            <div style="flex: 2; min-width: 250px;">
                <label style="font-size: 12px; color: #10b981; font-weight: 900; margin-bottom: 5px; display: block;">🔓 يُفتح مجاناً لمن حضر حصص:</label>
                <div style="max-height: 120px; overflow-y: auto; background: var(--bg-color); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">${sessionsCheckboxes}</div>
            </div>
            <div style="flex: 1; min-width: 150px;"><label style="font-size: 12px; color: #f59e0b; font-weight: bold;">شرط الفتح (اجتياز امتحان):</label><select class="custom-input vid-exam" style="margin: 0;">${examOpts}</select></div>
        </div>`;
    container.appendChild(div);
};

window.addEditCourseVideoRow = function(title = "", url = "", linkedSessions = [], requiredExam = "", type = "free", price = "", pdfUrl = "") {
    let container = document.getElementById("editCourseVideosContainer");
    let level = document.getElementById("editLecLevel").value;
    let validGroups = groups.filter(g => level === 'all' || g.level === level).map(g => g.name);
    let validSessions = classSessions.filter(s => validGroups.includes(s.group)).reverse();
    
    if (!Array.isArray(linkedSessions)) linkedSessions = linkedSessions ? [linkedSessions] : [];

    let sessionsCheckboxes = validSessions.length === 0 
        ? `<span style="color: var(--danger-color); font-size: 12px; font-weight: bold;">لا توجد حصص مسجلة لهذا الصف!</span>`
        : validSessions.map(s => `
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; background: white; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                <input type="checkbox" value="${s.id}" ${linkedSessions.includes(s.id) ? "checked" : ""} class="vid-session-cb" style="accent-color: var(--success-color); width: 16px; height: 16px;">
                ${s.date} - ${s.topic || 'حصة'} (${s.group})
            </label>`).join('');

    let examsToSelect = JSON.parse(localStorage.getItem("onlineExams")) || [];
    let examOpts = '<option value="">بدون شرط امتحان</option>' + examsToSelect.map(e => `<option value="${e.id}" ${requiredExam === e.id ? 'selected' : ''}>${e.title}</option>`).join('');

    let div = document.createElement("div");
    div.className = "video-row-edit";
    div.style.cssText = "background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 15px; position: relative;";
    
    div.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: 15px; left: 15px; background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; width: 35px; height: 35px; cursor: pointer;">🗑️</button>
        <div style="display: flex; gap: 15px; margin-bottom: 15px; padding-left: 45px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 180px;"><label style="font-size: 12px; font-weight: bold;">عنوان الفيديو</label><input type="text" class="custom-input vid-title" value="${title}" style="margin: 0; background: #f8fafc;"></div>
            <div style="flex: 1; min-width: 180px;"><label style="font-size: 12px; font-weight: bold;">رابط الفيديو</label><input type="url" class="custom-input vid-url" value="${url}" style="margin: 0; background: #f8fafc; direction: ltr;"></div>
            <div style="flex: 1; min-width: 180px;"><label style="font-size: 12px; font-weight: bold; color: #8b5cf6;">📄 رابط الملزمة PDF (اختياري)</label><input type="url" class="custom-input vid-pdf" placeholder="https://..." value="${pdfUrl || ''}" style="margin: 0; background: #f8fafc; direction: ltr; border-color: #c4b5fd;"></div>
        </div>
        <div style="display: flex; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 150px;">
                <label style="font-size: 12px; color: #3b82f6; font-weight: bold;">نوع المحاضرة:</label>
                <select class="custom-input vid-type" style="margin: 0;" onchange="this.nextElementSibling.style.display = this.value === 'paid' ? 'block' : 'none'">
                    <option value="free" ${type === 'free' ? 'selected' : ''}>محتوى مجاني</option>
                    <option value="paid" ${type === 'paid' ? 'selected' : ''}>محتوى مدفوع</option>
                </select>
                <input type="number" class="custom-input vid-price" placeholder="السعر (ج.م)" value="${price}" style="margin-top: 5px; display: ${type === 'paid' ? 'block' : 'none'};">
            </div>
            <div style="flex: 2; min-width: 250px;">
                <label style="font-size: 12px; color: #10b981; font-weight: 900; margin-bottom: 5px; display: block;">🔓 يُفتح مجاناً لمن حضر حصص:</label>
                <div style="max-height: 120px; overflow-y: auto; background: white; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">${sessionsCheckboxes}</div>
            </div>
            <div style="flex: 1; min-width: 150px;"><label style="font-size: 12px; color: #f59e0b; font-weight: bold;">شرط الفتح (اجتياز امتحان):</label><select class="custom-input vid-exam" style="margin: 0;">${examOpts}</select></div>
        </div>`;
    container.appendChild(div);
};

// ==========================================
// 🗺️ 2. تطوير صانع الامتحانات لدعم الخرائط والصور وتفسير الإجابة
// ==========================================
window.addQuestionBlock = function(type = 'mcq') {
    currentQuestions.push({ 
        id: "q_" + Date.now() + "_" + Math.floor(Math.random()*1000), 
        type: type, 
        text: "", 
        imageUrl: "", // 🖼️ رابط صورة أو خريطة السؤال
        explanation: "", // 💡 تفسير الإجابة وناتج التعلم
        points: 1, 
        options: ["", "", "", ""], 
        correctAnswerIndex: 0, 
        correctAnswerText: "", 
        correctAnswerTF: "true" 
    });
    renderQuestionBlocks();
    setTimeout(() => { let sa = document.getElementById('examBuilderScrollArea'); if(sa) sa.scrollTop = sa.scrollHeight; }, 100);
};

window.renderQuestionBlocks = function() {
    let container = document.getElementById("examQuestionsContainer");
    if(!container) return;
    if(currentQuestions.length === 0) return container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; border: 2px dashed var(--border-color); border-radius: 12px;">لم تقم بإضافة أي أسئلة بعد.</div>`;
    container.innerHTML = "";
    currentQuestions.forEach((q, index) => {
        let html = `
        <div class="question-block" style="background: var(--bg-color); padding: 20px; border: 1px solid var(--border-color); border-radius: 12px; position: relative; margin-bottom: 15px;">
            <button type="button" onclick="removeQuestion(${index})" style="position: absolute; top: 10px; left: 10px; background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer;">حذف 🗑️</button>
            <div style="display: flex; gap: 15px; margin-bottom: 12px; flex-wrap: wrap;">
                <div style="flex: 3; min-width: 240px;">
                    <label style="color: var(--primary-color); font-weight: bold;">نص السؤال ${index + 1}:</label>
                    <textarea class="custom-input" rows="2" required oninput="updateQuestion(${index}, 'text', this.value)">${q.text || ''}</textarea>
                </div>
                <div style="flex: 1; min-width: 100px;">
                    <label style="color: var(--exam-color); font-weight: bold;">الدرجة:</label>
                    <input type="number" class="custom-input" value="${q.points}" min="1" required oninput="updateQuestion(${index}, 'points', parseFloat(this.value))">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <label style="color: var(--text-main); font-weight: bold; display: block; margin-bottom: 5px;">🖼️ صورة / خريطة للسؤال (اختياري):</label>
                    <label style="display: flex; justify-content: center; align-items: center; background: #ffffff; border: 2px dashed var(--primary-color); color: var(--primary-color); padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s;">
                        <span>${q.imageUrl ? '✅ تم الرفع مسبقاً (اضغط لتغييرها)' : '+ رفع صورة'}</span>
                        <input type="file" accept="image/*" onchange="encodeExamImage(this, ${index})" style="display: none;">
                    </label>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <label style="font-size: 12px; font-weight: bold; color: #10b981;">💡 تفسير الإجابة / ناتج التعلم (يظهر بعد الحل):</label>
                    <input type="text" class="custom-input" placeholder="مثال: لأن معاهدة 1936 نصت على..." value="${q.explanation || ''}" oninput="updateQuestion(${index}, 'explanation', this.value)">
                </div>
            </div>
            <div id="q_options_${index}">${generateOptionsHtml(q, index)}</div>
        </div>`;
        container.innerHTML += html;
    });
};

window.generateOptionsHtml = function(q, index) {
    if(q.type === 'mcq') {
        let optionsHtml = q.options.map((opt, i) => {
            let optText = typeof opt === 'object' ? opt.text : opt;
            let btnText = (typeof opt === 'object' && opt.image) ? '✅ تم' : '🖼️ صورة';
            let btnStyle = (typeof opt === 'object' && opt.image) ? 'background: #d1fae5; border-color: #10b981; color: #047857;' : 'background: var(--hover-bg); border-color: var(--border-color); color: var(--text-muted);';
            
            return `<div style="display:flex; gap:10px; align-items:center; background: var(--bg-color); padding: 10px; border-radius: 12px; border: 1px solid var(--border-color);">
                <input type="radio" name="correct_${index}" ${q.correctAnswerIndex === i ? 'checked' : ''} onchange="updateQuestion(${index}, 'correctAnswerIndex', ${i})" style="width:18px; height:18px; cursor:pointer; accent-color: var(--primary-color);">
                <input type="text" class="custom-input" value="${optText}" placeholder="الاختيار ${i+1}" oninput="updateOption(${index}, ${i}, this.value)" style="flex: 1; margin: 0;">
                <label style="${btnStyle} border: 1px solid; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.3s; white-space: nowrap;">
                    ${btnText}
                    <input type="file" accept="image/*" onchange="encodeExamImage(this, ${index}, ${i})" style="display: none;">
                </label>
            </div>`;
        }).join('');
        return `<label style="font-weight:bold; font-size:14px; margin-bottom:5px; display:block;">الاختيارات (حدد الإجابة الصحيحة بالدائرة):</label><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">${optionsHtml}</div>`;
    } else if(q.type === 'tf') {
        return `<div style="display: flex; gap: 20px;"><label style="cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:bold; color:var(--success-color);"><input type="radio" name="ans_${index}" ${q.correctAnswerTF === 'true' ? 'checked' : ''} onchange="updateQuestion(${index}, 'correctAnswerTF', 'true')" style="width:18px; height:18px;"> صح ✔️</label><label style="cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:bold; color:var(--danger-color);"><input type="radio" name="ans_${index}" ${q.correctAnswerTF === 'false' ? 'checked' : ''} onchange="updateQuestion(${index}, 'correctAnswerTF', 'false')" style="width:18px; height:18px;"> خطأ ❌</label></div>`;
    } else if(q.type === 'blank') {
        return `<label style="font-weight:bold; font-size:14px; margin-bottom:5px; display:block;">الإجابة الصحيحة:</label><input type="text" class="custom-input" value="${q.correctAnswerText}" oninput="updateQuestion(${index}, 'correctAnswerText', this.value)">`;
    } else {
        return `<div style="background: rgba(139, 92, 246, 0.1); padding: 10px; border-radius: 8px; border: 1px dashed var(--exam-color); color: var(--exam-color); font-size: 14px; margin: 0;">📝 هذا السؤال مقالي يصحح يدوياً.</div>`;
    }
};

window.updateQuestion = function(index, field, value) { currentQuestions[index][field] = value; };

window.removeQuestion = function(index) { currentQuestions.splice(index, 1); renderQuestionBlocks(); };






        

window.backToPlatformExams = function() {
    let listContainer = document.getElementById("platform-exams-list-container");
    let detailsContainer = document.getElementById("platform-exam-details-section");
    
    if(listContainer) listContainer.style.display = "block";
    if(detailsContainer) detailsContainer.style.display = "none";
    
    if(typeof renderOnlineExams === 'function') renderOnlineExams();
};

// دعم إضافي لو الزرار القديم لسه موجود في الـ HTML
window.backToExams = function() {
    window.backToPlatformExams();
};


// ==========================================
// 📊 عرض تفاصيل الامتحان (ذكية تعتمد على الكود وتتجاهل تداخل الرقم 0)
// ==========================================
window.openOnlineExamDetails = async function(id) {
    const exam = window.fetchedOnlineExams.find(e => e.id === id); 
    if(!exam) return;
    
    let listContainer = document.getElementById("platform-exams-list-container");
    let detailsContainer = document.getElementById("platform-exam-details-section");
    
    if(listContainer) listContainer.style.display = "none";
    if(detailsContainer) detailsContainer.style.display = "block";
    
    let titleEl = document.getElementById("platform-exam-title");
    if(titleEl) {
        let groupsText = Array.isArray(exam.group) ? exam.group.join('، ') : (exam.group === 'all' ? 'الكل' : exam.group);
        titleEl.innerHTML = `💻 ${exam.title} <br><span style="font-size: 15px; color: var(--text-muted); font-weight: normal;">المجموع: ${exam.totalScore} | المدة: ${exam.duration} دقيقة | المستهدف: ${groupsText}</span>`;
    }
    
    let tbody = document.getElementById("platform-exam-submissions-list");
    if(!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">جاري تحليل البيانات ومقارنة الطلاب... ⏳</td></tr>`;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/onlineSubmissions/${id}.json`);
        let subs = await res.json() || {};
        exam.submissions = subs; 
        
        let targetStudents = [];
        if (exam.group === 'all' || (Array.isArray(exam.group) && exam.group.includes('all'))) {
            targetStudents = students; 
        } else {
            let examGroups = Array.isArray(exam.group) ? exam.group : [exam.group];
            targetStudents = students.filter(s => examGroups.includes(s.group));
        }

        let submittedList = [];
        let missingList = [];
        let processedKeys = new Set(); // 🌟 متغير جديد عشان نمنع تكرار الإجابات

        targetStudents.forEach(st => {
            let subData = null;
            let usedKey = null;

            // 1. البحث بالكود أولاً (الأساس السليم)
            if (subs[st.code]) {
                subData = subs[st.code];
                usedKey = st.code;
            } 
            // 2. البحث بالرقم (بشرط ميكونش 0 عشان ميدخلش الطلاب في بعض)
            else if (st.phone && String(st.phone).trim() !== "0" && subs[st.phone]) {
                subData = subs[st.phone];
                usedKey = st.phone;
            }

            if (subData) {
                submittedList.push({ student: st, data: subData, subKey: usedKey });
                processedKeys.add(usedKey);
            } else {
                missingList.push(st); 
            }
        });

        // 3. تجميع الإجابات اللي متسجلة برقم 0 أو أرقام قديمة ملهاش صاحب في المجموعة
        Object.keys(subs).forEach(key => {
            if (processedKeys.has(key)) return; 

            // لو الإجابة متسجلة بـ 0، هنكتب عليها إجابة متداخلة بدل ما نلبسها لطالب معين
            let unknownSt = students.find(s => s.code === key || (s.phone === key && key !== "0")) || { code: key, phone: key, name: key === "0" ? "إجابة متداخلة (رقم 0)" : "طالب غير مسجل", group: "--" };
            
            submittedList.push({ student: unknownSt, data: subs[key], subKey: key });
        });

        submittedList.sort((a, b) => b.data.score - a.data.score); 

        window.currentExamSubmittedList = submittedList;
        window.currentExamMissingList = missingList;
        window.currentExamObj = exam;

        let statsEl = document.getElementById("platform-exam-stats");
        if(statsEl) {
            statsEl.innerHTML = `
                <button onclick="renderExamSubmissionsList(true)" id="btnShowSubmitted" style="background: #10b981; color: white; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-left: 10px; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">تم التسليم (${submittedList.length}) ✅</button>
                <button onclick="renderExamSubmissionsList(false)" id="btnShowMissing" style="background: #ef4444; color: white; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">لم يمتحن (${missingList.length}) ❌</button>
            `;
        }
        
        renderExamSubmissionsList(true);

    } catch(e) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">خطأ أثناء جلب البيانات! تأكد من الإنترنت.</td></tr>`; 
    }
};

window.renderExamSubmissionsList = function(showSubmitted) {
    let tbody = document.getElementById("platform-exam-submissions-list");
    let exam = window.currentExamObj;

    let btnSubmitted = document.getElementById("btnShowSubmitted");
    let btnMissing = document.getElementById("btnShowMissing");

    if(btnSubmitted) btnSubmitted.style.opacity = showSubmitted ? "1" : "0.5";
    if(btnMissing) btnMissing.style.opacity = showSubmitted ? "0.5" : "1";

    tbody.innerHTML = "";

    if (showSubmitted) {
        let subsArray = window.currentExamSubmittedList;
        if(subsArray.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-weight:bold; padding: 20px;">لم يقم أي طالب بتسليم الامتحان حتى الآن</td></tr>`;

        subsArray.forEach(item => {
            let st = item.student;
            let subData = item.data;
            let subKey = item.subKey; // الكود أو الرقم اللي محفوظ بيه الداتا

            let needsGrading = (exam.questions || []).some(q => q.type === 'essay' && (!subData.manualGrades || subData.manualGrades[q.id] === undefined));

            let statusBadge = needsGrading ? `<span style="background:#fef3c7; color:#d97706; padding: 4px 8px; border-radius: 6px; font-size:12px; font-weight:bold;">يحتاج تقييم ⚠️</span>` : `<span style="background:#d1fae5; color:#059669; padding: 4px 8px; border-radius: 6px; font-size:12px; font-weight:bold;">مكتمل ✅</span>`;
            let scoreColor = needsGrading ? "#d97706" : "#059669";

            // 🔥 هنبعت subKey لدالة التقييم بدل التليفون
            tbody.innerHTML += `<tr>
                <td><strong>${st.code}</strong></td><td>${st.name}</td><td>${st.group}</td>
                <td><strong style="color:${scoreColor}; font-size: 16px;">${subData.score} / ${exam.totalScore}</strong></td>
                <td>${statusBadge}</td>
                <td>
    <div style="display: flex; gap: 5px;">
        <button class="save-btn" style="background: #3b82f6; width: auto; padding: 6px 12px; margin: 0; font-size: 12px; border:none; border-radius:6px; cursor:pointer;" onclick="openGradeSubmission('${exam.id}', '${subKey}')">التقييم 📝</button>
        <button class="save-btn" style="background: #ef4444; width: auto; padding: 6px 12px; margin: 0; font-size: 12px; border:none; border-radius:6px; cursor:pointer;" onclick="deleteStudentSubmission('${exam.id}', '${subKey}')" title="حذف ليتمكن من الإعادة">إعادة 🔄</button>
    </div>
</td>
            </tr>`;
        });

    } else {
        let missingArray = window.currentExamMissingList;
        if(missingArray.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-weight:bold; color:var(--success-color); padding: 20px;">ممتاز! جميع الطلاب المستهدفين قاموا بتسليم الامتحان 🎉</td></tr>`;

        missingArray.forEach(st => {
            let targetPhone = st.parentPhone ? st.parentPhone : st.phone;
            // حماية عشان منبعتش رسالة للرقم 0
            if(String(targetPhone).trim() === "0" || !targetPhone) targetPhone = "";

            let msg = encodeURIComponent(`🚨 *تحذير من الإدارة*\nولي الأمر المحترم، نحيطكم علماً بأن الطالب/ة: *${st.name}*\nلم يقم بتسليم الامتحان الإلكتروني (${exam.title}).\n\n⚠️ *برجاء التنبيه بالدخول للمنصة وإتمام الامتحان فوراً.*`);
            
            let btnHtml = targetPhone ? `<button class="save-btn" style="background: #25D366; width: auto; padding: 6px 12px; margin: 0; font-size: 13px; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold;" onclick="window.open('https://wa.me/20${targetPhone.replace(/^0+/, '')}?text=${msg}', '_blank')">إنذار ولي الأمر 💬</button>` : `<span style="font-size: 12px; color: var(--text-muted);">بدون رقم</span>`;

            tbody.innerHTML += `<tr style="background: rgba(239, 68, 68, 0.05);">
                <td><strong>${st.code}</strong></td><td>${st.name}</td><td>${st.group}</td>
                <td><strong style="color:var(--danger-color); font-size: 16px;">0 / ${exam.totalScore}</strong></td>
                <td><span style="background:#fee2e2; color:#ef4444; padding: 4px 8px; border-radius: 6px; font-size:12px; font-weight:bold;">لم يمتحن ❌</span></td>
                <td>${btnHtml}</td>
            </tr>`;
        });
    }
};


window.deleteStudentSubmission = async function(examId, subKey) {
    if(!confirm("هل أنت متأكد من حذف إجابة هذا الطالب نهائياً ليتمكن من إعادة الامتحان؟")) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/onlineSubmissions/${examId}/${subKey}.json`, { method: 'DELETE' });
        showToast("تم الحذف بنجاح. يمكن للطالب الآن دخول الامتحان مرة أخرى!", "success");
        openOnlineExamDetails(examId); // ريفريش للجدول
    } catch(e) { showToast("حدث خطأ أثناء الحذف", "error"); }
};


window.openGradeSubmission = function(examId, subKey) {
    try {
        window.currentGradingExamId = examId;
        window.currentGradingStudentKey = subKey; // حفظ المفتاح المستخدم (الكود)

        let exam = window.currentExamObj || window.fetchedOnlineExams.find(e => e.id === examId);
        if(!exam || !exam.submissions || !exam.submissions[subKey]) return alert("خطأ: تعذر العثور على إجابات هذا الطالب!");
        
        let sub = exam.submissions[subKey];
        let container = document.getElementById("studentAnswersContainer");

        let st = typeof students !== 'undefined' ? students.find(s => s.code === subKey || (s.phone && String(s.phone).trim() !== "0" && s.phone === subKey)) : null;
        let stName = st ? st.name : subKey;
        
        let nameEl = document.getElementById("gradeStudentName");
        if(nameEl) nameEl.innerHTML = `👤 الطالب: <strong style="color:var(--primary-color);">${stName}</strong>`;
        
        let scoreEl = document.getElementById("gradeStudentScore");
        if(scoreEl) scoreEl.innerHTML = `🎯 النتيجة الحالية: <strong style="color:var(--success-color); font-size:18px;">${sub.score} / ${exam.totalScore}</strong>`;

        let html = "";
        (exam.questions || []).forEach((q, index) => {
            let studentAns = sub.answers ? sub.answers[q.id] : undefined;
            let qHtml = `<div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">`;
            qHtml += `<h4 style="margin: 0 0 15px 0; color: var(--secondary-color); font-size: 16px; line-height: 1.5;">${index + 1}. ${q.text} <span style="color:var(--text-muted); font-size:13px; font-weight:normal;">(${q.points} درجات)</span></h4>`;

            if (q.type === 'essay') {
                let ansText = studentAns || "لم يُجب الطالب ⚠️";
                let currentGrade = (sub.manualGrades && sub.manualGrades[q.id] !== undefined) ? sub.manualGrades[q.id] : "";
                qHtml += `
                    <div style="background: white; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; margin-bottom: 15px; font-weight: bold; line-height: 1.6;">
                        <span style="color:var(--text-muted); font-size:13px; display:block; margin-bottom:5px;">إجابة الطالب:</span>
                        <span style="color: var(--primary-color); font-size:15px;">${ansText}</span>
                    </div>
                    <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                        <label style="font-weight: bold; font-size: 14px; color: #1e3a8a;">الدرجة المستحقة لهذا السؤال (من ${q.points}):</label>
                        <input type="number" id="manual_grade_${q.id}" class="input-field" style="width: 120px; border: 2px solid #3b82f6; font-size:16px; font-weight:bold; text-align:center; margin:0;" min="0" max="${q.points}" value="${currentGrade}" placeholder="الدرجة">
                    </div>`;
            } else {
                let isCorrect = false; let earnedPoints = 0; let correctStr = ""; let studentStr = "";

                if (q.type === 'mcq') {
                    isCorrect = (studentAns === q.correctAnswerIndex);
                    earnedPoints = isCorrect ? q.points : 0;
                    correctStr = q.options[q.correctAnswerIndex] || "غير محدد";
                    studentStr = studentAns !== undefined ? q.options[studentAns] : "لم يُجب";
                } else if (q.type === 'tf') {
                    let correctTF = String(q.correctAnswerTF || q.correctAnswer);
                    isCorrect = (String(studentAns) === correctTF);
                    earnedPoints = isCorrect ? q.points : 0;
                    correctStr = correctTF === "true" ? "صح" : "خطأ";
                    studentStr = studentAns === "true" ? "صح" : (studentAns === "false" ? "خطأ" : "لم يُجب");
                } else if (q.type === 'blank') {
                    isCorrect = (studentAns === q.correctAnswerText);
                    earnedPoints = isCorrect ? q.points : 0;
                    correctStr = q.correctAnswerText || "غير محدد";
                    studentStr = studentAns || "لم يُجب";
                }

                let badgeColor = isCorrect ? '#10b981' : '#ef4444'; let badgeBg = isCorrect ? '#d1fae5' : '#fee2e2'; let icon = isCorrect ? '✅' : '❌';

                qHtml += `
                    <div style="display:flex; gap: 15px; flex-wrap: wrap;">
                        <div style="flex:1; min-width:200px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <span style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:5px;">إجابة الطالب:</span>
                            <strong style="color: ${badgeColor}; font-size:15px;">${studentStr} ${icon}</strong>
                        </div>
                        <div style="flex:1; min-width:200px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <span style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:5px;">الإجابة الصحيحة النموذجية:</span>
                            <strong style="color: #10b981; font-size:15px;">${correctStr}</strong>
                        </div>
                        <div style="background: ${badgeBg}; color: ${badgeColor}; padding: 12px 20px; border-radius: 8px; border: 1px solid ${badgeColor}; font-weight: bold; display:flex; align-items:center; justify-content:center; font-size:15px;">
                            أخذ: ${earnedPoints} / ${q.points}
                        </div>
                    </div>`;
            }
            qHtml += `</div>`; html += qHtml;
        });

        container.innerHTML = html;
        let modal = document.getElementById('gradeOnlineExamModal');
        if(modal) modal.style.display = 'flex';
    } catch (error) { alert("حدث خطأ أثناء فتح التقييم!"); }
};

window.saveManualGrades = async function() {
    try {
        let examId = window.currentGradingExamId;
        let subKey = window.currentGradingStudentKey; // الكود المستخدم

        let exam = window.currentExamObj || window.fetchedOnlineExams.find(e => e.id === examId);
        let sub = exam.submissions[subKey];

        if(!sub.manualGrades) sub.manualGrades = {};

        let btn = document.querySelector("button[onclick='saveManualGrades()']");
        if(btn) { btn.innerHTML = "جاري الحفظ والاعتماد... ⏳"; btn.disabled = true; }

        (exam.questions || []).forEach(q => {
            if (q.type === 'essay') {
                let input = document.getElementById(`manual_grade_${q.id}`);
                if (input) {
                    let val = parseFloat(input.value); if (isNaN(val)) val = 0;
                    let oldVal = sub.manualGrades[q.id] || 0;
                    sub.score = (sub.score - oldVal) + val;
                    sub.manualGrades[q.id] = val; 
                }
            }
        });

        sub.isGraded = true; 

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/onlineSubmissions/${examId}/${subKey}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub)
        });

        let st = typeof students !== 'undefined' ? students.find(s => s.code === subKey || s.phone === subKey) : null;
        if (st && typeof window.sendPlatformNotification === "function") {
            await window.sendPlatformNotification(st.code, "تم تصحيح امتحانك! 📝", `نتيجة امتحان (${exam.title}) هي ${sub.score} من ${exam.totalScore}.`);
        }

        closeModal('gradeOnlineExamModal');
        window.openOnlineExamDetails(examId); // Refresh table
        showToast("تم الحفظ بنجاح وأصبح مكتمل! ✅");

    } catch(e) {
        alert("حدث خطأ أثناء حفظ التقييم! تأكد من اتصالك بالإنترنت.");
    } finally {
        let btn = document.querySelector("button[onclick='saveManualGrades()']");
        if(btn) { btn.innerHTML = "💾 حفظ الدرجات والتعديلات"; btn.disabled = false; }
    }
};







window.toggleExamStatus = async function(index, currentStatus) {
    let newStatus = currentStatus === 'open' ? 'closed' : 'open';
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/data/onlineExams/${index}/status.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStatus) });
        renderOnlineExams();
    } catch(e) {}
};

window.deleteOnlineExam = async function(index) {
    if(!confirm("⚠️ تأكيد الحذف النهائي؟")) return;
    try {
        let exams = [...window.fetchedOnlineExams]; exams.splice(index, 1);
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/data/onlineExams.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exams) });
        renderOnlineExams();
    } catch(e) {}
};


// ==========================================
// 🔔 إرسال إشعارات للطلاب على المنصة
// ==========================================
window.sendPlatformNotification = async function(target, title, message) {
    let notif = {
        id: "notif_" + Date.now(),
        target: target, // يقدر يكون 'all' أو اسم الجروب أو رقم تليفون الطالب
        title: title,
        message: message,
        date: new Date().toLocaleDateString('ar-EG')
    };
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/notifications/${notif.id}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notif)
        });
    } catch(e) { console.error("Notification Error", e); }
};





// ==========================================
// 📋 تسجيل الحضور المطور (حاضر / غائب / متأخر) مع النقاط
// ==========================================






// ==========================================
// 💬 منتدى اسأل المستر - لوحة تحكم المدرس
// ==========================================
window.loadPlatformForumQuestions = async function() {
    let tbody = document.getElementById("forum-questions-tbody");
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">جاري جلب الأسئلة... ⏳</td></tr>`;
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/forum.json`);
        let data = await res.json() || {};
        tbody.innerHTML = "";
        let keys = Object.keys(data).reverse();
        if(keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">لا توجد أسئلة معلقة حالياً 🎉</td></tr>`;
            return;
        }
        keys.forEach(id => {
            let q = data[id];
            let ansBtn = `<button class="save-btn" style="background:#3b82f6; width:auto; padding:5px 12px; margin:0;" onclick="answerForumQuestion('${id}')">💬 الرد</button>`;
            let replyHtml = q.replyText
                ? `<span style="color:var(--success-color)">💡 <strong>الرد:</strong> <span style="color:#059669; font-weight:bold;">${q.replyText}</span></span>`
                : '<span class="live-typing-text">⏳ <em>بانتظار الرد...</em></span>';

            tbody.innerHTML += `<tr>
                <td><strong>${q.studentName}</strong> (${q.studentGroup})</td>
                <td>${q.questionText}</td>
                <td>${replyHtml}</td>
                <td>${ansBtn}</td>
            </tr>`;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">خطأ بالاتصال</td></tr>`; }
};
window.answerForumQuestion = async function(id) {
    let reply = prompt("اكتب الرد النموذجي للسؤال:");
    if(!reply) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/forum/${id}.json`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replyText: reply })
        });
        showToast("تم إرسال الرد وتحديث المنصة لجميع زملائه! ✅");
        loadPlatformForumQuestions();
    } catch(e) { alert("خطأ في الحفظ"); }
};



// ==========================================
// 🛒 نظام إدارة المتجر الشامل (إضافة، تعديل، حذف، سجل)
// ==========================================
window.currentStoreItems = [];
window.currentStoreLogs = [];

window.loadStoreData = async function() {
    let grid = document.getElementById("store-items-grid");
    if(grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center;">جاري تحميل المتجر... ⏳</div>`;
    
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/store.json`);
        let data = await res.json() || { items: {}, logs: {} };
        
        window.currentStoreItems = data.items ? Object.values(data.items) : [];
        window.currentStoreLogs = data.logs ? Object.values(data.logs).reverse() : [];

        renderStoreItems();
        renderStoreLogs();
    } catch (e) {
        console.error(e);
        if(grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color: red;">حدث خطأ في جلب بيانات المتجر!</div>`;
    }
};

window.renderStoreItems = function() {
    let grid = document.getElementById("store-items-grid");
    if(!grid) return;
    grid.innerHTML = "";

    document.getElementById("store-total-items").innerText = window.currentStoreItems.length;

    if (window.currentStoreItems.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:30px; background:white; border-radius:12px; color:var(--text-muted);">لا توجد عناصر معروضة بالمتجر حالياً. 📭</div>`;
        return;
    }

    window.currentStoreItems.reverse().forEach(item => {
        let priceBadge = item.currency === 'cash' 
            ? `<span style="background:#d1fae5; color:#059669; padding:4px 8px; border-radius:6px; font-weight:bold;">${item.price} ج.م</span>`
            : `<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:6px; font-weight:bold;">${item.price} نقطة</span>`;

        let defaultImg = 'https://images.unsplash.com/photo-1544716131-18cdce85c47b?q=80&w=400&auto=format&fit=crop';
        
        grid.innerHTML += `
        <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <img src="${item.image || defaultImg}" style="width: 100%; height: 140px; object-fit: cover; border-bottom: 3px solid #10b981;">
            <div style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h4 style="margin:0; color:var(--secondary-color); font-size: 16px;">${item.name}</h4>
                    ${priceBadge}
                </div>
                <p style="margin:0 0 15px 0; font-size:12px; color:var(--text-muted); line-height: 1.5;">${item.desc || 'لا يوجد وصف'}</p>
                <div style="display: flex; gap: 8px; margin-top: auto;">
                    <button onclick="editStoreItem('${item.id}')" style="flex:1; background:#3b82f6; color:white; border:none; border-radius:6px; padding:8px; cursor:pointer; font-weight: bold;">تعديل ✏️</button>
                    <button onclick="deleteStoreItem('${item.id}', '${item.name}')" style="background:#ef4444; color:white; border:none; border-radius:6px; padding:8px; cursor:pointer; font-weight: bold;">حذف 🗑️</button>
                </div>
            </div>
        </div>`;
    });
};

window.saveStoreItem = async function() {
    let id = document.getElementById("storeItemId").value;
    let name = document.getElementById("storeItemName").value.trim();
    let price = document.getElementById("storeItemPrice").value;
    let currency = document.getElementById("storeItemCurrency").value;
    let desc = document.getElementById("storeItemDesc").value.trim();
    
    if(!name || !price) return showToast("⚠️ يرجى إدخال اسم وسعر العنصر!", "error");

    let btn = document.getElementById("saveStoreItemBtn");
    btn.innerHTML = "جاري الحفظ... ⏳"; btn.disabled = true;

    try {
        let imageBase64 = await window.readFileAsBase64("storeItemImage");
        let oldImage = document.getElementById("storeItemImageBase64").value;
        let finalImage = imageBase64 || oldImage;

        let isEdit = id !== "";
        if(!isEdit) id = "item_" + Date.now();

        let itemData = {
            id: id, name: name, price: parseFloat(price), currency: currency, desc: desc, image: finalImage
        };

        // حفظ العنصر
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/store/items/${id}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemData)
        });

        showToast(isEdit ? "تم تعديل العنصر بنجاح! ✏️" : "تمت إضافة العنصر للمتجر! 🛒");
        resetStoreForm();
        loadStoreData(); // ريفريش الداتا

    } catch (e) {
        showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
        btn.innerHTML = "حفظ ونشر في المتجر 🛒"; btn.disabled = false;
    }
};

window.editStoreItem = function(id) {
    let item = window.currentStoreItems.find(i => i.id === id);
    if(!item) return;

    document.getElementById("storeItemId").value = item.id;
    document.getElementById("storeItemName").value = item.name;
    document.getElementById("storeItemPrice").value = item.price;
    document.getElementById("storeItemCurrency").value = item.currency || 'cash';
    document.getElementById("storeItemDesc").value = item.desc || '';
    document.getElementById("storeItemImageBase64").value = item.image || '';
    
    document.getElementById("saveStoreItemBtn").innerHTML = "تحديث العنصر 💾";
    document.getElementById("saveStoreItemBtn").style.backgroundColor = "#3b82f6";
    document.getElementById("cancelEditStoreBtn").style.display = "block";
    
    // سكرول لفوق عشان المدرس يشوف الفورم
    document.getElementById("platform-store").scrollIntoView({ behavior: 'smooth' });
};

window.resetStoreForm = function() {
    document.getElementById("storeItemId").value = "";
    document.getElementById("storeItemName").value = "";
    document.getElementById("storeItemPrice").value = "";
    document.getElementById("storeItemDesc").value = "";
    document.getElementById("storeItemImage").value = "";
    document.getElementById("storeItemImageBase64").value = "";
    
    document.getElementById("saveStoreItemBtn").innerHTML = "حفظ ونشر في المتجر 🛒";
    document.getElementById("saveStoreItemBtn").style.backgroundColor = "#10b981";
    document.getElementById("cancelEditStoreBtn").style.display = "none";
};

window.deleteStoreItem = async function(id, name) {
    if(!confirm(`هل أنت متأكد من حذف (${name}) من المتجر نهائياً؟`)) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/store/items/${id}.json`, { method: 'DELETE' });
        showToast("تم الحذف بنجاح! 🗑️");
        loadStoreData();
    } catch(e) { showToast("حدث خطأ أثناء الحذف", "error"); }
};
window.renderStoreLogs = function() {
    let tbody = document.getElementById("store-logs-tbody");
    if(!tbody) return;
    
    if (window.currentStoreLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">لا توجد طلبات شراء أو استبدال من الطلاب حتى الآن.</td></tr>`;
        document.getElementById("store-most-edited").innerText = "لا توجد بيانات";
        return;
    }

    let itemCounts = {};
    let mostEditedName = "لا يوجد";
    let maxCount = 0;

    tbody.innerHTML = window.currentStoreLogs.map(log => {
        // حساب أكثر عنصر تم طلبه من الطلاب
        if(log.itemName) {
            itemCounts[log.itemName] = (itemCounts[log.itemName] || 0) + 1;
            if(itemCounts[log.itemName] > maxCount) {
                maxCount = itemCounts[log.itemName];
                mostEditedName = log.itemName;
            }
        }

        // تحديد بيانات الطالب
        let stName = log.studentName ? `👤 ${log.studentName} (${log.studentCode})` : `👤 ${log.user || 'غير معروف'}`;
        
        // تحديد طريقة الدفع وتلوينها
        let payMethod = "";
        let methodColor = "";
        if (log.currency === 'points') { payMethod = "نقاط سلوك ⭐"; methodColor = "#f59e0b"; }
        else if (log.currency === 'cash') { payMethod = "محفظة 💰"; methodColor = "#10b981"; }
        else { payMethod = log.action; methodColor = "#3b82f6"; } // دعم للسجل القديم

        return `
        <tr>
            <td style="font-size:12px; color:var(--text-muted);">${log.date}</td>
            <td style="font-weight:bold; color:var(--secondary-color);">${stName}</td>
            <td style="font-weight:bold;">${log.itemName}</td>
            <td><span style="background:${methodColor}20; color:${methodColor}; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${payMethod}</span></td>
        </tr>`;
    }).join('');

    // تحديث بطاقة أكثر عنصر استبدالاً
    if (maxCount > 0) {
        document.getElementById("store-most-edited").innerHTML = `${mostEditedName} <br><span style="font-size:14px; color:var(--text-muted); display:inline-block; margin-top:5px;">(تم طلبه ${maxCount} مرات)</span>`;
    }
};













// ==========================================
// 💳 رسم كروت الحصص (تصميم VIP المطور - ألوان متناسقة)
// ==========================================
window.renderSessionCards = function() {
    const grid = document.getElementById("sessions-grid");
    if(!grid) return;
    grid.innerHTML = "";

    // 1. إضافة أنيميشن النبض الخفيف (لو مش موجود)
    if (!document.getElementById('pulse-glow-style')) {
        let style = document.createElement('style');
        style.id = 'pulse-glow-style';
        style.innerHTML = `@keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }`;
        document.head.appendChild(style);
    }

    if (classSessions.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted); font-weight: bold; background: var(--card-bg); border-radius: 20px; border: 2px dashed var(--border-color); font-size: 16px;">لا توجد حصص مسجلة حالياً. قم بفتح حصة جديدة لبدء الرصد! 🎯</div>`;
        return;
    }

    [...classSessions].reverse().forEach(session => {
        // 2. حساب الحضور بشكل دقيق
        let presentCount = 0;
        if (session.attendance) {
            Object.values(session.attendance).forEach(val => {
                if (val === 'present' || val === 'late' || (typeof val === 'object' && val.status === 'makeup')) {
                    presentCount++;
                }
            });
        }
        const total = students.filter(s => s.group === session.group).length;
        const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
        const isClosed = session.status === 'closed';

        // 3. 🎨 التعديل هنا: الخط العلوي للحصة المفتوحة أصبح أخضر ساطع (#10b981)
        const cardBorder = isClosed ? 'border-top: 4px solid var(--danger-color); opacity: 0.85; filter: grayscale(10%);' : 'border-top: 4px solid #10b981;';
        
        const statusBadge = isClosed
            ? `<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 900; border: 1px solid rgba(239, 68, 68, 0.2);">مغلقة 🔒</span>`
            : `<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 900; border: 1px solid rgba(16, 185, 129, 0.2); animation: pulse-glow 2s infinite;">مفتوحة 🟢</span>`;

        const lockBtnColor = isClosed ? '#10b981' : '#f59e0b';
        const lockBtnIcon = isClosed ? '🔓 فتح الحصة' : '🔒 قفل وإرسال';
        const progressBarColor = percentage >= 50 ? '#10b981' : (percentage > 0 ? '#f59e0b' : '#cbd5e1');

        // 4. بناء مساحة الإرسال والتقارير الذكية
        let reportSectionHtml = '';
        if (session.isSending) {
            reportSectionHtml = `
                <div style="width: 100%; text-align: center; background: rgba(59, 130, 246, 0.05); padding: 12px; border-radius: 10px; border: 1px dashed rgba(59, 130, 246, 0.3); margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #3b82f6; font-weight: 800;">⏳ جاري إرسال التقارير...</span>
                        <span id="prog-text-${session.id}" style="font-size: 12px; font-weight: bold; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 20px;">${session.sentProgress}/${session.sentTotal}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 10px; overflow: hidden;">
                        <div id="prog-bar-${session.id}" style="width: ${(session.sentProgress/session.sentTotal)*100}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: 0.3s; border-radius: 10px;"></div>
                    </div>
                </div>`;
        } else if (session.reportData) {
            reportSectionHtml = `
                <button onclick="showReportModal('${session.id}')" style="width: 100%; background: linear-gradient(45deg, #10b981, #059669); color: white; border: none; padding: 10px 15px; border-radius: 10px; font-size: 14px; font-weight: 800; font-family: 'Cairo', sans-serif; cursor: pointer; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); transition: all 0.3s ease; display: flex; justify-content: center; align-items: center; gap: 8px;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
                    <span style="font-size: 18px;">📊</span> تقرير إرسال الواتساب
                </button>`;
        }

        // 5. 🎨 التعديل هنا: زر الدخول للرصد أصبح بلون أخضر موحد
        let cardHtml = `
        <div style="background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border-color); padding: 22px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: 0.3s; ${cardBorder}" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.03)';">
            
            <!-- الهيدر: التاريخ والجغرافيا والحالة -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="color: var(--text-muted); font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 5px;">📅 ${session.date}</span>
                ${statusBadge}
            </div>

            <!-- معلومات المجموعة والموضوع -->
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px 0; color: var(--secondary-color); font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">${session.group}</h3>
                <p style="margin: 0; color: var(--primary-color); font-size: 14px; font-weight: bold; background: rgba(152, 0, 0, 0.05); display: inline-block; padding: 4px 10px; border-radius: 6px; border: 1px dashed var(--primary-color);">🎯 ${session.topic || 'حصة عادية'}</p>
            </div>

            <!-- شريط الحضور التفاعلي -->
            <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 13px; font-weight: bold; color: var(--text-main);">نسبة الحضور</span>
                    <span style="font-size: 14px; font-weight: 900; color: ${progressBarColor};">${presentCount} <span style="font-size: 11px; color: var(--text-muted); font-weight: bold;">من ${total}</span></span>
                </div>
                <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: ${progressBarColor}; border-radius: 10px; transition: width 0.8s ease-out;"></div>
                </div>
            </div>

            ${reportSectionHtml}

            <!-- الأزرار الرئيسية والإجراءات -->
            <div style="margin-top: auto; display: flex; flex-direction: column; gap: 12px;">
                <button onclick="openSessionDetails('${session.id}')" style="width: 100%; padding: 14px; font-size: 16px; font-weight: 900; border-radius: 12px; border: none; cursor: ${isClosed ? 'not-allowed' : 'pointer'}; background: ${isClosed ? '#f1f5f9' : '#10b981'}; color: ${isClosed ? '#94a3b8' : 'white'}; transition: 0.3s; box-shadow: ${isClosed ? 'none' : '0 5px 15px rgba(16, 185, 129, 0.3)'}; border: ${isClosed ? '1px solid #e2e8f0' : 'none'};" ${isClosed ? 'disabled' : ''} onmouseover="if(!this.disabled) this.style.transform='scale(1.02)';" onmouseout="if(!this.disabled) this.style.transform='scale(1)';">
                    ${isClosed ? 'الحصة مغلقة للرصد 🔒' : 'الدخول للرصد 📠'}
                </button>
                
                
                <div style="display: flex; gap: 8px; justify-content: space-between;" class="admin-only">
                    <!-- الزرار الجديد للإحصائيات 👇 -->
                    <button onclick="openSessionAnalytics('${session.id}')" style="flex: 1; background: #f3e8ff; color: #7c3aed; border: 1px solid #d8b4fe; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#e9d5ff';" onmouseout="this.style.background='#f3e8ff';">📊 إحصائيات</button>
                    
                    <button onclick="openEditSessionModal('${session.id}')" style="flex: 1; background: #f8fafc; color: var(--text-main); border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0';" onmouseout="this.style.background='#f8fafc';">✏️ تعديل</button>
                    
                    <button onclick="toggleSessionStatus('${session.id}')" style="flex: 1; background: ${lockBtnColor}15; color:${lockBtnColor}; border: 1px solid ${lockBtnColor}40; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='${lockBtnColor}30';" onmouseout="this.style.background='${lockBtnColor}15';">${lockBtnIcon}</button>
                    
                    <button onclick="deleteSession('${session.id}')" style="flex: 1; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#fecaca';" onmouseout="this.style.background='#fee2e2';">🗑️ حذف</button>
                </div>
            </div>

        </div>`;
        
        grid.innerHTML += cardHtml;
    });
};
// ==========================================
// 📊 دوال فتح نافذة الإحصائيات وتنزيل الإكسيل
// ==========================================
window.showReportModal = function(sessionId) {
    const session = classSessions.find(s => s.id === sessionId);
    if(!session || !session.reportData) return;
    
    document.getElementById("reportSuccessCount").innerText = session.reportData.success.length;
    document.getElementById("reportFailedCount").innerText = session.reportData.failed.length;
    
    document.getElementById('reportResultsModal').setAttribute('data-session-id', sessionId);
    openModal('reportResultsModal');
};

window.downloadReportExcel = function(type) {
    let sessionId = document.getElementById('reportResultsModal').getAttribute('data-session-id');
    const session = classSessions.find(s => s.id === sessionId);
    if(!session || !session.reportData) return;

    let dataList = type === 'success' ? session.reportData.success : session.reportData.failed;
    if(dataList.length === 0) return showToast("لا توجد بيانات للتحميل!", "error");

    let excelData = dataList.map(item => ({
        "كود الطالب": item.code,
        "اسم الطالب": item.name,
        "جهة الإرسال": item.target,
        "الرقم المستخدم": item.phone,
        "حالة الإرسال": type === 'success' ? 'نجح ✅' : 'فشل ❌ (تأكد من رقم الواتساب)'
    }));

    let ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{wch: 15}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 35}]; // تظبيط العواميد
    
    let wb = XLSX.utils.book_new();
    let sheetName = type === 'success' ? "تقارير_ناجحة" : "تقارير_فاشلة";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    let dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${sheetName}_${session.topic}_${dateStr}.xlsx`);
    showToast("تم تحميل ملف الإكسيل بنجاح! 📥");
};

// ==========================================
// 🚀 الإصلاح الشامل: التحويل لاستخدام "كود الطالب" في الرصد بدلاً من "الهاتف" 
// للحفاظ على استقلالية الطلاب أصحاب الرقم "0" بدون ضياع البيانات القديمة
// ==========================================


window.renderGradesTable = function(itemDetails, tbodyId, saveFunction, itemId, itemType) {
    const tbody = document.getElementById(tbodyId); const gStudents = students.filter(s => s.group === itemDetails.group);
    if(gStudents.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لا يوجد طلاب</td></tr>`; tbody.innerHTML = ""; 
    let prevItem = null;
    if(itemType === 'exam') { const grpItems = exams.filter(e => e.group === itemDetails.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); prevItem = grpItems[grpItems.findIndex(e=>e.id===itemDetails.id)-1]; }
    if(itemType === 'hw') { const grpItems = homeworks.filter(h => h.group === itemDetails.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); prevItem = grpItems[grpItems.findIndex(h=>h.id===itemDetails.id)-1]; }

    gStudents.forEach(st => {
        let grade = itemDetails.grades[st.code] !== undefined ? itemDetails.grades[st.code] : (itemDetails.grades[st.phone] !== undefined ? itemDetails.grades[st.phone] : '');
        const isHw = tbodyId === 'hw-grades-list'; const btnColor = isHw ? 'var(--hw-color)' : 'var(--exam-color)';
        let pHT = `<span style="color:var(--text-muted)">--</span>`;
        if(prevItem && (prevItem.grades[st.code] !== undefined || prevItem.grades[st.phone] !== undefined)) {
            let pG = prevItem.grades[st.code] !== undefined ? prevItem.grades[st.code] : prevItem.grades[st.phone];
            pHT = `<strong style="color:${btnColor}">${pG} / ${prevItem.maxScore}</strong>`;
        }
        tbody.innerHTML += `<tr><td><strong>${st.code}</strong></td><td>${st.name}</td><td>${st.phone}</td><td style="direction:ltr;">${pHT}</td><td style="direction: ltr;"><span style="color:var(--text-muted);">/ ${itemDetails.maxScore}</span><input type="number" id="grade_${st.code}" class="custom-input" style="width:70px; padding:5px; text-align:center;" value="${grade}" max="${itemDetails.maxScore}"></td><td><button class="btn-present" onclick="${saveFunction.name}('${st.code}')" style="background-color: ${btnColor}; color: #fff;">حفظ</button></td></tr>`;
    });
}







window.profileSourceView = 'students';

window.backToStudents = function(fromHistory = false) { 
    currentStudentProfileCode = null; 
    document.getElementById("student-profile-view").style.display = "none";
    
    // التوجيه الذكي بناءً على المكان اللي جينا منه
    if (window.profileSourceView === 'group' && currentActiveGroup) {
        // 1. إظهار قسم المجموعات الرئيسي وإخفاء باقي الأقسام
        document.querySelectorAll(".view-section").forEach(el => el.style.display = "none");
        document.getElementById("groups-view").style.display = "block";
        
        // 2. تظبيط القائمة الجانبية (تنشيط زر المجموعات)
        document.querySelectorAll(".nav-links li").forEach(el => el.classList.remove("active"));
        if(document.getElementById("nav-groups")) document.getElementById("nav-groups").classList.add("active");

        // 3. إظهار تفاصيل المجموعة وإخفاء كروت المجموعات
        document.getElementById("groups-overview").style.display = "none";
        document.getElementById("group-details-view").style.display = "block";
        
        // 4. إعادة رسم جدول المجموعة عشان نضمن إن الداتا موجودة
        if(typeof renderGroupStudentsTable === "function") renderGroupStudentsTable();

        // 5. تسجيل الخطوة في الهيستوري (عشان زرار المتصفح)
        if (!fromHistory && !window.isHistoryNavigating) {
            history.pushState({ page: 'group-details', type: 'sub', id: currentActiveGroup }, '', `#group-${currentActiveGroup}`);
        }
    } else {
        // الرجوع الطبيعي لصفحة إدارة الطلاب
        document.querySelectorAll(".view-section").forEach(el => el.style.display = "none");
        document.getElementById("students-view").style.display = "block";
        
        document.querySelectorAll(".nav-links li").forEach(el => el.classList.remove("active"));
        if(document.getElementById("nav-students")) document.getElementById("nav-students").classList.add("active");

        document.getElementById("students-overview").style.display = "block"; 
        document.getElementById("student-profile-view").style.display = "none";
        
        if(typeof renderTable === "function") renderTable();

        if (!fromHistory && !window.isHistoryNavigating) {
            history.pushState({ page: 'students', type: 'main' }, '', `#students`);
        }
    }
};

function changeBehaviorPoints(points) { 
    const student = students.find(s => s.code === currentStudentProfileCode); 
    if(student) { 
        student.behaviorPoints = (student.behaviorPoints || 0) + points; 
        localStorage.setItem("students", JSON.stringify(students)); 
        showToast(points > 0 ? "تم إضافة نقاط 🌟" : "تم خصم نقاط 🤫"); 
        openStudentProfile(student.code); // إعادة رسم الملف لتحديث المجموع الشامل
    } 
}

// ==========================================
// ✏️ دالة تعديل حالة الحضور مباشرة من ملف الطالب وتحديث الحصة الأصلية
// ==========================================
window.updateAttendanceFromProfile = function(sessionId, studentCode, newStatus) {
    const session = classSessions.find(s => String(s.id) === String(sessionId));
    const student = students.find(s => String(s.code) === String(studentCode));
    if (!session || !student) return;

    if (!session.attendance) session.attendance = {};
    let oldStatus = session.attendance[student.code] || (student.phone && student.phone !== "0" ? session.attendance[student.phone] : undefined);

    // 1. تعديل نقاط السلوك تلقائياً بناءً على تغيير الحالة
    let oldPts = (oldStatus === 'present' || (typeof oldStatus === 'object' && oldStatus?.status === 'makeup' && !oldStatus?.isLate)) ? 5 : (oldStatus === 'late' || (typeof oldStatus === 'object' && oldStatus?.isLate) ? 2 : 0);
    let newPts = newStatus === 'present' ? 5 : (newStatus === 'late' ? 2 : 0);
    student.behaviorPoints = (student.behaviorPoints || 0) - oldPts + newPts;

    // 2. تحديث حالة الطالب داخل الحصة نفسها
    if (newStatus === 'none') {
        delete session.attendance[student.code];
        if (student.phone && student.phone !== "0") delete session.attendance[student.phone];
        if (session.attendanceLog) delete session.attendanceLog[student.code];
    } else {
        session.attendance[student.code] = newStatus;
        if (!session.attendanceLog) session.attendanceLog = {};
        let now = new Date();
        session.attendanceLog[student.code] = {
            time: typeof formatTime12 === "function" ? formatTime12(`${now.getHours()}:${now.getMinutes()}`) : now.toLocaleTimeString('ar-EG'),
            ts: now.getTime(),
            isManual: true
        };
    }

    // 3. حفظ التعديلات في التخزين المحلي والسحابي
    localStorage.setItem("classSessions", JSON.stringify(classSessions));
    localStorage.setItem("students", JSON.stringify(students));

    if (typeof addSystemLog === "function") {
        let statusAr = newStatus === 'present' ? 'حاضر ✅' : newStatus === 'late' ? 'متأخر ⏳' : newStatus === 'absent' ? 'غائب ❌' : 'إلغاء التسجيل';
        addSystemLog("تعديل حضور من الملف ✏️", `تعديل حالة الطالب ${student.name} في حصة (${session.date} - ${session.group}) إلى: ${statusAr}`);
    }

    // 4. تحديث الجداول المفتوحة وملف الطالب فوراً
    openStudentProfile(student.code);
    if (currentActiveSessionId === sessionId && typeof renderAttendanceTable === "function") {
        renderAttendanceTable(session);
    }
    if (typeof showToast === "function") showToast("تم تحديث حالة الحضور في الحصة والملف بنجاح! ✅", "success");
    if (typeof syncDataToBot === "function") syncDataToBot();
};

// ==========================================
// 👤 فتح ملف الطالب (يدعم حفظ سجل المجموعات القديمة + أزرار تعديل الحضور)
// ==========================================
window.openStudentProfile = function(code) {
    const student = students.find(s => String(s.code) === String(code)); 
    if(!student) return;
    
    window.profileSourceView = document.getElementById("group-details-view")?.style.display === "block" ? 'group' : 'students';
    switchPage('students'); 
    currentStudentProfileCode = student.code;
    document.getElementById("students-overview").style.display = "none"; 
    document.getElementById("group-details-view").style.display = "none";
    document.getElementById("student-profile-view").style.display = "block";
    
    let specialBadge = student.isSpecialCase ? `<span style="font-size: 14px; margin-right: 5px;" title="حالة خاصة: ${student.specialAmount > 0 ? 'يدفع ' + student.specialAmount + ' ج.م' : 'إعفاء تام'}">⭐</span>` : '';
    let suspendBadge = student.isSuspended ? `<span style="background:#ef4444; color:white; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:bold; margin-right:10px; box-shadow:0 2px 5px rgba(239,68,68,0.3);">موقوف ⛔</span>` : '';
    
    document.getElementById("profile-name").innerHTML = student.name + specialBadge + suspendBadge; 

    let suspendBtn = document.getElementById("suspend-student-btn");
    if(suspendBtn) {
        if(student.isSuspended) {
            suspendBtn.innerHTML = "✅ فك الإيقاف (تفعيل)";
            suspendBtn.style.backgroundColor = "#10b981";
            suspendBtn.style.color = "white";
            suspendBtn.style.border = "none";
        } else {
            suspendBtn.innerHTML = "⛔ إيقاف الطالب";
            suspendBtn.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            suspendBtn.style.color = "#ef4444";
            suspendBtn.style.border = "1px solid #ef4444";
        }
    }
    document.getElementById("profile-code-group").innerText = `${student.code} | المجموعة: ${student.group}`;
    
    if (document.getElementById("profile-student-note")) {
        document.getElementById("profile-student-note").innerText = student.note ? student.note : "لا توجد ملاحظات مسجلة.";
    }

    if (typeof JsBarcode !== 'undefined') JsBarcode("#studentProfileBarcode", student.code, { format: "CODE128", lineColor: "#0f172a", width: 2, height: 40, displayValue: false });
    
    if(document.getElementById("profile-phone")) document.getElementById("profile-phone").innerText = student.phone;
    if(document.getElementById("profile-parent")) document.getElementById("profile-parent").innerText = student.parentPhone;
    if(document.getElementById("profile-level")) document.getElementById("profile-level").innerText = student.level;
    if(document.getElementById("profile-gender")) document.getElementById("profile-gender").innerText = student.gender;

    // دالة مساعدة لفحص هل الطالب مسجل في حصة/امتحان قديم قبل النقل
    const hasStudentRecord = (recordObj) => {
        if (!recordObj) return false;
        if (recordObj[student.code] !== undefined) return true;
        if (student.phone && String(student.phone).trim() !== "0" && recordObj[student.phone] !== undefined) return true;
        return false;
    };

    // 🌟 جلب كل حصص وامتحانات وواجبات الطالب (في مجموعته الحالية + أي مجموعة سابقة له سجل بها)
    const studentSessions = classSessions.filter(s => s && (s.group === student.group || hasStudentRecord(s.attendance))).sort((a,b) => new Date(b.date) - new Date(a.date));
    const studentExams = exams.filter(e => e && (e.group === student.group || hasStudentRecord(e.grades))).sort((a,b) => new Date(b.date) - new Date(a.date));
    const studentHw = homeworks.filter(h => h && (h.group === student.group || hasStudentRecord(h.grades))).sort((a,b) => new Date(b.date) - new Date(a.date));

    // حساب المجموع الشامل (يشمل سجل الطالب القديم والجديد)
    let totalScore = student.behaviorPoints || 0;
    studentSessions.forEach(session => { 
        let att = (session.attendance || {})[student.code] || (student.phone !== "0" ? (session.attendance || {})[student.phone] : undefined); 
        if(att === 'present' || (typeof att === 'object' && att?.status === 'makeup')) totalScore += 10; 
    }); 
    studentExams.forEach(exam => { 
        let g = (exam.grades || {})[student.code] !== undefined ? (exam.grades || {})[student.code] : (student.phone !== "0" ? (exam.grades || {})[student.phone] : undefined); 
        if(g !== undefined && exam.maxScore) { totalScore += (parseFloat(g) / parseFloat(exam.maxScore)) * 50; } 
    }); 
    studentHw.forEach(hw => { 
        let g = (hw.grades || {})[student.code] !== undefined ? (hw.grades || {})[student.code] : (student.phone !== "0" ? (hw.grades || {})[student.phone] : undefined); 
        if(g !== undefined && hw.maxScore) { totalScore += (parseFloat(g) / parseFloat(hw.maxScore)) * 20; } 
    });
    totalScore = Math.round(totalScore);

    document.getElementById("profile-behavior-points").innerText = totalScore; 

    let behaviorTitle = document.querySelector("#student-profile-view .stat-card h3");
    if(behaviorTitle && behaviorTitle.innerText.includes("السلوكي")) {
        behaviorTitle.innerHTML = "🏆 مجموع النقاط الشامل";
        behaviorTitle.nextElementSibling.innerText = "يعكس المستوى الأكاديمي والحضور والسلوك معاً";
    }

    let waStudentBtn = document.getElementById("wa-student-btn");
    if (waStudentBtn) waStudentBtn.onclick = function() { if(student.phone && student.phone !== "0" && student.phone !== "") window.open(`https://wa.me/20${student.phone.replace(/^0+/, '')}`, '_blank'); else showToast("رقم هاتف الطالب غير مسجل!", "error"); };

    let waParentBtn = document.getElementById("wa-parent-btn");
    if (waParentBtn) waParentBtn.onclick = function() { if(student.parentPhone && student.parentPhone !== "0" && student.parentPhone !== "") window.open(`https://wa.me/20${student.parentPhone.replace(/^0+/, '')}`, '_blank'); else showToast("رقم ولي الأمر غير مسجل!", "error"); };

    // 1. رسم جدول الحصص مع قائمة منسدلة لتعديل الحالة مباشرة
    let attended = 0; 
    const attTbody = document.getElementById("profile-attendance-list"); 
    if(attTbody) attTbody.innerHTML = "";
    
    studentSessions.forEach(s => { 
        const rawSt = (s.attendance || {})[student.code] || (student.phone !== "0" ? (s.attendance || {})[student.phone] : undefined); 
        const isMakeup = typeof rawSt === 'object' && rawSt !== null && rawSt.status === 'makeup';
        const st = isMakeup ? (rawSt.isLate ? 'late' : 'present') : (rawSt || 'none');

        if(st === 'present' || st === 'late') attended++; 

        let selectBg = st === 'present' ? '#d1fae5' : st === 'late' ? '#fef3c7' : st === 'absent' ? '#fee2e2' : '#f1f5f9';
        let selectColor = st === 'present' ? '#047857' : st === 'late' ? '#b45309' : st === 'absent' ? '#b91c1c' : '#64748b';
        let selectBorder = st === 'present' ? '#10b981' : st === 'late' ? '#f59e0b' : st === 'absent' ? '#ef4444' : '#cbd5e1';

        let oldGroupTag = s.group !== student.group 
            ? `<br><span style="font-size:10px; background:rgba(59,130,246,0.1); color:#3b82f6; padding:2px 6px; border-radius:6px; font-weight:bold;">من مجموعة: ${s.group}</span>` 
            : `<br><span style="font-size:11px; color:var(--text-muted);">${s.topic || 'حصة'}</span>`;

        let controlHtml = `
            <select onchange="updateAttendanceFromProfile('${s.id}', '${student.code}', this.value)" class="no-print" style="background:${selectBg}; color:${selectColor}; border:1px solid ${selectBorder}; padding:5px 10px; border-radius:8px; font-weight:900; font-family:'Cairo'; font-size:13px; cursor:pointer; outline:none;">
                <option value="present" ${st === 'present' ? 'selected' : ''}>حاضر ✓</option>
                <option value="late" ${st === 'late' ? 'selected' : ''}>متأخر ⏳</option>
                <option value="absent" ${st === 'absent' ? 'selected' : ''}>غائب ✗</option>
                <option value="none" ${st === 'none' ? 'selected' : ''}>لم يسجل --</option>
            </select>`;

        if(attTbody) attTbody.innerHTML += `<tr><td><strong>${s.date}</strong>${oldGroupTag}</td><td>${controlHtml}</td></tr>`; 
    });
    document.getElementById("profile-attendance").innerText = `${studentSessions.length > 0 ? Math.round((attended / studentSessions.length) * 100) : 0}%`;

    // 2. رسم جدول الامتحانات (الحالية والسابقة)
    let tExam = 0, sExam = 0; 
    const exTbody = document.getElementById("profile-exams-list"); 
    if(exTbody) exTbody.innerHTML = "";
    studentExams.forEach(e => { 
        let g = (e.grades || {})[student.code] !== undefined ? (e.grades || {})[student.code] : (student.phone !== "0" ? (e.grades || {})[student.phone] : undefined); 
        if(g !== undefined) { tExam += parseFloat(e.maxScore); sExam += parseFloat(g); } 
        let grpNote = e.group !== student.group ? ` <span style="font-size:10px; color:#3b82f6;">(${e.group})</span>` : '';
        if(exTbody) exTbody.innerHTML += `<tr><td>${e.name}${grpNote}</td><td>${e.date}</td><td><strong>${g !== undefined ? g : '--'}</strong> / ${e.maxScore}</td></tr>`; 
    });
    document.getElementById("profile-exams").innerText = `${tExam > 0 ? Math.round((sExam / tExam) * 100) : 0}%`;

    // 3. رسم جدول الواجبات (الحالية والسابقة)
    let tHw = 0, sHw = 0; 
    const hwTbody = document.getElementById("profile-hw-list"); 
    if(hwTbody) hwTbody.innerHTML = "";
    studentHw.forEach(h => { 
        let g = (h.grades || {})[student.code] !== undefined ? (h.grades || {})[student.code] : (student.phone !== "0" ? (h.grades || {})[student.phone] : undefined); 
        if(g !== undefined) { tHw += parseFloat(h.maxScore); sHw += parseFloat(g); } 
        let grpNote = h.group !== student.group ? ` <span style="font-size:10px; color:#3b82f6;">(${h.group})</span>` : '';
        if(hwTbody) hwTbody.innerHTML += `<tr><td>${h.name}${grpNote}</td><td>${h.date}</td><td><strong>${g !== undefined ? g : '--'}</strong> / ${h.maxScore}</td></tr>`; 
    });
    document.getElementById("profile-hw").innerText = `${tHw > 0 ? Math.round((sHw / tHw) * 100) : 0}%`;
};

// ==========================================
// 🔃 محرك الترتيب التصاعدي والتنازلي للجداول
// ==========================================
window.studentsSortState = { column: 'code', direction: 'asc' };
window.groupStudentsSortState = { column: 'code', direction: 'asc' };

// دالة المقارنة الذكية (تدعم الأكواد مثل F3501 والأسماء العربية)
function smartCompare(a, b, column, direction) {
    let valA = a[column] !== undefined ? String(a[column]).trim() : "";
    let valB = b[column] !== undefined ? String(b[column]).trim() : "";

    let result = valA.localeCompare(valB, 'ar', { numeric: true, sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
}

// 1. تبديل ترتيب جدول الطلاب الشامل
window.sortStudentsTable = function(column) {
    if (window.studentsSortState.column === column) {
        window.studentsSortState.direction = window.studentsSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        window.studentsSortState.column = column;
        window.studentsSortState.direction = 'asc';
    }
    renderTable();
};

// 2. تبديل ترتيب جدول المجموعة
window.sortGroupStudentsTable = function(column) {
    if (window.groupStudentsSortState.column === column) {
        window.groupStudentsSortState.direction = window.groupStudentsSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        window.groupStudentsSortState.column = column;
        window.groupStudentsSortState.direction = 'asc';
    }
    renderGroupStudentsTable();
};

window.renderTable = function() { 
    const tbody = document.getElementById("students-list"); 
    if(!tbody) return;

    ['code', 'name', 'level', 'group'].forEach(col => {
        let el = document.getElementById(`sort-st-${col}`);
        if(el) {
            if(window.studentsSortState.column === col) {
                el.innerHTML = window.studentsSortState.direction === 'asc' ? '▲' : '▼';
                el.style.color = 'var(--primary-color)';
                el.style.fontWeight = '900';
            } else {
                el.innerHTML = '⇅';
                el.style.color = 'var(--text-muted)';
                el.style.fontWeight = 'normal';
            }
        }
    });
    
    let sortedList = [...students].sort((a, b) => smartCompare(a, b, window.studentsSortState.column, window.studentsSortState.direction));

    let html = ""; 
    sortedList.forEach((student) => { 
        let trackBadge = student.level.includes('ثانوي') || student.level.includes('بكالوريا') ? `<br><span style="font-size: 11px; color: var(--text-muted); font-weight: bold;">مسار: ${student.track || 'عام'}</span>` : '';
        let specialBadge = student.isSpecialCase ? `<span style="cursor: help; margin-right: 5px; font-size: 14px;" title="حالة خاصة: ${student.specialAmount > 0 ? 'يدفع ' + student.specialAmount + ' ج.م' : 'إعفاء تام'}">⭐</span>` : '';
        let noteIcon = student.note && student.note.trim() !== "" ? `<span style="cursor: pointer; margin-right: 8px; font-size: 16px; filter: drop-shadow(0 2px 4px rgba(139,92,246,0.4));" title="يوجد ملاحظة (اضغط للعرض)" onclick="openStudentNoteModal('${student.code}')">📝</span>` : `<span style="cursor: pointer; margin-right: 8px; font-size: 14px; opacity: 0.3;" title="إضافة ملاحظة" onclick="openStudentNoteModal('${student.code}')">📝</span>`;
        
        html += `<tr>
            <td><strong style="color:var(--primary-color);">${student.code}</strong></td>
            <td>${student.name} ${specialBadge} ${noteIcon}</td>
            <td>${student.level} ${trackBadge}</td>
            <td>${student.group}</td>
            <td><button class="profile-btn" onclick="openStudentProfile('${student.code}')">👤 الملف</button></td>
        </tr>`; 
    }); 
    
    tbody.innerHTML = html; 
    if(document.getElementById("total-students")) {
        document.getElementById("total-students").innerText = students.length; 
    }
};

window.renderGroupStudentsTable = function() { 
    const tbody = document.getElementById("group-students-list"); 
    if(!tbody) return;

    ['code', 'name', 'parentPhone'].forEach(col => {
        let el = document.getElementById(`sort-gs-${col}`);
        if(el) {
            if(window.groupStudentsSortState.column === col) {
                el.innerHTML = window.groupStudentsSortState.direction === 'asc' ? '▲' : '▼';
                el.style.color = 'var(--primary-color)';
                el.style.fontWeight = '900';
            } else {
                el.innerHTML = '⇅';
                el.style.color = 'var(--text-muted)';
                el.style.fontWeight = 'normal';
            }
        }
    });

    const groupStudentsFiltered = students.filter(s => s.group === currentActiveGroup); 
    if(groupStudentsFiltered.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; font-weight: bold; color: var(--text-muted);">لا يوجد طلاب في هذه المجموعة</td></tr>`; 
    }

    let sortedGroupStudents = [...groupStudentsFiltered].sort((a, b) => smartCompare(a, b, window.groupStudentsSortState.column, window.groupStudentsSortState.direction));

    let htmlContent = ""; 

    sortedGroupStudents.forEach((student) => { 
        let trackName = student.track || 'عام';
        let trackBadge = `<span style="font-size: 11px; background: rgba(59, 130, 246, 0.1); color: var(--primary-color); padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2); margin-top: 5px; display: inline-block; font-weight: bold;">🎓 ${trackName}</span>`;
        let specialBadge = student.isSpecialCase ? `<span style="cursor: help; margin-right: 5px; font-size: 13px;" title="حالة خاصة: ${student.specialAmount > 0 ? 'يدفع ' + student.specialAmount + ' ج.م' : 'إعفاء تام'}">⭐</span>` : '';
        let noteIcon = student.note && student.note.trim() !== "" ? `<span style="cursor: pointer; margin-right: 8px; font-size: 16px; filter: drop-shadow(0 2px 4px rgba(139,92,246,0.4));" title="يوجد ملاحظة (اضغط للعرض)" onclick="openStudentNoteModal('${student.code}')">📝</span>` : `<span style="cursor: pointer; margin-right: 8px; font-size: 14px; opacity: 0.3;" title="إضافة ملاحظة" onclick="openStudentNoteModal('${student.code}')">📝</span>`;
        let last4Sessions = classSessions.filter(s => s && (s.group === currentActiveGroup || (s.attendance && (s.attendance[student.code] || (student.phone !== "0" && s.attendance[student.phone]))))).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-4);
        let attendanceDotsHtml = `<div style="display: flex; gap: 6px; justify-content: center; align-items: center;" dir="rtl">`;
        for(let i = 0; i < 4; i++) {
            let session = last4Sessions[i];
            let dotColor = "#e2e8f0"; 
            let tooltipText = "لا توجد حصة / لم يسجل";

            if (session) {
                let status = session.attendance[student.code] || session.attendance[student.phone];
                if (status === 'present') { dotColor = "#10b981"; tooltipText = `${session.date}: حاضر ✅`; }
                else if (status === 'late') { dotColor = "#f59e0b"; tooltipText = `${session.date}: متأخر ⏳`; }
                else if (status === 'absent') { dotColor = "#ef4444"; tooltipText = `${session.date}: غائب ❌`; }
                else if (typeof status === 'object' && status.status === 'makeup') { dotColor = "#2563eb"; tooltipText = `${session.date}: حاضر كتعويض 💻`; }
            }
            attendanceDotsHtml += `<span style="width: 14px; height: 14px; border-radius: 50%; background-color: ${dotColor}; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); cursor: help;" title="${tooltipText}"></span>`;
        }
        attendanceDotsHtml += `</div>`;

        htmlContent += `
        <tr>
            <td><strong style="color:var(--primary-color); font-size: 16px;">${student.code}</strong></td>
            <td>
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <div style="display: flex; align-items: center;">
                        <strong style="font-size: 14px;">${student.name}</strong> ${specialBadge} ${noteIcon}
                    </div>
                    ${trackBadge}
                </div>
            </td>
            <td>${attendanceDotsHtml}</td>
            <td style="direction: ltr;">${student.parentPhone}</td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="profile-btn" onclick="openStudentProfile('${student.code}', ${students.indexOf(student)})" style="margin:0;">👤 الملف</button>
                    <button class="icon-btn admin-only" style="background-color: #3b82f6; color: white;" onclick="openMoveGroupModal(${students.indexOf(student)})" title="نقل لمجموعة أخرى">🔄</button>
                    <button class="icon-btn danger admin-only" onclick="removeStudentFromGroup(${students.indexOf(student)})" title="إزالة من المجموعة">❌</button>
                </div>
            </td>
        </tr>`; 
    }); 
    tbody.innerHTML = htmlContent; 
};

// ==========================================
// 📝 نظام الملاحظات الخاص بالطلاب
// ==========================================
window.openStudentNoteModal = function(code) {
    const student = students.find(s => s.code === code);
    if(!student) return;
    document.getElementById("noteStudentCode").value = student.code;
    document.getElementById("noteStudentName").innerText = student.name;
    document.getElementById("studentNoteText").value = student.note || "";
    openModal("studentNoteModal");
};

window.openStudentNoteModalFromProfile = function() {
    if (currentStudentProfileCode) {
        window.openStudentNoteModal(currentStudentProfileCode);
    }
};

window.saveStudentNote = function() {
    const code = document.getElementById("noteStudentCode").value;
    const text = document.getElementById("studentNoteText").value.trim();
    const studentIndex = students.findIndex(s => s.code === code);
    
    if(studentIndex > -1) {
        students[studentIndex].note = text;
        localStorage.setItem("students", JSON.stringify(students));
        showToast("تم حفظ الملاحظة بنجاح! 📝");
        closeModal("studentNoteModal");
        
        if (typeof refreshCurrentVisibleScreens === 'function') refreshCurrentVisibleScreens();
        if (document.getElementById("student-profile-view")?.style.display === "block") {
            document.getElementById("profile-student-note").innerText = text || "لا توجد ملاحظات مسجلة.";
        }
        if (typeof syncDataToBot === "function") syncDataToBot();
    }
};

window.deleteStudentNote = function() {
    const code = document.getElementById("noteStudentCode").value;
    const studentIndex = students.findIndex(s => s.code === code);
    
    if(studentIndex > -1) {
        students[studentIndex].note = "";
        document.getElementById("studentNoteText").value = "";
        localStorage.setItem("students", JSON.stringify(students));
        showToast("تم مسح الملاحظة! 🗑️");
        closeModal("studentNoteModal");
        
        if (typeof refreshCurrentVisibleScreens === 'function') refreshCurrentVisibleScreens();
        if (document.getElementById("student-profile-view")?.style.display === "block") {
            document.getElementById("profile-student-note").innerText = "لا توجد ملاحظات مسجلة.";
        }
        if (typeof syncDataToBot === "function") syncDataToBot();
    }
};




window.renderAtRiskStudents = function() {
    const tbody = document.getElementById("atrisk-list"); tbody.innerHTML = "";
    if(students.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">لا يوجد طلاب</td></tr>`;
    let atRiskCount = 0;
    students.forEach(student => {
        let reasons = [];
        const gSessions = classSessions.filter(s => s.group === student.group).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 2);
        if(gSessions.length === 2) {
            let a1 = gSessions[0].attendance[student.code] || gSessions[0].attendance[student.phone];
            let a2 = gSessions[1].attendance[student.code] || gSessions[1].attendance[student.phone];
            if(a1 === 'absent' && a2 === 'absent') reasons.push("غياب آخر حصتين"); 
        }
        const gExams = exams.filter(e => e.group === student.group).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 2);
        let failCount = 0; gExams.forEach(ex => { let grade = ex.grades[student.code] !== undefined ? ex.grades[student.code] : ex.grades[student.phone]; if(grade !== undefined && parseFloat(grade) < (parseFloat(ex.maxScore) / 2)) failCount++; });
        if(failCount === 2) reasons.push("رسوب في آخر امتحانين");
        if(reasons.length > 0) {
            atRiskCount++; const msg = encodeURIComponent(`تحذير من الإدارة: مستوى ${student.name} متراجع بسبب ${reasons.join(" و ")}.`); const waUrl = `https://wa.me/20${student.parentPhone.replace(/^0+/, '')}?text=${msg}`;
            tbody.innerHTML += `<tr><td><strong>${student.code}</strong></td><td>${student.name}</td><td>${student.group}</td><td style="color:var(--danger-color); font-weight:bold;">${reasons.join("<br>")}</td><td><button class="icon-btn" style="background-color:#128C7E; color:white;" onclick="window.open('${waUrl}','_blank')">إنذار</button></td></tr>`;
        }
    });
    if(atRiskCount === 0) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--success-color);">الطلاب في مستوى أمان!</td></tr>`;
};

window.generateLeaderboard = function() {
    const group = document.getElementById("leaderboardGroup").value; const container = document.getElementById("leaderboard-results");
    if(!group) return container.innerHTML = `<p style="text-align: center; color: var(--text-muted);">اختر المجموعة</p>`;
    const groupStudents = students.filter(s => s.group === group); if(groupStudents.length === 0) return container.innerHTML = `<p style="text-align: center;">لا طلاب هنا</p>`;
    let leaderboard = groupStudents.map(student => {
        let score = 0; 
        classSessions.filter(s => s.group === group).forEach(session => { let att = session.attendance[student.code] || session.attendance[student.phone]; if(att === 'present') score += 10; }); 
        exams.filter(e => e.group === group).forEach(exam => { let g = exam.grades[student.code] !== undefined ? exam.grades[student.code] : exam.grades[student.phone]; if(g !== undefined) { score += (parseFloat(g) / parseFloat(exam.maxScore)) * 50; } }); 
        homeworks.filter(h => h.group === group).forEach(hw => { let g = hw.grades[student.code] !== undefined ? hw.grades[student.code] : hw.grades[student.phone]; if(g !== undefined) { score += (parseFloat(g) / parseFloat(hw.maxScore)) * 20; } }); 
        score += (student.behaviorPoints || 0); return { name: student.name, code: student.code, score: Math.round(score) };
    });
    leaderboard.sort((a, b) => b.score - a.score); const top5 = leaderboard.slice(0, 5); container.innerHTML = ""; const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
    top5.forEach((st, index) => { container.innerHTML += `<div class="stat-card" style="display:flex; justify-content:space-between; align-items:center; border-left: 5px solid var(--exam-color);"><div style="display:flex; gap:15px; align-items:center;"><span style="font-size:30px;">${medals[index] || "🏅"}</span><div><h3 style="margin-bottom:5px;">${st.name}</h3><p style="color:var(--primary-color);">الكود: ${st.code}</p></div></div><div style="text-align:center;"><p style="color:var(--text-muted); font-size:12px;">مجموع النقاط</p><p style="font-size:24px; font-weight:bold; color:var(--exam-color);">${st.score}</p></div></div>`; });
};



// ==========================================
// 📱 التحكم في القائمة الجانبية للموبايل
// ==========================================
window.toggleMobileMenu = function() {
    document.querySelector('.sidebar').classList.toggle('active-mobile');
    document.querySelector('.mobile-overlay').classList.toggle('active');
};

// نقفل القائمة أوتوماتيك لما يختار صفحة
const oldSwitchPageForMobile = window.switchPage;
window.switchPage = function(pageId) {
    if (oldSwitchPageForMobile) oldSwitchPageForMobile(pageId);
    
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active-mobile');
        document.querySelector('.mobile-overlay').classList.remove('active');
    }
};




// ==========================================
// 📊 رسم جدول الحضور
// ==========================================
window.renderAttendanceTable = function(session) { 
    const tbody = document.getElementById("attendance-list"); 
    const gStudents = students.filter(s => s.group === session.group || (session.attendance && session.attendance[s.code])); 
    
    if(gStudents.length === 0) return tbody.innerHTML=`<tr><td colspan="6" style="text-align:center; padding: 30px; font-weight: bold; color: var(--text-muted);">لا يوجد طلاب مسجلين في هذه المجموعة</td></tr>`; 
    
    const groupS = classSessions.filter(s => s.group === session.group).sort((a,b)=>new Date(a.date)-new Date(b.date)); 
    const prevSession = groupS[groupS.findIndex(s => s.id === session.id) - 1]; 
    
    let sortedStudents = [...gStudents].sort((a, b) => {
        let logA = session.attendanceLog ? session.attendanceLog[a.code] : null;
        let logB = session.attendanceLog ? session.attendanceLog[b.code] : null;
        let tsA = logA ? logA.ts : 0;
        let tsB = logB ? logB.ts : 0;
        if (tsA > 0 && tsB > 0) return tsB - tsA; 
        if (tsA > 0) return -1;
        if (tsB > 0) return 1;
        return 0; 
    });

    let htmlContent = ""; 
    let countPresent = 0, countLate = 0, countAbsent = 0;

    sortedStudents.forEach(st => { 
        const stat = session.attendance[st.code] || session.attendance[st.phone]; 
        const log = session.attendanceLog ? session.attendanceLog[st.code] : null;
        
        let isMakeup = typeof stat === 'object' && stat.status === 'makeup';
        let isStatusLate = stat === 'late' || (isMakeup && stat.isLate);
        
        if (stat === 'present' || (isMakeup && !stat.isLate)) countPresent++;
        if (isStatusLate) countLate++;
        if (stat === 'absent') countAbsent++;

        let timeDisplay = log ? `<span style="font-size:11px; color:var(--text-muted); font-weight:bold; display:block; margin-top:3px;">🕒 ${log.time}</span>` : '';
        
        let statHtml = '';
        if (stat === 'present') statHtml = `<span style="color:#10b981; font-weight:900; font-size:14px;">حاضر ✅</span>${timeDisplay}`;
        else if (stat === 'late') statHtml = `<span style="color:#f59e0b; font-weight:900; font-size:14px;">متأخر ⏳</span>${timeDisplay}`;
        else if (stat === 'absent') statHtml = `<span style="color:#ef4444; font-weight:900; font-size:14px;">غائب ❌</span>${timeDisplay}`;
        else if (isMakeup) statHtml = `<span style="color:#3b82f6; font-weight:900; font-size:14px;">تعويض 💻</span>${timeDisplay}`;
        else statHtml = `<span style="color:var(--text-muted); font-size:13px; font-weight:bold;">--</span>`;
        
        let pHT = '<span style="color:var(--text-muted); font-size:12px;">--</span>'; 
        if(prevSession) { 
            const p = prevSession.attendance[st.code] || prevSession.attendance[st.phone]; 
            pHT = p==='present'?'<span style="background:rgba(16,185,129,0.1); color:#10b981; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold;">حاضر</span>':
                  p==='late'?'<span style="background:rgba(245,158,11,0.1); color:#f59e0b; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold;">متأخر</span>':
                  p==='absent'?'<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold;">غائب</span>':
                  (typeof p === 'object' && p.status === 'makeup') ? '<span style="background:rgba(59,130,246,0.1); color:#3b82f6; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold;">تعويض</span>' : '--'; 
        } 
        
        let noteIcon = st.note && st.note.trim() !== "" ? `<span style="cursor: pointer; margin-right: 8px; font-size: 15px; filter: drop-shadow(0 2px 4px rgba(139,92,246,0.4));" title="يوجد ملاحظة (اضغط للعرض)" onclick="openStudentNoteModal('${st.code}')">📝</span>` : ``;
        let guestGroupBadge = st.group !== session.group ? `<span style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: bold; margin-right: 5px;">ضيف من: ${st.group}</span>` : '';

        // 💡 التعديل هنا: إضافة (true) لاستدعاء الدالة بشكل يدوي لمنع النط
        let actionButtons = '';
        if (stat) {
            actionButtons = `<button onclick="markAttendance('${st.code}', 'none', true)" style="background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 4px 12px; border-radius: 6px; font-size:12px; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#ef4444'; this.style.color='#fff';" onmouseout="this.style.background='#fee2e2'; this.style.color='#ef4444';">إلغاء ✖</button>`;
        } else {
            actionButtons = `
            <div style="display: inline-flex; gap: 5px; background: var(--bg-color); padding: 4px; border-radius: 8px; border: 1px solid var(--border-color);">
                <button onclick="markAttendance('${st.code}', 'present', true)" title="حاضر" style="background: #d1fae5; color: #10b981; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 13px;" onmouseover="this.style.background='#10b981'; this.style.color='white';">✅</button>
                <button onclick="markAttendance('${st.code}', 'late', true)" title="متأخر" style="background: #fef3c7; color: #f59e0b; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 13px;" onmouseover="this.style.background='#f59e0b'; this.style.color='white';">⏳</button>
                <button onclick="markAttendance('${st.code}', 'absent', true)" title="غائب" style="background: #fee2e2; color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 13px;" onmouseover="this.style.background='#ef4444'; this.style.color='white';">❌</button>
            </div>`;
        }

        let rowBg = '';
        if (log && (Date.now() - log.ts) < 5000 && log.ts > 0) { rowBg = 'animation: flashRow 2s ease-out;'; } 
        else if (stat) { rowBg = 'background: rgba(248, 250, 252, 0.5);'; }

        htmlContent += `<tr style="${rowBg}">
            <td><strong style="color:var(--primary-color); font-size:14px;">${st.code}</strong></td>
            <td><div style="font-weight:bold; font-size:14px; display:flex; flex-direction:column; justify-content:center;"><div style="display:flex; align-items:center;">${st.name} ${noteIcon}</div>${guestGroupBadge}</div></td>
            <td style="direction: ltr; font-size:13px; color:var(--text-main);">${st.phone && st.phone !== "0" ? st.phone : "--"}</td>
            <td>${pHT}</td>
            <td>${statHtml}</td>
            <td style="text-align: center;">${actionButtons}</td>
        </tr>`; 
    }); 
    
    if(document.getElementById("att-count-total")) document.getElementById("att-count-total").innerText = gStudents.length;
    if(document.getElementById("att-count-present")) document.getElementById("att-count-present").innerText = countPresent;
    if(document.getElementById("att-count-late")) document.getElementById("att-count-late").innerText = countLate;
    if(document.getElementById("att-count-absent")) document.getElementById("att-count-absent").innerText = countAbsent;

    tbody.innerHTML = htmlContent; 
};

// ==========================================
// 💡 تحديث شريط المعلومات السريع وفتح تفاصيل الحصة
// ==========================================
window.openSessionDetails = function(id) { 
    currentActiveSessionId = id; 
    const session = classSessions.find(s => s.id === id); 
    if (!session) return;

    document.getElementById("sessions-overview").style.display = "none"; 
    document.getElementById("session-details-view").style.display = "block"; 
    document.getElementById("current-session-title").innerText = session.group; 
    
    // 🚀 تشغيل شريط المعلومات الذكي (الصف وآخر كود)
    updateQuickSessionInfoBar(session);

    renderAttendanceTable(session); 
};

window.updateQuickSessionInfoBar = function(session) {
    let levelNameEl = document.getElementById("quick-info-level-name");
    let lastCodeEl = document.getElementById("quick-info-last-code");
    let lastNameEl = document.getElementById("quick-info-last-name");
    if (!levelNameEl || !lastCodeEl) return;

    let groupObj = groups.find(g => g.name === session.group);
    let level = groupObj ? groupObj.level : "غير محدد";
    levelNameEl.innerText = `الصف: ${level}`;

    // جلب طلاب هذا الصف لمعرفة آخر كود
    let levelStudents = students.filter(s => s.level === level);
    if (levelStudents.length > 0) {
        let lastSt = levelStudents[levelStudents.length - 1];
        lastCodeEl.innerText = lastSt.code;
        if (lastNameEl) lastNameEl.innerText = `(${lastSt.name})`;
    } else {
        lastCodeEl.innerText = "لا يوجد طلاب";
        if (lastNameEl) lastNameEl.innerText = "";
    }
};

// ==========================================
// 🧠 خوارزمية حساب نسبة تشابه الأسماء العربية
// ==========================================
window.calculateArabicNameSimilarity = function(excelName, dbName) {
    let s1 = window.smartArabicNormalize(excelName);
    let s2 = window.smartArabicNormalize(dbName);
    
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100; // تطابق تام 100%

    let words1 = s1.split(' ');
    let words2 = s2.split(' ');

    // شرط أساسي في الأسماء العربية: الاسم الأول لازم يكون متطابق أو قريب جداً لمنع الاقتراحات العشوائية
    if (words1[0] !== words2[0] && !words2[0].includes(words1[0]) && !words1[0].includes(words2[0])) {
        return 0; 
    }

    // لو اسم جزء صريح من التاني (مثلاً اسم ثلاثي في الإكسيل وهو رباعي في السيستم)
    if (s2.startsWith(s1) || s1.startsWith(s2)) return 90;
    if (s2.includes(s1) || s1.includes(s2)) return 85;

    // حساب تطابق الكلمات
    let matchedWords = 0;
    words1.forEach(w1 => {
        if (words2.some(w2 => w2 === w1 || (w1.length > 3 && w2.includes(w1)) || (w2.length > 3 && w1.includes(w2)))) {
            matchedWords++;
        }
    });

    let maxWords = Math.max(words1.length, words2.length);
    let minWords = Math.min(words1.length, words2.length);
    
    // لو كل الكلمات المكتوبة في الإكسيل موجودة بالترتيب أو بدون ترتيب
    if (matchedWords >= 2 && matchedWords === minWords) return 85;
    
    let wordScore = (matchedWords / maxWords) * 100;
    return Math.round(wordScore);
};

// ==========================================
// 📥 رفع شيت إكسيل لتسجيل الحضور المجمع (النسخة الذكية المطورة)
// ==========================================
window.importAttendanceFromExcel = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const session = classSessions.find(s => s.id === currentActiveSessionId);
    if (!session || session.status === 'closed') {
        showToast("يرجى فتح حصة أولاً لتسجيل الحضور!", "error");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

            let successList = [];        // حضروا تلقائياً (تطابق تام في نفس المجموعة)
            let suggestionsQueue = [];   // أسماء متشابهة تحتاج تأكيد المدرس
            let wrongGroupQueue = [];    // تطابق تام لكن في مجموعة أخرى
            let notFoundList = [];       // غير موجودين نهائياً

            let isLate = document.getElementById('markAsLateCheckbox')?.checked;
            let attStatus = isLate ? 'late' : 'present';

            // 1. تحديد الصف الدراسي للحصة الحالية وتقسيم الطلاب لأولويات
            let currentGroupObj = groups.find(g => g.name === session.group);
            let currentLevel = currentGroupObj ? currentGroupObj.level : null;

            let groupStudents = students.filter(s => s.group === session.group);
            let sameLevelOtherGroups = students.filter(s => s.group !== session.group && (!currentLevel || s.level === currentLevel));
            let otherLevelStudents = students.filter(s => s.group !== session.group && currentLevel && s.level !== currentLevel);

            excelData.forEach(row => {
                let searchValue = row['الكود'] || row['كود'] || row['كود الطالب'] || row['الاسم'] || row['اسم الطالب'] || Object.values(row)[0];
                if (!searchValue) return;
                
                searchValue = String(searchValue).trim();
                if (!searchValue) return;

                let normInput = window.smartArabicNormalize(searchValue);

                // دالة مساعدة للبحث التام (كود، هاتف، أو اسم مطابق 100%)
                const findExactInPool = (pool) => {
                    return pool.find(s => 
                        String(s.code) === searchValue || 
                        (s.phone && s.phone !== "0" && String(s.phone) === searchValue) ||
                        (s.parentPhone && s.parentPhone !== "0" && String(s.parentPhone) === searchValue) ||
                        window.smartArabicNormalize(s.name) === normInput
                    );
                };

                // ⚡ الأولوية 1: بحث تام داخل المجموعة الحالية
                let exactInGroup = findExactInPool(groupStudents);
                if (exactInGroup) {
                    if (!exactInGroup.isSuspended) {
                        let oldStatus = session.attendance[exactInGroup.code] || session.attendance[exactInGroup.phone];
                        if (!oldStatus) {
                            if (attStatus === 'present') exactInGroup.behaviorPoints = (exactInGroup.behaviorPoints || 0) + 5;
                            if (attStatus === 'late') exactInGroup.behaviorPoints = (exactInGroup.behaviorPoints || 0) + 2;
                            
                            let now = new Date();
                            session.attendance[exactInGroup.code] = attStatus;
                            if (!session.attendanceLog) session.attendanceLog = {};
                            session.attendanceLog[exactInGroup.code] = { time: formatTime12(`${now.getHours()}:${now.getMinutes()}`), ts: now.getTime(), isManual: false };
                            
                            successList.push(exactInGroup);
                        }
                    }
                    return; // انتهينا من هذا الصف في الإكسيل
                }

                // ⚡ الأولوية 2: بحث تام في نفس الصف الدراسي (مجموعات أخرى)
                let exactInSameLevel = findExactInPool(sameLevelOtherGroups);
                if (exactInSameLevel) {
                    wrongGroupQueue.push({ student: exactInSameLevel, isSameLevel: true });
                    return;
                }

                // ⚡ الأولوية 3: بحث تام في باقي المراحل الدراسية
                let exactInOtherLevel = findExactInPool(otherLevelStudents);
                if (exactInOtherLevel) {
                    wrongGroupQueue.push({ student: exactInOtherLevel, isSameLevel: false });
                    return;
                }

                // 🤔 الأولوية 4: لو المدخل نص (اسم طالب) ولم نجد تطابق تام -> نبحث عن "التقارب والتشابه"
                if (isNaN(searchValue)) {
                    let bestMatch = null;
                    let bestScore = 0;
                    let matchScope = '';

                    // أ. نبحث عن تشابه داخل المجموعة الحالية أولاً
                    groupStudents.forEach(s => {
                        let score = window.calculateArabicNameSimilarity(searchValue, s.name);
                        if (score >= 65 && score > bestScore) {
                            bestScore = score;
                            bestMatch = s;
                            matchScope = 'same_group';
                        }
                    });

                    // ب. لو مفيش تشابه قوي في المجموعة، نبحث في نفس الصف الدراسي
                    if (bestScore < 80) {
                        sameLevelOtherGroups.forEach(s => {
                            let score = window.calculateArabicNameSimilarity(searchValue, s.name);
                            if (score >= 70 && score > bestScore) {
                                bestScore = score;
                                bestMatch = s;
                                matchScope = 'same_level';
                            }
                        });
                    }

                    if (bestMatch) {
                        suggestionsQueue.push({
                            excelName: searchValue,
                            student: bestMatch,
                            scope: matchScope,
                            score: bestScore
                        });
                        return;
                    }
                }

                // ❌ إذا فشل كل ما سبق -> غير مسجل بالنظام
                notFoundList.push(searchValue);
            });

            // ترتيب قائمة المجموعات الأخرى بحيث يظهر طلاب نفس الصف في الأعلى
            wrongGroupQueue.sort((a, b) => (b.isSameLevel ? 1 : 0) - (a.isSameLevel ? 1 : 0));

            // حفظ الحضور التلقائي وتحديث الجدول
            localStorage.setItem("classSessions", JSON.stringify(classSessions));
            localStorage.setItem("students", JSON.stringify(students));
            renderAttendanceTable(session);
            if (typeof syncDataToBot === "function") syncDataToBot();

            // عرض التقرير التفاعلي الذكي
            showExcelImportReport(successList, suggestionsQueue, wrongGroupQueue, notFoundList, session);

        } catch (err) {
            console.error(err);
            showToast("حدث خطأ أثناء قراءة ملف الإكسيل!", "error");
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ""; 
};

// ==========================================
// 📊 نافذة التقرير الذكي بعد رفع الإكسيل (تفاعلية بالكامل)
// ==========================================
window.showExcelImportReport = function(successList, suggestionsQueue, wrongGroupQueue, notFoundList, session) {
    let oldModal = document.getElementById('excelReportModal');
    if (oldModal) oldModal.remove();

    // 1. قسم المحضرين تلقائياً
    let successHtml = `
        <div style="background: rgba(16, 185, 129, 0.1); padding: 15px 20px; border-radius: 12px; border: 1px solid #10b981; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h3 style="color: #047857; margin: 0; font-size: 18px;">✅ تم تحضير (${successList.length}) طالب تلقائياً</h3>
                <p style="margin: 3px 0 0 0; font-size: 12px; color: #065f46; font-weight: bold;">تطابق تام في الكود أو الاسم داخل مجموعة (${session.group})</p>
            </div>
            <span style="font-size: 28px;">🎉</span>
        </div>
    `;

    // 2. قسم الأسماء المتشابهة (الاقتراحات الذكية قبل التحضير)
    let suggestionsHtml = "";
    if (suggestionsQueue.length > 0) {
        suggestionsHtml = `
            <div style="background: rgba(59, 130, 246, 0.05); padding: 18px; border-radius: 12px; border: 2px dashed #3b82f6; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h4 style="color: #1d4ed8; margin: 0; font-size: 16px;">🤔 أسماء متشابهة تنتظر تأكيدك (${suggestionsQueue.length})</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin: 3px 0 0 0; font-weight: bold;">تم إيقاف تحضيرهم تلقائياً لوجود اختلاف بسيط في الاسم، راجعهم وأكد الحضور:</p>
                    </div>
                    <button onclick="confirmAllSameGroupSuggestions('${session.id}')" style="background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(59,130,246,0.3);">✅ تحضير كل المطابقين بالمجموعة</button>
                </div>
                <div style="max-height: 220px; overflow-y: auto; background: #fff; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                        <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: var(--text-muted);">
                            <tr>
                                <th style="padding: 10px;">الاسم في الشيت</th>
                                <th style="padding: 10px;">الطالب المقترح بالسيستم</th>
                                <th style="padding: 10px;">المجموعة</th>
                                <th style="padding: 10px; text-align: center;">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${suggestionsQueue.map((item, idx) => {
                                let badge = item.scope === 'same_group' 
                                    ? `<span style="background:#d1fae5; color:#047857; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold;">نفس المجموعة (${item.score}%)</span>`
                                    : `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:bold;">${item.student.group} (${item.score}%)</span>`;
                                
                                let actionBtn = item.scope === 'same_group'
                                    ? `<button class="sugg-same-group-btn" data-code="${item.student.code}" onclick="approveSuggestedStudent('${item.student.code}', '${session.id}', true, this)" style="background:#10b981; color:white; border:none; padding:5px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">تحضير ✅</button>`
                                    : `<button onclick="approveSuggestedStudent('${item.student.code}', '${session.id}', false, this)" style="background:#f59e0b; color:white; border:none; padding:5px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">معالجة كضيف ⚙️</button>`;

                                return `
                                <tr id="sugg-row-${idx}" style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px; color: #ef4444; font-weight: bold;">${item.excelName}</td>
                                    <td style="padding: 10px; font-weight: 900; color: var(--secondary-color);">${item.student.name} <span style="color:var(--primary-color); font-size:11px;">(${item.student.code})</span></td>
                                    <td style="padding: 10px;">${badge}</td>
                                    <td style="padding: 10px; text-align: center;">
                                        <div style="display:flex; gap:5px; justify-content:center;">
                                            ${actionBtn}
                                            <button onclick="document.getElementById('sugg-row-${idx}').remove()" style="background:#fee2e2; color:#ef4444; border:none; padding:5px 8px; border-radius:6px; cursor:pointer; font-weight:bold;" title="تجاهل">✖</button>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 3. قسم طلاب المجموعات الأخرى (مرتبين: نفس الصف أولاً)
    let wrongGroupHtml = "";
    if (wrongGroupQueue.length > 0) {
        wrongGroupHtml = `
            <div style="background: rgba(245, 158, 11, 0.05); padding: 18px; border-radius: 12px; border: 1px dashed #f59e0b; margin-bottom: 20px;">
                <h4 style="color: #d97706; margin: 0 0 10px 0; font-size: 16px;">⚠️ طلاب مسجلون في مجموعات أخرى (${wrongGroupQueue.length})</h4>
                <div style="max-height: 180px; overflow-y: auto; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                        ${wrongGroupQueue.map((item, idx) => {
                            let st = item.student;
                            let levelBadge = item.isSameLevel 
                                ? `<span style="background:#e0e7ff; color:#1d4ed8; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:5px;">نفس الصف</span>` 
                                : `<span style="background:#fee2e2; color:#b91c1c; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:5px;">${st.level}</span>`;
                            return `
                            <tr id="wg-row-${idx}" style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px; font-weight: bold;">${st.name} <span style="color:var(--primary-color);">(${st.code})</span></td>
                                <td style="padding: 10px; color: var(--text-muted); font-weight: bold;">${st.group}${levelBadge}</td>
                                <td style="padding: 10px; text-align: left;">
                                    <button onclick="openWrongGroupModal(students.find(s=>s.code=='${st.code}'), classSessions.find(s=>s.id=='${session.id}')); document.getElementById('wg-row-${idx}').style.opacity='0.4';" style="background:#f59e0b; color:white; border:none; padding:5px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">نقل / تعويض ⚙️</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </table>
                </div>
            </div>
        `;
    }

    // 4. قسم غير المسجلين بالنظام
    let notFoundHtml = "";
    if (notFoundList.length > 0) {
        let textToCopy = notFoundList.join('\\n');
        notFoundHtml = `
            <div style="background: rgba(239, 68, 68, 0.05); padding: 18px; border-radius: 12px; border: 1px dashed #ef4444; margin-bottom: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                    <h4 style="color: #ef4444; margin:0; font-size: 16px;">❌ غير مسجلين بالنظام (${notFoundList.length})</h4>
                    <button onclick="navigator.clipboard.writeText('${textToCopy}'); showToast('تم نسخ الأسماء! 📋');" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">📋 نسخ الأسماء</button>
                </div>
                <textarea readonly style="width:100%; height:80px; border-radius:8px; border:1px solid #fca5a5; padding:10px; font-family:'Cairo'; font-weight:bold; resize:none; background: #fff; color: #b91c1c;">${notFoundList.join('\n')}</textarea>
            </div>
        `;
    }

    let modalHtml = `
        <div id="excelReportModal" class="modal" style="display:flex; z-index: 1000000; align-items:center; justify-content:center;">
            <div class="modal-content" style="width: 750px; max-width: 95%; max-height: 90vh; overflow-y:auto; border-top: 6px solid var(--primary-color); padding: 25px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
                    <h2 style="color: var(--secondary-color); margin: 0; display:flex; align-items:center; gap:10px;">📊 التقرير الذكي لرفع شيت الحضور</h2>
                    <span class="close-btn" onclick="document.getElementById('excelReportModal').remove()" style="position:static; font-size: 28px;">&times;</span>
                </div>
                ${successHtml}
                ${suggestionsHtml}
                ${wrongGroupHtml}
                ${notFoundHtml}
                <button class="save-btn" style="width: 100%; margin-top: 10px; font-size: 16px; background: var(--secondary-color);" onclick="document.getElementById('excelReportModal').remove()">إغلاق التقرير 👍</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ==========================================
// ⚡ دوال التفاعل السريع داخل تقرير الإكسيل
// ==========================================
window.approveSuggestedStudent = function(studentCode, sessionId, isSameGroup, btnElement) {
    let student = students.find(s => String(s.code) === String(studentCode));
    let session = classSessions.find(s => String(s.id) === String(sessionId));
    if (!student || !session) return;

    if (isSameGroup) {
        let isLate = document.getElementById('markAsLateCheckbox')?.checked;
        let attStatus = isLate ? 'late' : 'present';
        markAttendance(student.code, attStatus);
        
        let td = btnElement.parentElement;
        td.innerHTML = `<span style="color:#10b981; font-weight:900; font-size:13px;">تم التحضير ✅</span>`;
    } else {
        openWrongGroupModal(student, session);
        btnElement.innerText = "تم الفتح ✔️";
        btnElement.style.opacity = "0.6";
    }
};

window.confirmAllSameGroupSuggestions = function(sessionId) {
    let buttons = document.querySelectorAll('.sugg-same-group-btn');
    if (buttons.length === 0) return showToast("لا يوجد طلاب في نفس المجموعة لتأكيدهم!", "info");
    
    buttons.forEach(btn => btn.click());
    showToast(`تم تأكيد وتحضير (${buttons.length}) طالب بنجاح! 🚀`, "success");
};


// ==========================================
// 📋 تسجيل الحضور المطور (مزامنة لحظية + إشعارات صوتية ومرئية)
// ==========================================
window.markAttendance = function(codeOrPhone, status, isManual = false) {
    const sIndex = classSessions.findIndex(s => s.id === currentActiveSessionId);
    const s = classSessions[sIndex];

    if(s && s.status === 'open') {
        // تأمين التطابق بين النص والرقم لحل مشكلة الرصد اليدوي
        const studentIndex = students.findIndex(st => String(st.code) === String(codeOrPhone) || String(st.phone) === String(codeOrPhone));
        const student = students[studentIndex];

        if(!student) return;

        if(student.isSuspended && status !== 'none') {
            if(typeof showToast === 'function') showToast(`⛔ الطالب (${student.name}) موقوف، لا يمكن تحضيره!`, 'error');
            return;
        }

        // 🌟 خصم/إضافة نقاط السلوك
        let oldStatus = s.attendance[student.code] || s.attendance[student.phone];
        if (oldStatus) {
            if (oldStatus === 'present') student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 5);
            if (oldStatus === 'late') student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 2);
        }
        
        if (status !== 'none') {
            if (status === 'present') student.behaviorPoints = (student.behaviorPoints || 0) + 5;
            if (status === 'late') student.behaviorPoints = (student.behaviorPoints || 0) + 2;
        }

        // ⏰ حفظ الوقت
        let now = new Date();
        let timeStr = formatTime12(`${now.getHours()}:${now.getMinutes()}`);
        let timestamp = now.getTime();

        if (!s.attendanceLog) s.attendanceLog = {};

        let firebaseStatusUpdate = {};
        let firebaseLogUpdate = {};

        if (status === 'none') {
            delete s.attendance[student.code];
            delete s.attendanceLog[student.code];
            firebaseStatusUpdate[student.code] = null;
            firebaseLogUpdate[student.code] = null;
            if(typeof showToast === 'function') showToast(`تم إلغاء حضور ${student.name}`, 'warning');
        } else {
            s.attendance[student.code] = status;
            
            // 💡 السحر هنا: لو ضغط يدوي، هنضيف خاصية (isManual: true) عشان الجدول ميرتبوش فوق خالص!
            s.attendanceLog[student.code] = { time: timeStr, ts: timestamp, isManual: isManual };
            
            firebaseStatusUpdate[student.code] = status;
            firebaseLogUpdate[student.code] = { time: timeStr, ts: timestamp, isManual: isManual };
            
            let statusText = status === 'present' ? 'حاضر ✅' : 'متأخر ⏳';
            if(typeof showToast === 'function') showToast(`تم تسجيل ${student.name} كـ ${statusText}`, 'success');
        }

        // 1. الحفظ المحلي السريع
        localStorage.setItem("classSessions", JSON.stringify(classSessions));
        localStorage.setItem("students", JSON.stringify(students));

        // 2. تحديث الشاشة فوراً
        renderAttendanceTable(s);

        // 3. 🚀 المزامنة اللحظية للطالب ده بس في الفايربيز
        let baseUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data`;

        fetch(`${baseUrl}/classSessions/${sIndex}/attendance.json`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(firebaseStatusUpdate)
        }).catch(e => console.error("Sync Error:", e));

        fetch(`${baseUrl}/classSessions/${sIndex}/attendanceLog.json`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(firebaseLogUpdate)
        }).catch(e => console.error("Sync Error:", e));

        fetch(`${baseUrl}/students/${studentIndex}.json`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ behaviorPoints: student.behaviorPoints })
        }).catch(e => console.error("Sync Error:", e));

        // 4. الإشعارات للأبلكيشن (لو متفعلة ومفيش رصد يدوي عشان منعملش سبام لأولياء الأمور)
        if (status !== 'none' && !isManual) {
            if(typeof notifyParentApp === 'function') notifyParentApp(student.code, "تحديث حضور 🏫", `تم تحضير ${student.name}`);
        }
    }
};

// ==========================================
// 🔄 دوال الطالب في مجموعة مختلفة (نقل أو تعويض)
// ==========================================
let tempWrongGroupStudent = null;

window.openWrongGroupModal = function(student, currentSession) {
    tempWrongGroupStudent = student;
    
    document.getElementById('wgStudentName').innerText = student.name;
    document.getElementById('wgOldGroup').innerText = student.group || 'بدون مجموعة';
    document.getElementById('wgCurrentGroup').innerText = currentSession.group;

    // البحث عن حصة مفتوحة في مجموعة الطالب الأصلية عشان يسجل حضوره فيها (تعويض)
    let actualGroupSessions = classSessions.filter(s => s.group === student.group && s.status === 'open').reverse();
    let selectEl = document.getElementById('wgActualGroupSessions');
    let attendanceDiv = document.getElementById('wgAttendanceDiv');
    
    selectEl.innerHTML = '';

    if(actualGroupSessions.length > 0) {
        actualGroupSessions.forEach(s => {
            selectEl.innerHTML += `<option value="${s.id}">${s.date} - ${s.topic || 'حصة'}</option>`;
        });
        attendanceDiv.style.display = 'block';
    } else {
        attendanceDiv.style.display = 'none'; // لو مجموعته الأصلية معندهاش حصة مفتوحة دلوقتي، هنخفي خيار التعويض
    }

    openModal('wrongGroupModal');
};

// ❌ تخطي الإجراءات
window.skipWrongGroup = function() {
    tempWrongGroupStudent = null;
    closeModal('wrongGroupModal');
    setTimeout(() => {
        let inputEl = document.getElementById('attendanceBarcode');
        if(inputEl) { inputEl.value = ''; inputEl.focus(); }
    }, 100);
};

// 🔄 نقل الطالب للمجموعة الجديدة وتحضيره
window.moveStudentAndAttend = function() {
    if (!tempWrongGroupStudent) return;
    
    const currentSession = classSessions.find(s => s.id === currentActiveSessionId);
    if (!currentSession) return;

    const studentIndex = students.findIndex(s => s.code === tempWrongGroupStudent.code);
    if (studentIndex > -1) {
        // 1. تغيير مجموعة الطالب في قاعدة البيانات الرئيسية
        students[studentIndex].group = currentSession.group;
        localStorage.setItem("students", JSON.stringify(students));
        
        // 2. تحديث المزامنة مع الفايربيز اللحظية
        let baseUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid ? window.getSafeUid() : 'AlQaisar_System'}/data`;
        fetch(`${baseUrl}/students/${studentIndex}.json`, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ group: currentSession.group }) 
        }).catch(e => console.error("Sync Error:", e));

        // 3. قفل المودال وتحضير الطالب
        closeModal('wrongGroupModal');
        
        let isLate = document.getElementById('markAsLateCheckbox')?.checked;
        let attStatus = isLate ? 'late' : 'present';
        
        markAttendance(tempWrongGroupStudent.code, attStatus);
        showToast(`تم نقل الطالب لمجموعة (${currentSession.group}) وتحضيره بنجاح! 🔄`, 'success');
        
        tempWrongGroupStudent = null;
        
        // إرجاع المؤشر
        setTimeout(() => {
            let inputEl = document.getElementById('attendanceBarcode');
            if(inputEl) { inputEl.value = ''; inputEl.focus(); }
        }, 100);
    }
};

// ✅ تحضير كتعويض في مجموعته الأصلية والحالية مع المزامنة اللحظية
window.markAttendanceInActualGroup = function() {
    if (!tempWrongGroupStudent) return;

    let originalSessionId = document.getElementById('wgActualGroupSessions').value;
    
    let currentSessionIndex = classSessions.findIndex(s => s.id === currentActiveSessionId);
    let currentSession = classSessions[currentSessionIndex];

    let originalSessionIndex = classSessions.findIndex(s => s.id === originalSessionId);
    let originalSession = classSessions[originalSessionIndex];

    let studentIndex = students.findIndex(s => s.code === tempWrongGroupStudent.code);
    let isLate = document.getElementById('markAsLateCheckbox')?.checked;

    let now = new Date();
    let timeStr = formatTime12(`${now.getHours()}:${now.getMinutes()}`);
    let ts = now.getTime();

    // نستخدم دالة getSafeUid إذا كانت موجودة لضمان المسار الصحيح
    let uid = window.getSafeUid ? window.getSafeUid() : 'AlQaisar_System';
    let baseUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/data`;

    // أ. تسجيله في الحصة الحالية كـ (تعويض) ورفع التحديث اللحظي
    if (currentSession) {
        currentSession.attendance[tempWrongGroupStudent.code] = { status: 'makeup', isLate: isLate };
        if (!currentSession.attendanceLog) currentSession.attendanceLog = {};
        currentSession.attendanceLog[tempWrongGroupStudent.code] = { time: timeStr, ts: ts, isManual: false };

        fetch(`${baseUrl}/classSessions/${currentSessionIndex}/attendance.json`, { 
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ [tempWrongGroupStudent.code]: { status: 'makeup', isLate: isLate } }) 
        });
        
        fetch(`${baseUrl}/classSessions/${currentSessionIndex}/attendanceLog.json`, { 
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ [tempWrongGroupStudent.code]: { time: timeStr, ts: ts, isManual: false } }) 
        });
    }

    // ب. تسجيله في حصته الأصلية كـ (تعويض) ورفع التحديث اللحظي
    if (originalSession) {
        if (!originalSession.attendance) originalSession.attendance = {};
        originalSession.attendance[tempWrongGroupStudent.code] = { status: 'makeup', isLate: isLate };
        fetch(`${baseUrl}/classSessions/${originalSessionIndex}/attendance.json`, { 
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ [tempWrongGroupStudent.code]: { status: 'makeup', isLate: isLate } }) 
        });
    }

    // تحديث السلوك اللحظي
    tempWrongGroupStudent.behaviorPoints = (tempWrongGroupStudent.behaviorPoints || 0) + (isLate ? 2 : 5);
    fetch(`${baseUrl}/students/${studentIndex}.json`, { 
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ behaviorPoints: tempWrongGroupStudent.behaviorPoints }) 
    });

    localStorage.setItem("classSessions", JSON.stringify(classSessions));
    localStorage.setItem("students", JSON.stringify(students));

    showToast(`✅ تم تحضير ${tempWrongGroupStudent.name} كتعويض بنجاح!`, 'success');

    closeModal('wrongGroupModal');

    if (currentSession) renderAttendanceTable(currentSession);

    let autoPaymentEnabled = document.getElementById('autoPaymentCheckbox')?.checked;
    if (autoPaymentEnabled) {
        setTimeout(() => openQuickPaymentModal(tempWrongGroupStudent), 500);
    } else {
        setTimeout(() => {
            let inputEl = document.getElementById('attendanceBarcode');
            if(inputEl) { inputEl.value = ''; inputEl.focus(); }
        }, 100);
    }

    tempWrongGroupStudent = null;
};





// 🔔 دالة إرسال الإشعارات اللحظية (تعمل عبر سيرفر الإشعارات المنفصل)
window.notifyParentApp = async function(studentCode, title, message) {
    if (!getSafeUid()) return; 
    
    try {
        // توجيه الطلب لسيرفر الإشعارات المستقل
        await fetch(`${NOTIFICATIONS_SERVER_URL}/send-notification`, {
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }, 
            body: JSON.stringify({
                centerCode: getSafeUid(),
                target: studentCode,
                title: title,
                message: message
            })
        });
        
        // حفظ نسخة في الداتا بيز عشان "سجل الإشعارات" يفضل شغال في تطبيق ولي الأمر
        let notifId = "notif_" + Date.now();
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/notifications/${notifId}.json`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                id: notifId, target: studentCode, title: title, message: message, date: new Date().toLocaleDateString('ar-EG')
            })
        });

    } catch(e) { 
        console.error("❌ خطأ في إرسال إشعار التطبيق عبر السيرفر المنفصل:", e); 
    }
};





window.saveExamGrade = function(codeOrPhone) {
    const e = exams.find(ex => ex.id === currentActiveExamId);
    const student = students.find(s => s.code === codeOrPhone || s.phone === codeOrPhone);
    if(!student) return;
    const v = document.getElementById(`grade_${student.code}`).value;
    if(v !== "") {
        let gradeVal = parseFloat(v); let maxScore = parseFloat(e.maxScore);
        if(gradeVal > maxScore || gradeVal < 0) return showToast(`الدرجة غير منطقية!`, 'error');
        let oldGrade = e.grades[student.code] !== undefined ? parseFloat(e.grades[student.code]) : (e.grades[student.phone] !== undefined ? parseFloat(e.grades[student.phone]) : null);
        if (oldGrade !== null && oldGrade >= maxScore - 1) student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 10);
        if (gradeVal >= maxScore - 1) student.behaviorPoints = (student.behaviorPoints || 0) + 10;
        e.grades[student.code] = v; // الحفظ بالكود
        localStorage.setItem("exams", JSON.stringify(exams)); localStorage.setItem("students", JSON.stringify(students)); 
        renderGradesTable(e, "grades-list", saveExamGrade, currentActiveExamId, 'exam'); showToast("تم حفظ الدرجة بنجاح ✅");

        // 🚀 --- إرسال الإشعار اللحظي --- 🚀
        if(typeof notifyParentApp === 'function') notifyParentApp(student.code, "نتيجة امتحان 🎯", `تم رصد درجة امتحان (${e.name}). حصل ${student.name} على ${gradeVal} من ${maxScore}.`);
    }
};

window.saveHwGrade = function(codeOrPhone) {
    const hw = homeworks.find(h => h.id === currentActiveHwId);
    const student = students.find(s => s.code === codeOrPhone || s.phone === codeOrPhone);
    if(!student) return;
    const v = document.getElementById(`grade_${student.code}`).value;
    if(v !== "") {
        let gradeVal = parseFloat(v); let maxScore = parseFloat(hw.maxScore); let halfScore = maxScore / 2;
        if(gradeVal > maxScore || gradeVal < 0) return showToast(`الدرجة غير منطقية!`, 'error');
        let oldGrade = hw.grades[student.code] !== undefined ? parseFloat(hw.grades[student.code]) : (hw.grades[student.phone] !== undefined ? parseFloat(hw.grades[student.phone]) : null);
        if (oldGrade !== null) {
            if (oldGrade >= maxScore - 3) student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 10);
            else if (oldGrade >= halfScore) student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 5);
        }
        if (gradeVal >= maxScore - 3) student.behaviorPoints = (student.behaviorPoints || 0) + 10;
        else if (gradeVal >= halfScore) student.behaviorPoints = (student.behaviorPoints || 0) + 5;
        hw.grades[student.code] = v;
        localStorage.setItem("homeworks", JSON.stringify(homeworks)); localStorage.setItem("students", JSON.stringify(students)); 
        renderGradesTable(hw, "hw-grades-list", saveHwGrade, currentActiveHwId, 'hw'); showToast("تم حفظ درجة الواجب بنجاح ✅");

        // 🚀 --- إرسال الإشعار اللحظي --- 🚀
        if(typeof notifyParentApp === 'function') notifyParentApp(student.code, "تقييم الواجب 📝", `تم رصد درجة الواجب (${hw.name}). حصل ${student.name} على ${gradeVal} من ${maxScore}.`);
    }
};

window.submitExamBarcodeGrade = function() {
    let c = document.getElementById('examBarcodeCode').value.trim(); let g = document.getElementById('examBarcodeGrade').value.trim();
    const ex = exams.find(e => e.id === currentActiveExamId);
    if(c !== "" && g !== "") {
        let student = findStudentByCodeOrName(c);
        if(student && ex && ex.status === 'open') {
            let gradeVal = parseFloat(g); let maxScore = parseFloat(ex.maxScore);
            if(gradeVal > maxScore || gradeVal < 0) return showToast(`الدرجة غير منطقية!`, 'error');
            let oldGrade = ex.grades[student.code] !== undefined ? parseFloat(ex.grades[student.code]) : (ex.grades[student.phone] !== undefined ? parseFloat(ex.grades[student.phone]) : null);
            if (oldGrade !== null && oldGrade >= maxScore - 1) student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 10);
            if (gradeVal >= maxScore - 1) student.behaviorPoints = (student.behaviorPoints || 0) + 10;
            ex.grades[student.code] = g; 
            localStorage.setItem("exams", JSON.stringify(exams)); localStorage.setItem("students", JSON.stringify(students));
            renderGradesTable(ex, "grades-list", saveExamGrade, currentActiveExamId, 'exam'); showToast(`تم رصد ${g} لـ ${student.name}`);
            
            // 🚀 --- إرسال الإشعار اللحظي --- 🚀
            if(typeof notifyParentApp === 'function') notifyParentApp(student.code, "نتيجة امتحان 🎯", `تم رصد درجة امتحان (${ex.name}). حصل ${student.name} على ${gradeVal} من ${maxScore}.`);

            document.getElementById('examBarcodeCode').value = ''; document.getElementById('examBarcodeGrade').value = ''; document.getElementById('examBarcodeCode').focus();
        }
    }
};

window.submitHwBarcodeGrade = function() {
    let c = document.getElementById('hwBarcodeCode').value.trim(); let g = document.getElementById('hwBarcodeGrade').value.trim();
    const hw = homeworks.find(h => h.id === currentActiveHwId);
    if(c !== "" && g !== "") {
        let student = findStudentByCodeOrName(c);
        if(student && hw && hw.status === 'open') {
            let gradeVal = parseFloat(g); let maxScore = parseFloat(hw.maxScore); let halfScore = maxScore / 2;
            if(gradeVal > maxScore || gradeVal < 0) return showToast(`الدرجة غير منطقية!`, 'error');
            let oldGrade = hw.grades[student.code] !== undefined ? parseFloat(hw.grades[student.code]) : (hw.grades[student.phone] !== undefined ? parseFloat(hw.grades[student.phone]) : null);
            if (oldGrade !== null) {
                if (oldGrade >= maxScore - 3) student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 10);
                else if (oldGrade >= halfScore) student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) - 5);
            }
            if (gradeVal >= maxScore - 3) student.behaviorPoints = (student.behaviorPoints || 0) + 10;
            else if (gradeVal >= halfScore) student.behaviorPoints = (student.behaviorPoints || 0) + 5;
            hw.grades[student.code] = g; 
            localStorage.setItem("homeworks", JSON.stringify(homeworks)); localStorage.setItem("students", JSON.stringify(students));
            renderGradesTable(hw, "hw-grades-list", saveHwGrade, currentActiveHwId, 'hw'); showToast(`تم رصد ${g} لـ ${student.name}`);
            
            // 🚀 --- إرسال الإشعار اللحظي --- 🚀
            if(typeof notifyParentApp === 'function') notifyParentApp(student.code, "تقييم الواجب 📝", `تم رصد درجة الواجب (${hw.name}). حصل ${student.name} على ${gradeVal} من ${maxScore}.`);

            document.getElementById('hwBarcodeCode').value = ''; document.getElementById('hwBarcodeGrade').value = ''; document.getElementById('hwBarcodeCode').focus();
        }
    }
};

// 1. إضافة الصفحة لدالة التنقل
const oldSwitchPageForJoinReq = window.switchPage;
window.switchPage = function(pageId) {
    if (oldSwitchPageForJoinReq) oldSwitchPageForJoinReq(pageId);
    if (pageId === "joinreq") {
        document.getElementById("page-title").innerText = "طلبات الانضمام 🙋‍♂️";
        document.getElementById("page-desc").innerText = "مراجعة وتسكين الطلاب الجدد القادمين من المنصة";
        loadJoinRequests();
    }
};

// 2. تحميل الطلبات من الفايربيز
window.currentJoinRequests = {};
window.loadJoinRequests = async function() {
    let tbody = document.getElementById("join-requests-tbody");
    if(!tbody) return;
    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/join_requests.json`);
        let data = await res.json() || {};
        window.currentJoinRequests = data;
        
        tbody.innerHTML = "";
        let keys = Object.keys(data).reverse();
        
        // تحديث البادج الأحمر
        let badge = document.getElementById("joinReqBadge");
        if(badge) {
            badge.innerText = keys.length;
            badge.style.display = keys.length > 0 ? "inline-block" : "none";
        }

        if(keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); font-weight: bold; padding: 30px;">لا توجد طلبات انضمام معلقة حالياً.</td></tr>`;
            return;
        }

        keys.forEach(id => {
            let req = data[id];
            let dObj = new Date(req.timestamp);
            let dateStr = dObj.toLocaleDateString('ar-EG') + " " + formatTime12(`${dObj.getHours()}:${dObj.getMinutes()}`);
            
            tbody.innerHTML += `
            <tr>
                <td style="font-size: 13px; color: var(--text-muted);">${dateStr}</td>
                <td><strong>${req.name}</strong><br><span style="font-size: 12px; color: var(--primary-color);">${req.level}</span></td>
                <td style="direction: ltr; text-align: right;">ط: ${req.phone}<br>أ: ${req.parentPhone}</td>
                <td>السنتر: ${req.centerName}<br><span style="font-size: 12px; color: #f59e0b;">المجموعة: ${req.groupPref}</span></td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="save-btn" style="margin:0; width:auto; padding:6px 12px; background:var(--success-color);" onclick="openApproveModal('${id}')">قبول</button>
                        <button class="icon-btn danger" style="margin:0;" onclick="rejectRequest('${id}')">رفض</button>
                    </div>
                </td>
            </tr>`;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">خطأ في الاتصال!</td></tr>`; }
};

// 🧠 دالة الفلترة الذكية (توحيد الحروف العربية)
window.smartArabicNormalize = function(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[أإآا]/g, 'ا') // توحيد الألف
        .replace(/ة/g, 'ه')      // توحيد التاء المربوطة والهاء
        .replace(/[يى]/g, 'ي')    // توحيد الياء والألف اللينة
        .replace(/[ئءؤ]/g, 'ء')   // توحيد أشكال الهمزة
        .replace(/\s+/g, ' ')     // إزالة المسافات الزائدة
        .trim();
};

// 🔍 دالة البحث في جدول طلبات الانضمام
window.searchJoinRequests = function() {
    let input = document.getElementById("joinReqSearchInput").value;
    // نمرر الكلمة اللي بتبحث بيها على الدالة الذكية
    let filter = window.smartArabicNormalize(input); 
    
    let tbody = document.getElementById("join-requests-tbody");
    if (!tbody) return;
    
    let rows = tbody.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        // تخطي صف "لا توجد طلبات" أو "جاري التحميل" 
        if (rows[i].getElementsByTagName("td").length < 4) continue;

        // نسحب كل النص اللي جوه الصف (اسم، كود، رقم موبايل) ونمرره برضه على الدالة الذكية
        let rowText = window.smartArabicNormalize(rows[i].textContent);
        
        // نقارن الاتنين ببعض
        if (rowText.includes(filter)) {
            rows[i].style.display = ""; // إظهار
        } else {
            rows[i].style.display = "none"; // إخفاء
        }
    }
};


// ==========================================
// 2️⃣ تحديث نافذة الموافقة (لتنبيهك بالطلبات المكررة)
// ==========================================
window.openApproveModal = function(id) {
    let req = window.currentJoinRequests[id];
    if(!req) return;
    
    document.getElementById("approveReqId").value = id;
    document.getElementById("approveStName").innerText = req.name;
    document.getElementById("approveStLevel").innerText = req.level;

    // 🔍 البحث عن طلبات مكررة لنفس الطالب
    let reqNameNorm = window.smartArabicNormalize(req.name);
    let reqWords = reqNameNorm.split(' ');
    let duplicatesCount = 0;

    for (let otherId in window.currentJoinRequests) {
        if (otherId === id) continue;
        let otherReq = window.currentJoinRequests[otherId];
        let otherNameNorm = window.smartArabicNormalize(otherReq.name);
        
        let isDup = false;
        if (req.phone && req.phone !== "0" && otherReq.phone === req.phone) isDup = true;
        if (req.parentPhone && req.parentPhone !== "0" && otherReq.parentPhone === req.parentPhone) isDup = true;
        // مطابقة ذكية للاسم
        if (reqNameNorm === otherNameNorm || reqWords.every(w => otherNameNorm.includes(w)) || otherNameNorm.split(' ').every(w => reqNameNorm.includes(w))) isDup = true;

        if (isDup) duplicatesCount++;
    }

    // إظهار تحذير المكررات
    let dupWarningEl = document.getElementById("approveDupWarning");
    if (!dupWarningEl) {
        dupWarningEl = document.createElement("div");
        dupWarningEl.id = "approveDupWarning";
        document.getElementById("approveStName").parentElement.appendChild(dupWarningEl);
    }
    
    if (duplicatesCount > 0) {
        dupWarningEl.innerHTML = `<span style="display:inline-block; margin-top:10px; background:rgba(239,68,68,0.1); color:#ef4444; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:bold;">⚠️ انتبه: هذا الطالب له (${duplicatesCount}) طلبات مكررة أخرى (سيتم حذفها تلقائياً عند القبول).</span>`;
    } else {
        dupWarningEl.innerHTML = "";
    }

    let codeInput = document.getElementById("approveStCode");
    if(codeInput) {
        codeInput.value = req.code ? req.code : window.generateStudentCode(); 
    }

    let groupSelect = document.getElementById("approveStGroup");
    groupSelect.innerHTML = "<option value=''>اختر المجموعة...</option>";
    groups.filter(g => g.level === req.level).forEach(g => {
        groupSelect.innerHTML += `<option value="${g.name}">${g.name}</option>`;
    });

    openModal("approveRequestModal");
};

// ==========================================
// 3️⃣ تأكيد القبول (حل مشكلة المسح بعد دقيقتين، وتنظيف المكررات)
// ==========================================
window.confirmApproveRequest = async function() {
    let id = document.getElementById("approveReqId").value;
    let selectedGroup = document.getElementById("approveStGroup").value;
    let req = window.currentJoinRequests[id];
    
    if(!selectedGroup) return showToast("يجب اختيار مجموعة لتسكين الطالب!", "error");

    let newCode = document.getElementById("approveStCode").value.trim();
    if(!newCode) return showToast("كود الطالب لا يمكن أن يكون فارغاً!", "error");

    const duplicate = students.find(s => String(s.code) === String(newCode));
    if(duplicate) return showToast(`تنبيه! هذا الكود مستخدم بالفعل للطالب: ${duplicate.name}`, "error");

    let btn = document.querySelector("#approveRequestModal .save-btn");
    let origText = btn.innerText;
    btn.innerText = "جاري التسكين والتنظيف... ⚡"; btn.disabled = true;

    try {
        let newStudent = {
            code: newCode, name: req.name, phone: req.phone, parentPhone: req.parentPhone,
            level: req.level, gender: req.gender, group: selectedGroup, behaviorPoints: 0
        };

        // 1. التحديث المحلي
        students.push(newStudent);
        localStorage.setItem("students", JSON.stringify(students));
        
        // 🚀 الرفع الفوري للسيرفر لمنع ضياع البيانات بعد دقيقتين 🚀
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/data/students.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(students)
        });

        delete window.currentJoinRequests[id];

        showToast(`تم التسكين بنجاح! كود الطالب هو: ${newCode}`);
        closeModal("approveRequestModal");
        loadJoinRequests(); 
        renderTable(); 

        if (window.pendingAttendanceAfterAction && currentActiveSessionId) {
            let isLate = document.getElementById('markAsLateCheckbox')?.checked;
            let attStatus = isLate ? 'late' : 'present';
            markAttendance(newCode, attStatus);
            
            // 🚀 الرفع الفوري للحضور عشان ميضيعش 🚀
            await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/data/classSessions.json`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classSessions)
            });

            showToast(`تم تحضير الطالب المنضم حديثاً بنجاح! ✅`);
            window.pendingAttendanceAfterAction = false;
            
            let autoPaymentEnabled = document.getElementById('autoPaymentCheckbox')?.checked;
            if (autoPaymentEnabled) {
                setTimeout(() => openQuickPaymentModal(newStudent), 500);
            } else {
                setTimeout(() => document.getElementById('attendanceBarcode')?.focus(), 200);
            }
        }

        // 2. عمليات الخلفية (مسح المكررات والواتساب)
        (async () => {
            try {
                await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/join_requests/${id}.json`, { method: 'DELETE' });

                let reqNameNorm = window.smartArabicNormalize(req.name);
                let reqWords = reqNameNorm.split(' ');

                // 🧹 البحث ومسح المكررات من الداتابيز
                for (let otherId in window.currentJoinRequests) {
                    if (otherId === id) continue;
                    let otherReq = window.currentJoinRequests[otherId];
                    let otherNameNorm = window.smartArabicNormalize(otherReq.name);
                    
                    let isDup = false;
                    if (req.phone && req.phone !== "0" && otherReq.phone === req.phone) isDup = true;
                    if (req.parentPhone && req.parentPhone !== "0" && otherReq.parentPhone === req.parentPhone) isDup = true;
                    if (reqNameNorm === otherNameNorm || reqWords.every(w => otherNameNorm.includes(w)) || otherNameNorm.split(' ').every(w => reqNameNorm.includes(w))) isDup = true;

                    if (isDup) {
                        delete window.currentJoinRequests[otherId];
                        fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/join_requests/${otherId}.json`, { method: 'DELETE' }); 
                    }
                }

                let portalLink = `https://ma9248290-collab.github.io/historya-systtem/parent.html`;
                let waMsg = `🎉 *تمت الموافقة على طلب الانضمام*\nأهلاً بك في نظام ${localStorage.getItem("teacherName") || "السنتر"}.\n\n👤 *اسم الطالب:* ${newStudent.name}\n📚 *المجموعة:* ${newStudent.group}\n🔑 *كود الدخول الخاص بك:* ${newCode}\n\n🔗 *رابط منصة الطالب:* ${portalLink}`;
                
                if (typeof sendAutoWhatsApp === "function") {
                    let targetPhone = (newStudent.phone && newStudent.phone !== "0") ? newStudent.phone : newStudent.parentPhone;
                    await sendAutoWhatsApp(targetPhone, waMsg);
                }
            } catch(bgError) { }
        })();

    } catch(e) {
        showToast("حدث خطأ أثناء المعالجة!", "error");
    }
    
    btn.innerText = origText; btn.disabled = false;
};

// 5. رفض الطلب (مسحه فقط)
window.rejectRequest = async function(id) {
    if(!confirm("هل أنت متأكد من رفض هذا الطلب وحذفه؟")) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/join_requests/${id}.json`, { method: 'DELETE' });
        showToast("تم حذف الطلب 🗑️");
        loadJoinRequests();
    } catch(e) { showToast("خطأ في الاتصال!", "error"); }
};

// 6. تشغيل جلب الطلبات أوتوماتيك أول ما السيستم يفتح عشان البادج الأحمر
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(sessionStorage.getItem("isLoggedIn") === "true") {
            loadJoinRequests();
        }
    }, 2000);
});

// ==========================================
// 🔙 نظام التنقل الذكي وزر الرجوع الشامل للمتصفح (Full History API) - لوحة المدرس
// ==========================================

window.isHistoryNavigating = false;

// 🚀 1. حل مشكلة القوائم الجانبية (منع المتصفح من إرسالك للرئيسية بسبب href="#")
document.addEventListener('click', function(e) {
    let target = e.target.closest('a');
    // لو العنصر اللي انداس عليه لينك والـ href بتاعه # بس، نوقفه عشان ميبوظش الهيستوري
    if (target && target.getAttribute('href') === '#') {
        e.preventDefault(); 
    }
});

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(sessionStorage.getItem("isLoggedIn") === "true") {
            // قراءة الرابط الحالي
            let hash = window.location.hash.replace('#', '');
            
            if (hash && hash !== 'dashboard') {
                // التوجيه التلقائي للمكان اللي كنت فيه
                if (hash.startsWith('student-')) {
                    let id = hash.replace('student-', '');
                    window.openStudentProfile(id, true);
                } else if (hash.startsWith('group-')) {
                    let id = decodeURIComponent(hash.replace('group-', ''));
                    window.openGroupDetails(id, true);
                } else if (hash.startsWith('session-')) {
                    let id = hash.replace('session-', '');
                    window.openSessionDetails(id, true);
                } else if (hash.startsWith('exam-')) {
                    let id = hash.replace('exam-', '');
                    window.openExamDetails(id, true);
                } else if (hash.startsWith('online-exam-')) {
                    let id = hash.replace('online-exam-', '');
                    window.openOnlineExamDetails(id, true);
                } else if (hash.startsWith('hw-')) {
                    let id = hash.replace('hw-', '');
                    window.openHwDetails(id, true);
                } else {
                    window.switchPage(hash, true);
                }
            } else {
                // لو مفيش رابط محدد، ارجع للرئيسية
                history.replaceState({ page: 'dashboard', type: 'main' }, '', '#dashboard');
                window.switchPage('dashboard', true);
            }
        }
    }, 1500); // بنستنى ثانية ونص لحد ما الفايربيز يحمل الداتا
});

// 3. تتبع التنقل بين التابات الرئيسية
const originalSwitchPageForHistory = window.switchPage;
window.switchPage = function(pageId, fromHistory = false) {
    // تشغيل الدالة الأصلية
    if (originalSwitchPageForHistory) originalSwitchPageForHistory(pageId);

    // تسجيل الخطوة في الهيستوري لو مش جاية من زرار الرجوع
    if (!fromHistory && !window.isHistoryNavigating) {
        history.pushState({ page: pageId, type: 'main' }, '', `#${pageId}`);
    }
};

// 4. تتبع فتح الصفحات الفرعية (ملفات الطلاب، تفاصيل الحصة، الامتحانات، إلخ)
const subPagesOverrides = [
    { funcName: 'openStudentProfile', pageKey: 'student-profile', prefix: 'student' },
    { funcName: 'openGroupDetails', pageKey: 'group-details', prefix: 'group' },
    { funcName: 'openSessionDetails', pageKey: 'session-details', prefix: 'session' },
    { funcName: 'openExamDetails', pageKey: 'exam-details', prefix: 'exam' },
    { funcName: 'openOnlineExamDetails', pageKey: 'online-exam-details', prefix: 'online-exam' },
    { funcName: 'openHwDetails', pageKey: 'hw-details', prefix: 'hw' }
];

subPagesOverrides.forEach(override => {
    const originalFunc = window[override.funcName];
    window[override.funcName] = async function(id, fromHistory = false) {
        // تشغيل الدالة الأصلية 
        if (originalFunc) {
            let result = originalFunc.apply(this, [id]);
            if (result instanceof Promise) await result;
        }
        
        // تسجيل الخطوة
        if (!fromHistory && !window.isHistoryNavigating) {
            history.pushState({ page: override.pageKey, type: 'sub', id: id }, '', `#${override.prefix}-${id}`);
        }
    };
});

// 5. تتبع زراير العودة الداخلية في الواجهة (عشان رابط الموقع يتحدث معاها)
const backButtonsOverrides = [
    { funcName: 'backToStudents', parentPage: 'students' },
    { funcName: 'backToGroups', parentPage: 'groups' },
    { funcName: 'backToSessions', parentPage: 'attendance' },
    { funcName: 'backToExams', parentPage: 'exams' },
    { funcName: 'backToPlatformExams', parentPage: 'platform' },
    { funcName: 'backToHw', parentPage: 'homework' }
];

backButtonsOverrides.forEach(override => {
    const originalBackFunc = window[override.funcName];
    window[override.funcName] = function(fromHistory = false) {
        if (originalBackFunc) originalBackFunc.apply(this, []);
        
        // تحديث الرابط وتسجيل الخطوة
        if (!fromHistory && !window.isHistoryNavigating) {
            history.pushState({ page: override.parentPage, type: 'main' }, '', `#${override.parentPage}`);
        }
    };
});

// 6. الاستماع السحري لزر الرجوع (Back Button) في المتصفح أو الموبايل
window.addEventListener('popstate', function(event) {
    window.isHistoryNavigating = true;
    const state = event.state;

    // إغلاق كل النوافذ المنبثقة (Modals) بالمرة عشان الشاشة تنضف
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');

    if (state) {
        if (state.type === 'main') {
            // لو بنرجع لصفحة رئيسية، لازم نقفل أي ملف مفتوح الأول
            if(document.getElementById("student-profile-view")?.style.display === 'block') window.backToStudents(true);
            if(document.getElementById("group-details-view")?.style.display === 'block') window.backToGroups(true);
            if(document.getElementById("session-details-view")?.style.display === 'block') window.backToSessions(true);
            if(document.getElementById("exam-details-view")?.style.display === 'block') window.backToExams(true);
            if(document.getElementById("online-exam-details-section")?.style.display === 'block') window.backToPlatformExams(true);
            if(document.getElementById("hw-details-view")?.style.display === 'block') window.backToHw(true);

            // بعد كده نفتح الصفحة اللي طلبها زرار الرجوع
            window.switchPage(state.page, true);
        } 
        else if (state.type === 'sub') {
            // لو بنرجع لملف كان مفتوح قبل كده
            if (state.page === 'student-profile') window.openStudentProfile(state.id, true);
            else if (state.page === 'group-details') window.openGroupDetails(state.id, true);
            else if (state.page === 'session-details') window.openSessionDetails(state.id, true);
            else if (state.page === 'exam-details') window.openExamDetails(state.id, true);
            else if (state.page === 'online-exam-details') window.openOnlineExamDetails(state.id, true);
            else if (state.page === 'hw-details') window.openHwDetails(state.id, true);
        }
    } else {
        // حماية: لو الهيستوري فاضي يرجعه للرئيسية
        window.switchPage('dashboard', true);
    }

    setTimeout(() => { window.isHistoryNavigating = false; }, 100);
});



window.saveBotSettings = function() {
    let enabled = document.getElementById("settingBotEnabled").checked;
    let name = document.getElementById("settingBotName").value.trim();
    let instructions = document.getElementById("settingBotInstructions").value.trim();

    localStorage.setItem("botEnabled", enabled);
    localStorage.setItem("botName", name);
    localStorage.setItem("botInstructions", instructions);

    showToast("تم حفظ إعدادات المساعد الذكي بنجاح! 🤖");
    
    // رفع التعديلات فوراً للسيرفر عشان الـ AI يطبقها
    if (typeof syncDataToBot === "function") syncDataToBot();
};


// 3. المزامنة السحابية + التحقق من الإيقاف والتاريخ والجغرافيا التلقائي والإنذار
async function loadDataFromFirebase() {
    // 🛑 منع التحميل من السحابة لو الحساب تجريبي
    if (localStorage.getItem("is_demo_mode") === "true") {
        isFirebaseLoaded = true; return; 
    }
    
    // 🔥 تعريف كود السنتر اللي كان بيعمل إيرور في الخفاء
    let currentLicenseKey = localStorage.getItem("licenseKey"); 
    if(!currentLicenseKey) return; 
    
    try {
        let licRes = await fetch(`https://edutrack-system-1ded4-default-rtdb.firebaseio.com/licenses/${currentLicenseKey}.json`);
        let licData = await licRes.json();
        
        if (licData) {
            let isExpired = false;
            
            // حساب هل الباقة انتهت زمنياً أم لا
            if (licData.activatedAt) {
                let activationDate = new Date(licData.activatedAt);
                let expirationDate = new Date(activationDate);
                
                if (licData.durationDays) {
                    expirationDate.setDate(expirationDate.getDate() + parseInt(licData.durationDays));
                } else if (licData.durationMonths) {
                    expirationDate.setMonth(expirationDate.getMonth() + parseInt(licData.durationMonths));
                }
                
                let today = new Date();
                let timeDiff = expirationDate.getTime() - today.getTime();
                let daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24)); // حساب الأيام المتبقية

                if (licData.durationMonths != 99) {
                    if (daysLeft <= 0) {
                        isExpired = true;
                    } else if (daysLeft <= 5 && daysLeft > 0) {
                        // 🚨 إظهار شريط الإنذار
                        let banner = document.getElementById("expiration-banner");
                        if(banner) {
                            banner.style.display = "block";
                            document.getElementById("expire-days").innerText = daysLeft;
                        }
                    }
                }
            }

            // 🚫 الطرد المباشر
            if (licData.status === 'suspended' || isExpired) {
                sessionStorage.removeItem("isLoggedIn"); // مسح الجلسة
                localStorage.setItem("keepLoggedIn", "false"); // 🔥 مسح (تذكرني) إجبارياً
                
                document.getElementById("login-screen").style.display = "none";
                document.getElementById("main-app").style.display = "none";
                
                const suspendedScreen = document.getElementById("suspended-screen");
                if(suspendedScreen) {
                    suspendedScreen.style.display = "flex";
                    if (isExpired) {
                        suspendedScreen.querySelector("h2").innerText = "انتهت فترة الاشتراك! ⏳";
                        suspendedScreen.querySelector("p").innerText = "لقد انتهت صلاحية باقتك الحالية. يرجى التواصل مع الإدارة لتجديد الاشتراك واستعادة بياناتك.";
                    } else {
                        suspendedScreen.querySelector("h2").innerText = "تم إيقاف النسخة! 🚫";
                        suspendedScreen.querySelector("p").innerText = "عفواً، تم إيقاف ترخيص استخدام هذا النظام من قبل الإدارة العليا.";
                    }
                }
                return; // ⛔ قفل السيستم ومنع تحميل باقي الداتا
            }
        }
        
        // ... (باقي الكود بتاع جلب الداتا الخاصة بالطلاب زي ما هو تحت هنا) ...

        // --- باقي دالة الـ loadDataFromFirebase لسحب الداتا ---
        let res = await fetch(getFirebaseUrl());
        let data = await res.json();
        // ... (تكملة الكود بتاع سحب الـ settings والـ students زي ما هو) ...
        
        if (data) {
            if(data.settings) {
                localStorage.setItem("teacherName", data.settings.teacherName);
                localStorage.setItem("centerName", data.settings.centerName);
                // السطرين الجداد دول 👇
                localStorage.setItem("adminUser", data.settings.adminUser);
                localStorage.setItem("adminPass", data.settings.adminPass);
                localStorage.setItem("adminPin", data.settings.adminPin);
                adminPin = data.settings.adminPin; // تحديث المتغير العالمي
                if(data.settings.phoneNumbers) localStorage.setItem("teacherPhones", data.settings.phoneNumbers);
                if(data.settings.parentMsgTemplate) localStorage.setItem("parentMsgTemplate", data.settings.parentMsgTemplate);
                if(data.settings.studentMsgTemplate) localStorage.setItem("studentMsgTemplate", data.settings.studentMsgTemplate);
            } else if (data.teacherName) {
                localStorage.setItem("teacherName", data.teacherName);
            }

            students = (data.students || []).filter(i => i !== null);
            groups = (data.groups || []).filter(i => i !== null);
            schedule = (data.schedule || []).filter(i => i !== null);
            expenses = (data.expenses || []).filter(i => i !== null);
            financeRecords = data.financeRecords || {};
            books = (data.books || []).filter(i => i !== null);
             onlineExams = (data.onlineExams || []).filter(i => i !== null);
            classSessions = (data.classSessions || []).filter(i => i !== null).map(s => ({...s, attendance: s.attendance || {}}));
            exams = (data.exams || []).filter(i => i !== null).map(e => ({...e, grades: e.grades || {}}));
            homeworks = (data.homeworks || []).filter(i => i !== null).map(h => ({...h, grades: h.grades || {}}));
            
            localStorage.setItem("students", JSON.stringify(students));
            localStorage.setItem("classSessions", JSON.stringify(classSessions));
            localStorage.setItem("exams", JSON.stringify(exams));
            localStorage.setItem("homeworks", JSON.stringify(homeworks));
            localStorage.setItem("schedule", JSON.stringify(schedule));
            localStorage.setItem("groups", JSON.stringify(groups));
            localStorage.setItem("financeRecords", JSON.stringify(financeRecords));
            localStorage.setItem("expenses", JSON.stringify(expenses));
            localStorage.setItem("books", JSON.stringify(books));
           
            localStorage.setItem("onlineExams", JSON.stringify(onlineExams));

            renderTable();
            if (document.getElementById("groups-list")) renderGroupCards();
            if (typeof renderBooksTable === "function") renderBooksTable();
            if(sessionStorage.getItem("isLoggedIn") === "true" && typeof renderDashboardCharts === "function") {
                renderDashboardCharts();
            }
        }
    } catch (e) {
        console.log("⚠️ تعذر الاتصال بالسحابة أو قاعدة البيانات فارغة.");
    }
    isFirebaseLoaded = true; 

    // بعد ما السيستم يحمل الداتا ويفرشها، شيك لو محتاجين باك أب النهاردة
    setTimeout(autoCloudBackup, 5000); // بنأخره 5 ثواني عشان ميعطلش فتح الشاشة

    setTimeout(window.checkGlobalAnnouncements, 1500);
}

// ==========================================
// 🧬 المُدمج الذكي للبيانات (Two-Way Sync Merge)
// ==========================================
window.mergeOfflineDataAndSync = async function() {
    showToast("جاري دمج بياناتك الأوفلاين مع بيانات الأجهزة الأخرى... ⏳", "info");
    
    try {
        // 1. سحب داتا السيرفر الحالية
        let res = await fetch(getFirebaseUrl());
        let serverData = await res.json() || {};

        // 2. دمج الطلاب (الجداد من هنا ومن هناك)
        let mergedStudentsMap = {};
        (serverData.students || []).forEach(s => { if(s) mergedStudentsMap[s.code] = s; });
        students.forEach(s => { mergedStudentsMap[s.code] = { ...mergedStudentsMap[s.code], ...s }; });
        students = Object.values(mergedStudentsMap);

        // 3. دمج الحصص والحضور (أهم نقطة عشان الغياب ميتلغيش)
        let mergedSessionsMap = {};
        (serverData.classSessions || []).forEach(s => { if(s) mergedSessionsMap[s.id] = s; });
        classSessions.forEach(s => {
            if(mergedSessionsMap[s.id]) {
                // لو الحصة موجودة في الجهازين، ادمج غياب الطلاب اللي هنا مع اللي هناك
                mergedSessionsMap[s.id].attendance = { ...mergedSessionsMap[s.id].attendance, ...s.attendance };
                mergedSessionsMap[s.id] = { ...mergedSessionsMap[s.id], ...s, attendance: mergedSessionsMap[s.id].attendance };
            } else {
                mergedSessionsMap[s.id] = s; // لو حصة جديدة أوفلاين
            }
        });
        classSessions = Object.values(mergedSessionsMap).sort((a,b) => new Date(a.date) - new Date(b.date));

        // 4. دمج الامتحانات والدرجات
        let mergedExamsMap = {};
        (serverData.exams || []).forEach(e => { if(e) mergedExamsMap[e.id] = e; });
        exams.forEach(e => {
            if(mergedExamsMap[e.id]) {
                mergedExamsMap[e.id].grades = { ...mergedExamsMap[e.id].grades, ...e.grades };
                mergedExamsMap[e.id] = { ...mergedExamsMap[e.id], ...e, grades: mergedExamsMap[e.id].grades };
            } else {
                mergedExamsMap[e.id] = e;
            }
        });
        exams = Object.values(mergedExamsMap);

        // 5. دمج الخزنة والماليات (عشان الفلوس متضيعش)
        let serverFinance = serverData.financeRecords || {};
        Object.keys(financeRecords).forEach(sessionKey => {
            if(!serverFinance[sessionKey]) serverFinance[sessionKey] = {};
            serverFinance[sessionKey] = { ...serverFinance[sessionKey], ...financeRecords[sessionKey] };
        });
        financeRecords = serverFinance;

        // 6. حفظ النسخة المدمجة في الجهاز
        localStorage.setItem("students", JSON.stringify(students));
        localStorage.setItem("classSessions", JSON.stringify(classSessions));
        localStorage.setItem("exams", JSON.stringify(exams));
        localStorage.setItem("financeRecords", JSON.stringify(financeRecords));

        // 7. رفع النسخة المدمجة للسيرفر
        localStorage.removeItem('has_offline_changes');
        await syncDataToBot();
        
        showToast("✅ تمت المزامنة! تم دمج شغلك مع السيرفر بنجاح.", "success");
        if(typeof refreshCurrentVisibleScreens === 'function') refreshCurrentVisibleScreens();

    } catch(err) {
        showToast("حدث خطأ أثناء دمج البيانات!", "error");
        console.error(err);
    }
};


// ==========================================
// 🛡️ نظام النسخ الاحتياطي التلقائي السحابي (Auto Cloud Backup)
// ==========================================
async function autoCloudBackup() {
    const licenseKey = localStorage.getItem("licenseKey");
    let isDemo = localStorage.getItem("is_demo_mode") === "true";
    
    // لو مفيش نت، أو الحساب تجريبي، أو مفيش كود سنتر، متعملش باك أب
    if (!licenseKey || !navigator.onLine || isDemo) return;

    // تحديد اسم النسخة بتاريخ اليوم (مثال: 2026-08-19)
    const today = new Date().toISOString().split('T')[0];
    const lastBackup = localStorage.getItem('last_auto_backup');

    // لو السيستم عمل نسخة النهاردة بالفعل، هيوقف عشان ميزحمش الداتابيز
    if (lastBackup === today) return;

    // تجميع كل قطرة داتا في السيستم
    const backupData = {
        timestamp: new Date().toISOString(),
        students: typeof students !== 'undefined' ? students : [], 
        classSessions: typeof classSessions !== 'undefined' ? classSessions : [], 
        exams: typeof exams !== 'undefined' ? exams : [], 
        homeworks: typeof homeworks !== 'undefined' ? homeworks : [], 
        schedule: typeof schedule !== 'undefined' ? schedule : [], 
        groups: typeof groups !== 'undefined' ? groups : [], 
        financeRecords: typeof financeRecords !== 'undefined' ? financeRecords : {}, 
        expenses: typeof expenses !== 'undefined' ? expenses : [], 
        books: typeof books !== 'undefined' ? books : [], 
        monthlyPayments: typeof monthlyPayments !== 'undefined' ? monthlyPayments : {},
        onlineExams: typeof onlineExams !== 'undefined' ? onlineExams : []
    };

    try {
        // رفع النسخة في مسار معزول تماماً اسمه (backups) جوه ملف السنتر
        await fetch(`https://edutrack-system-1ded4-default-rtdb.firebaseio.com/teachers/${licenseKey}/backups/${today}.json`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(backupData) 
        });
        
        // تسجيل إننا عملنا باك أب النهاردة عشان ميكرروش تاني إلا بكرة
        localStorage.setItem('last_auto_backup', today);
        console.log(`✅ تم أخذ لقطة احتياطية سحابية بنجاح ليوم: ${today}`);
        
    } catch (e) {
        console.error("⚠️ فشل النسخ الاحتياطي التلقائي:", e);
    }
}


// ==========================================
// 🌐 مراقب حالة الإنترنت (محدث بالدمج الذكي)
// ==========================================
function updateNetworkStatus(isOnline, isInitialLoad = false) {
    const badge = document.getElementById('network-status-badge');
    const dot = document.getElementById('network-status-dot');
    const text = document.getElementById('network-status-text');
    if (!badge || !dot || !text) return;

    if (isOnline) {
        badge.style.background = 'rgba(16, 185, 129, 0.1)'; badge.style.color = '#10b981';
        dot.style.background = '#10b981'; dot.style.boxShadow = '0 0 5px #10b981';
        text.innerText = 'متصل بالإنترنت';
        
        if (!isInitialLoad) {
            // 🛑 فحص هل في شغل اتعمل وإحنا أوفلاين ولا لأ؟
            let hasOfflineChanges = localStorage.getItem('has_offline_changes') === 'true';
            
            if (hasOfflineChanges) {
                // تشغيل الدمج الذكي اللي بيجمع شغل الجهازين مع بعض
                mergeOfflineDataAndSync();
            } else {
                // لو معملش حاجة أوفلاين، يسحب بأمان
                showToast("تم عودة الإنترنت، جاري سحب أحدث البيانات... 📥", "info");
                if (typeof loadDataFromFirebase === 'function') {
                    loadDataFromFirebase().then(() => {
                        if (typeof refreshCurrentVisibleScreens === 'function') refreshCurrentVisibleScreens();
                        showToast("تم تحديث شاشتك بأحدث البيانات بنجاح ✅", "success");
                    });
                }
            }
        }
    } else {
        badge.style.background = 'rgba(239, 68, 68, 0.1)'; badge.style.color = '#ef4444';
        dot.style.background = '#ef4444'; dot.style.boxShadow = '0 0 5px #ef4444';
        text.innerText = 'الإنترنت فاصل';
        if (!isInitialLoad) showToast("انقطع الاتصال بالإنترنت! سيتم دمج أي تعديل لاحقاً ⚠️", "error");
    }
}

// ==========================================
// ☁️ دالة الرفع للسحابة (محمية ضد تداخل الأجهزة)
// ==========================================
async function syncDataToBot() {
    // 🔥 الحماية الأولى: لو مفيش نت، متعملش أي حاجة وسجل إن في شغل أوفلاين
    if (!navigator.onLine) {
        console.warn("الإنترنت مفصول.. تم إيقاف الرفع مؤقتاً وتسجيل التعديلات كمحلية.");
        // وضع علامة سرية في الجهاز إن في داتا مستنية تترفع
        const originalSetItem = localStorage.constructor.prototype.setItem;
        originalSetItem.call(localStorage, 'has_offline_changes', 'true');
        return; 
    }

    let isDemo = localStorage.getItem("is_demo_mode") === "true";
    if (!isDemo && (!isFirebaseLoaded || !licenseKey)) return; 

   const dataToSync = {
        settings: {
            teacherName: localStorage.getItem("teacherName") || "المدير",
            centerName: localStorage.getItem("centerName") || "السنتر",
            adminUser: localStorage.getItem("adminUser") || "shefo",
            adminPass: localStorage.getItem("adminPass") || "12345",
            adminPin: localStorage.getItem("adminPin") || "1234",
            phoneNumbers: localStorage.getItem("teacherPhones") || "",
            parentMsgTemplate: localStorage.getItem("parentMsgTemplate") || "",
            studentMsgTemplate: localStorage.getItem("studentMsgTemplate") || "",
            botEnabled: localStorage.getItem("botEnabled") === "true",
            botName: localStorage.getItem("botName") || "المساعد",
            botInstructions: localStorage.getItem("botInstructions") || ""
        },
        teacherName: localStorage.getItem("teacherName") || "المدير",
        centerName: localStorage.getItem("centerName") || "السنتر",
        adminUser: localStorage.getItem("adminUser"),
        adminPass: localStorage.getItem("adminPass"),
        adminPin: localStorage.getItem("adminPin"),
        
        students, classSessions, exams, homeworks, schedule, groups, financeRecords, expenses, books, monthlyPayments: monthlyPayments,
        onlineExams: onlineExams 
    };

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:") {
        try {
            await fetch(`${WHATSAPP_SERVER_URL}/sync-database`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(dataToSync) 
            });
        } catch (e) {}
    }

    if (isDemo) return;

    try {
        await fetch(getFirebaseUrl(), { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(dataToSync) 
        });
        
        // 🔥 مسح العلامة بعد الرفع بنجاح عشان منسألوش تاني
        localStorage.removeItem('has_offline_changes');

        if (typeof triggerGlobalSyncSignal === 'function') {
            await triggerGlobalSyncSignal();
        }
    } catch (e) {}
}


// الاستماع لتغيرات الشبكة لحظياً
window.addEventListener('online', () => updateNetworkStatus(true, false));
window.addEventListener('offline', () => updateNetworkStatus(false, false));

// فحص الحالة أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', () => {
    // تشغيل الفحص المبدئي
    setTimeout(() => {
        updateNetworkStatus(navigator.onLine, true);
    }, 500);
});


window.toggleTrackDropdown = function(levelId, trackGroupId) {
    let level = document.getElementById(levelId).value;
    let trackGroup = document.getElementById(trackGroupId);
    if (level.includes('ثانوي') || level.includes('بكالوريا')) {
        trackGroup.style.display = 'block';
    } else {
        trackGroup.style.display = 'none';
    }
};



// امسح البلوك ده بالكامل
window.updateEditGeneratedCode = function() {
    let prefix = document.getElementById("editStudentCenterPrefix").value;
    if (prefix) {
        document.getElementById("editStudentCode").value = window.generateStudentCode(prefix);
    }
};

// ==========================================
// 🚀 محرك المزامنة اللحظية الفائقة (Live Server-Sent Events)
// ==========================================
function startRealTimeSync() {
    if (sessionStorage.getItem("isLoggedIn") !== "true" || localStorage.getItem("is_demo_mode") === "true") return;

    // الاتصال المباشر والمستمر بالفايربيز بدون ضغط على السيرفر
    const syncUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/AlQaisar_System/syncSignal.json`;
    const source = new EventSource(syncUrl);

    source.addEventListener('put', async function(e) {
        try {
            const payload = JSON.parse(e.data);
            const serverTime = payload.data; // الوقت اللي جاي من السيرفر

            // لو فيه تحديث جديد من جهاز تاني (وقت التحديث أكبر من الوقت اللي عندي)
            if (serverTime && (!window.lastLocalSyncTime || serverTime > window.lastLocalSyncTime)) {
                console.log("⚡ [SYNC] تم رصد تغيير من جهاز آخر، يتم تحديث الواجهة فوراً...");
                
                // استدعاء البيانات الجديدة بصمت
                await loadDataFromFirebase();
                
                // تحديث فوري للشاشات المفتوحة قدام السكرتارية
                if (document.getElementById("students-overview")?.style.display === "block") renderTable();
                if (document.getElementById("groups-overview")?.style.display === "block" && typeof renderGroupCards === "function") renderGroupCards();
                if (document.getElementById("group-details-view")?.style.display === "block" && typeof renderGroupStudentsTable === "function") renderGroupStudentsTable();
                if (document.getElementById("dashboard-view")?.style.display === "block") document.getElementById("total-students").innerText = students.length;
                if (document.getElementById("finance-view")?.style.display === "block") renderFinanceTable();
                
                // تحديث شاشة الحضور لو مفتوحة
                if (document.getElementById("session-details-view")?.style.display === "block" && currentActiveSessionId) {
                    const session = classSessions.find(s => s.id === currentActiveSessionId);
                    if(session) renderAttendanceTable(session);
                }
            }
        } catch (err) {
            console.error("Sync Error:", err);
        }
    });

    source.onerror = function() {
        // إعادة المحاولة عند انقطاع الاتصال
        source.close();
        setTimeout(startRealTimeSync, 5000);
    };
}

// تشغيل محرك المزامنة بمجرد فتح السيستم
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        startRealTimeSync();
    }, 3000); // بنستنى 3 ثواني لحد ما السيستم يحمل عشان منعملش تعارض
});


// ==========================================
// 📥 تصدير جميع الطلاب إلى إكسيل (شيت شامل)
// ==========================================
window.exportAllStudentsToExcel = function() {
    if (students.length === 0) return showToast("لا يوجد طلاب لتصديرهم!", "error");

    let excelData = students.map(st => ({
        "الكود": st.code,
        "الاسم": st.name,
        "الصف الدراسي": st.level,
        "المسار": st.track || 'عام',
        "المجموعة": st.group,
        "هاتف الطالب": st.phone,
        "هاتف ولي الأمر": st.parentPhone,
        "الجنس": st.gender,
        "نقاط التميز": st.behaviorPoints || 0
    }));

    let ws = XLSX.utils.json_to_sheet(excelData);
    // تظبيط عرض العواميد عشان الكلام ميبقاش مقطوش
    ws['!cols'] = [{wch: 10}, {wch: 30}, {wch: 20}, {wch: 10}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 12}];
    
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل الطلاب");
    
    let dateStr = new Date().toLocaleDateString('ar-EG').replace(/\//g, '-');
    XLSX.writeFile(wb, `سجل_جميع_الطلاب_${dateStr}.xlsx`);
    showToast("تم تصدير سجل الطلاب بنجاح! 📥");
};

// ==========================================
// 📥 تصدير طلاب مجموعة معينة إلى إكسيل (شيت حضور/غياب)
// ==========================================
window.exportGroupStudentsToExcel = function() {
    if (!currentActiveGroup) return;
    
    let groupStudents = students.filter(s => s.group === currentActiveGroup);
    if (groupStudents.length === 0) return showToast("لا يوجد طلاب في هذه المجموعة لتصديرهم!", "error");

    let excelData = groupStudents.map(st => ({
        "الكود": st.code,
        "الاسم": st.name,
        "المسار": st.track || 'عام',
        "هاتف الطالب": st.phone,
        "هاتف ولي الأمر": st.parentPhone,
        "نقاط التميز": st.behaviorPoints || 0
    }));

    let ws = XLSX.utils.json_to_sheet(excelData);
    // تظبيط عرض العواميد
    ws['!cols'] = [{wch: 10}, {wch: 30}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 12}];
    
    let wb = XLSX.utils.book_new();
    // اسم الشيت من تحت هيكون اسم المجموعة
    XLSX.utils.book_append_sheet(wb, ws, currentActiveGroup.substring(0, 30)); 
    
    let dateStr = new Date().toLocaleDateString('ar-EG').replace(/\//g, '-');
    XLSX.writeFile(wb, `طلاب_مجموعة_${currentActiveGroup}_${dateStr}.xlsx`);
    showToast(`تم تصدير شيت مجموعة (${currentActiveGroup}) بنجاح! 📥`);
};





// ==========================================
// 🔄 المزامنة اللحظية بين التابات (بدون ريفريش حتى لو أوفلاين)
// ==========================================
window.addEventListener('storage', function(e) {
    // 1. لو التغيير حصل في (الطلاب) من تاب تاني (إضافة، تعديل، حذف)
    if (e.key === 'students') {
        // تحديث الداتا في التاب الحالي أوتوماتيكياً
        students = JSON.parse(e.newValue) || [];
        
        // تحديث جدول الطلاب الشامل لو المدرس فاتحه
        if (document.getElementById("students-overview")?.style.display === "block") {
            if (typeof renderTable === 'function') renderTable();
        }
        
        // تحديث جدول طلاب المجموعة لو المدرس فاتح تفاصيل مجموعة معينة
        if (document.getElementById("group-details-view")?.style.display === "block") {
            if (typeof renderGroupStudentsTable === 'function') renderGroupStudentsTable();
        }
        
        // تحديث أعداد الطلاب جوه كروت المجموعات من بره
        if (document.getElementById("groups-overview")?.style.display === "block") {
            if (typeof renderGroupCards === 'function') renderGroupCards();
        }
        
        // تحديث العداد الإجمالي للطلاب في لوحة الإحصائيات (الرئيسية)
        let totalEl = document.getElementById("total-students");
        if (totalEl) totalEl.innerText = students.length;
    }

    // 2. لو التغيير حصل في (المجموعات) من تاب تاني (إنشاء مجموعة جديدة أو مسحها)
    if (e.key === 'groups') {
        groups = JSON.parse(e.newValue) || [];
        
        // تحديث كروت المجموعات
        if (document.getElementById("groups-overview")?.style.display === "block") {
            if (typeof renderGroupCards === 'function') renderGroupCards();
        }
    }
});


// ==========================================
// 🌐 فحص حالة السيرفر والواتساب (بالتحديث التلقائي)
// ==========================================
window.waCheckInterval = null; // عداد الفحص التلقائي

const oldModalOpenerForServer = window.openModal;
window.openModal = function(modalId) {
    if (oldModalOpenerForServer) oldModalOpenerForServer(modalId);
    
    // أول ما المدرس يفتح الإعدادات، نشغل الفحص الفوري والعداد
    if (modalId === 'settingsModal') {
        checkWhatsappServer(); 
        window.waCheckInterval = setInterval(checkWhatsappServer, 3000); // يفحص كل 3 ثواني
    }
};

const oldCloseModalForServer = window.closeModal;
window.closeModal = function(modalId) {
    if (oldCloseModalForServer) oldCloseModalForServer(modalId);
    // إيقاف العداد لو قفل النافذة عشان منسحبش نت على الفاضي
    if (modalId === 'settingsModal') {
        if (window.waCheckInterval) clearInterval(window.waCheckInterval); 
    }
};




window.showShefoTypingIndicator = function() {
    const chatBox = document.getElementById("shefo-chat-messages");
    if (!chatBox) return;

    hideShefoTypingIndicator(); // مسح أي مؤشر قديم احتياطياً

    const typingDiv = document.createElement("div");
    typingDiv.id = "shefo-typing-indicator";
    // استخدمنا الكلاسات بتاعتك بالظبط عشان ياخد لون وخلفية رسالة البوت (#334155)
    typingDiv.className = "shefo-message bot-message"; 
    typingDiv.style.display = "flex";
    typingDiv.style.alignItems = "center";
    typingDiv.style.gap = "4px";
    typingDiv.style.padding = "15px";
    typingDiv.style.width = "fit-content";
    
    typingDiv.innerHTML = `
        <div class="shefo-typing-dot"></div>
        <div class="shefo-typing-dot"></div>
        <div class="shefo-typing-dot"></div>
    `;
    
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // النزول لآخر الشات
};

window.hideShefoTypingIndicator = function() {
    const indicator = document.getElementById("shefo-typing-indicator");
    if (indicator) indicator.remove();
};




// ==========================================
// 📥 نظام استيراد الطلاب من الإكسيل مباشرة داخل المجموعة (النسخة الذكية)
// ==========================================

window.downloadGroupExcelTemplate = function() {
    const headers = [["كود الطالب", "الاسم", "رقم الطالب", "رقم ولي الأمر", "الجنس"]];
    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    worksheet['!cols'] = [{wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 10}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب");
    XLSX.writeFile(workbook, `نموذج_إضافة_طلاب_مجموعة.xlsx`);
    showToast("تم تحميل نموذج الإكسيل بنجاح! 📥");
};

// 2. معالجة ملف الإكسيل المرفوع والتقسيم الذكي
window.importStudentsToGroupFromExcel = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!currentActiveGroup) {
        showToast("خطأ: لم يتم التعرف على المجموعة الحالية!", "error");
        event.target.value = "";
        return;
    }

    let groupObj = groups.find(g => g.name === currentActiveGroup);
    let groupLevel = groupObj ? groupObj.level : "غير محدد";

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
            
            let addedList = [];
            let moveQueue = [];
            let skippedList = [];
            
            excelData.forEach(row => {
                let rawCode = row['كود الطالب'] || row['الكود'] || '';
                let name = row['الاسم'] || row['اسم الطالب'] || '';
                let phone = row['رقم الطالب'] || row['هاتف الطالب'] || '0';
                let parentPhone = row['رقم ولي الأمر'] || row['هاتف ولي الأمر'] || '0';
                let gender = row['الجنس'] || 'ذكر';
                
                if (name) {
                    phone = String(phone).trim();
                    parentPhone = String(parentPhone).trim();
                    name = String(name).trim();
                    rawCode = rawCode ? String(rawCode).trim() : "";
                    
                    // البحث عن الطالب (بالكود أو برقم الهاتف أو بالاسم)
                    let existingStudent = students.find(s => 
                        (rawCode !== "" && String(s.code) === rawCode) || 
                        (phone !== "0" && phone !== "" && s.phone === phone) ||
                        (window.smartArabicNormalize(s.name) === window.smartArabicNormalize(name))
                    );
                    
                    if (existingStudent) {
                        if (existingStudent.group === currentActiveGroup) {
                            skippedList.push({ name: existingStudent.name, reason: 'موجود بالفعل في هذه المجموعة' });
                        } else {
                            moveQueue.push(existingStudent); // محتاج يتنقل
                        }
                    } else {
                        // طالب جديد تماماً
                        let finalCode = rawCode !== "" ? rawCode : window.generateStudentCode();
                        let newStudent = {
                            code: finalCode,
                            name: name,
                            level: groupLevel,
                            group: currentActiveGroup,
                            phone: phone,
                            parentPhone: parentPhone,
                            gender: String(gender).trim(),
                            track: "عام",
                            behaviorPoints: 0
                        };
                        students.push(newStudent);
                        addedList.push(newStudent);
                    }
                }
            });
            
            // حفظ التغييرات لو في طلاب جداد اتضافوا
            if (addedList.length > 0) {
                localStorage.setItem("students", JSON.stringify(students));
                if (typeof renderGroupStudentsTable === "function") renderGroupStudentsTable();
                if (typeof renderGroupCards === "function") renderGroupCards();
                if (typeof syncDataToBot === "function") syncDataToBot();
            }
            
            // عرض تقرير الاستيراد الذكي
            window.showGroupImportReportModal(addedList, moveQueue, skippedList);
            
        } catch(err) {
            showToast("حدث خطأ أثناء قراءة ملف الإكسيل! يرجى التأكد من الصيغة.", "error");
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ""; 
};

// 3. رسم شاشة التقرير التفاعلية
window.showGroupImportReportModal = function(addedList, moveQueue, skippedList) {
    let oldModal = document.getElementById('groupExcelReportModal');
    if (oldModal) oldModal.remove();

    window.pendingMoveQueue = moveQueue; // حفظ القائمة للتعامل معها

    // بوكس الطلاب الجدد
    let addedHtml = "";
    if (addedList.length > 0) {
        addedHtml = `
            <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; border: 1px dashed #10b981; margin-bottom: 15px; text-align:center;">
                <h3 style="color: #10b981; margin:0 0 5px 0;">✅ تم إضافة ${addedList.length} طالب جديد</h3>
                <p style="margin:0; font-size:13px; color:var(--text-main); font-weight:bold;">تم تسكينهم فوراً في مجموعة (${currentActiveGroup}) وتوليد أكوادهم.</p>
            </div>
        `;
    }

    // بوكس الطلاب اللي محتاجين نقل
    let moveHtml = "";
    if (moveQueue.length > 0) {
        moveHtml = `
            <div style="background: rgba(59, 130, 246, 0.05); padding: 15px; border-radius: 8px; border: 1px dashed #3b82f6; margin-bottom: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                    <h4 style="color: #3b82f6; margin:0;">🔄 طلاب مسجلين مسبقاً (${moveQueue.length})</h4>
                    <button onclick="moveAllToCurrentGroup()" style="background:#3b82f6; color:white; border:none; padding:5px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">نقل الجميع للمجموعة الحالية ⚡</button>
                </div>
                <div style="max-height: 180px; overflow-y: auto; background: #fff; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        ${moveQueue.map(st => `
                            <tr style="border-bottom: 1px solid #e2e8f0;" id="move_row_${st.code}">
                                <td style="padding: 10px; font-weight:bold; color:var(--primary-color);">${st.code}</td>
                                <td style="padding: 10px; font-weight:bold;">${st.name}</td>
                                <td style="padding: 10px; color:var(--danger-color); font-weight:bold;">من: ${st.group || 'بدون'}</td>
                                <td style="padding: 10px; text-align:left;">
                                    <button onclick="moveStudentToCurrentGroup('${st.code}')" class="save-btn" style="margin:0; padding:5px 12px; width:auto; font-size:12px; background:#f59e0b;">نقل هنا 📥</button>
                                </td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        `;
    }

    // بوكس المتجاهلين (المكررين)
    let skippedHtml = "";
    if (skippedList.length > 0) {
        skippedHtml = `
            <div style="background: rgba(239, 68, 68, 0.05); padding: 15px; border-radius: 8px; border: 1px dashed #ef4444; margin-bottom: 15px;">
                <h4 style="color: #ef4444; margin:0 0 10px 0;">⚠️ تم تجاهل (${skippedList.length}) طلاب</h4>
                <p style="margin:0; font-size:13px; color:var(--text-muted); font-weight:bold;">هؤلاء الطلاب موجودون بالفعل داخل هذه المجموعة.</p>
            </div>
        `;
    }

    // تجميع النافذة
    let modalHtml = `
        <div id="groupExcelReportModal" class="modal" style="display:flex; z-index: 1000000; align-items:center; justify-content:center;">
            <div class="modal-content" style="width: 700px; max-width: 95%; max-height: 90vh; overflow-y:auto; border-top: 5px solid var(--primary-color);">
                <span class="close-btn" onclick="this.parentElement.parentElement.remove(); if(typeof renderGroupStudentsTable === 'function') renderGroupStudentsTable();">&times;</span>
                <h2 style="color: var(--primary-color); margin-bottom: 20px;">📊 تقرير إضافة الطلاب</h2>
                ${addedHtml}
                ${moveHtml}
                ${skippedHtml}
                <button class="save-btn" style="width: 100%; margin-top: 10px;" onclick="this.parentElement.parentElement.remove(); if(typeof renderGroupStudentsTable === 'function') renderGroupStudentsTable();">إغلاق التقرير 👍</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// 4. دالة نقل طالب واحد
window.moveStudentToCurrentGroup = function(code) {
    let stIdx = students.findIndex(s => s.code === code);
    if (stIdx > -1) {
        students[stIdx].group = currentActiveGroup;
        localStorage.setItem("students", JSON.stringify(students));
        
        let row = document.getElementById(`move_row_${code}`);
        if(row) {
            row.innerHTML = `<td colspan="4" style="padding:10px; text-align:center; color:#10b981; font-weight:bold; background:#f0fdf4;">✅ تم نقل الطالب (${students[stIdx].name}) إلى ${currentActiveGroup}</td>`;
        }
        if (typeof syncDataToBot === "function") syncDataToBot();
    }
};

// 5. دالة نقل كل الطلاب المعلقين دفعة واحدة
window.moveAllToCurrentGroup = function() {
    if (!window.pendingMoveQueue || window.pendingMoveQueue.length === 0) return;
    
    window.pendingMoveQueue.forEach(pendingSt => {
        let stIdx = students.findIndex(s => s.code === pendingSt.code);
        if (stIdx > -1) {
            students[stIdx].group = currentActiveGroup;
            let row = document.getElementById(`move_row_${pendingSt.code}`);
            if(row) row.innerHTML = `<td colspan="4" style="padding:10px; text-align:center; color:#10b981; font-weight:bold; background:#f0fdf4;">✅ تم النقل</td>`;
        }
    });

    localStorage.setItem("students", JSON.stringify(students));
    window.pendingMoveQueue = []; // تصفير القائمة
    showToast("تم نقل جميع الطلاب المحددين بنجاح! 🚀");
    if (typeof syncDataToBot === "function") syncDataToBot();
};




// ==========================================
// 💡 نظام الكود الذكي والإضافة السريعة من الحصة
// ==========================================

// 1. دالة بتجيب آخر طالب متسجل في صف معين
window.getLastStudentInLevel = function(level) {
    let levelStudents = students.filter(s => s.level === level);
    if (levelStudents.length === 0) return null;

    // ترتيب الطلاب بناءً على الأرقام اللي في الكود عشان نجيب الأخير صح
    levelStudents.sort((a, b) => {
        let numA = parseInt(String(a.code).replace(/\D/g, '')) || 0;
        let numB = parseInt(String(b.code).replace(/\D/g, '')) || 0;
        return numA - numB;
    });

    return levelStudents[levelStudents.length - 1]; // إرجاع بيانات آخر طالب
};

// 2. دالة بتولد الكود الجديد بناءً على كود آخر طالب في الصف
window.generateNextCodeForLevel = function(level) {
    let lastStudent = window.getLastStudentInLevel(level);
    if (!lastStudent) return "1"; // لو مفيش طلاب خالص في الصف ده

    let codeStr = String(lastStudent.code).trim();
    // البحث عن آخر رقم في الكود (عشان لو بتستخدم حروف زي G2-105)
    let numMatch = codeStr.match(/\d+$/); 

    if (numMatch) {
        let numStr = numMatch[0];
        let prefix = codeStr.substring(0, codeStr.length - numStr.length);
        let nextNum = parseInt(numStr, 10) + 1;

        // الحفاظ على الأصفار لو موجودة (مثال: 001 يبقى 002)
        let paddedNum = nextNum.toString();
        if (numStr.startsWith('0')) {
            paddedNum = paddedNum.padStart(numStr.length, '0');
        }

        return prefix + paddedNum;
    } else {
        return codeStr + "1"; // لو الكود مفيهوش أرقام خالص
    }
};

// 3. دالة الزرار السحري (إضافة وتسكين وتحضير)
window.openQuickAddFromSession = function() {
    const session = classSessions.find(s => s.id === currentActiveSessionId);
    if(!session) return;

    const groupObj = groups.find(g => g.name === session.group);
    if(!groupObj) return;

    const level = groupObj.level;
    const nextCode = window.generateNextCodeForLevel(level); // توليد الكود الخاص بالصف ده بس

    // فتح نافذة الإضافة
    openModal('addStudentModal');

    // تعبئة البيانات أوتوماتيك
    document.getElementById('studentCode').value = nextCode;
    document.getElementById('studentLevel').value = level;
    filterGroupsByLevel('studentLevel', 'studentGroup');
    
    // تأخير بسيط عشان قائمة المجموعات تلحق تحمل
    setTimeout(() => {
        document.getElementById('studentGroup').value = session.group;
    }, 50);

    // التركيز على خانة الاسم عشان تكتب على طول
    document.getElementById('studentName').focus();

    // 🌟 تفعيل التحضير اللحظي بعد الحفظ
    window.pendingAttendanceAfterAction = true;
};



window.sendAiCommand = function(text) {
    document.getElementById("shefo-text-input").value = text;
    sendShefoMessage();
};






// ==========================================
// 🤖 عقل المساعد الذكي المُطور (القائمة الشاملة والألوان)
// ==========================================

// 1. القائمة الرئيسية الشاملة لكل السيستم (بألوان متناسقة)
window.aiMasterMenu = [
    { text: "🏫 المجموعات والحصص", cmd: "مجموعات", color: "#3b82f6" },
    { text: "🎓 سجل الطلاب", cmd: "الطلاب", color: "#10b981" },
    { text: "💰 الخزنة والماليات", cmd: "الخزنة", color: "#f59e0b" },
    { text: "📝 الامتحانات الورقية", cmd: "الامتحانات", color: "#8b5cf6" },
    { text: "💻 منصة الأونلاين", cmd: "المنصة", color: "#ec4899" },
    { text: "📚 الواجبات", cmd: "الواجبات", color: "#0ea5e9" },
    { text: "🏆 لوحة الشرف", cmd: "لوحة الشرف", color: "#eab308" },
    { text: "🚨 تحت الملاحظة (خطر)", cmd: "خطر", color: "#ef4444" },
    { text: "🙋‍♂️ طلبات الانضمام", cmd: "طلبات", color: "#14b8a6" },
    { text: "📢 الإرسال الجماعي", cmd: "ارسال جماعي", color: "#f97316" },
    { text: "📘 إدارة الكتب", cmd: "الكتب", color: "#6366f1" },
    { text: "🛒 متجر الهدايا", cmd: "المتجر", color: "#84cc16" },
    { text: "📊 إحصائيات السنتر", cmd: "احصائيات", color: "#64748b" }
];


// إغلاق القائمة عند النقر في أي مكان خارجها
document.addEventListener('click', function(e) {
    let popup = document.getElementById("ai-dropdown-popup");
    let menuBtn = document.getElementById("ai-menu-btn");
    if (popup && menuBtn && !popup.contains(e.target) && !menuBtn.contains(e.target)) {
        popup.style.display = "none";
    }
});

// رسم العناصر جوه القائمة المنسدلة بأسلوب بروفيشنال
window.renderAiSuggestions = function(suggestionsArray) {
    let container = document.getElementById("ai-dropdown-popup");
    if(!container) return;
    container.innerHTML = "";
    
    if (suggestionsArray.length === 0) {
        container.style.display = "none";
        return;
    }

    suggestionsArray.forEach(sug => {
        let btn = document.createElement("button");
        btn.className = "ai-dropdown-item";
        btn.innerHTML = sug.text;
        
        let defaultColor = "#3b82f6";
        let activeColor = sug.color ? sug.color : defaultColor;
        
        btn.style.borderRight = `4px solid ${activeColor}`;
        btn.style.color = "#0f172a";
        
        btn.onmouseover = function() {
            this.style.background = '#f8fafc';
            this.style.color = activeColor;
        };
        btn.onmouseout = function() {
            this.style.background = 'white';
            this.style.color = '#0f172a';
        };

        btn.onclick = () => {
            container.style.display = "none"; // قفل القائمة بعد الاختيار
            if (sug.cmd.endsWith(" ")) {
                let input = document.getElementById("shefo-text-input");
                input.value = sug.cmd;
                input.focus();
            } else {
                sendAiCommand(sug.cmd);
            }
        };
        container.appendChild(btn);
    });
};

// 🧠 قلب التنفيذ (Auto Executor) المطور الشامل
window.processAiLogic = function(text) {
    let rawText = text.trim(); 
    let query = window.smartArabicNormalize(text); 
    
    let backToMenuSuggestion = [{ text: "🔄 القائمة الرئيسية", cmd: "القائمة", color: "#64748b" }];

    // ==========================================
    // 1️⃣ التنقل الأساسي وإظهار القائمة
    // ==========================================
    if (query === "القائمة" || query.includes("الرئيسية") || query.includes("رجوع")) {
        return { response: "إليك القائمة الشاملة لأدوات السيستم يا مستر 👇", suggestions: window.aiMasterMenu };
    }

    const pagesMap = {
        "الخزنه": "finance", "الخزنة": "finance", "ماليات": "finance",
        "امتحان": "exams", "الامتحانات": "exams",
        "واجب": "homework", "الواجبات": "homework",
        "لوحة الشرف": "leaderboard", "الاوائل": "leaderboard",
        "المنصة": "platform", "اونلاين": "platform",
        "الطلاب": "students", "بحث": "students",
        "احصائيات": "dashboard", "الرئيسية": "dashboard",
        "خطر": "atrisk", "ملاحظة": "atrisk",
        "طلبات": "joinreq", "انضمام": "joinreq",
        "ارسال جماعي": "broadcast", "رسائل": "broadcast",
        "الكتب": "books", "كتب": "books"
    };

    for (const [key, value] of Object.entries(pagesMap)) {
        if (query === key || query.includes(key) && query.length < key.length + 5) { 
            switchPage(value);
            return { response: `تم يا مستر! فتحتلك صفحة <b>${key}</b> 🚀`, suggestions: backToMenuSuggestion };
        }
    }

    if (query === "المتجر" || query.includes("متجر")) {
        switchPage('platform'); setTimeout(() => switchPlatformTab('store'), 100);
        return { response: "فتحتلك متجر السنتر 🛒 وتقدر تدير المنتجات دلوقتي.", suggestions: backToMenuSuggestion };
    }
    if (query === "الاسئلة" || query.includes("منتدى")) {
        switchPage('platform'); setTimeout(() => switchPlatformTab('forum'), 100);
        return { response: "فتحتلك منتدى الأسئلة 💬 لمتابعة استفسارات الطلاب.", suggestions: backToMenuSuggestion };
    }

    // ==========================================
    // 2️⃣ الأوامر التشغيلية المباشرة
    // ==========================================

    // --- أ) إنشاء امتحان أو واجب (مع التقاط الاسم بذكاء) ---
    let isCreateTask = query.includes("انشاء") || query.includes("انشئ") || query.includes("اعمل") || query.includes("عمل") || query.includes("اضف");
    let isTaskType = query.includes("امتحان") || query.includes("واجب");

    if (isCreateTask && isTaskType && !query.includes("اونلاين") && !query.includes("الكتروني")) {
        
        let isExam = query.includes("امتحان");
        let typeName = isExam ? "امتحان" : "واجب";

        let maxScore = 50; 
        let textWithoutScore = rawText;
        
        let scoreMatch = rawText.match(/(?:بدرجة|درجة|درجه|من)\s*(\d+)/);
        if (scoreMatch) {
            maxScore = parseInt(scoreMatch[1]);
            textWithoutScore = rawText.replace(scoreMatch[0], ''); 
        } else {
            let endNumMatch = rawText.match(/\s+(\d+)$/);
            if (endNumMatch) {
                maxScore = parseInt(endNumMatch[1]);
                textWithoutScore = rawText.replace(new RegExp('\\s+' + maxScore + '$'), '');
            }
        }

        let customTitle = null;
        let textForGroupSearch = textWithoutScore;
        let titleMatch = textWithoutScore.match(/(?:باسم|اسمه|موضوع|موضوعها|عن)\s+(.+)/);
        
        if (titleMatch && titleMatch[1]) {
            customTitle = titleMatch[1].split(/(بدرجة|درجة|درجه|من\s*\d+|لمجموعة|لمجموعه|لـ|ل)/)[0].trim();
            textForGroupSearch = textWithoutScore.replace(titleMatch[0], '');
        }
        let finalTitle = customTitle ? customTitle : `${typeName} جديد (عبر أوكتو)`;

        let rawSearchWord = textForGroupSearch.replace(/(انشاء|انشئ|اعمل|عمل|اضف|امتحان|واجب|لمجموعة|لمجموعه|لـ|ل|مجموعة|مجموعه)/g, '').trim();
        let cleanSearchWord = window.smartArabicNormalize(rawSearchWord).replace(/[\s\-\_\.\•\*\+\(\)\[\]]/g, '').replace(/^(ل|لل|ب|ف)/, '');

        if (!cleanSearchWord) return { response: `يرجى تحديد اسم المجموعة! (مثال: اعمل ${typeName} لمجموعة المنوات باسم الدرس الأول بدرجة 20)`, suggestions: [] };

        let exactMatchGroup = groups.find(g => window.smartArabicNormalize(g.name).replace(/[\s\-\_\.\•\*\+\(\)\[\]]/g, '') === cleanSearchWord);
        let matchedGroups = exactMatchGroup ? [exactMatchGroup] : groups.filter(g => {
            let cleanGName = window.smartArabicNormalize(g.name).replace(/[\s\-\_\.\•\*\+\(\)\[\]]/g, '');
            return cleanGName.includes(cleanSearchWord) || cleanSearchWord.includes(cleanGName);
        });

        if (matchedGroups.length === 1) {
            let targetGroupName = matchedGroups[0].name;
            let newId = Date.now().toString() + (isExam ? "_e" : "_h");
            let today = new Date().toISOString().split('T')[0];

            if (isExam) {
                exams.push({ id: newId, group: targetGroupName, name: finalTitle, maxScore: maxScore, date: today, status: "open", grades: {} });
                localStorage.setItem("exams", JSON.stringify(exams));
                switchPage('exams');
                if(typeof renderExamCards === 'function') renderExamCards();
            } else {
                homeworks.push({ id: newId, group: targetGroupName, name: finalTitle, maxScore: maxScore, date: today, status: "open", grades: {} });
                localStorage.setItem("homeworks", JSON.stringify(homeworks));
                switchPage('homework');
                if(typeof renderHwCards === 'function') renderHwCards();
            }

            if(typeof addSystemLog === "function") addSystemLog(`إنشاء تلقائي 🤖`, `قام أوكتو بإنشاء ${typeName} (${finalTitle}) لـ ${targetGroupName} من ${maxScore} درجة`);

            return {
                response: `✅ تم يا مستر! أنشأتلك <b>${typeName}</b> جديد لمجموعة <b>(${targetGroupName})</b> باسم <b>(${finalTitle})</b> بدرجة <b>${maxScore}</b>.<br>فتحتلك الصفحة عشان ترصد فوراً! 🚀`,
                suggestions: backToMenuSuggestion
            };
        } else if (matchedGroups.length > 1) {
             return { response: `لقيت أكتر من مجموعة، تقصد أي واحدة؟`, suggestions: matchedGroups.map(g => ({ text: `📖 ${g.name}`, cmd: `انشاء ${typeName} لمجموعة ${g.name} باسم ${finalTitle} بدرجة ${maxScore}` })) };
        } else {
             return { response: `مش لاقي أي مجموعة بالاسم ده يا مستر. متأكد من الاسم؟ 🤔`, suggestions: backToMenuSuggestion };
        }
    }


    // 🧠 مهارة تحليل الغياب الخطر (3 حصص غياب من أصل آخر 4 حصص) - الجديدة والمحسنة!
    if (query.includes("غايبين 3") || query.includes("3 حصص") || query.includes("اخر 4") || query.includes("غايب") && query.includes("3")) {
        
        // 1. تحديد الصف الدراسي المستهدف من كلامك
        let targetLevel = null;
        if (query.includes("اول") || query.includes("اولى")) targetLevel = "الصف الأول الثانوي";
        else if (query.includes("ثاني") || query.includes("تانيه") || query.includes("ثانية")) targetLevel = "الصف الثاني الثانوي";
        else if (query.includes("ثالث") || query.includes("تالته") || query.includes("ثالثة")) targetLevel = "الصف الثالث الثانوي";

        // 2. فلترة الطلاب بناءً على الصف
        let targetStudents = students;
        if (targetLevel) {
            targetStudents = students.filter(s => s.level === targetLevel);
        }

        let atRiskStudents = [];

        // 3. خوارزمية فحص آخر 4 حصص لكل طالب بناءً على مجموعته
        targetStudents.forEach(st => {
            // جلب حصص مجموعة الطالب فقط وترتيبها من الأحدث للأقدم
            let groupSessions = classSessions
                .filter(s => s.group === st.group)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            // أخذ آخر 4 حصص فقط
            let last4Sessions = groupSessions.slice(0, 4);

            // التأكد أن المجموعة أخذت حصص بالفعل
            if (last4Sessions.length > 0) { 
                let absentCount = 0;
                
                last4Sessions.forEach(session => {
                    let stat = session.attendance[st.code] || session.attendance[st.phone];
                    // إذا لم يكن حاضراً أو متأخراً (أي غائب أو لم يتم رصده من الأساس)
                    if (stat !== 'present' && stat !== 'late') {
                        absentCount++;
                    }
                });

                // 🚨 الشرط: إذا غاب 3 مرات أو أكثر في آخر 4 حصص
                if (absentCount >= 3) {
                    atRiskStudents.push({
                        "كود الطالب": st.code,
                        "اسم الطالب": st.name,
                        "المجموعة": st.group,
                        "رقم الطالب": st.phone && st.phone !== "0" ? st.phone : "غير مسجل",
                        "رقم ولي الأمر": st.parentPhone && st.parentPhone !== "0" ? st.parentPhone : "غير مسجل",
                        "الغياب": absentCount + " من أصل " + last4Sessions.length + " حصص"
                    });
                }
            }
        });

        // 4. استخراج التقرير والرد عليك
        if (atRiskStudents.length > 0) {
            // إنشاء شيت إكسيل نظيف ومحدد
            const ws = XLSX.utils.json_to_sheet(atRiskStudents);
            ws['!cols'] = [{wch: 15}, {wch: 30}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}]; // تظبيط عرض العواميد
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "الطلاب المنذرين");

            let fileNameLevel = targetLevel ? targetLevel.replace(/\s+/g, '_') : "جميع_الصفوف";
            XLSX.writeFile(wb, `تقرير_إنذار_غياب_${fileNameLevel}.xlsx`);

            return { 
                response: `تم يا مستر! 🚨<br>فحصت سجلات <b>${targetLevel ? targetLevel : 'كل الطلاب'}</b>، ولقيت <b>${atRiskStudents.length}</b> طالب غايبين 3 حصص أو أكتر في آخر 4 حصص لمجموعاتهم.<br>نزّلتلك شيت إكسيل نظيف فيه (الكود، الاسم، المجموعة، أرقام التواصل) عشان السكرتارية تتواصل معاهم فوراً! 📊`, 
                suggestions: backToMenuSuggestion 
            };
        } else {
            return { 
                response: `ممتاز يا مستر! 🎉<br>راجعت سجلات <b>${targetLevel ? targetLevel : 'كل الطلاب'}</b> ومفيش أي طالب غاب 3 حصص في آخر 4 حصص. نسبة الحضور ممتازة!`, 
                suggestions: backToMenuSuggestion 
            };
        }
    }
    
    // --- ب) فتح وإنشاء الحصص (مع التقاط موضوع الحصة) ---
    if (query.includes("افتح حصه") || query.includes("عرض حصه") || query.includes("افتح حصة") || query.includes("انشاء حصه") || query.includes("انشاء حصة") || query.includes("عمل حصة")) {
        
        let customTopic = null;
        let textForGroupSearch = rawText;
        let topicMatch = rawText.match(/(?:باسم|اسمه|موضوع|موضوعها|عن)\s+(.+)/);
        
        if (topicMatch && topicMatch[1]) {
            customTopic = topicMatch[1].split(/(لمجموعة|لمجموعه|لـ|ل)/)[0].trim();
            textForGroupSearch = rawText.replace(topicMatch[0], '');
        }
        let finalTopic = customTopic ? customTopic : "حصة جديدة (عبر أوكتو)";

        let rawSearchWord = textForGroupSearch.replace(/(افتح|انشاء|عمل|حصه|حصة|سجل|حضور|عرض|مجموعة|مجموعه|المجموعات|لـ|لمجموعة)/g, '').trim();
        let cleanSearchWord = window.smartArabicNormalize(rawSearchWord).replace(/[\s\-\_\.\•\*\+\(\)\[\]]/g, '').replace(/^(ل|لل|ب|ف)/, ''); 
        
        if (!cleanSearchWord) {
            if (groups.length === 0) return { response: "مفيش أي مجموعات متسجلة في السيستم يا مستر. ضيف مجموعة من صفحة المجموعات الأول.", suggestions: backToMenuSuggestion };
            let allGroupsSuggestions = groups.map(g => ({ text: `📖 ${g.name}`, cmd: `افتح حصة ${g.name}`, color: "#3b82f6" }));
            allGroupsSuggestions.push(...backToMenuSuggestion);
            return { response: "تحب نفتح حصة لأي مجموعة في دول يا مستر؟ (اضغط على المجموعة) 👇", suggestions: allGroupsSuggestions };
        }

        let targetGroupName = null;
        let exactMatchGroup = groups.find(g => window.smartArabicNormalize(g.name).replace(/[\s\-\_\.\•\*\+\(\)\[\]]/g, '') === cleanSearchWord);
        let matchedGroups = exactMatchGroup ? [exactMatchGroup] : groups.filter(g => {
            let cleanGName = window.smartArabicNormalize(g.name).replace(/[\s\-\_\.\•\*\+\(\)\[\]]/g, '');
            return cleanGName.includes(cleanSearchWord) || cleanSearchWord.includes(cleanGName);
        });

        if (matchedGroups.length === 1) {
            targetGroupName = matchedGroups[0].name;
            let activeSession = classSessions.find(s => s.group === targetGroupName && s.status === 'open');
            
            let inSessionSuggestions = [
                { text: "📊 من غاب في الحصة؟", cmd: "من غاب اليوم؟", color: "#ef4444" }, 
                { text: "🔒 قفل الحصة", cmd: "اقفل الحصة", color: "#f59e0b" },
                ...backToMenuSuggestion
            ];

            if (activeSession) {
                switchPage('attendance'); openSessionDetails(activeSession.id); 
                return { response: `✅ فتحتلك كشف الحضور الحالي لمجموعة <b>(${targetGroupName})</b>. وتقدر تقولي (حضر الكود كذا) دلوقتي.`, suggestions: inSessionSuggestions };
            } else {
                let newId = Date.now().toString();
                let today = new Date().toISOString().split('T')[0];
                classSessions.push({ id: newId, group: targetGroupName, date: today, topic: finalTopic, status: "open", attendance: {} });
                localStorage.setItem("classSessions", JSON.stringify(classSessions));
                if(typeof addSystemLog === "function") addSystemLog("إنشاء تلقائي 🤖", `قام أوكتو بفتح حصة جديدة لـ ${targetGroupName} بموضوع ${finalTopic}`);
                switchPage('attendance'); openSessionDetails(newId);
                
                return { response: `✨ مكنش في حصة مفتوحة لـ <b>(${targetGroupName})</b>، فأنشأتلك حصة جديدة بتاريخ اليوم بموضوع <b>(${finalTopic})</b> ودخلتك عليها فوراً! ابدأ الرصد.`, suggestions: inSessionSuggestions };
            }
        } else if (matchedGroups.length > 1) {
            let dynamicSuggestions = matchedGroups.map(g => ({ text: `📖 ${g.name}`, cmd: `افتح حصة ${g.name} موضوع ${finalTopic}`, color: "#3b82f6" }));
            dynamicSuggestions.push(...backToMenuSuggestion);
            return { response: `لقيت أكتر من مجموعة بالاسم ده، تقصد أي واحدة؟ 👇`, suggestions: dynamicSuggestions };
        } else {
            return { response: `مش لاقي أي مجموعة بالاسم ده يا مستر.`, suggestions: backToMenuSuggestion };
        }
    }

    if (query === "مجموعات" || query.includes("الحصص المفتوحة")) {
        let activeSessions = classSessions.filter(s => s.status === 'open');
        if(activeSessions.length === 0) return { response: "مفيش حصص مفتوحة دلوقتي.", suggestions: [{ text: "➕ إنشاء حصة جديدة", cmd: "انشاء حصة", color: "#10b981" }, ...backToMenuSuggestion]};
        
        let dynamicSuggestions = activeSessions.map(s => ({ text: `📖 ${s.group}`, cmd: `افتح حصة ${s.group}`, color: "#3b82f6" }));
        dynamicSuggestions.push(...backToMenuSuggestion);
        return { response: "دي كل الحصص المفتوحة حالياً، تحب تدخل أي واحدة؟ 👇", suggestions: dynamicSuggestions };
    }

    // --- ج) محرك التقارير الذكية ---
    if ((query.includes("تقرير") || query.includes("شيت") || query.includes("كشف") || query.includes("استخرج") || query.includes("هات") || query.includes("عايز")) && !query.includes("ارفع") && !query.includes("استيراد")) {
        
        if (query.includes("كل") || query.includes("صف") || query.includes("اسبوع") || query.includes("شهر") || query.includes("فائت") || query.includes("ماضي") || query.includes("حصه") || query.includes("حصة") || query.includes("امتحانات") || query.includes("واجبات")) {
            
            let rType = 'attendance'; let rTypeName = "الغياب والحضور";
            if (query.includes("امتحان") || query.includes("درجات")) { rType = 'exams'; rTypeName = "الامتحانات"; }
            else if (query.includes("واجب")) { rType = 'homework'; rTypeName = "الواجبات"; }

            let rLevel = null;
            if (query.includes("اولى") || query.includes("الاول") || query.includes("1ث")) rLevel = "الصف الأول الثانوي";
            else if (query.includes("تانيه") || query.includes("الثاني") || query.includes("2ث")) rLevel = "الصف الثاني الثانوي";
            else if (query.includes("تالته") || query.includes("الثالث") || query.includes("3ث")) rLevel = "الصف الثالث الثانوي";

            let today = new Date(); let dFrom = null, dTo = null, dName = "كل الأوقات"; let isLastSessionOnly = false;

            if (query.includes("اخر حصه") || query.includes("اخر حصة") || query.includes("أخر حصة")) {
                isLastSessionOnly = true; dName = "آخر حصة فقط لكل مجموعة";
            } else if (query.includes("اليوم") || query.includes("النهارده")) {
                dFrom = new Date(); dTo = new Date(); dName = "اليوم";
            } else if (query.includes("امبارح") || query.includes("امس")) {
                dFrom = new Date(); dFrom.setDate(today.getDate() - 1); dTo = new Date(dFrom); dName = "الأمس";
            } else if (query.includes("اسبوع") || query.includes("الاسبوع")) {
                if (query.includes("فاءت") || query.includes("فايت") || query.includes("ماضي") || query.includes("فات")) {
                    dTo = new Date(); dTo.setDate(today.getDate() - 7); dFrom = new Date(); dFrom.setDate(today.getDate() - 14); dName = "الأسبوع الفائت";
                } else {
                    dFrom = new Date(); dFrom.setDate(today.getDate() - 7); dTo = new Date(); dName = "هذا الأسبوع";
                }
            } else if (query.includes("شهر") || query.includes("الشهر")) {
                dFrom = new Date(today.getFullYear(), today.getMonth(), 1); dTo = new Date(today.getFullYear(), today.getMonth() + 1, 0); dName = "هذا الشهر";
            }

            let strFrom = dFrom ? dFrom.toISOString().split('T')[0] : null;
            let strTo = dTo ? dTo.toISOString().split('T')[0] : null;

            let sourceDb = rType === 'attendance' ? classSessions : (rType === 'exams' ? exams : homeworks);
            let validGroupsForLevel = rLevel ? groups.filter(g => g.level === rLevel).map(g => g.name) : groups.map(g => g.name);
            let filteredItems = [];

            if (isLastSessionOnly) {
                validGroupsForLevel.forEach(gName => {
                    let groupSessions = sourceDb.filter(s => s.group === gName).sort((a,b) => new Date(b.date) - new Date(a.date));
                    if (groupSessions.length > 0) filteredItems.push(groupSessions[0]);
                });
            } else {
                filteredItems = sourceDb.filter(item => {
                    let matchDate = true;
                    if (strFrom && strTo) matchDate = (item.date >= strFrom && item.date <= strTo);
                    let matchLevel = validGroupsForLevel.includes(item.group);
                    return matchDate && matchLevel;
                });
            }

            if (filteredItems.length === 0) return { response: `⚠️ لم أجد أي بيانات تخص (<b>${rTypeName}</b>) لـ (<b>${rLevel || 'كل الصفوف'}</b>) في فترة (<b>${dName}</b>).`, suggestions: backToMenuSuggestion };

            let excelData = [];
            let targetGroups = [...new Set(filteredItems.map(i => i.group))];
            let targetStudents = students.filter(s => targetGroups.includes(s.group));

            targetStudents.forEach(st => {
                let row = { "الكود": st.code, "اسم الطالب": st.name, "المجموعة": st.group, "رقم الطالب": st.phone, "رقم ولي الأمر": st.parentPhone };
                filteredItems.forEach(item => {
                    let colName = `${item.topic || item.name} (${item.date})`; let val = "---";
                    if (rType === 'attendance') {
                        let stat = item.attendance[st.code] || item.attendance[st.phone];
                        if (stat === 'present') val = "حاضر"; else if (stat === 'late') val = "متأخر"; else if (stat === 'absent') val = "غائب";
                    } else {
                        let g = item.grades[st.code] !== undefined ? item.grades[st.code] : item.grades[st.phone];
                        if (g !== undefined) val = `${g} / ${item.maxScore}`; else val = "لم يُمتحن/يسلم";
                    }
                    row[colName] = val;
                });
                excelData.push(row);
            });

            let ws = XLSX.utils.json_to_sheet(excelData);
            ws['!cols'] = [{wch: 10}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}];
            let wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "التقرير الذكي");
            XLSX.writeFile(wb, `تقرير_${rTypeName}_${rLevel || 'شامل'}_${dName.replace(/\s+/g, '_')}.xlsx`);

            return { response: `تم يا مستر! 🫡<br>جمعتلك تقرير <b>${rTypeName}</b> لـ <b>${rLevel || 'كل الصفوف'}</b> لـ (<b>${dName}</b>).<br>وتم إنشاء ملف الإكسيل 📊 وتحميله على جهازك فوراً!`, suggestions: backToMenuSuggestion };
        }
    }

    // --- د) التحضير المباشر من الشات وتعديل البيانات ---
    if (query.includes("حضر") || query.includes("سجل") || query.includes("تأخير") || query.includes("غياب")) {
        if (!currentActiveSessionId) return { response: "⚠️ إنت مش فاتح كشف حضور أي حصة دلوقتي! افتح الحصة الأول.", suggestions: window.aiMasterMenu };
        let searchTarget = query.replace(/(حضر|حضور|سجل|تأخير|تاخير|غياب|غايب|الطالب|الكود|رقم|لي)/g, '').trim();
        if (!searchTarget) return { response: "يرجى كتابة كود أو اسم الطالب مع الأمر.", suggestions: [] };
        
        let student = findStudentByCodeOrName(searchTarget);
        if (!student) return { response: `مش لاقي أي طالب بالاسم أو الكود "<b>${searchTarget}</b>" يا مستر.`, suggestions: [] };

        const session = classSessions.find(s => s.id === currentActiveSessionId);
        if (student.group !== session.group) return { response: `⚠️ الطالب <b>${student.name}</b> مش في المجموعة الحالية (${session.group}).`, suggestions: [] };

        let status = 'present'; let statusText = 'حاضر ✅';
        if (query.includes("تأخير") || query.includes("تاخير") || query.includes("متاخر")) { status = 'late'; statusText = 'متأخر ⏳'; }
        else if (query.includes("غياب") || query.includes("غايب")) { status = 'absent'; statusText = 'غائب ❌'; }
        else if (query.includes("الغاء") || query.includes("امسح")) { status = 'none'; statusText = 'ملغي ✖'; }

        markAttendance(student.code, status);
        return { response: `تم يا مستر! سجلت الطالب <b>${student.name}</b> (${statusText}) في حصة اليوم. 🫡`, suggestions: [{ text: "📊 من غاب في الحصة؟", cmd: "من غاب اليوم؟", color: "#ef4444" }, ...backToMenuSuggestion] };
    }

    if (query.includes("ايقاف") || query.includes("إيقاف") || query.includes("وقف") || query.includes("تفعيل") || query.includes("فعل") || query.includes("فك")) {
        let isSuspending = query.includes("ايقاف") || query.includes("إيقاف") || query.includes("وقف");
        let searchTarget = query.replace(/(اعمل|ايقاف|إيقاف|وقف|تفعيل|فعل|فك|الطالب|للطالب|الكود|رقم|عن)/g, '').trim();
        if (!searchTarget) return { response: "يرجى كتابة كود أو اسم الطالب مع الأمر.", suggestions: [] };

        let student = findStudentByCodeOrName(searchTarget);
        if (student) {
            student.isSuspended = isSuspending; localStorage.setItem("students", JSON.stringify(students));
            if (typeof renderTable === "function") renderTable();
            if (window.currentStudentProfileCode === student.code) openStudentProfile(student.code); 
            return { response: `تم يا مستر! عملت <b>${isSuspending ? "إيقاف ⛔" : "تفعيل ✅"}</b> للطالب <b>${student.name}</b>.`, suggestions: backToMenuSuggestion };
        }
    }

    if (query.includes("عدل") || query.includes("غير") || query.includes("تعديل") || query.includes("انقل")) {
        let fieldToUpdate = null; let fieldNameAr = "";
        if (query.includes("ولي") || query.includes("ولى") || query.includes("الاب")) { fieldToUpdate = "parentPhone"; fieldNameAr = "رقم ولي الأمر"; }
        else if (query.includes("رقم") || query.includes("تليفون") || query.includes("هاتف")) { fieldToUpdate = "phone"; fieldNameAr = "رقم الطالب"; }
        else if (query.includes("اسم")) { fieldToUpdate = "name"; fieldNameAr = "اسم الطالب"; }
        else if (query.includes("مجموعه") || query.includes("مجموعة") || query.includes("انقل")) { fieldToUpdate = "group"; fieldNameAr = "المجموعة"; }

        if(fieldToUpdate) {
            let parts = rawText.split(/\s(الى|إلى|لـ|يساوي|بـ|يخلي|ل)\s/);
            let newValue = ""; let targetSearchPart = "";

            if (parts.length >= 3) {
                newValue = parts[parts.length - 1].trim(); 
                targetSearchPart = parts[0].trim(); 
            } else {
                let nums = rawText.match(/\d+/g);
                if (nums && nums.length >= 2) { targetSearchPart = nums[0]; newValue = nums[nums.length - 1]; } 
                else return { response: "يرجى كتابة الأمر بوضوح.", suggestions: [] };
            }

            let cleanTarget = targetSearchPart.replace(/(انقل|عدل|غير|تعديل|رقم|ولي|الامر|ولى|الاب|تليفون|هاتف|اسم|مجموعة|مجموعه|الطالب|اللى|كوده|للكود|الكود)/g, '').trim();
            let student = findStudentByCodeOrName(cleanTarget);
            if (!student) { let nums = targetSearchPart.match(/\d+/g); if(nums) student = findStudentByCodeOrName(nums[0]); }

            if (student) {
                student[fieldToUpdate] = newValue; localStorage.setItem("students", JSON.stringify(students));
                if (typeof renderTable === "function") renderTable();
                if (window.currentStudentProfileCode === student.code) openStudentProfile(student.code);
                return { response: `تم يا مستر! عدلت <b>${fieldNameAr}</b> للطالب <b>${student.name}</b> وبقى (<b>${newValue}</b>). 🫡`, suggestions: backToMenuSuggestion };
            }
        }
    }

    if (query.includes("نقط") || query.includes("نقطه") || query.includes("نقاط") || query.includes("نقطة")) {
        let isAdding = query.includes("ضيف") || query.includes("زود") || query.includes("اعطي") || query.includes("اضف");
        let isSubtracting = query.includes("اخصم") || query.includes("نقص") || query.includes("اسحب");

        if (isAdding || isSubtracting) {
            let numMatch = query.match(/\d+/); let points = numMatch ? parseInt(numMatch[0]) : (isAdding ? 5 : -5); 
            if (isSubtracting) points = -Math.abs(points);
            let searchTarget = query.replace(/(ضيف|زود|اعطي|اضف|اخصم|نقص|اسحب|نقط|نقطه|نقاط|نقطة|للطالب|للكود|من|الطالب|الكود|\d+)/g, '').trim();
            let student = findStudentByCodeOrName(searchTarget);

            if (student) {
                student.behaviorPoints = Math.max(0, (student.behaviorPoints || 0) + points); localStorage.setItem("students", JSON.stringify(students));
                if (typeof renderTable === "function") renderTable();
                if (window.currentStudentProfileCode === student.code && document.getElementById("profile-behavior-points")) document.getElementById("profile-behavior-points").innerText = student.behaviorPoints;
                return { response: `تم! إجمالي نقاط <b>${student.name}</b> السلوكية الآن: <b>${student.behaviorPoints}</b>.`, suggestions: backToMenuSuggestion };
            }
        }
    }

    // --- هـ) رفع واستيراد وتحميل الإكسيل ---
    if (query.includes("ارفع") || query.includes("رفع") || query.includes("استيراد") || query.includes("ضيف شيت") || query.includes("تسجيل شيت") || query.includes("شيت حضور")) {
        let targetGroup = groups.find(g => query.includes(window.smartArabicNormalize(g.name)));
        if (query.includes("حضور") || query.includes("حصه") || query.includes("حصة") || query.includes("غياب")) {
            if (targetGroup) {
                 let activeSession = classSessions.find(s => s.group === targetGroup.name && s.status === 'open');
                 if(activeSession) { switchPage('attendance'); openSessionDetails(activeSession.id); setTimeout(() => document.getElementById("importAttendanceExcel").click(), 800); return { response: `جاري التجهيز... 📁 اختر الشيت لتسجيل حضور (${targetGroup.name}).`, suggestions: backToMenuSuggestion }; }
            } else if (currentActiveSessionId && document.getElementById("session-details-view").style.display === "block") {
                setTimeout(() => document.getElementById("importAttendanceExcel").click(), 500); return { response: "اختر شيت الإكسيل لتسجيل الحضور في الحصة الحالية.", suggestions: backToMenuSuggestion };
            }
        } else {
            if (targetGroup) { switchPage('groups'); openGroupDetails(targetGroup.name); setTimeout(() => document.getElementById("importGroupExcelInput").click(), 800); return { response: `اختر الشيت لإضافة الطلاب لمجموعة (${targetGroup.name}).`, suggestions: backToMenuSuggestion }; }
            else { switchPage('students'); setTimeout(() => document.getElementById("importExcelInput").click(), 800); return { response: "اختر الشيت لرفع قائمة الطلاب للنظام بشكل عام.", suggestions: backToMenuSuggestion }; }
        }
    }

    if (query.includes("حمل") || query.includes("تنزيل") || query.includes("نزل") || query.includes("استخراج")) {
        if (query.includes("اكسيل") || query.includes("شيت") || query.includes("غياب")) {
            if (window.aiLastAbsentees && window.aiLastAbsentees.length > 0) {
                exportAiAbsentees(); return { response: "تم استخراج ملف الإكسيل وتحميله على جهازك بنجاح! 📥", suggestions: backToMenuSuggestion };
            }
        }
    }

    if (query.includes("ملف") || query.includes("بيانات") || query.includes("ابحث عن") || query.includes("هات")) {
        let searchTarget = query.replace(/(ملف|بيانات|ابحث|عن|هات|الطالب|الكود)/g, '').trim();
        if (searchTarget) {
            let student = findStudentByCodeOrName(searchTarget);
            if (student) {
                return { response: `لقيت بيانات الطالب!<br>👤 الاسم: <b>${student.name}</b><br>🔢 الكود: <b>${student.code}</b><br>📚 المجموعة: <b>${student.group}</b><br><br><button onclick="openStudentProfile('${student.code}'); closeShefoChat();" style="margin-top:10px; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold; width: 100%;">فتح ملف الطالب التفصيلي 📂</button>`, suggestions: backToMenuSuggestion };
            }
        }
    }


    // ==========================================
    // 3️⃣ الشرح والمساعدة والتفاصيل (الدليل الشامل لأوكتو)
    // ==========================================
    if (query.includes("اشرح") || query.includes("شرح") || query.includes("كيف") || query.includes("ازاي") || query.includes("طريقة") || query.includes("مساعدة") || query.includes("اضيف") || query.includes("اعمل") || query.includes("انشاء") || query.includes("انشئ") || query.includes("بضيف") || query.includes("قدراتك") || query.includes("بتعمل ايه") || query.includes("روبوت") || query.includes("أنت مين") || query.includes("بتعمل اى") || query.includes("بتساعدني") || query.includes("بتساعدنى") || query.includes("وظيفتك")) {
        
        // --- 🐙 الدليل الشامل لوظائف أوكتو ---
        if (query.includes("قدراتك") || query.includes("بتعمل") || query.includes("روبوت") || query.includes("مين") || query.includes("بتساعدني") || query.includes("بتساعدنى") || query.includes("وظيفتك") || query.includes("السيستم") || query.includes("النظام") || query.includes("كل حاجه") || query === "اشرح") {
            return {
                response: `<b>أنا أوكتو AI 🐙، المساعد الذكي الخاص بيك المدمج في نظام القيصر. أنا هنا عشان أوفر عليك وقت ومجهود، وأنفذ أوامرك وأنت في مكانك من غير ما تلف في الشاشات!</b><br><br>
                أقدر أعملك الحاجات دي بكلمة واحدة:<br><br>
                <b>1. إدارة الحصص والتقييمات 📚:</b><br>
                أقدر أفتحلك حصص جديدة أو أكريت امتحانات وواجبات بذكاء.<br>
                (مثال: "افتح حصة للمنوات باسم مراجعة"، "اعمل امتحان لمجموعة المنيل 1ث باسم الدرس الأول من 20").<br><br>
                <b>2. رصد الغياب والحضور 📋:</b><br>
                أقدر أسجل حضور أو غياب للطلاب فوراً وإنت فاتح الحصة.<br>
                (مثال: "حضر الكود 1001"، "سجل محمد أحمد تأخير"، "اعمل الكود 50 غياب").<br><br>
                <b>3. تعديل بيانات الطلاب 👤:</b><br>
                أقدر أغير بيانات أي طالب في ثانية.<br>
                (مثال: "عدل رقم ولي الأمر للكود 1001 لـ 010123456"، "انقل الكود 20 لمجموعة المنوات").<br><br>
                <b>4. التقييم السلوكي ⭐:</b><br>
                أقدر أضيف أو أخصم نقاط من الطلاب.<br>
                (مثال: "ضيف 10 نقط للكود 1001"، "اخصم 5 نقط من محمود").<br><br>
                <b>5. التقارير الذكية والإكسيل 📊:</b><br>
                أقدر أحلل البيانات وأطلعلك شيتات إكسيل جاهزة أوتوماتيك.<br>
                (مثال: "عايز تقرير غياب لكل مجموعات 1ث الأسبوع اللي فات"، "نزل شيت الغياب"، "ارفع شيت طلاب").<br><br>
                <b>6. البحث والإيقاف 🔍:</b><br>
                أقدر أجيبلك ملف أي طالب، أو أوقفه عن السيستم.<br>
                (مثال: "ملف الكود 1001"، "اعمل إيقاف للطالب 120").<br><br>
                <b>7. التنقل السريع 🚀:</b><br>
                أقدر أوديك لأي شاشة في السيستم فوراً.<br>
                (مثال: "افتح الخزنة"، "المنصة"، "الامتحانات").<br><br>
                <b>أؤمرني يا مستر.. عايزني أعملك إيه دلوقتي؟ 🫡</b>`,
                suggestions: window.aiMasterMenu
            };
        }

        // --- أدلة مصغرة ---
        if (query.includes("مجموعة") || query.includes("مجموعه") || query.includes("مجموعات")) {
            return {
                response: `<b>📌 طريقة إضافة وإدارة المجموعات:</b><br><br>1. ادخل على <b>"إدارة المجموعات"</b> من القائمة الجانبية.<br>2. اضغط على زر <b>(+ إضافة مجموعة جديدة)</b>.<br>3. اكتب اسم المجموعة، واختار الصف الدراسي، وحدد نظام الدفع وسعرها.<br>4. اضغط حفظ.`,
                suggestions: [{ text: "📚 افتح المجموعات", cmd: "مجموعات", color: "#3b82f6" }, ...backToMenuSuggestion]
            };
        }

        if (query.includes("طالب") || query.includes("اضافة") || query.includes("اكسيل") || query.includes("شيت")) {
            return {
                response: `<b>📌 طريقة إضافة الطلاب:</b><br><br>عندك 3 طرق:<br>1. <b>يدوي:</b> من صفحة (إدارة الطلاب) اضغط (+ تسجيل طالب).<br>2. <b>شيت إكسيل:</b> حمل النموذج واملاه وارفعه.<br>3. <b>عن طريقي 🤖:</b> قولي (ارفع شيت طلاب) وهفتحلك الكمبيوتر تختار الملف!`,
                suggestions: [{ text: "📥 ارفع شيت طلاب", cmd: "ارفع شيت طلاب", color: "#3b82f6" }, ...backToMenuSuggestion]
            };
        }

        return {
            response: `تحت أمرك يا مستر! عايزني أشرحلك إيه بالظبط في السيستم؟`,
            suggestions: [{ text: "🚀 اشرح قدراتك كاملة", cmd: "اشرح قدراتك", color: "#3b82f6" }, ...backToMenuSuggestion]
        };
    }

    // --- الرد الافتراضي ---
    return {
        response: "أنا جاهز لتنفيذ أوامرك. يمكنك أن تطلب مني إنشاء امتحانات باسم معين (مثال: اعمل امتحان لمجموعة المنيل باسم الدرس الأول بدرجة 20) أو استخراج تقارير ذكية ⚡",
        suggestions: window.aiMasterMenu
    };
};
// 🤖 أداة الروبوت لاستخراج شيت الغياب الفوري
window.exportAiAbsentees = function() {
    if (!window.aiLastAbsentees || window.aiLastAbsentees.length === 0) {
        return showToast("لا يوجد طلاب غائبين لاستخراجهم!", "error");
    }
    let data = window.aiLastAbsentees.map(s => ({ "الكود": s.code, "الاسم": s.name, "تليفون ولي الأمر": s.parentPhone, "المجموعة": s.group }));
    let ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch: 15}, {wch: 30}, {wch: 20}, {wch: 20}]; 
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الغياب");
    XLSX.writeFile(wb, `غياب_الحصة_${new Date().toISOString().split('T')[0]}.xlsx`);
};


window.downloadCurrentSessionReport = function() {
    if (!currentActiveSessionId) {
        showToast("يرجى فتح حصة أولاً!", "error");
        return;
    }

    const session = classSessions.find(s => s.id === currentActiveSessionId);
    if (!session) return;

    const groupStudents = students.filter(s => s.group === session.group);
    if (groupStudents.length === 0) {
        showToast("لا يوجد طلاب في هذه المجموعة", "error");
        return;
    }

    let reportData = [];

    groupStudents.forEach(st => {
        // فحص حالة الطالب في الحصة الحالية
        let stat = session.attendance[st.code] || session.attendance[st.phone];
        let statusText = "غائب (لم يُرصد)"; // الحالة الافتراضية لمن لم يتم رصده

        if (stat === 'present') statusText = "حاضر";
        else if (stat === 'late') statusText = "متأخر";
        else if (stat === 'absent') statusText = "غائب (مسجل غياب يدوي)";

        reportData.push({
            "كود الطالب": st.code,
            "اسم الطالب": st.name,
            "رقم الطالب": st.phone && st.phone !== "0" ? st.phone : "غير مسجل",
            "رقم ولي الأمر": st.parentPhone && st.parentPhone !== "0" ? st.parentPhone : "غير مسجل",
            "الحالة": statusText
        });
    });

    // ترتيب الشيت بحيث يظهر الغائبين في الأعلى لسهولة التواصل معهم
    reportData.sort((a, b) => a["الحالة"].localeCompare(b["الحالة"], 'ar'));

    // إنشاء وتصدير ملف الإكسيل
    const ws = XLSX.utils.json_to_sheet(reportData);
    ws['!cols'] = [{wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 18}]; 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الحصة");

    const dateStr = session.date || new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `تقرير_غياب_وحضور_${session.group}_${dateStr}.xlsx`);

    showToast("تم تحميل تقرير الحصة بنجاح! 📥");
};




// ==========================================
// 🧠 نظام الاقتراحات الذكي للبحث السريع (نفس المجموعة ثم نفس الصف)
// ==========================================
window.setupSmartAutocomplete = function(inputId, mode) {
    let inputEl = document.getElementById(inputId);
    if(!inputEl) return;

    inputEl.setAttribute('autocomplete', 'off'); // قفل اقتراحات المتصفح العادية المزعجة

    let dropdown = document.getElementById(inputId + '-autocomplete');
    if(!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = inputId + '-autocomplete';
        dropdown.className = 'smart-autocomplete-dropdown';
        inputEl.parentNode.style.position = 'relative'; // عشان القايمة تظهر تحته بالظبط
        inputEl.parentNode.appendChild(dropdown);
    }

    inputEl.addEventListener('input', function() {
        let val = this.value.trim();
        if(!val) { dropdown.style.display = 'none'; return; }

        let currentGroup = '';
        let currentLevel = '';
        
        // معرفة إحنا شغالين على أي مجموعة وصف دلوقتي
        if(mode === 'attendance' && currentActiveSessionId) {
            let s = classSessions.find(x => x.id === currentActiveSessionId);
            if(s) currentGroup = s.group;
        } else if (mode === 'exam' && currentActiveExamId) {
            let e = exams.find(x => x.id === currentActiveExamId);
            if(e) currentGroup = e.group;
        } else if (mode === 'hw' && currentActiveHwId) {
            let h = homeworks.find(x => x.id === currentActiveHwId);
            if(h) currentGroup = h.group;
        }

        let groupObj = groups.find(g => g.name === currentGroup);
        if(groupObj) currentLevel = groupObj.level;

        let normalizedVal = window.smartArabicNormalize(val);

        // 1. فلترة الطلاب
        let matches = students.filter(s => {
            if(s.level !== currentLevel) return false; // 🚫 استبعاد صفوف تانية خالص
            
            let dbName = window.smartArabicNormalize(s.name);
            return dbName.includes(normalizedVal) || String(s.code).includes(val) || String(s.phone).includes(val);
        });

        // 2. ترتيب الطلاب: نفس المجموعة تظهر في الأول
        matches.sort((a, b) => {
            let aInGroup = (a.group === currentGroup) ? 0 : 1;
            let bInGroup = (b.group === currentGroup) ? 0 : 1;
            return aInGroup - bInGroup;
        });

        // تحديد أقصى عدد يظهر (10 طلاب عشان الشاشة متزحمش)
        matches = matches.slice(0, 10);

        // 3. عرض النتائج
        if(matches.length > 0) {
            dropdown.innerHTML = matches.map(m => {
                let isSameGroup = m.group === currentGroup;
                // بادج أخضر لو في مجموعته، وأصفر لو مجموعة تانية
                let badge = isSameGroup ? `<span class="badge-same-group">مجموعته ✅</span>` : `<span class="badge-other-group">مجموعة: ${m.group} ⚠️</span>`;
                
                return `<div class="autocomplete-item" onclick="selectSmartStudent('${inputId}', '${m.code}', '${mode}')">
                    <div><strong style="color:var(--primary-color); margin-left:8px;">${m.code}</strong> ${m.name}</div>
                    ${badge}
                </div>`;
            }).join('');
            dropdown.style.display = 'block';
        } else {
            dropdown.innerHTML = `<div style="padding:15px;text-align:center;color:var(--danger-color);font-weight:bold;">لا يوجد طالب بهذا الاسم في هذا الصف.</div>`;
            dropdown.style.display = 'block';
        }
    });

    // إخفاء القايمة لو ضغط بره
    document.addEventListener('click', function(e) {
        if(e.target !== inputEl && e.target !== dropdown && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
};

// الدالة اللي بتشتغل لما تختار طالب من القايمة
window.selectSmartStudent = function(inputId, code, mode) {
    let inputEl = document.getElementById(inputId);
    inputEl.value = code;
    document.getElementById(inputId + '-autocomplete').style.display = 'none';
    
    // تنفيذ الأكشن (التحضير أو الرصد) زي كأنك دوست Enter بالظبط
    if(mode === 'attendance') {
        window.processAttendanceBarcode(code);
    } else if (mode === 'exam' || mode === 'hw') {
        let enterEvent = new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, which: 13 });
        inputEl.dispatchEvent(enterEvent);
    }
};

// تشغيل النظام على الـ 3 مربعات (الحضور، الامتحان، الواجب)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        setupSmartAutocomplete('attendanceBarcode', 'attendance');
        setupSmartAutocomplete('examBarcodeCode', 'exam');
        setupSmartAutocomplete('hwBarcodeCode', 'hw');
    }, 1500);
});




// فتح نافذة النقل وتعبئة المجموعات المتاحة
window.openMoveGroupModal = function(studentIndex) {
    if (studentIndex > -1 && students[studentIndex]) {
        const student = students[studentIndex];
        document.getElementById('moveStIndex').value = studentIndex;
        document.getElementById('moveStName').innerText = student.name;
        document.getElementById('moveStCurrentGroup').innerText = student.group || 'بدون مجموعة';
        
        // تعبئة قائمة المجموعات المتاحة لنفس الصف (ما عدا المجموعة الحالية)
        let groupSelect = document.getElementById('moveStNewGroup');
        groupSelect.innerHTML = "<option value=''>اختر المجموعة الجديدة...</option>";
        
        groups.filter(g => g.level === student.level && g.name !== student.group).forEach(g => {
            groupSelect.innerHTML += `<option value="${g.name}">${g.name}</option>`;
        });
        
        openModal('moveGroupModal');
    }
};

// تنفيذ النقل الفعلي
window.confirmMoveGroup = function() {
    let studentIndex = document.getElementById('moveStIndex').value;
    let newGroup = document.getElementById('moveStNewGroup').value;
    
    if (!newGroup) return showToast("يرجى اختيار المجموعة الجديدة!", "error");
    
    if (studentIndex > -1 && students[studentIndex]) {
        let oldGroup = students[studentIndex].group;
        students[studentIndex].group = newGroup;
        
        localStorage.setItem("students", JSON.stringify(students));
        
        if (typeof addSystemLog === "function") {
            addSystemLog("نقل طالب 🔄", `تم نقل الطالب ${students[studentIndex].name} من مجموعة (${oldGroup}) إلى (${newGroup})`);
        }
        
        showToast(`تم نقل الطالب لـ ${newGroup} بنجاح! ✅`);
        closeModal('moveGroupModal');
        
        // إعادة رسم الجدول الحالي (الطالب سيختفي منه لأنه انتقل)
        if (typeof renderGroupStudentsTable === "function") renderGroupStudentsTable();
        if (typeof renderGroupCards === "function") renderGroupCards();
        if (typeof syncDataToBot === "function") syncDataToBot();
    }
};



// ==========================================
// 🎨 دالة الفحص اللحظي لأرقام الهواتف (ألوان تفاعلية ومنع الحروف)
// ==========================================
window.validatePhoneUI = function(input) {
    // 1. إجبار المستخدم على إدخال أرقام فقط (يمسح أي حرف أو مسافة فوراً)
    input.value = input.value.replace(/[^0-9]/g, '');

    let val = input.value.trim();

    // لو الخانة فاضية نرجعها للونها الطبيعي
    if (val === "") {
        input.classList.remove('input-success', 'input-error');
        return;
    }

    // استثناء: لو كتب 0 (معناها لا يوجد هاتف)، ننور أخضر
    if (val === "0") {
        input.classList.remove('input-error');
        input.classList.add('input-success');
        return;
    }

    // التحقق من الصيغة المصرية (11 رقم تبدأ بـ 010, 011, 012, 015)
    const regex = /^(010|011|012|015)\d{8}$/;

    if (regex.test(val)) {
        // لو الرقم سليم 100% -> نور أخضر
        input.classList.remove('input-error');
        input.classList.add('input-success');
    } else {
        // لو الرقم لسه بيكتب أو غلط (مثلاً 10 أرقام أو بيبدأ بـ 016) -> نور أحمر
        input.classList.remove('input-success');
        input.classList.add('input-error');
    }
};


// ==========================================
// 📊 محرك الإحصائيات التحليلية الذكية للحصص
// ==========================================
window.openSessionAnalytics = function(sessionId) {
    const session = classSessions.find(s => s.id === sessionId);
    if (!session) return;

    // جلب كل حصص هذه المجموعة وترتيبها زمنياً
    const groupSessions = classSessions.filter(s => s.group === session.group).sort((a,b) => new Date(a.date) - new Date(b.date));
    const currentIndex = groupSessions.findIndex(s => s.id === sessionId);
    const prevSession = currentIndex > 0 ? groupSessions[currentIndex - 1] : null;
    const allPrevSessions = groupSessions.slice(0, currentIndex);

    document.getElementById("analyticsModalSubtitle").innerText = `مجموعة: ${session.group} | بتاريخ: ${session.date}`;

    let presentCount = 0, lateCount = 0, absentCount = 0;
    let targetGroupStudentsCount = students.filter(s => s.group === session.group).length;

    let lists = { dropped: [], consecAbsent: [], guests: [], newcomers: [] };

    // دالة مساعدة لمعرفة هل الطالب حضر في حصة معينة أم لا
    const didAttend = (stat) => (stat === 'present' || stat === 'late' || (typeof stat === 'object' && stat.status === 'makeup'));
    const isAbsent = (stat) => (!stat || stat === 'absent' || stat === 'none');

    // الدوران على جميع الطلاب المسجلين لاستخراج البيانات
    students.forEach(st => {
        let currStat = session.attendance[st.code] || session.attendance[st.phone];
        let prevStat = prevSession ? (prevSession.attendance[st.code] || prevSession.attendance[st.phone]) : null;

        // 1. حساب الملخص العام (لطلاب المجموعة الأساسيين فقط)
        if (st.group === session.group) {
            if (currStat === 'present' || (typeof currStat === 'object' && !currStat.isLate)) presentCount++;
            if (currStat === 'late' || (typeof currStat === 'object' && currStat.isLate)) lateCount++;
            if (isAbsent(currStat)) absentCount++;

            let currAttended = didAttend(currStat);
            let prevAttended = prevSession ? didAttend(prevStat) : false;
            let currAbsentBool = isAbsent(currStat);
            let prevAbsentBool = prevSession ? isAbsent(prevStat) : false;

            // 📉 غابوا هذه الحصة وكانوا حاضرين السابقة
            if (prevAttended && currAbsentBool) lists.dropped.push(st);

            // 🚨 غياب متتالي
            if (prevAbsentBool && currAbsentBool && prevSession) lists.consecAbsent.push(st);

            // ✨ طلاب جدد (حضروا اليوم ومفيش ليهم أي حضور سابق في نفس المجموعة)
            if (currAttended && allPrevSessions.length > 0) {
                let attendedBefore = allPrevSessions.some(oldS => didAttend(oldS.attendance[st.code] || oldS.attendance[st.phone]));
                if (!attendedBefore) lists.newcomers.push(st);
            }
        } 
        // 2. حساب الضيوف (طلاب من مجموعة أخرى ولكن حضروا اليوم)
        else {
            if (didAttend(currStat)) {
                lists.guests.push(st);
                presentCount++; // يضافوا للحضور الفعلي للحصة
            }
        }
    });

    // تحديث الأرقام
    document.getElementById("sa-total").innerText = targetGroupStudentsCount;
    document.getElementById("sa-present").innerText = presentCount;
    document.getElementById("sa-late").innerText = lateCount;
    document.getElementById("sa-absent").innerText = absentCount;

    document.getElementById("sa-dropped-count").innerText = lists.dropped.length;
    document.getElementById("sa-consec-count").innerText = lists.consecAbsent.length;
    document.getElementById("sa-guests-count").innerText = lists.guests.length;
    document.getElementById("sa-newcomers-count").innerText = lists.newcomers.length;

    // دالة مساعدة لطباعة الجداول
    const renderTableHtml = (studentArray, emptyMsg) => {
        if (studentArray.length === 0) return `<div style="text-align:center; padding:15px; color:#94a3b8; font-weight:bold;">${emptyMsg}</div>`;
        let rows = studentArray.map(st => `
            <tr>
                <td class="sa-code">${st.code}</td>
                <td style="font-weight:bold;">${st.name}</td>
                <td><a href="https://wa.me/20${(st.parentPhone||"").replace(/^0+/, '')}" target="_blank" style="text-decoration:none; filter: grayscale(100%); transition: 0.3s;" onmouseover="this.style.filter='grayscale(0)'">💬 ولي الأمر</a></td>
            </tr>
        `).join('');
        return `<table class="sa-table">${rows}</table>`;
    };

    // طباعة القوائم
    document.getElementById("sa-dropped-list").innerHTML = renderTableHtml(lists.dropped, "لا يوجد (استقرار تام 🎉)");
    document.getElementById("sa-consec-list").innerHTML = renderTableHtml(lists.consecAbsent, "لا يوجد غياب متتالي الحمدلله");
    document.getElementById("sa-guests-list").innerHTML = renderTableHtml(lists.guests, "لا يوجد ضيوف تعويض");
    document.getElementById("sa-newcomers-list").innerHTML = renderTableHtml(lists.newcomers, "لا يوجد طلاب جدد");

    openModal('sessionAnalyticsModal');
};


// ==========================================
// 📲 إدارة طلبات شحن المحفظة (فودافون كاش / InstaPay) في لوحة التحكم
// ==========================================
window.renderWalletTopupRequests = async function() {
    let tbody = document.getElementById("wallet-requests-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">جاري التحميل... ⏳</td></tr>`;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/wallet_requests.json`);
        let reqs = await res.json() || {};
        let list = Object.values(reqs).filter(r => r !== null).reverse();

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 25px; font-weight: bold;">لا توجد طلبات تحويل حالياً 📭</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(r => {
            let actionHtml = '';
            if (r.status === 'pending') {
                actionHtml = `
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button class="save-btn" style="background: #10b981; width: auto; padding: 6px 14px; margin: 0; font-size: 13px;" onclick="approveWalletTopupRequest('${r.id}')">✅ قبول وشحن</button>
                        <button class="icon-btn danger" style="padding: 6px 12px; font-size: 13px;" onclick="rejectWalletTopupRequest('${r.id}')">❌ رفض</button>
                    </div>`;
            } else if (r.status === 'approved') {
                actionHtml = `<span class="status-badge" style="background: rgba(16,185,129,0.1); color: #10b981;">تم الشحن ✅</span>`;
            } else {
                actionHtml = `<span class="status-badge" style="background: rgba(239,68,68,0.1); color: #ef4444;">مرفوض ❌</span>`;
            }

            return `<tr style="${r.status === 'pending' ? 'background: rgba(245, 158, 11, 0.05);' : ''}">
                <td style="font-size: 12px; color: var(--text-muted); font-weight: bold;">${r.date}</td>
                <td><strong>${r.studentName}</strong> <br><span style="font-size: 12px; color: var(--primary-color);">كود: ${r.studentCode} | ${r.studentGroup}</span></td>
                <td><strong>${r.method}</strong> <br><span style="direction: ltr; font-family: monospace; font-size: 14px; color: #3b82f6;">📞 ${r.senderPhone}</span></td>
                <td><strong style="color: #10b981; font-size: 18px;">${r.amount} ج.م</strong></td>
                <td>
                    <button class="theme-btn" style="padding: 5px 12px; font-size: 12px; border-color: #8b5cf6; color: #8b5cf6;" onclick="viewReceiptImageModal('${r.id}')">🖼️ عرض الإيصال</button>
                </td>
                <td>${actionHtml}</td>
            </tr>`;
        }).join('');

        window.loadedWalletRequests = reqs;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">حدث خطأ في جلب الطلبات!</td></tr>`;
    }
};

window.viewReceiptImageModal = function(reqId) {
    let r = window.loadedWalletRequests ? window.loadedWalletRequests[reqId] : null;
    if (!r || !r.receiptImage) return alert("لا توجد صورة مرفقة!");
    let w = window.open("", "_blank", "width=500,height=700");
    w.document.write(`<body style="margin:0; background:#0f172a; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:sans-serif;">
        <h3 style="margin:15px 0;">إيصال الطالب: ${r.studentName} (${r.amount} ج.م)</h3>
        <img src="${r.receiptImage}" style="max-width:95%; max-height:85vh; border-radius:12px; border:3px solid #10b981;">
    </body>`);
};

window.approveWalletTopupRequest = async function(reqId) {
    let r = window.loadedWalletRequests ? window.loadedWalletRequests[reqId] : null;
    if (!r) return;
    if (!confirm(`تأكيد قبول الإيصال وإضافة مبلغ (${r.amount} ج.م) إلى محفظة الطالب: ${r.studentName}؟`)) return;

    let uid = getSafeUid();
    let stCode = String(r.studentCode).trim();
    let amount = parseFloat(r.amount) || 0;

    try {
        // 1. جلب خزنة الطالب المحمية وإضافة المبلغ إليها
        let vaultRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/student_vault/${stCode}.json`);
        let vault = await vaultRes.json() || {};
        let newBalance = (parseFloat(vault.walletBalance) || 0) + amount;

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/student_vault/${stCode}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletBalance: newBalance, lastUpdated: new Date().toISOString() })
        });

        // 2. تحديث رصيد الطالب في المصفوفة المحلية والسحابية
        let stIdx = students.findIndex(s => s && String(s.code).trim() === stCode);
        if (stIdx > -1) {
            students[stIdx].walletBalance = newBalance;
            localStorage.setItem("students", JSON.stringify(students));
        }

        // 3. تحديث حالة الطلب إلى مقبول
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${uid}/wallet_requests/${reqId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "approved", approvedAt: new Date().toLocaleString('ar-EG') })
        });

        // 4. إرسال إشعار فوري للطالب على منصته
        if (typeof sendPlatformNotification === "function") {
            await sendPlatformNotification(stCode, "تم شحن محفظتك بنجاح! 💰", `تم قبول إيصال التحويل وإضافة ${amount} ج.م إلى محفظتك. رصيدك الحالي: ${newBalance} ج.م.`);
        }

        showToast(`تم شحن ${amount} ج.م للطالب ${r.studentName} بنجاح! 🎉`, "success");
        renderWalletTopupRequests();
    } catch (e) {
        alert("حدث خطأ أثناء اعتماد الشحن!");
    }
};

window.rejectWalletTopupRequest = async function(reqId) {
    if (!confirm("هل أنت متأكد من رفض طلب الشحن هذا؟")) return;
    try {
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${getSafeUid()}/wallet_requests/${reqId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "rejected" })
        });
        showToast("تم رفض الطلب ❌", "warning");
        renderWalletTopupRequests();
    } catch (e) {}
};



// ==========================================
// 📊 نظام التحليل الذكي للحصة + تصدير الإكسيل لكل فئة
// ==========================================
window.currentSessionAnalyticsData = null;

window.openSessionAnalytics = function(sessionId) {
    const session = classSessions.find(s => s.id === sessionId);
    if (!session) return;

    document.getElementById("analyticsModalSubtitle").innerText = `مجموعة: ${session.group} | بتاريخ: ${session.date}`;

    // ترتيب حصص هذه المجموعة زمنياً لمعرفة الحصة السابقة
    const groupSessions = classSessions
        .filter(s => s.group === session.group)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const currentIndex = groupSessions.findIndex(s => s.id === session.id);
    const prevSession = currentIndex > 0 ? groupSessions[currentIndex - 1] : null;
    const earlierSessions = currentIndex > 0 ? groupSessions.slice(0, currentIndex) : [];

    // طلاب المجموعة الأساسيين
    const groupStudents = students.filter(s => s.group === session.group);

    let lists = {
        total: [...groupStudents],
        present: [],
        late: [],
        absent: [],
        dropped: [],    // غابوا وكانوا حاضرين الحصة السابقة
        consec: [],     // غياب حصتين متتاليتين
        guests: [],     // حضور تعويض (ضيوف)
        newcomers: []   // طلاب جدد (أول حضور)
    };

    groupStudents.forEach(st => {
        const att = (session.attendance || {})[st.code] || (session.attendance || {})[st.phone];
        const isMakeup = typeof att === 'object' && att !== null && att.status === 'makeup';
        const isPresent = att === 'present' || (isMakeup && !att.isLate);
        const isLate = att === 'late' || (isMakeup && att.isLate);
        const isAttended = isPresent || isLate;

        if (isPresent) lists.present.push(st);
        else if (isLate) lists.late.push(st);
        else lists.absent.push(st);

        // فحص الحصة السابقة
        if (prevSession) {
            const prevAtt = (prevSession.attendance || {})[st.code] || (prevSession.attendance || {})[st.phone];
            const wasPresentPrev = prevAtt === 'present' || prevAtt === 'late' || (typeof prevAtt === 'object' && prevAtt !== null && prevAtt.status === 'makeup');

            if (!isAttended && wasPresentPrev) {
                lists.dropped.push(st);
            } else if (!isAttended && !wasPresentPrev) {
                lists.consec.push(st);
            }
        }

        // فحص الطلاب الجدد (حضر هذه الحصة ولم يحضر أي حصة سابقة)
        if (isAttended && earlierSessions.length > 0) {
            const attendedBefore = earlierSessions.some(oldSess => {
                const oldAtt = (oldSess.attendance || {})[st.code] || (oldSess.attendance || {})[st.phone];
                return oldAtt === 'present' || oldAtt === 'late' || (typeof oldAtt === 'object' && oldAtt !== null && oldAtt.status === 'makeup');
            });
            if (!attendedBefore) {
                lists.newcomers.push(st);
            }
        }
    });

    // فحص الضيوف (طلاب من خارج المجموعة تم تحضيرهم في هذه الحصة)
    Object.keys(session.attendance || {}).forEach(key => {
        const att = session.attendance[key];
        const isAttended = att === 'present' || att === 'late' || (typeof att === 'object' && att !== null && att.status === 'makeup');
        if (!isAttended) return;

        const st = students.find(s => String(s.code) === String(key) || (s.phone && s.phone !== "0" && String(s.phone) === String(key)));
        if (st && st.group !== session.group) {
            if (!lists.guests.some(g => g.code === st.code)) {
                lists.guests.push(st);
            }
        }
    });

    // حفظ القوائم لاستخدامها عند الضغط على زر تحميل الإكسيل
    window.currentSessionAnalyticsData = {
        session: session,
        lists: lists
    };

    // تحديث الأعداد في الشاشة
    document.getElementById("sa-total").innerText = lists.total.length;
    document.getElementById("sa-present").innerText = lists.present.length;
    document.getElementById("sa-late").innerText = lists.late.length;
    document.getElementById("sa-absent").innerText = lists.absent.length;

    document.getElementById("sa-dropped-count").innerText = lists.dropped.length;
    document.getElementById("sa-consec-count").innerText = lists.consec.length;
    document.getElementById("sa-guests-count").innerText = lists.guests.length;
    document.getElementById("sa-newcomers-count").innerText = lists.newcomers.length;

    // دالة رسم الجدول الداخلي لكل قسم
    const renderMiniList = (arr, emptyMsg) => {
        if (arr.length === 0) {
            return `<div style="text-align:center; padding:20px; color:var(--text-muted); font-weight:bold;">${emptyMsg}</div>`;
        }
        return `<table class="sa-table"><tbody>` + arr.map(st => {
            let pPhone = (st.parentPhone && st.parentPhone !== "0") ? st.parentPhone : st.phone;
            let waLink = (pPhone && pPhone !== "0") 
                ? `<a href="https://wa.me/20${String(pPhone).trim().replace(/^0+/, '')}" target="_blank" style="color:#64748b; text-decoration:none; font-size:12px; font-weight:bold;">💬 ولي الأمر</a>` 
                : `<span style="color:#cbd5e1; font-size:11px;">بدون رقم</span>`;
            return `<tr>
                <td class="sa-code" style="width:20%;">${st.code}</td>
                <td style="font-weight:bold; color:var(--secondary-color);">${st.name}</td>
                <td style="text-align:left; width:28%;">${waLink}</td>
            </tr>`;
        }).join('') + `</tbody></table>`;
    };

    document.getElementById("sa-dropped-list").innerHTML = renderMiniList(lists.dropped, "لا يوجد طلاب في هذه الفئة 🎉");
    document.getElementById("sa-consec-list").innerHTML = renderMiniList(lists.consec, "لا يوجد غياب متتالي 🎉");
    document.getElementById("sa-guests-list").innerHTML = renderMiniList(lists.guests, "لا يوجد طلاب تعويض في هذه الحصة");
    document.getElementById("sa-newcomers-list").innerHTML = renderMiniList(lists.newcomers, "لا يوجد طلاب جدد في هذه الحصة");

    openModal("sessionAnalyticsModal");
};

// 📥 دالة تصدير الإكسيل بالاسم والكود ورقم الطالب ورقم ولي الأمر
window.exportSessionAnalyticsExcel = function(category) {
    if (!window.currentSessionAnalyticsData) {
        return showToast("يرجى فتح إحصائيات الحصة أولاً!", "error");
    }

    const { session, lists } = window.currentSessionAnalyticsData;

    const categoryTitles = {
        total: "إجمالي_المستهدف",
        present: "الحاضرين",
        late: "المتأخرين",
        absent: "الغائبين",
        dropped: "غابوا_بعد_حضور",
        consec: "غياب_متتالي_حصتين",
        guests: "حضور_تعويض_ضيوف",
        newcomers: "طلاب_جدد_أول_حضور"
    };

    // تجهيز بيانات الطلاب بالترتيب المطلوب (الكود، الاسم، رقم الطالب، رقم ولي الأمر، المجموعة)
    const formatStudentRows = (arr, label) => {
        return arr.map((st, idx) => ({
            "م": idx + 1,
            "كود الطالب": st.code || "--",
            "اسم الطالب": st.name || "--",
            "رقم هاتف الطالب": (st.phone && String(st.phone).trim() !== "0") ? st.phone : "غير مسجل",
            "رقم هاتف ولي الأمر": (st.parentPhone && String(st.parentPhone).trim() !== "0") ? st.parentPhone : "غير مسجل",
            "المجموعة الأصلية": st.group || "--",
            "التصنيف": label
        }));
    };

    const wb = XLSX.utils.book_new();
    const colWidths = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 24 }];

    // لو ضغط على "تحميل التقرير الشامل" -> ينشئ ملف إكسيل واحد بداخله شيت مستقل لكل فئة
    if (category === 'all_sheets') {
        let addedSheets = 0;
        Object.keys(categoryTitles).forEach(key => {
            if (lists[key] && lists[key].length > 0) {
                let sheetName = categoryTitles[key].replace(/_/g, ' ').substring(0, 30);
                let ws = XLSX.utils.json_to_sheet(formatStudentRows(lists[key], sheetName));
                ws['!cols'] = colWidths;
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                addedSheets++;
            }
        });

        if (addedSheets === 0) return showToast("لا توجد بيانات لتصديرها في هذه الحصة!", "error");

        let safeGroupName = session.group.replace(/[\\/?*[\]]/g, '');
        XLSX.writeFile(wb, `التقرير_الشامل_${safeGroupName}_${session.date}.xlsx`);
        showToast("تم تحميل ملف الإكسيل الشامل بجميع الأقسام بنجاح! 📥", "success");
        return;
    }

    // لو ضغط على زر إكسيل خاص بقسم واحد محدد
    const targetList = lists[category] || [];
    if (targetList.length === 0) {
        return showToast("لا يوجد طلاب في هذا القسم لتحميلهم!", "warning");
    }

    const titleAr = categoryTitles[category] || "تقرير";
    const ws = XLSX.utils.json_to_sheet(formatStudentRows(targetList, titleAr.replace(/_/g, ' ')));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, titleAr.substring(0, 30));
    let safeGroupName = session.group.replace(/[\\/?*[\]]/g, '');
    XLSX.writeFile(wb, `${titleAr}_${safeGroupName}_${session.date}.xlsx`);
    showToast(`تم تحميل شيت (${titleAr.replace(/_/g, ' ')}) بنجاح! 📥`, "success");
};

// داخل script.js المرفوع على GitHub
window.launchLocalTerminalServer = async function() {
    window.switchWaServerMode('local');
    try {
        // محاولة الاتصال بالسيرفر المحلي أولاً
        let res = await fetch("http://localhost:3000/status?clientId=AlQaisar_System");
        if (res.ok) {
            showToast("السيرفر المحلي يعمل بالفعل ومتصل! ✅", "success");
            checkWaServerStatusNow();
            return;
        }
    } catch (e) {
        // إذا كان متوقفاً، يرسل إشارة التشغيل عبر البروتوكول المسجل
        let launcherLink = document.createElement('a');
        launcherLink.href = "historia-wa://start";
        document.body.appendChild(launcherLink);
        launcherLink.click();
        document.body.removeChild(launcherLink);
        
        showToast("تم إرسال أمر التشغيل لمحرك الواتساب المحلي ⚡", "info");
        setTimeout(checkWaServerStatusNow, 3500);
    }
};

// دالة حفظ ونشر الكورس الجديد
window.saveLecture = async function() {
    let title = document.getElementById("lecTitle").value.trim();
    let level = document.getElementById("lecLevel").value;
    let track = document.getElementById("lecTrack").value;
    let visibility = document.getElementById("lecVisibility").value;
    let maxViews = parseInt(document.getElementById("lecMaxViews").value) || 0;
    let desc = document.getElementById("lecDesc").value.trim();
    
    // التأكد من إدخال العنوان
    if (!title) {
        if(typeof showToast === 'function') showToast("يرجى كتابة عنوان الكورس!", "error");
        else alert("يرجى كتابة عنوان الكورس!");
        return;
    }

    let videos = [];
    // ابحث عن صفوف الفيديوهات حسب النافذة (جديد أو تعديل)
    let videoRows = document.querySelectorAll(document.getElementById("courseVideosContainer") ? "#courseVideosContainer .video-row" : "#editCourseVideosContainer .video-row-edit");
    
    videoRows.forEach(row => {
        let vTitle = row.querySelector(".vid-title").value.trim();
        let vUrl = row.querySelector(".vid-url").value.trim();
        let vPdf = row.querySelector(".vid-pdf") ? row.querySelector(".vid-pdf").value.trim() : ""; // 👈 هذا السطر هو الحل الجذري
        let vType = row.querySelector(".vid-type").value;
        let vPrice = parseFloat(row.querySelector(".vid-price").value) || 0;
        let vExam = row.querySelector(".vid-exam").value;
        
        let linkedSessions = [];
        row.querySelectorAll(".vid-session-cb:checked").forEach(cb => linkedSessions.push(cb.value));

        if (vTitle && vUrl) {
            videos.push({
                title: vTitle,
                url: vUrl,
                pdfUrl: vPdf, // 👈 يتم الآن إرسال رابط الملزمة لقاعدة البيانات بنجاح
                type: vType,
                price: vPrice,
                requiredExam: vExam,
                linkedSessions: linkedSessions
            });
        }
    });

    if (videos.length === 0) {
        if(typeof showToast === 'function') showToast("يرجى إضافة فيديو واحد على الأقل!", "error");
        else alert("يرجى إضافة فيديو واحد على الأقل!");
        return;
    }

    let btn = document.querySelector('button[onclick="saveLecture()"]');
    let origText = btn.innerText;
    btn.innerText = "جاري النشر... ⏳";
    btn.disabled = true;

    try {
        let imageBase64 = "";
        let fileInput = document.getElementById("lecImageFile");
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            imageBase64 = await window.readFileAsBase64("lecImageFile");
        }

        let newLecture = {
            id: "lec_" + Date.now(),
            title: title,
            level: level,
            track: track,
            isHidden: visibility === "hidden",
            maxViews: maxViews,
            desc: desc,
            image: imageBase64 || "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop",
            videos: videos,
            date: new Date().toISOString()
        };

        // رفع الكورس لقاعدة البيانات
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/lectures/${newLecture.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLecture)
        });

        if(typeof showToast === 'function') showToast("تم نشر الكورس بنجاح! 🚀", "success");
        else alert("تم نشر الكورس بنجاح!");
        
        // تفريغ الخانات بعد النشر
        document.getElementById("lecTitle").value = "";
        document.getElementById("lecDesc").value = "";
        document.getElementById("lecMaxViews").value = "";
        if(fileInput) fileInput.value = "";
        document.getElementById("courseVideosContainer").innerHTML = "";
        window.addCourseVideoRow(); // إضافة صف فارغ جديد

        // تحديث قائمة الكورسات المعروضة
        if (typeof window.renderLectures === 'function') window.renderLectures();
    } catch(e) {
        console.error(e);
        alert("حدث خطأ أثناء الاتصال بالإنترنت!");
    } finally {
        btn.innerText = origText;
        btn.disabled = false;
    }
};


// دالة حفظ التعديلات على كورس موجود
window.saveEditedCourse = async function() {
    let id = document.getElementById("editLecId").value;
    if (!id) return alert("خطأ: لم يتم العثور على الكورس!");

    let title = document.getElementById("editLecTitle").value.trim();
    let level = document.getElementById("editLecLevel").value;
    let track = document.getElementById("editLecTrack").value;
    let visibility = document.getElementById("editLecVisibility").value;
    let maxViews = parseInt(document.getElementById("editLecMaxViews").value) || 0;
    let desc = document.getElementById("editLecDesc").value.trim();

    if (!title) {
        if(typeof showToast === 'function') showToast("يرجى كتابة عنوان الكورس!", "error");
        return;
    }

    let videos = [];
    let videoRows = document.querySelectorAll("#editCourseVideosContainer .video-row-edit");
    videoRows.forEach(row => {
        let vTitle = row.querySelector(".vid-title").value.trim();
        let vUrl = row.querySelector(".vid-url").value.trim();
        let vPdf = row.querySelector(".vid-pdf").value.trim();
        let vType = row.querySelector(".vid-type").value;
        let vPrice = parseFloat(row.querySelector(".vid-price").value) || 0;
        let vExam = row.querySelector(".vid-exam").value;
        
        let linkedSessions = [];
        row.querySelectorAll(".vid-session-cb:checked").forEach(cb => linkedSessions.push(cb.value));

        if (vTitle && vUrl) {
            videos.push({
                title: vTitle,
                url: vUrl,
                pdfUrl: vPdf,
                type: vType,
                price: vPrice,
                requiredExam: vExam,
                linkedSessions: linkedSessions
            });
        }
    });

    let btn = document.querySelector('button[onclick="saveEditedCourse()"]');
    let origText = btn.innerText;
    btn.innerText = "جاري الحفظ... ⏳";
    btn.disabled = true;

    try {
        let imageBase64 = document.getElementById("editLecImageBase64").value;
        let fileInput = document.getElementById("editLecImageFile");
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            imageBase64 = await window.readFileAsBase64("editLecImageFile");
        }

        let updatedLecture = {
            id: id,
            title: title,
            level: level,
            track: track,
            isHidden: visibility === "hidden",
            maxViews: maxViews,
            desc: desc,
            image: imageBase64 || "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop",
            videos: videos
        };

        // تحديث الكورس في قاعدة البيانات
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${window.getSafeUid()}/lectures/${id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedLecture)
        });

        if(typeof showToast === 'function') showToast("تم حفظ التعديلات بنجاح! 💾", "success");
        closeModal('editCourseModal');
        
        if (typeof window.renderLectures === 'function') window.renderLectures();
    } catch(e) {
        console.error(e);
        alert("حدث خطأ أثناء حفظ التعديلات!");
    } finally {
        btn.innerText = origText;
        btn.disabled = false;
    }
};

// دالة تشفير ورفع الصور للامتحانات بذكاء
window.encodeExamImage = function(input, qIndex, optIndex = null) {
    if (input.files && input.files[0]) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let base64 = e.target.result;
            if (optIndex === null) {
                // حفظ صورة السؤال الرئيسي
                currentQuestions[qIndex].imageUrl = base64;
            } else {
                // حفظ صورة الاختيار
                let currentOpt = currentQuestions[qIndex].options[optIndex];
                let optText = typeof currentOpt === 'object' ? currentOpt.text : currentOpt;
                currentQuestions[qIndex].options[optIndex] = { text: optText, image: base64 };
            }
            // تغيير شكل الزر ليدل على النجاح
            let label = input.parentElement;
            label.style.background = '#d1fae5';
            label.style.borderColor = '#10b981';
            label.style.color = '#047857';
            label.innerHTML = '✅ تم الرفع';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// تحديث نص الاختيار دون مسح الصورة (إن وجدت)
window.updateOption = function(qIndex, optIndex, value) { 
    let currentOpt = currentQuestions[qIndex].options[optIndex];
    if (typeof currentOpt === 'object') {
        currentQuestions[qIndex].options[optIndex].text = value;
    } else {
        currentQuestions[qIndex].options[optIndex] = value;
    }
};


// =========================================================
// 🏆 1. محرك المستويات والمهمات لكارت الطلاب (Student Quest Engine V2)
// =========================================================
const STUDENT_QUEST_MILESTONES = [
    { target: 100,  level: 1, title: "🌱 البداية القوية (كتيبة المئة)", color: "linear-gradient(135deg, #10b981, #047857)" },
    { target: 200,  level: 2, title: "⚡ التمدد السريع (200 بطل)", color: "linear-gradient(135deg, #3b82f6, #1d4ed8)" },
    { target: 500,  level: 3, title: "🔥 جيش النصف ألف", color: "linear-gradient(135deg, #f59e0b, #b45309)" },
    { target: 1000, level: 4, title: "👑 إمبراطورية الألف طالب", color: "linear-gradient(135deg, #8b5cf6, #5b21b6)" },
    { target: 2000, level: 5, title: "💎 أسطورة الـ 2000 (القيصر VIP)", color: "linear-gradient(135deg, #ec4899, #be185d)" },
    { target: 5000, level: 6, title: "🌍 القمة التاريخ والجغرافياية الكبرى", color: "linear-gradient(135deg, #ef4444, #b91c1c)" }
];

window.updateStudentQuestCard = function() {
    const count = Array.isArray(students) ? students.length : 0;
    const totalEl = document.getElementById("total-students");
    if (totalEl) totalEl.innerText = count;

    // تحديد المستوى الحالي
    let currentQuest = STUDENT_QUEST_MILESTONES.find(m => count < m.target);
    let isMaxed = false;

    if (!currentQuest) {
        currentQuest = { target: 10000, level: "MAX", title: "🚀 الأسطورة الحية", color: "linear-gradient(135deg, #0f172a, #000000)" };
        isMaxed = true;
    }

    let prevIndex = STUDENT_QUEST_MILESTONES.indexOf(currentQuest) - 1;
    let prevTarget = prevIndex >= 0 ? STUDENT_QUEST_MILESTONES[prevIndex].target : 0;
    
    // حساب النسبة (من بداية المستوى الحالي لحد الهدف القادم) عشان الشريط يفضل يتحرك صح
    let range = currentQuest.target - prevTarget;
    let progress = count - prevTarget;
    let pct = isMaxed ? 100 : Math.min(100, Math.round((progress / range) * 100));
    let remaining = Math.max(0, currentQuest.target - count);

    // تطبيق الألوان والنصوص
    let card = document.getElementById("quest-hero-card");
    if (card) card.style.background = currentQuest.color;

    if (document.getElementById("quest-level-badge")) document.getElementById("quest-level-badge").innerText = `⭐ المستوى ${currentQuest.level}`;
    if (document.getElementById("quest-rank-title")) document.getElementById("quest-rank-title").innerText = currentQuest.title;
    if (document.getElementById("quest-next-target")) document.getElementById("quest-next-target").innerText = isMaxed ? "∞" : currentQuest.target;
    if (document.getElementById("quest-percentage-badge")) document.getElementById("quest-percentage-badge").innerText = `${pct}%`;
    if (document.getElementById("quest-progress-bar")) document.getElementById("quest-progress-bar").style.width = `${pct}%`;
    
    if (document.getElementById("quest-remaining-text")) {
        document.getElementById("quest-remaining-text").innerHTML = isMaxed
            ? `🎉 لقد حطمت جميع الأرقام القياسية! أنت الآن أسطورة.`
            : `🔥 متبقي <strong>${remaining}</strong> طالب لفتح المستوى القادم!`;
    }

    // رسم كبسولات المحطات
    const pillsBox = document.getElementById("quest-milestones-pills");
    if (pillsBox) {
        pillsBox.innerHTML = [100, 200, 500, 1000, 2000].map(m => {
            let achieved = count >= m;
            let isCurrent = currentQuest.target === m;
            let bg = achieved ? "rgba(255,255,255,0.9)" : (isCurrent ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)");
            let border = isCurrent ? "1px solid #fff" : "1px solid transparent";
            let color = achieved ? "#000" : "#fff";
            return `<span style="background:${bg}; color:${color}; border:${border}; padding:2px 8px; border-radius:20px; font-size:10.5px; font-weight:900;">${achieved ? '✓ ' : ''}${m}</span>`;
        }).join('');
    }
};

// ربط تحديث كارت المهمة مع رسم الداشبورد والجدول
const origRenderChartsForQuest = window.renderDashboardCharts;
window.renderDashboardCharts = function() {
    if (origRenderChartsForQuest) origRenderChartsForQuest();
    window.updateStudentQuestCard();
};

const origRenderTableForQuest = window.renderTable;
window.renderTable = function() {
    if (origRenderTableForQuest) origRenderTableForQuest();
    window.updateStudentQuestCard();
};


// =========================================================
// 📈 2. محرك صفحة الإحصائيات الشاملة (يدعم فلتر الوقت والتاريخ والجغرافيا)
// =========================================================
window.anGroupsChartInst = null;
window.anLevelsChartInst = null;

// دالة مساعدة لمعرفة هل التاريخ والجغرافيا يقع ضمن الفترة المطلوبة
window.isDateInRange = function(dateStr, timeFilter) {
    if (!dateStr || timeFilter === "all") return true;
    
    let targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return true; // لو التاريخ والجغرافيا مش مظبوط كمل عادي

    let now = new Date();
    now.setHours(23, 59, 59, 999); // تصفير الساعات لنهاية اليوم للمقارنة
    
    let diffDays = (now - targetDate) / (1000 * 60 * 60 * 24);

    if (timeFilter === "today") return diffDays <= 1;
    if (timeFilter === "week") return diffDays <= 7;
    if (timeFilter === "month") return targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear();
    if (timeFilter === "3months") return diffDays <= 90;
    
    return true;
};

window.renderMasterAnalytics = function() {
    const levelFilter = document.getElementById("masterAnalyticsLevelFilter")?.value || "all";
    const timeFilter = document.getElementById("masterAnalyticsTimeFilter")?.value || "all";

    // ضمان أن كل المصفوفات موجودة قبل الفلترة
    let allSt = Array.isArray(students) ? students : [];
    let allGrps = Array.isArray(groups) ? groups : [];
    let allSess = Array.isArray(classSessions) ? classSessions : [];
    let allExs = Array.isArray(exams) ? exams : [];
    let allHws = Array.isArray(homeworks) ? homeworks : [];
    let allBks = Array.isArray(books) ? books : [];
    let allFin = financeRecords || {};

    // 1. فلترة البيانات
    const filteredStudents = allSt.filter(s => {
        let matchLevel = levelFilter === "all" || (s.level && s.level.includes(levelFilter));
        let matchTime = isDateInRange(s.timestamp || s.date, timeFilter); // لو متسجلوش بتاريخ نعتبرهم متاحين
        return matchLevel && matchTime;
    });

    const filteredGroups = allGrps.filter(g => levelFilter === "all" || (g.level && g.level.includes(levelFilter)));
    const filteredGroupNames = new Set(filteredGroups.map(g => g.name));
    
    const filteredSessions = allSess.filter(s => {
        let matchGroup = levelFilter === "all" || filteredGroupNames.has(s.group);
        let matchTime = isDateInRange(s.date, timeFilter);
        return matchGroup && matchTime;
    });

    const filteredExams = allExs.filter(e => {
        let matchGroup = levelFilter === "all" || filteredGroupNames.has(e.group);
        let matchTime = isDateInRange(e.date, timeFilter);
        return matchGroup && matchTime;
    });

    const filteredHws = allHws.filter(h => {
        let matchGroup = levelFilter === "all" || filteredGroupNames.has(h.group);
        let matchTime = isDateInRange(h.date, timeFilter);
        return matchGroup && matchTime;
    });

    // 2. إحصائيات الطلاب
    let onlineCount = 0, centerCount = 0, males = 0, females = 0, specialCases = 0, suspendedCount = 0;

    filteredStudents.forEach(s => {
        if (String(s.code).startsWith("O-") || String(s.code).startsWith("GUEST-") || (s.group && s.group.includes("أونلاين"))) onlineCount++;
        else centerCount++;

        if (s.gender === "أنثى") females++; else males++;
        if (s.isSpecialCase) specialCases++;
        if (s.isSuspended) suspendedCount++;
    });

    let timeText = timeFilter === 'today' ? 'اليوم' : timeFilter === 'week' ? 'آخر أسبوع' : timeFilter === 'month' ? 'هذا الشهر' : timeFilter === '3months' ? 'آخر 3 شهور' : 'الإجمالي';

    if(document.getElementById("an-total-students")) document.getElementById("an-total-students").innerText = filteredStudents.length;
    if(document.getElementById("an-new-students-month")) document.getElementById("an-new-students-month").innerText = `(${timeText})`;
    if(document.getElementById("an-center-vs-online")) document.getElementById("an-center-vs-online").innerText = `${centerCount} سنتر / ${onlineCount} أونلاين`;
    if(document.getElementById("an-gender-breakdown")) document.getElementById("an-gender-breakdown").innerText = `ذكور: ${males} | إناث: ${females} | إعفاء: ${specialCases}`;
    if(document.getElementById("an-suspended-count")) document.getElementById("an-suspended-count").innerText = `${suspendedCount} موقوف`;

    // 3. الحضور والغياب (بناءً على الحصص المفلترة)
    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalMakeup = 0;
    let studentAbsentMap = {};
    let studentLateMap = {};

    filteredSessions.forEach(sess => {
        const att = sess.attendance || {};
        Object.keys(att).forEach(key => {
            const val = att[key];
            if (val === 'present') {
                totalPresent++;
            } else if (val === 'late') {
                totalLate++;
                studentLateMap[key] = (studentLateMap[key] || 0) + 1;
            } else if (val === 'absent') {
                totalAbsent++;
                studentAbsentMap[key] = (studentAbsentMap[key] || 0) + 1;
            } else if (typeof val === 'object' && val !== null && val.status === 'makeup') {
                totalMakeup++;
                if (val.isLate) {
                    totalLate++;
                    studentLateMap[key] = (studentLateMap[key] || 0) + 1;
                } else {
                    totalPresent++;
                }
            }
        });
    });

    const totalAttRecords = totalPresent + totalLate + totalAbsent;
    const attRate = totalAttRecords > 0 ? Math.round(((totalPresent + totalLate) / totalAttRecords) * 100) : 0;
    const absRate = totalAttRecords > 0 ? Math.round((totalAbsent / totalAttRecords) * 100) : 0;

    if(document.getElementById("an-attendance-rate")) document.getElementById("an-attendance-rate").innerText = `${attRate}%`;
    if(document.getElementById("an-sessions-count")) document.getElementById("an-sessions-count").innerText = `في ${filteredSessions.length} حصة (${totalPresent + totalLate} حضور)`;
    if(document.getElementById("an-absence-count")) document.getElementById("an-absence-count").innerText = totalAbsent;
    if(document.getElementById("an-absent-rate")) document.getElementById("an-absent-rate").innerText = `${absRate}% نسبة الغياب`;
    if(document.getElementById("an-late-count")) document.getElementById("an-late-count").innerText = totalLate;
    if(document.getElementById("an-makeup-count")) document.getElementById("an-makeup-count").innerText = `حالات تأخير | ${totalMakeup} تعويض 🔄`;

    // 4. الماليات والكتب (مربوطة بفترة الفلتر)
    let totalIncome = 0, totalExtraExp = 0;
    let sessionIncomeMap = {};

    filteredSessions.forEach(sess => {
        const recKey = `fin_session_${sess.id}`;
        const rec = allFin[recKey] || {};
        const grpObj = allGrps.find(g => g.name === sess.group) || {};
        const defaultPrice = parseFloat(grpObj.price) || 0;
        let sessInc = 0;

        Object.keys(rec).forEach(stCode => {
            const payment = rec[stCode];
            if (payment && payment.status === 'paid') sessInc += parseFloat(payment.amount) || 0;
            else if (payment === 'paid') sessInc += defaultPrice; 
        });
        sessionIncomeMap[sess.group] = (sessionIncomeMap[sess.group] || 0) + sessInc;
        totalIncome += sessInc;
    });

    const validSessionIds = new Set(filteredSessions.map(s => s.id));
    if(Array.isArray(expenses)) {
        expenses.forEach(ex => {
            if (validSessionIds.has(ex.sessionId)) {
                totalExtraExp += parseFloat(ex.amount) || 0;
            }
        });
    }

    const netProfit = totalIncome - totalExtraExp;
    if (document.getElementById("an-net-profit")) {
        document.getElementById("an-net-profit").innerText = `${netProfit.toLocaleString()} ج`;
        document.getElementById("an-income-vs-exp").innerText = `إيراد: ${totalIncome.toLocaleString()} | مصاريف: ${totalExtraExp.toLocaleString()}`;
    }

    let booksReceived = 0, booksRemaining = 0;
    allBks.filter(b => isDateInRange(b.date || b.id, timeFilter)).forEach(b => {
        let comm = b.commissionType === 'percentage' ? (b.price * b.commissionValue / 100) : b.commissionValue;
        let expected = (b.price - comm) * b.quantity;
        let rec = parseFloat(b.receivedAmount) || 0;
        booksReceived += rec;
        booksRemaining += (expected - rec);
    });
    if (document.getElementById("an-books-received")) {
        document.getElementById("an-books-received").innerText = `${booksReceived.toLocaleString()} ج`;
        document.getElementById("an-books-remaining").innerText = `متبقي: ${booksRemaining.toLocaleString()} ج`;
    }

    // 5. الامتحانات والواجبات المفلترة
    let sumExamPct = 0, examEntries = 0;
    filteredExams.forEach(ex => {
        const max = parseFloat(ex.maxScore) || 100;
        Object.values(ex.grades || {}).forEach(g => {
            if (!isNaN(parseFloat(g)) && max > 0) {
                sumExamPct += (parseFloat(g) / max) * 100;
                examEntries++;
            }
        });
    });
    const overallExamAvg = examEntries > 0 ? Math.round(sumExamPct / examEntries) : 0;
    const allOnlineExamsList = window.fetchedOnlineExams || JSON.parse(localStorage.getItem("onlineExams")) || [];
    const filteredOnlineExams = allOnlineExamsList.filter(e => isDateInRange(e.date, timeFilter));
    
    if(document.getElementById("an-exams-avg")) document.getElementById("an-exams-avg").innerText = `${overallExamAvg}%`;
    if(document.getElementById("an-exams-hw-count")) document.getElementById("an-exams-hw-count").innerText = `${filteredExams.length + filteredOnlineExams.length} امتحان | ${filteredHws.length} واجب`;

    // 6. قوائم الـ Top 8
    const resolveStudent = (key) => allSt.find(s => String(s.code) === String(key) || (s.phone !== "0" && String(s.phone) === String(key)));

    const topAbsentArr = Object.entries(studentAbsentMap).map(([k, count]) => ({ st: resolveStudent(k), count })).filter(item => item.st).sort((a, b) => b.count - a.count).slice(0, 8);
    let absTbody = document.getElementById("an-top-absent-list");
    if(absTbody) {
        absTbody.innerHTML = topAbsentArr.length === 0
            ? `<div style="text-align:center; padding:30px; color:var(--text-muted); font-weight:bold;">🎉 لا توجد حالات غياب!</div>`
            : topAbsentArr.map(item => `<div class="mini-rank-item" onclick="openStudentProfile('${item.st.code}')" style="cursor:pointer;"><div><strong style="color:var(--primary-color);">${item.st.code}</strong> - ${item.st.name}<div style="font-size:11px; color:var(--text-muted);">${item.st.group}</div></div><span class="stat-pill" style="background:#fee2e2; color:#b91c1c;">غاب ${item.count} ❌</span></div>`).join('');
    }

    const topLateArr = Object.entries(studentLateMap).map(([k, count]) => ({ st: resolveStudent(k), count })).filter(item => item.st).sort((a, b) => b.count - a.count).slice(0, 8);
    let lateTbody = document.getElementById("an-top-late-list");
    if(lateTbody) {
        lateTbody.innerHTML = topLateArr.length === 0
            ? `<div style="text-align:center; padding:30px; color:var(--text-muted); font-weight:bold;">✨ الجميع ملتزمون!</div>`
            : topLateArr.map(item => `<div class="mini-rank-item" onclick="openStudentProfile('${item.st.code}')" style="cursor:pointer;"><div><strong style="color:var(--primary-color);">${item.st.code}</strong> - ${item.st.name}<div style="font-size:11px; color:var(--text-muted);">${item.st.group}</div></div><span class="stat-pill" style="background:#fef3c7; color:#b45309;">تأخر ${item.count} ⏳</span></div>`).join('');
    }

    const newestArr = [...filteredStudents].slice(-8).reverse();
    let newTbody = document.getElementById("an-newest-students-list");
    if(newTbody) {
        newTbody.innerHTML = newestArr.length === 0
            ? `<div style="text-align:center; padding:30px; color:var(--text-muted); font-weight:bold;">لا يوجد طلاب.</div>`
            : newestArr.map(st => `<div class="mini-rank-item" onclick="openStudentProfile('${st.code}')" style="cursor:pointer;"><div><strong style="color:#10b981;">${st.code}</strong> - ${st.name}<div style="font-size:11px; color:var(--text-muted);">${st.group}</div></div><span class="stat-pill" style="background:#d1fae5; color:#047857;">جديد ✨</span></div>`).join('');
    }

    // 7. جدول ورسوم المجموعات (Charts)
    const tbody = document.getElementById("an-groups-Comparison-tbody");
    if(tbody) {
        tbody.innerHTML = "";
        let chartLabels = [], chartPresent = [], chartAbsent = [], chartLate = [];

        filteredGroups.forEach(grp => {
            const gStudentsCount = filteredStudents.filter(s => s.group === grp.name).length;
            const gSessions = filteredSessions.filter(s => s.group === grp.name);
            const gExams = filteredExams.filter(e => e.group === grp.name);

            let gPres = 0, gAbs = 0, gLate = 0;
            gSessions.forEach(sess => {
                Object.values(sess.attendance || {}).forEach(v => {
                    if (v === 'present' || (typeof v === 'object' && v?.status === 'makeup' && !v?.isLate)) gPres++;
                    else if (v === 'late' || (typeof v === 'object' && v?.isLate)) gLate++;
                    else if (v === 'absent') gAbs++;
                });
            });

            let gTotalAtt = gPres + gLate + gAbs;
            let gRate = gTotalAtt > 0 ? Math.round(((gPres + gLate) / gTotalAtt) * 100) : 0;

            let gExSum = 0, gExCnt = 0;
            gExams.forEach(ex => {
                let max = parseFloat(ex.maxScore) || 100;
                Object.values(ex.grades || {}).forEach(val => {
                    if (!isNaN(parseFloat(val)) && max > 0) {
                        gExSum += (parseFloat(val) / max) * 100;
                        gExCnt++;
                    }
                });
            });
            let gExAvg = gExCnt > 0 ? Math.round(gExSum / gExCnt) : 0;
            let gIncome = sessionIncomeMap[grp.name] || 0;

            chartLabels.push(grp.name);
            chartPresent.push(gPres);
            chartAbsent.push(gAbs);
            chartLate.push(gLate);

            let rateColor = gRate >= 75 ? '#10b981' : (gRate >= 50 ? '#f59e0b' : '#ef4444');

            tbody.innerHTML += `
                <tr>
                    <td><strong style="color:var(--primary-color); cursor:pointer;" onclick="switchPage('groups'); openGroupDetails('${grp.name}')">📁 ${grp.name}</strong></td>
                    <td>${grp.level}</td>
                    <td><strong>${gStudentsCount}</strong></td>
                    <td>${gSessions.length}</td>
                    <td><span class="stat-pill" style="background:${rateColor}20; color:${rateColor};">${gRate}% (${gPres})</span></td>
                    <td style="color:#ef4444; font-weight:bold;">${gAbs}</td>
                    <td style="color:#f59e0b; font-weight:bold;">${gLate}</td>
                    <td><strong>${gExAvg}%</strong></td>
                    <td class="admin-only" style="color:#10b981; font-weight:900;">${gIncome.toLocaleString()} ج.م</td>
                </tr>`;
        });

        if (filteredGroups.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:25px; color:var(--text-muted);">لا توجد مجموعات مسجلة لهذه الفلاتر.</td></tr>`;
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#334155';
        
        // شارت الحضور
        const ctxGrp = document.getElementById("anGroupsBreakdownChart")?.getContext("2d");
        if (ctxGrp && typeof Chart !== "undefined") {
            if (window.anGroupsChartInst) window.anGroupsChartInst.destroy();
            window.anGroupsChartInst = new Chart(ctxGrp, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [
                        { label: 'حاضر ✅', data: chartPresent, backgroundColor: '#10b981', borderRadius: 6 },
                        { label: 'متأخر ⏳', data: chartLate, backgroundColor: '#f59e0b', borderRadius: 6 },
                        { label: 'غائب ❌', data: chartAbsent, backgroundColor: '#ef4444', borderRadius: 6 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { labels: { color: textColor, font: { family: 'Cairo' } } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
            });
        }

        // شارت الصفوف
        const ctxLvl = document.getElementById("anLevelsDoughnutChart")?.getContext("2d");
        if (ctxLvl && typeof Chart !== "undefined") {
            if (window.anLevelsChartInst) window.anLevelsChartInst.destroy();
            let lvlCounts = { "الأول": 0, "الثاني": 0, "الثالث": 0, "أخرى": 0 };
            filteredStudents.forEach(s => {
                if (s.level?.includes("الأول")) lvlCounts["الأول"]++;
                else if (s.level?.includes("الثاني")) lvlCounts["الثاني"]++;
                else if (s.level?.includes("الثالث")) lvlCounts["الثالث"]++;
                else lvlCounts["أخرى"]++;
            });
            window.anLevelsChartInst = new Chart(ctxLvl, {
                type: 'doughnut',
                data: {
                    labels: ["الأول", "الثاني", "الثالث"],
                    datasets: [{ data: [lvlCounts["الأول"], lvlCounts["الثاني"], lvlCounts["الثالث"]], backgroundColor: ['#f59e0b', '#10b981', '#980000'], borderWidth: 0 }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Cairo' } } } } }
            });
        }
    }
};

// تصدير جدول الإحصائيات الشامل إلى شيت Excel
window.exportMasterAnalyticsTable = function() {
    const table = document.getElementById("master-groups-analytics-table");
    if (!table || typeof XLSX === "undefined") return;
    const wb = XLSX.utils.table_to_book(table, { sheet: "إحصائيات_المجموعات" });
    XLSX.writeFile(wb, `إحصائيات_القيصر_الشاملة_${new Date().toISOString().split('T')[0]}.xlsx`);
    if (typeof showToast === "function") showToast("تم تحميل شيت الإحصائيات الشاملة بنجاح! 📥");
};

// ربط صفحة الإحصائيات بنظام التنقل switchPage
const prevSwitchPageForMasterAnalytics = window.switchPage;
window.switchPage = function(pageId) {
    if (prevSwitchPageForMasterAnalytics) prevSwitchPageForMasterAnalytics(pageId);
    if (pageId === "analytics") {
        document.getElementById("page-title").innerText = "الإحصائيات الشاملة والرادار 📈";
        document.getElementById("page-desc").innerText = "تحليل متكامل للطلاب، الحضور، الغياب، التأخير، والماليات";
        
        // استدعاء دالة الرسم بعد ثانية صغيرة للتأكد من إن الشاشة ظهرت وكل الـ DOM اتعمله Render
        setTimeout(() => {
            if (typeof renderMasterAnalytics === "function") renderMasterAnalytics();
        }, 100);
    }
    if (pageId === "dashboard") {
        if(typeof window.updateStudentQuestCard === "function") window.updateStudentQuestCard();
    }
};

// =========================================================
// 🤖 محرك "أوكتو AI" التنفيذي الشامل (Full-System Action Agent V3)
// =========================================================

// 1. فتح وإغلاق الشات وتجهيز الواجهة
window.openShefoChat = function() {
    const overlay = document.getElementById("shefo-chat-overlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    renderAiQuickSuggestions();
    renderAiDropdownCommands();
    setTimeout(() => document.getElementById("shefo-text-input")?.focus(), 150);
};

window.closeShefoChat = function() {
    const overlay = document.getElementById("shefo-chat-overlay");
    if (overlay) overlay.style.display = "none";
};

window.toggleAiMenu = function() {
    const popup = document.getElementById("ai-dropdown-popup");
    if (!popup) return;
    popup.style.display = popup.style.display === "flex" ? "none" : "flex";
};

window.handleAiKeyPress = function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendShefoMessage();
    }
};

// 2. كبسولات الأوامر السريعة التفاعلية
window.renderAiQuickSuggestions = function() {
    const box = document.getElementById("ai-suggestions-container");
    if (!box) return;
    const suggestions = [
        { label: "📊 رادار السيستم اليوم", cmd: "ملخص السيستم" },
        { label: "📖 كتالوج أوامر التنفيذ", cmd: "كل الاوامر" },
        { label: "🎯 فتح حصة جديدة", cmd: "عايز افتح حصة" },
        { label: "💳 توليد 10 كروت بـ 50", cmd: "توليد 10 كارت شحن بـ 50" },
        { label: "💰 جرد الخزنة والكتب", cmd: "تقرير الخزنة والماليات" },
        { label: "🚨 الطلاب في خطر", cmd: "اعرض الطلاب تحت الملاحظة" }
    ];
    box.innerHTML = suggestions.map(s => `
        <button class="ai-quick-btn" onclick="executeQuickAiCommand('${s.cmd}')">${s.label}</button>
    `).join('');
};

// 3. قائمة الصاعقة (⚡) للمهام الفورية
window.renderAiDropdownCommands = function() {
    const popup = document.getElementById("ai-dropdown-popup");
    if (!popup) return;
    const actions = [
        { title: "📖 عرض كتالوج الأوامر الصوتية/الكتابية", action: "executeQuickAiCommand('كل الاوامر');" },
        { title: "➕ تسجيل طالب جديد فوراً", action: "openModal('addStudentModal'); closeShefoChat();" },
        { title: "🎯 فتح حصة ورصد الباركود", action: "switchPage('attendance'); openModal('addSessionModal'); closeShefoChat();" },
        { title: "📝 إنشاء امتحان ورقي لمجموعة", action: "switchPage('exams'); openModal('addExamModal'); closeShefoChat();" },
        { title: "💻 صانع الامتحانات الإلكترونية", action: "switchPage('platform'); switchPlatformTab('exams'); openOnlineExamBuilder(); closeShefoChat();" },
        { title: "🎬 رفع كورس أو ملزمة PDF", action: "switchPage('platform'); switchPlatformTab('lectures'); closeShefoChat();" },
        { title: "📘 تسليم عهدة كتب لسنتر", action: "switchPage('books'); openModal('addBookModal'); closeShefoChat();" },
        { title: "📈 فتح الرادار والإحصائيات الشاملة", action: "switchPage('analytics'); closeShefoChat();" },
        { title: "📥 تحميل نسخة احتياطية كاملة (Backup)", action: "exportData(); closeShefoChat();" }
    ];
    popup.innerHTML = actions.map(a => `
        <button class="ai-dropdown-item" onclick="${a.action}; document.getElementById('ai-dropdown-popup').style.display='none';">
            <span>${a.title}</span>
            <span style="color:#3b82f6;">⬅</span>
        </button>
    `).join('');
};

window.executeQuickAiCommand = function(cmdText) {
    const input = document.getElementById("shefo-text-input");
    if (input) {
        input.value = cmdText;
        sendShefoMessage();
    }
};

// 4. إرسال الرسالة وتشغيل العقل التنفيذي
window.sendShefoMessage = function() {
    const input = document.getElementById("shefo-text-input");
    const msgContainer = document.getElementById("shefo-chat-messages");
    if (!input || !msgContainer) return;

    const text = input.value.trim();
    if (!text) return;

    const popup = document.getElementById("ai-dropdown-popup");
    if (popup) popup.style.display = "none";

    msgContainer.innerHTML += `<div class="user-message">${text}</div>`;
    input.value = "";
    msgContainer.scrollTop = msgContainer.scrollHeight;

    const typingId = "typing_" + Date.now();
    msgContainer.innerHTML += `
        <div class="ai-message" id="${typingId}">
            <div class="ai-typing"><span></span><span></span><span></span></div>
        </div>`;
    msgContainer.scrollTop = msgContainer.scrollHeight;

    setTimeout(async () => {
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        const replyHtml = await processOctoAiBrain(text);
        msgContainer.innerHTML += `<div class="ai-message">${replyHtml}</div>`;
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }, 300);
};

// دالة مساعدة لاستخراج الطالب من داخل الجملة النصية بذكاء
window.extractStudentFromSentence = function(sentence) {
    if (!Array.isArray(students) || students.length === 0) return null;
    // 1. محاولة البحث بالكود المكتوب في الجملة (سواء رقم أو O-1001)
    let tokens = sentence.split(/\s+/);
    for (let t of tokens) {
        let cleanToken = t.replace(/[^\w\d-]/g, '');
        if (!cleanToken) continue;
        let byCode = students.find(s => String(s.code).toLowerCase() === cleanToken.toLowerCase());
        if (byCode) return byCode;
    }
    // 2. البحث بتطابق الاسم داخل الجملة
    let normSentence = window.smartArabicNormalize ? window.smartArabicNormalize(sentence) : sentence;
    let sortedByLength = [...students].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
    for (let st of sortedByLength) {
        let normName = window.smartArabicNormalize ? window.smartArabicNormalize(st.name) : st.name;
        if (normName && normName.length >= 5 && normSentence.includes(normName)) {
            return st;
        }
    }
    return null;
};

// =========================================================
// 🧠 5. العقل التنفيذي الشامل (ينفذ كل مهام السيستم أوتوماتيك)
// =========================================================
window.processOctoAiBrain = async function(rawInput) {
    const text = window.smartArabicNormalize ? window.smartArabicNormalize(rawInput) : rawInput.trim().toLowerCase();
    const allSt = Array.isArray(students) ? students : [];
    const allGrps = Array.isArray(groups) ? groups : [];
    const allSess = Array.isArray(classSessions) ? classSessions : [];
    const allEx = Array.isArray(exams) ? exams : [];
    const allHw = Array.isArray(homeworks) ? Array.from(homeworks) : [];
    const allBks = Array.isArray(books) ? books : [];

    // ---------------------------------------------------------
    // 1️⃣ كتالوج الأوامر الشامل (تعليم أي مستخدم أو مساعد جديد)
    // ---------------------------------------------------------
    if (text.includes("كل الاوامر") || text.includes("كتالوج") || text.includes("بتعمل ايه") || text.includes("ازاي") || text.includes("شرح")) {
        return `
            👑 <strong>كتالوج الأوامر التنفيذية لـ "أوكتو AI":</strong><br>
            اكتب لي أي أمر من دول وهنفذه فوراً مكانك:<br><br>
            📋 <strong>الحضور والحصص:</strong><br>
            • <code>افتح حصة لمجموعة [اسمها] بعنوان [الموضوع]</code><br>
            • <code>حضر الطالب [الكود/الاسم]</code> أو <code>سجل متأخر للطالب [الكود]</code><br><br>
            📝 <strong>الامتحانات والواجبات والنقاط:</strong><br>
            • <code>رصد امتحان للطالب [الكود] درجة [45]</code><br>
            • <code>رصد واجب للطالب [الكود] درجة [20]</code><br>
            • <code>كافئ الطالب [الكود] بـ 10 نقاط</code> أو <code>اخصم 5 نقاط من [الكود]</code><br><br>
            💰 <strong>الماليات والكتب وكروت الشحن:</strong><br>
            • <code>تحصيل من الطالب [الكود]</code> (يسجل دفع الحصة/الشهر)<br>
            • <code>سجل مصروف 150 تصوير ملازم</code><br>
            • <code>استلام 500 من سنتر [اسم السنتر]</code> (حسابات الكتب)<br>
            • <code>توليد 20 كارت شحن بـ 100</code><br><br>
            🔄 <strong>إدارة الطلاب والمنصة:</strong><br>
            • <code>انقل الطالب [الكود] لمجموعة [اسم المجموعة]</code><br>
            • <code>اوقف الطالب [الكود]</code> أو <code>فعل الطالب [الكود]</code><br>
            • <code>ابعت اشعار للكل: [نص الإشعار]</code>`;
    }

    // ---------------------------------------------------------
    // 2️⃣ تنفيذ فوري: تحضير أو تأخير أو تغييب طالب من الشات
    // ---------------------------------------------------------
    if (text.includes("حضر") || text.includes("تسجيل حضور") || text.includes("سجل متاخر") || text.includes("غيب")) {
        let targetSt = window.extractStudentFromSentence(rawInput);
        if (!targetSt) return `⚠️ لم أتعرف على كود أو اسم الطالب! اكتب مثلاً: <code>حضر الطالب 105</code>`;

        // تحديد الحصة المستهدفة (المفتوحة حالياً أو آخر حصة لمجموعة الطالب)
        let targetSess = currentActiveSessionId
            ? allSess.find(s => s.id === currentActiveSessionId)
            : [...allSess].reverse().find(s => s.group === targetSt.group && s.status !== 'closed');

        if (!targetSess) return `⚠️ لا توجد حصة مفتوحة حالياً لمجموعة (${targetSt.group})! اكتب أولاً: <code>افتح حصة لمجموعة ${targetSt.group}</code>`;

        let status = text.includes("متاخر") ? "late" : (text.includes("غيب") ? "absent" : "present");
        let statusAr = status === "present" ? "حاضر ✅" : (status === "late" ? "متأخر ⏳" : "غائب ❌");

        if (!targetSess.attendance) targetSess.attendance = {};
        targetSess.attendance[targetSt.code] = status;
        localStorage.setItem("classSessions", JSON.stringify(classSessions));
        if (currentActiveSessionId === targetSess.id && typeof renderAttendanceTable === "function") {
            renderAttendanceTable(targetSess);
        }

        return `✅ <strong>تم التنفيذ فوراً!</strong><br>سجلت الطالب <strong>${targetSt.name} (${targetSt.code})</strong> كـ <strong>${statusAr}</strong> في حصة (${targetSess.group} - ${targetSess.date}).`;
    }

    // ---------------------------------------------------------
    // 3️⃣ تنفيذ فوري: رصد درجة امتحان أو واجب لطالب
    // ---------------------------------------------------------
    if (text.includes("رصد") || text.includes("درجه")) {
        let targetSt = window.extractStudentFromSentence(rawInput);
        // استخراج الأرقام واستبعاد كود الطالب منها للحصول على الدرجة
        let allNums = rawInput.match(/\d+(\.\d+)?/g) || [];
        let gradeVal = allNums.find(n => String(n) !== String(targetSt?.code));

        if (targetSt && gradeVal !== undefined) {
            let isHw = text.includes("واجب");
            if (isHw) {
                let targetHw = currentActiveHwId
                    ? allHw.find(h => h.id === currentActiveHwId)
                    : [...allHw].reverse().find(h => h.group === targetSt.group);
                if (!targetHw) return `⚠️ لا يوجد واجب مسجل لمجموعة (${targetSt.group})!`;

                if (!targetHw.grades) targetHw.grades = {};
                targetHw.grades[targetSt.code] = parseFloat(gradeVal);
                localStorage.setItem("homeworks", JSON.stringify(homeworks));
                if (currentActiveHwId === targetHw.id && typeof openHwDetails === "function") openHwDetails(targetHw.id);

                return `📚 <strong>تم رصد درجة الواجب بنجاح!</strong><br>الطالب: <strong>${targetSt.name}</strong><br>الواجب: ${targetHw.name}<br>الدرجة: <strong>${gradeVal} / ${targetHw.maxScore}</strong>`;
            } else {
                let targetEx = currentActiveExamId
                    ? allEx.find(e => e.id === currentActiveExamId)
                    : [...allEx].reverse().find(e => e.group === targetSt.group);
                if (!targetEx) return `⚠️ لا يوجد امتحان مسجل لمجموعة (${targetSt.group})!`;

                if (!targetEx.grades) targetEx.grades = {};
                targetEx.grades[targetSt.code] = parseFloat(gradeVal);
                localStorage.setItem("exams", JSON.stringify(exams));
                if (currentActiveExamId === targetEx.id && typeof openExamDetails === "function") openExamDetails(targetEx.id);

                return `📝 <strong>تم رصد درجة الامتحان بنجاح!</strong><br>الطالب: <strong>${targetSt.name}</strong><br>الامتحان: ${targetEx.name}<br>الدرجة: <strong style="color:#10b981;">${gradeVal} / ${targetEx.maxScore}</strong>`;
            }
        }
    }

    // ---------------------------------------------------------
    // 4️⃣ تنفيذ فوري: تحصيل مالي من طالب أو تسجيل مصروف بالخزنة
    // ---------------------------------------------------------
    if (text.includes("تحصيل") || text.includes("دفع")) {
        let targetSt = window.extractStudentFromSentence(rawInput);
        if (!targetSt) return `⚠️ اذكر كود أو اسم الطالب! مثال: <code>تحصيل من الطالب 105</code>`;

        let targetSess = currentActiveSessionId
            ? allSess.find(s => s.id === currentActiveSessionId)
            : [...allSess].reverse().find(s => s.group === targetSt.group);
        if (!targetSess) return `⚠️ لا توجد حصة مسجلة لمجموعة (${targetSt.group}) لتحصيل المبلغ فيها!`;

        let grpObj = allGrps.find(g => g.name === targetSess.group) || {};
        let payType = grpObj.payType || 'session';
        let amount = targetSt.isSpecialCase ? (parseFloat(targetSt.specialAmount) || 0) : (parseFloat(grpObj.price) || 50);

        let recKey = `fin_session_${targetSess.id}`;
        if (!financeRecords[recKey]) financeRecords[recKey] = {};
        financeRecords[recKey][targetSt.code] = { status: 'paid', type: payType, amount: amount, date: new Date().toISOString() };
        localStorage.setItem("financeRecords", JSON.stringify(financeRecords));

        if (payType === 'month') {
            let mKey = targetSess.date.substring(0, 7);
            if (!window.monthlyPayments[targetSt.code]) window.monthlyPayments[targetSt.code] = {};
            window.monthlyPayments[targetSt.code][mKey] = true;
            localStorage.setItem("monthlyPayments", JSON.stringify(window.monthlyPayments));
        }
        if (typeof renderFinanceTable === "function") renderFinanceTable();

        return `💰 <strong>تم تحصيل النقدية وإضافتها للخزنة!</strong><br>الطالب: <strong>${targetSt.name}</strong><br>المبلغ المحصل: <strong style="color:#10b981;">${amount} ج.م</strong> (${payType === 'month' ? 'اشتراك شهر' : 'حصة'}).`;
    }

    if (text.includes("مصروف") || text.includes("مصاريف")) {
        let nums = rawInput.match(/\d+/g);
        if (nums && nums.length > 0) {
            let expVal = parseFloat(nums[0]);
            let targetSess = currentActiveSessionId ? allSess.find(s => s.id === currentActiveSessionId) : allSess[allSess.length - 1];
            if (!targetSess) return `⚠️ افتح حصة أولاً لتسجيل المصروف عليها!`;

            let desc = rawInput.replace(/سجل|مصروف|مصاريف|\d+|جنيه|ج/g, '').trim() || "مصروف إضافي";
            expenses.push({ id: "exp_" + Date.now(), sessionId: targetSess.id, desc: desc, amount: expVal });
            localStorage.setItem("expenses", JSON.stringify(expenses));
            if (typeof renderFinanceTable === "function") renderFinanceTable();

            return `📤 <strong>تم تسجيل المصروف بنجاح!</strong><br>البند: <strong>${desc}</strong><br>المبلغ: <strong style="color:#ef4444;">${expVal} ج.م</strong> (حصة ${targetSess.group}).`;
        }
    }

    // ---------------------------------------------------------
    // 5️⃣ تنفيذ فوري: مكافأة/خصم نقاط سلوك، أو نقل مجموعة، أو إيقاف/تفعيل طالب
    // ---------------------------------------------------------
    if (text.includes("نقاط") || text.includes("نقطه") || text.includes("كافئ") || text.includes("اخصم")) {
        let targetSt = window.extractStudentFromSentence(rawInput);
        let nums = rawInput.match(/\d+/g) || [];
        let ptsVal = nums.find(n => String(n) !== String(targetSt?.code));
        if (targetSt && ptsVal) {
            let delta = (text.includes("اخصم") || text.includes("خصم")) ? -parseInt(ptsVal) : parseInt(ptsVal);
            targetSt.behaviorPoints = (targetSt.behaviorPoints || 0) + delta;
            localStorage.setItem("students", JSON.stringify(students));
            return `🏆 <strong>تم تحديث نقاط الطالب (${targetSt.name})!</strong><br>${delta > 0 ? `تمت إضافة +${delta} نقطة 🌟` : `تم خصم ${delta} نقطة 🤫`}.`;
        }
    }

    if (text.includes("انقل") || text.includes("نقل")) {
        let targetSt = window.extractStudentFromSentence(rawInput);
        let targetGrp = allGrps.find(g => text.includes(window.smartArabicNormalize(g.name)));
        if (targetSt && targetGrp) {
            let oldGrp = targetSt.group;
            targetSt.group = targetGrp.name;
            localStorage.setItem("students", JSON.stringify(students));
            if (typeof renderTable === "function") renderTable();
            return `🔄 <strong>تم نقل الطالب بنجاح!</strong><br>الطالب: <strong>${targetSt.name}</strong><br>من: (${oldGrp}) ⬅️ إلى: <strong style="color:#3b82f6;">(${targetGrp.name})</strong> مع الاحتفاظ بكامل سجله القديم.`;
        }
    }

    if (text.includes("اوقف") || text.includes("ايقاف") || text.includes("فعل") || text.includes("تفعيل")) {
        let targetSt = window.extractStudentFromSentence(rawInput);
        if (targetSt) {
            let suspend = text.includes("اوقف") || text.includes("ايقاف");
            targetSt.isSuspended = suspend;
            localStorage.setItem("students", JSON.stringify(students));
            return suspend
                ? `⛔ <strong>تم إيقاف حساب الطالب (${targetSt.name})!</strong> لن يتمكن من الدخول للمنصة أو التحضير بالباركود حتى تعيد تفعيله.`
                : `✅ <strong>تم إعادة تفعيل حساب الطالب (${targetSt.name}) بنجاح!</strong>`;
        }
    }

    // ---------------------------------------------------------
    // 6️⃣ تنفيذ فوري: استلام نقدية كتب من سنتر
    // ---------------------------------------------------------
    if (text.includes("استلام") && (text.includes("سنتر") || text.includes("كتاب"))) {
        let nums = rawInput.match(/\d+/g);
        let matchedBook = allBks.find(b => text.includes(window.smartArabicNormalize(b.centerName)) || text.includes(window.smartArabicNormalize(b.bookName)));
        if (nums && matchedBook) {
            let amount = parseFloat(nums[0]);
            matchedBook.receivedAmount = (parseFloat(matchedBook.receivedAmount) || 0) + amount;
            localStorage.setItem("books", JSON.stringify(books));
            if (typeof renderBooksTable === "function") renderBooksTable();
            return `📘 <strong>تم تسجيل استلام نقدية الكتب!</strong><br>السنتر: <strong>${matchedBook.centerName}</strong> (${matchedBook.bookName})<br>المبلغ المستلم: <strong style="color:#10b981;">${amount} ج.م</strong>.`;
        }
    }

    // ---------------------------------------------------------
    // 7️⃣ تنفيذ فوري: إرسال إشعار مباشر لطلاب المنصة
    // ---------------------------------------------------------
    if (text.includes("اشعار") && (text.includes("ابعت") || text.includes("ارسل"))) {
        let content = rawInput.split(/بعنوان|للطلاب|للكل|:/)[1] || rawInput.replace(/ابعت|ارسل|اشعار|للكل/g, '');
        if (content && content.trim().length > 3 && typeof sendPlatformNotification === "function") {
            await sendPlatformNotification("all", "📢 تنبيه هام من مستر بدر على", content.trim());
            return `📢 <strong>تم بث الإشعار لجميع طلاب المنصة فوراً!</strong><br>النص: <em>"${content.trim()}"</em>`;
        }
    }

    // ---------------------------------------------------------
    // 8️⃣ توليد كروت شحن / فتح حصة / ملخص السيستم / بحث عن طالب
    // ---------------------------------------------------------
    if ((text.includes("توليد") || text.includes("اعمل") || text.includes("طلع")) && (text.includes("كارت") || text.includes("كروت") || text.includes("شحن"))) {
        let nums = rawInput.match(/\d+/g);
        if (nums && nums.length >= 2) {
            let count = parseInt(nums[0]), amount = parseInt(nums[1]);
            if (count > 50 && amount <= 50) { let t = count; count = amount; amount = t; }
            switchPage('platform'); switchPlatformTab('codes');
            document.getElementById("codeCount").value = count;
            document.getElementById("codeAmount").value = amount;
            generateChargeCodes();
            return `✅ <strong>تم توليد ${count} كارت شحن فئة ${amount} ج.م فوراً!</strong>`;
        }
    }

    if ((text.includes("افتح") || text.includes("انشئ")) && text.includes("حصه")) {
        let matchedGrp = allGrps.find(g => text.includes(window.smartArabicNormalize(g.name)));
        if (matchedGrp) {
            let todayStr = new Date().toISOString().split('T')[0];
            let topic = (rawInput.split(/بعنوان|موضوع/i)[1] || "حصة جديدة").trim();
            let newId = Date.now().toString();
            classSessions.push({ id: newId, group: matchedGrp.name, date: todayStr, topic: topic, status: "open", attendance: {} });
            localStorage.setItem("classSessions", JSON.stringify(classSessions));
            switchPage('attendance'); openSessionDetails(newId);
            return `🚀 <strong>تم فتح حصة (${matchedGrp.name}) وتجهيز شاشة الباركود للرصد!</strong>`;
        }
        switchPage('attendance'); openModal('addSessionModal');
        return `📋 فتحت لك نافذة إنشاء الحصة الآن!`;
    }

    if (text.includes("ملخص") || text.includes("تقرير") || text.includes("احصائيات") || text.includes("خزنه")) {
        let totalInc = 0;
        Object.keys(financeRecords || {}).forEach(k => {
            Object.values(financeRecords[k] || {}).forEach(p => { if (p && p.status === 'paid') totalInc += (parseFloat(p.amount) || 0); });
        });
        return `
            📊 <strong>تقرير القيصر الشامل:</strong><br>
            • الطلاب: <strong>${allSt.length}</strong> | المجموعات: <strong>${allGrps.length}</strong><br>
            • الحصص: <strong>${allSess.length}</strong> | الامتحانات: <strong>${allEx.length}</strong><br>
            • إجمالي خزنة الحصص: <strong style="color:#10b981;">${totalInc.toLocaleString()} ج.م</strong><br>
            <div style="margin-top:8px; display:flex; gap:6px;">
                <button class="ai-quick-btn" onclick="switchPage('analytics'); closeShefoChat();">📈 فتح الرادار الشامل</button>
            </div>`;
    }

    // 9️⃣ إذا كتب اسم أو كود طالب، يعرض بطاقة تحكم كاملة بالطالب داخل الشات
    let cleanQuery = rawInput.replace(/طالب|بحث عن|بيانات|ملف|كود|هات/g, '').trim();
    let foundSt = window.extractStudentFromSentence(rawInput) || (typeof findStudentByCodeOrName === "function" ? findStudentByCodeOrName(cleanQuery) : null);
    if (foundSt) {
        let waParent = (foundSt.parentPhone && foundSt.parentPhone !== "0") ? `https://wa.me/20${foundSt.parentPhone.replace(/^0+/, '')}` : null;
        return `
            🎓 <strong>لوحة التحكم السريعة للطالب:</strong><br>
            • <strong>الاسم:</strong> ${foundSt.name} (${foundSt.isSuspended ? '<span style="color:red;">موقوف ⛔</span>' : '<span style="color:#10b981;">نشط ✅</span>'})<br>
            • <strong>الكود:</strong> <strong style="color:#3b82f6;">${foundSt.code}</strong> | <strong>المجموعة:</strong> ${foundSt.group}<br>
            • <strong>ولي الأمر:</strong> <span dir="ltr">${foundSt.parentPhone || '--'}</span><br>
            <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
                <button class="ai-quick-btn" style="background:#10b981; color:#fff; border-color:#10b981;" onclick="executeQuickAiCommand('حضر الطالب ${foundSt.code}')">✅ تحضير</button>
                <button class="ai-quick-btn" style="background:#f59e0b; color:#fff; border-color:#f59e0b;" onclick="executeQuickAiCommand('تحصيل من الطالب ${foundSt.code}')">💰 تحصيل</button>
                <button class="ai-quick-btn" onclick="executeQuickAiCommand('كافئ الطالب ${foundSt.code} بـ 5 نقاط')">⭐ +5 نقاط</button>
                <button class="ai-quick-btn" onclick="openStudentProfile('${foundSt.code}'); closeShefoChat();">👤 الملف</button>
                ${waParent ? `<button class="ai-quick-btn" style="border-color:#10b981; color:#10b981;" onclick="window.open('${waParent}', '_blank')">💬 واتس</button>` : ''}
            </div>`;
    }

    return `🤖 لم أفهم الأمر بدقة يا مستر! اضغط على <button class="ai-quick-btn" onclick="executeQuickAiCommand('كل الاوامر')">📖 كتالوج الأوامر</button> لترى كل ما يمكنني تنفيذه لك تلقائياً.`;
};