
       // ==========================================
        // ⚙️ المتغيرات الأساسية ودوال التنقل بين الشاشات
        // ==========================================
        let globalTeacherId = "AlQaisar_System"; // 🔒 التثبيت هنا
        let currentStudent = null;
        let allOnlineExams = [];
        let currentExam = null;
        let examTimerInterval = null;
        window.allLectures = []; 
        window.allClassSessions = []; 

        // 🔘 دوال فتح وقفل النوافذ (شاشة المودال)
        function openAuthModal(type) {
            document.getElementById('auth-modal').classList.add('active');
            toggleAuthView(type);
        }
        function closeAuthModal() {
            document.getElementById('auth-modal').classList.remove('active');
        }
        function toggleAuthView(type) {
    document.getElementById('login-form-view').style.display = 'none';
    document.getElementById('register-form-view').style.display = 'none';
    
    let forgotView = document.getElementById('forgot-form-view');
    let guestView = document.getElementById('guest-form-view'); // الواجهة الجديدة
    
    if(forgotView) forgotView.style.display = 'none';
    if(guestView) guestView.style.display = 'none';

    if(type === 'login') {
        document.getElementById('login-form-view').style.display = 'block';
    } else if (type === 'register') {
        document.getElementById('register-form-view').style.display = 'block';
    } else if (type === 'forgot') {
        if(forgotView) forgotView.style.display = 'block';
    } else if (type === 'guest') {
        if(guestView) {
            guestView.style.display = 'block';
            document.getElementById('guest-step-1').style.display = 'block';
            document.getElementById('guest-step-2').style.display = 'none';
            document.getElementById('guestChargeCode').value = '';
        }
    }
}
        
        function toggleRegFields() {
            let type = document.getElementById("regType").value;
            document.getElementById("centerFields").style.display = type === 'center' ? 'flex' : 'none';
            document.getElementById("onlineFields").style.display = type === 'online' ? 'flex' : 'none';
            document.getElementById("submitRegBtn").innerText = type === 'center' ? 'إرسال طلب الانضمام 🚀' : 'إنشاء حساب أونلاين 🚀';
        }

        // ==========================================
        // 🎨 سحر الألوان: تطبيق الثيم بناءً على الصف
        // ==========================================
        function applyDynamicTheme(level) {
            document.body.classList.remove('theme-grade-1', 'theme-grade-2', 'theme-grade-3');
            if (level.includes('الأول')) document.body.classList.add('theme-grade-1');
            else if (level.includes('الثاني')) document.body.classList.add('theme-grade-2');
            else if (level.includes('الثالث')) document.body.classList.add('theme-grade-3');
        }

        document.getElementById("regLevel")?.addEventListener("change", function() {
            applyDynamicTheme(this.value);
        });

        // ==========================================
        // 🌟 1. جلب بيانات المستر وتوزيعها (Landing & Auth)
        // ==========================================
        async function loadTeacherInfoInitial() {
            try {
                let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/settings.json`);
                let settings = await res.json();
                
                if (settings) {
                    let tName = settings.teacherName || "بدر على";
                    let cName = settings.centerName || "El-Senior";

                    // أسماء المستر في الصفحة الرئيسية والمودال والمنصة
                   if(document.getElementById("nav-brand-name")) document.getElementById("nav-brand-name").innerText ="القيصر: بدر على"; // مؤقت لحد ما الطالب يسجل
                    if(document.getElementById("hero-teacher-name")) document.getElementById("hero-teacher-name").innerText = `مستر ${tName}`;
                    if(document.getElementById("modal-teacher-name")) document.getElementById("modal-teacher-name").innerText = `مستر ${tName}`;
                    if(document.getElementById("top-name")) document.getElementById("top-name").innerText = `مرحباً بك!`; // مؤقت لحد ما الطالب يسجل

                    // أرقام التواصل
                    const landingContactBox = document.getElementById("landing-contact-box");
                    const modalContactBox = document.getElementById("teacher-contact-box");

                    if (settings.phoneNumbers && settings.phoneNumbers.trim() !== "") {
                        let phones = settings.phoneNumbers.split(',');
                        
                        // أرقام الفوتر (الصفحة الرئيسية)
                        if(landingContactBox) {
                            landingContactBox.innerHTML = phones.map(p => `
                                <a href="https://wa.me/20${p.trim().replace(/^0+/, '')}" target="_blank" class="contact-number">
                                    <span>📞</span> ${p.trim()}
                                </a>
                            `).join('');
                        }

                        // أرقام مودال الدخول
                        if(modalContactBox) {
                            modalContactBox.innerHTML = `<div style="color: rgba(255,255,255,0.7); margin-bottom: 8px; font-weight:bold;">للتواصل والدعم الفني:</div>` + 
                                phones.map(p => `<a href="https://wa.me/20${p.trim().replace(/^0+/, '')}" target="_blank" style="margin: 0 5px; color: white; text-decoration: none; font-weight: 900; font-size: 16px; letter-spacing: 1px;">${p.trim()}</a>`).join('<span style="color: rgba(255,255,255,0.3);"> | </span>');
                        }
                    }
                }
            } catch (e) { console.log("Error loading teacher info", e); }
        }

        window.onload = function() {
            const savedCode = localStorage.getItem("AlQaisar_System_student_code");
            const savedPhone = localStorage.getItem("AlQaisar_System_parent_phone");
            
            loadTeacherInfoInitial(); 

            // لو كان مسجل دخول قبل كده، هيدخل أوتوماتيك ويخفي الـ Landing
            if (savedCode && savedPhone) {
                document.getElementById("studentCode").value = savedCode;
                document.getElementById("parentPhone").value = savedPhone;
                fetchStudentData(true); 
            }
        };      

// ==========================================
// 🛡️ نظام الخزنة المستقلة لحماية الرصيد والمشتريات من الضياع
// ==========================================
window.isProcessingTransaction = false;

// دالة موحدة لتحديث الرصيد في جميع أماكن الشاشة فوراً
window.updateWalletUI = function() {
    if (!currentStudent) return;
    let balance = parseFloat(currentStudent.walletBalance) || 0;
    
    let topBal = document.getElementById("top-balance");
    if (topBal) topBal.innerText = balance;
    
    let homeBal = document.getElementById("walletBalanceDisplay");
    if (homeBal) homeBal.innerText = balance;
    
    let pageBal = document.getElementById("wallet-page-balance");
    if (pageBal) pageBal.innerHTML = `${balance} <span style="font-size: 24px; color: rgba(0, 0, 0, 0.7);">ج.م</span>`;
};

// 1. دالة استرجاع ودمج الرصيد والكورسات المحمية للطالب
window.syncStudentSafeVault = async function() {
    if (!currentStudent || !currentStudent.code) return;
    window.currentStudent = currentStudent; // ربط المتغير بالـ window لمنع أي تعارض
    let stCode = String(currentStudent.code).trim();

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/student_vault/${stCode}.json`);
        let vault = await res.json();

        let currentCourses = Array.isArray(currentStudent.purchasedCourses) 
            ? currentStudent.purchasedCourses 
            : Object.values(currentStudent.purchasedCourses || {});

        if (vault) {
            if (vault.walletBalance !== undefined && vault.walletBalance !== null) {
                currentStudent.walletBalance = parseFloat(vault.walletBalance) || 0;
            }
            let vaultCourses = Array.isArray(vault.purchasedCourses) 
                ? vault.purchasedCourses 
                : Object.values(vault.purchasedCourses || {});
            
            currentStudent.purchasedCourses = [...new Set([...currentCourses, ...vaultCourses])];
            
            if (vault.guestCourseOnly && !currentStudent.guestCourseOnly) {
                currentStudent.guestCourseOnly = vault.guestCourseOnly;
            }
        } else {
            currentStudent.purchasedCourses = currentCourses;
            await window.saveToStudentSafeVault();
        }

        window.updateWalletUI();
    } catch (e) {
        console.error("Vault Sync Error:", e);
    }
};

// 2. دالة الحفظ الآمن في الخزنة المستقلة + تحديث ملف الطالب الأساسي
window.saveToStudentSafeVault = async function() {
    if (!currentStudent || !currentStudent.code) return;
    window.currentStudent = currentStudent;
    let stCode = String(currentStudent.code).trim();

    let safeCourses = Array.isArray(currentStudent.purchasedCourses) 
        ? currentStudent.purchasedCourses 
        : Object.values(currentStudent.purchasedCourses || {});

    let vaultData = {
        walletBalance: parseFloat(currentStudent.walletBalance) || 0,
        purchasedCourses: safeCourses,
        guestCourseOnly: currentStudent.guestCourseOnly || null,
        lastUpdated: new Date().toISOString()
    };

    // أ. الحفظ في الخزنة المستقلة
    await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/student_vault/${stCode}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultData)
    });

    // ب. تحديث ملف الطالب الأساسي في مصفوفة الطلاب
    try {
        let stRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`);
        let rawStudents = await stRes.json();
        if (rawStudents) {
            let realKey = Object.keys(rawStudents).find(k => rawStudents[k] && String(rawStudents[k].code).trim() === stCode);
            if (realKey !== undefined) {
                await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students/${realKey}.json`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        walletBalance: vaultData.walletBalance, 
                        purchasedCourses: vaultData.purchasedCourses 
                    })
                });
            }
        }
    } catch (e) {}
};

// ==========================================
// 🌟 دالة تسجيل الدخول وجلب بيانات الطالب
// ==========================================
async function fetchStudentData(isAutoLogin = false) {
    const code = document.getElementById("studentCode").value.trim();
    const phone = document.getElementById("parentPhone").value.trim();
    const errorMsg = document.getElementById("error-msg");
    const btn = document.getElementById('login-btn-action');
    
    if (!code || !phone || !globalTeacherId) {
        if(!isAutoLogin) { errorMsg.style.display = "block"; errorMsg.innerText = "تأكد من إدخال البيانات كاملة!"; }
        return;
    }

    errorMsg.style.display = "none";
    if(btn && !isAutoLogin) {
        btn.innerHTML = `جاري الدخول... ⏳`;
        btn.disabled = true;
    }

    try {
        let licRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/settings.json`);
        let licData = await licRes.json();
        
        if (licData) {
            let isExpired = false;
            if (licData.activatedAt) {
                let activationDate = new Date(licData.activatedAt);
                let expirationDate = new Date(activationDate);
                if (licData.durationDays) expirationDate.setDate(expirationDate.getDate() + parseInt(licData.durationDays));
                else if (licData.durationMonths) expirationDate.setMonth(expirationDate.getMonth() + parseInt(licData.durationMonths));
                
                if (licData.durationMonths != 99 && new Date() > expirationDate) isExpired = true;
            }

            if (licData.status === 'suspended' || isExpired) {
                errorMsg.style.display = "block";
                errorMsg.innerText = "عفواً، المنصة متوقفة حالياً. يرجى مراجعة إدارة المستر!";
                if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
                if(isAutoLogin) {
                    localStorage.removeItem("AlQaisar_System_student_code"); localStorage.removeItem("AlQaisar_System_parent_phone"); localStorage.removeItem("AlQaisar_System_teacher_id");
                }
                return; 
            }
        }

        // 1. جلب البيانات من data ودمج platformData احتياطياً لو الطلاب محفوظين هناك
        let [res, platRes] = await Promise.all([
            fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data.json`),
            fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/platformData.json`)
        ]);
        let rawData = await res.json() || {};
        let platData = await platRes.json() || {};

        // دمج البيانات بحيث يقرأ الطلاب سواء كانوا في data أو platformData
        let data = {
            ...platData,
            ...rawData,
            students: rawData.students || platData.students || (platData.data && platData.data.students) || {},
            groups: rawData.groups || platData.groups || (platData.data && platData.data.groups) || {},
            classSessions: rawData.classSessions || platData.classSessions || {},
            exams: rawData.exams || platData.exams || {},
            homeworks: rawData.homeworks || platData.homeworks || {},
            onlineExams: rawData.onlineExams || platData.onlineExams || []
        };

        let safeStudents = Array.isArray(data.students) ? data.students.filter(Boolean) : Object.values(data.students || {}).filter(Boolean);
        let safeGroups = Array.isArray(data.groups) ? data.groups.filter(Boolean) : Object.values(data.groups || {}).filter(Boolean);
        let safeClassSessions = Array.isArray(data.classSessions) ? data.classSessions.filter(Boolean) : Object.values(data.classSessions || {}).filter(Boolean);
        let safeExams = Array.isArray(data.exams) ? data.exams.filter(Boolean) : Object.values(data.exams || {}).filter(Boolean);
        let safeHomeworks = Array.isArray(data.homeworks) ? data.homeworks.filter(Boolean) : Object.values(data.homeworks || {}).filter(Boolean);

        window.allClassSessions = safeClassSessions;

        let lecRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/lectures.json`);
        let lecturesData = await lecRes.json() || {};
        
        if (Array.isArray(lecturesData)) window.allLectures = lecturesData.filter(l => l !== null).reverse();
        else window.allLectures = Object.values(lecturesData).filter(l => l !== null).reverse();

        if (safeStudents.length === 0) {
            errorMsg.style.display = "block"; errorMsg.innerText = "لا يوجد طلاب مسجلين في قاعدة البيانات!";
            if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
            return;
        }

        // دالة لتوحيد صيغة أرقام الهواتف (إزالة المسافات وإضافة الصفر لو محذوف)
        const normalizePhone = (p) => {
            let clean = String(p || '').replace(/\D/g, '');
            if (clean.length === 10 && clean.startsWith('1')) clean = '0' + clean;
            if (clean.length === 12 && clean.startsWith('20')) clean = '0' + clean.substring(2);
            return clean;
        };

        const normalizeCode = (c) => String(c || '').trim().toUpperCase();

        const inputCode = normalizeCode(code);
        const inputPhone = normalizePhone(phone);

        // البحث الذكي: يطابق الكود (بدون حساسية لحالة الأحرف) + يقبل رقم ولي الأمر أو رقم الطالب الشخصي
        currentStudent = safeStudents.find(s => {
            if (!s) return false;
            let sCode = normalizeCode(s.code || s.id);
            if (sCode !== inputCode) return false;

            let pPhone = normalizePhone(s.parentPhone);
            let sPhone = normalizePhone(s.phone);
            return (pPhone && pPhone === inputPhone) || (sPhone && sPhone === inputPhone);
        });
        window.currentStudent = currentStudent;
        if (!currentStudent) {
            errorMsg.style.display = "block"; errorMsg.innerText = "البيانات غير مسجلة!";
            if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
            return;
        }

        if (currentStudent.isSuspended) {
            if(isAutoLogin) {
                document.getElementById("landing-page").style.display = "flex";
                document.getElementById("app-layout").style.display = "none";
                openAuthModal('login'); 
                
                localStorage.removeItem("AlQaisar_System_student_code"); 
                localStorage.removeItem("AlQaisar_System_parent_phone"); 
                localStorage.removeItem("AlQaisar_System_teacher_id");
                
                document.getElementById("studentCode").value = code;
                document.getElementById("parentPhone").value = phone;
            }
            
            errorMsg.style.display = "block"; 
            errorMsg.style.background = "var(--danger)";
            errorMsg.innerText = "⛔ عفواً، حسابك موقوف حالياً من قبل الإدارة. يرجى مراجعة المستر!";
            
            if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
            return;
        }

        // 🛡️ استدعاء الخزنة المحمية لاسترجاع الرصيد والكورسات المشترية
        await window.syncStudentSafeVault();

        let studentGroupObj = safeGroups.find(g => typeof g === 'object' && g.name === currentStudent.group);
        currentStudent.level = (studentGroupObj && studentGroupObj.level) ? studentGroupObj.level : (currentStudent.level || "غير محدد");

        if (currentStudent.level === "غير محدد") {
            let gName = currentStudent.group || "";
            if (gName.includes("1ث") || gName.includes("الأول")) currentStudent.level = "الصف الأول الثانوي";
            else if (gName.includes("2ث") || gName.includes("الثاني")) currentStudent.level = "الصف الثاني الثانوي";
            else if (gName.includes("3ث") || gName.includes("الثالث")) currentStudent.level = "الصف الثالث الثانوي";
        }

        applyDynamicTheme(currentStudent.level);

        localStorage.setItem("AlQaisar_System_student_code", code);
        localStorage.setItem("AlQaisar_System_parent_phone", phone);
        localStorage.setItem("AlQaisar_System_teacher_id", globalTeacherId);

        allOnlineExams = data.onlineExams || [];
        window.studentCode = code;

        document.getElementById("top-name").innerText = currentStudent.name;
        document.getElementById("top-group").innerText = currentStudent.group;
        
        let cName = document.getElementById("card-student-name"); if(cName) cName.innerText = currentStudent.name;
        let cLevel = document.getElementById("card-student-level"); if(cLevel) cLevel.innerText = currentStudent.level;
        let cGroup = document.getElementById("card-student-group-name"); if(cGroup) cGroup.innerText = currentStudent.group;
        let cCodeNum = document.getElementById("card-student-code-num"); if(cCodeNum) cCodeNum.innerText = code;
        
        let totalScore = currentStudent.behaviorPoints || 0;
        safeClassSessions.filter(s => s && s.group === currentStudent.group).forEach(session => { 
            let att = (session.attendance || {})[currentStudent.code] || (session.attendance || {})[currentStudent.phone]; 
            if(att === 'present') totalScore += 10; 
        }); 
        safeExams.filter(e => e && e.group === currentStudent.group).forEach(exam => { 
            let g = (exam.grades || {})[currentStudent.code] !== undefined ? (exam.grades || {})[currentStudent.code] : (exam.grades || {})[currentStudent.phone]; 
            if(g !== undefined && exam.maxScore) { totalScore += (parseFloat(g) / parseFloat(exam.maxScore)) * 50; } 
        }); 
        safeHomeworks.filter(h => h && h.group === currentStudent.group).forEach(hw => { 
            let g = (hw.grades || {})[currentStudent.code] !== undefined ? (hw.grades || {})[currentStudent.code] : (hw.grades || {})[currentStudent.phone]; 
            if(g !== undefined && hw.maxScore) { totalScore += (parseFloat(g) / parseFloat(hw.maxScore)) * 20; } 
        });
        
        currentStudent.totalScore = Math.round(totalScore);

        let cPoints = document.getElementById("card-behavior-points"); 
        if(cPoints) {
            cPoints.innerText = currentStudent.totalScore;
            cPoints.parentElement.innerHTML = `🏆 مجموع النقاط الشامل: <span id="card-behavior-points" style="color: var(--accent); font-size: 20px; font-weight: 900;">${currentStudent.totalScore}</span>`;
        }

        if (typeof JsBarcode !== 'undefined' && document.getElementById("digitalIdBarcode")) {
            JsBarcode("#digitalIdBarcode", currentStudent.code, { format: "CODE128", lineColor: "#0f172a", width: 2, height: 45, displayValue: false });
        }

        window.updateWalletUI();

        let totalItems = 0; let completedItems = 0; let missingLectures = 0; let missingExams = 0;
        try {
            let subRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions.json`);
            let allSubs = await subRes.json() || {};
            let myExams = allOnlineExams.filter(e => e && (e.status === "open" || e.status === "closed") && (Array.isArray(e.group) ? e.group.includes(currentStudent.group) || e.group.includes("all") : e.group === currentStudent.group || e.group === "all"));
            totalItems += myExams.length;
            myExams.forEach(e => { if (allSubs[e.id] && (allSubs[e.id][currentStudent.code] || (currentStudent.phone !== "0" && allSubs[e.id][currentStudent.phone]))) completedItems++; else if (e.status === "open") missingExams++; });

            let myLectures = window.allLectures.filter(l => {
                if (!l) return false;
                let levelMatch = l.level === "all" || l.level === currentStudent.level;
                let trackMatch = !l.track || l.track === 'all' || l.track === (currentStudent.track || 'عام');
                return levelMatch && trackMatch;
            });
            totalItems += myLectures.length;
            let trackRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking.json`);
            let allTracks = await trackRes.json() || {};
            myLectures.forEach(l => { 
                let hasWatched = allTracks[l.id] && (allTracks[l.id][currentStudent.code] || (currentStudent.phone !== "0" && allTracks[l.id][currentStudent.phone])); 
                if (hasWatched) completedItems++; else missingLectures++; 
            });

            let percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;
            if(document.getElementById("tracker-bar")) document.getElementById("tracker-bar").style.width = percent + "%";
            if(document.getElementById("tracker-percentage")) document.getElementById("tracker-percentage").innerText = percent + "%";
            if(document.getElementById("tracker-text")) document.getElementById("tracker-text").innerText = percent === 100 ? "🎉 ممتاز! لقد أتممت خطتك الدراسية!" : "📈 خطة المذاكرة:";
            let reminder = "";
            if (missingLectures > 0) reminder += `🎬 متبقي (${missingLectures}) محاضرة. `;
            if (missingExams > 0) reminder += `📝 متبقي (${missingExams}) امتحان. `;
            if(document.getElementById("tracker-reminder")) document.getElementById("tracker-reminder").innerText = reminder || "🎯 واصل تقدمك!";
        } catch(err) {}

        let attHtml = `<tr><th>التاريخ والجغرافيا</th><th>الموضوع</th><th>حالة الحضور</th></tr>`;
        let hasAtt = false;
        safeClassSessions.filter(s => s && s.group === currentStudent.group).reverse().forEach(s => {
            hasAtt = true;
            let stat = (s.attendance || {})[currentStudent.code] || (s.attendance || {})[currentStudent.phone];
            let badge = stat === 'present' ? `<span class="badge badge-present">حاضر ✓</span>` : stat === 'late' ? `<span class="badge" style="background:#fef3c7; color:#d97706;">متأخر ⏳</span>` : stat === 'absent' ? `<span class="badge badge-absent">غائب ✗</span>` : `<span style="color:var(--text-muted); font-weight:bold;">لم يسجل</span>`;
            attHtml += `<tr><td>${s.date}</td><td>${s.topic || 'حصة عادية'}</td><td>${badge}</td></tr>`;
        });
        if(!hasAtt) attHtml += `<tr><td colspan="3" style="text-align:center; padding: 30px; font-weight:bold;">لا توجد حصص مسجلة.</td></tr>`;
        document.getElementById("attendance-details").innerHTML = attHtml;

        let exHtml = `<tr><th>التاريخ والجغرافيا</th><th>اسم التقييم</th><th>الدرجة التي حصلت عليها</th></tr>`;
        let hasEx = false;
        safeExams.concat(safeHomeworks).filter(e => e && e.group === currentStudent.group).sort((a,b)=> new Date(b.date) - new Date(a.date)).forEach(e => {
            hasEx = true;
            let grade = (e.grades || {})[currentStudent.code] !== undefined ? (e.grades || {})[currentStudent.code] : (e.grades || {})[currentStudent.phone];
            let text = grade !== undefined ? `<span style="font-weight:900; color:var(--primary); font-size:16px;">${grade} <span style="color:var(--text-muted); font-size:13px;">من ${e.maxScore}</span></span>` : `<span style="color:var(--text-muted); font-weight:bold;">لم يتم الرصد</span>`;
            exHtml += `<tr><td>${e.date}</td><td>${e.name}</td><td>${text}</td></tr>`;
        });
        if(!hasEx) exHtml += `<tr><td colspan="3" style="text-align:center; padding: 30px; font-weight:bold;">لا توجد تقييمات.</td></tr>`;
        document.getElementById("exams-details").innerHTML = exHtml;

        fetchStudentNotifications();
        if(typeof loadStudentStore === "function") loadStudentStore();
        if(typeof loadForumQuestions === "function") loadForumQuestions();
        showOnlineExams(true); 
        renderStudentLectures(); 

        document.getElementById("landing-page").style.display = "none";
        document.getElementById("auth-modal").classList.remove('active');
        document.getElementById("app-layout").style.display = "block";
        if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }

    } catch (e) {
        console.error("🔥 Crash Details:", e); 
        errorMsg.style.display = "block"; errorMsg.innerText = "خطأ في الاتصال بالسيرفر! يرجى التأكد من البيانات أو الإنترنت.";
        if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
    }
}

// ==========================================
// 🛒 دالة شراء المحاضرة (محمية ضد الضياع وتغيير الترتيب)
// ==========================================
window.purchaseVideo = async function(courseId, videoIndex, price, videoTitle) {
    if (window.isProcessingTransaction) return;
    if(!confirm(`تأكيد خصم ${price} ج.م من محفظتك لشراء محاضرة (${videoTitle})؟`)) return;
    
    await window.syncStudentSafeVault();

    if((currentStudent.walletBalance || 0) < price) { 
        if(typeof showToast === 'function') showToast("رصيد محفظتك لا يكفي! قم بالشحن أولاً.", "error"); 
        else alert("رصيد محفظتك لا يكفي!");
        return; 
    }
    
    window.isProcessingTransaction = true;
    let btn = (typeof event !== 'undefined' && event) ? event.currentTarget : null;
    let origText = btn ? btn.innerText : "شراء 🛒";
    if (btn) {
        btn.innerText = "جاري الشراء... ⏳"; 
        btn.disabled = true;
    }

    try {
        let specificVideoId = `${courseId}_v${videoIndex}`;
        currentStudent.purchasedCourses = Array.isArray(currentStudent.purchasedCourses) ? currentStudent.purchasedCourses : [];

        if(!currentStudent.purchasedCourses.includes(specificVideoId)) {
            currentStudent.walletBalance = (parseFloat(currentStudent.walletBalance) || 0) - parseFloat(price);
            currentStudent.purchasedCourses.push(specificVideoId);
        }

        await window.saveToStudentSafeVault();
        window.updateWalletUI();
        
        if(typeof showToast === 'function') showToast("تم شراء المحاضرة بنجاح! 🎉", "success");
        else alert("تم شراء المحاضرة بنجاح! 🎉");

        openStudentCourseDetails(courseId);
    } catch(e) { 
        if(typeof showToast === 'function') showToast("حدث خطأ أثناء الشراء! تأكد من الإنترنت.", "error"); 
        else alert("حدث خطأ أثناء الشراء!");
        if (btn) { btn.innerText = origText; btn.disabled = false; }
    } finally {
        window.isProcessingTransaction = false;
    }
};

// ==========================================
// 💳 دالة شحن الكود (تضيف الرصيد فوراً وتحفظه بأمان)
// ==========================================
window.redeemCode = async function() {
    if (window.isProcessingTransaction) return;

    const codeInput = document.getElementById("rechargeCodeInput");
    if (!codeInput) return;

    const code = codeInput.value.replace(/\s+/g, '').replace(/_/g, '-').toUpperCase();
    
    const notify = (msg, type) => {
        if (typeof showToast === 'function') showToast(msg, type);
        else alert(msg);
    };

    if(!code) return notify("أدخل الكود أولاً!", "error");
    if(!currentStudent || !currentStudent.code) return notify("يرجى تسجيل الدخول أولاً!", "error");

    window.isProcessingTransaction = true;
    let btn = document.querySelector('button[onclick="redeemCode()"]');
    let origText = btn ? btn.innerHTML : "شحن الآن 🚀";
    
    if(btn) {
        btn.innerHTML = "جاري الشحن... ⏳";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    }

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${code}.json`);
        let codeData = await res.json();
        
        if (!codeData) {
            notify(`الكود (${code}) غير موجود! تأكد من كتابة الحروف بشكل صحيح.`, "error");
            return;
        }
        
        if (codeData.status === 'used') {
            notify("هذا الكود تم شحنه واستخدامه مسبقاً!", "error");
            return;
        }

        let amount = parseFloat(codeData.amount) || 0;

        // 1. مزامنة أحدث رصيد من الخزنة ثم إضافة قيمة الكود
        await window.syncStudentSafeVault();
        currentStudent.walletBalance = (parseFloat(currentStudent.walletBalance) || 0) + amount;
        
        // 2. حفظ الرصيد الجديد في الخزنة المحمية وملف الطالب
        await window.saveToStudentSafeVault();

        // 3. تحديث حالة الكود إلى مستخدم
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${code}.json`, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                status: "used",
                usedBy: `${currentStudent.name} (${currentStudent.code})`,
                usedAt: new Date().toLocaleString('ar-EG')
            }) 
        });

        // 4. تحديث الأرقام في الشاشة فوراً وتفريغ الحقل
        window.updateWalletUI();
        codeInput.value = ""; 
        notify(`🎉 تم شحن ${amount} ج.م بنجاح! رصيدك الآن ${currentStudent.walletBalance} ج.م`, "success");

    } catch (e) { 
        console.error(e);
        notify("حدث خطأ في الاتصال بالإنترنت!", "error"); 
    } finally {
        window.isProcessingTransaction = false;
        if(btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
};

        // ==========================================
        // 🌟 باقي الدوال
        // ==========================================
        function logoutStudent() {
            localStorage.removeItem("AlQaisar_System_student_code");
            localStorage.removeItem("AlQaisar_System_parent_phone");
            localStorage.removeItem("AlQaisar_System_teacher_id");
            location.reload(); 
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            let targetTab = document.getElementById(tabId);
            if(targetTab) targetTab.classList.add('active');
            if(event && event.currentTarget) event.currentTarget.classList.add('active');
        }

        async function submitRegistration() {
            globalTeacherId = "AlQaisar_System";
            let type = document.getElementById("regType").value;
            
            let genderInput = document.getElementById("regGender");
            let studentGender = genderInput ? genderInput.value : "غير محدد";

            let studentData = {
                name: document.getElementById("regName").value.trim(),
                track: document.getElementById("regTrackGroup") && document.getElementById("regTrackGroup").style.display !== 'none' ? document.getElementById("regTrack").value : "عام",
                phone: document.getElementById("regPhone").value.trim() || "0",
                parentPhone: document.getElementById("regParentPhone").value.trim() || "0",
                level: document.getElementById("regLevel").value,
                gender: studentGender,
                timestamp: new Date().toISOString(),
                regType: type
            };

            if (!studentData.name || studentData.phone === "0" || studentData.parentPhone === "0") {
                return alert("يرجى ملء الاسم وأرقام الهواتف بشكل صحيح!");
            }

            let btn = document.getElementById("submitRegBtn");
            let msgEl = document.getElementById("regMsg");
            btn.innerText = "جاري الإرسال... ⏳"; btn.disabled = true;

            try {
                if (type === 'center') {
                    // طالب المستر
                    studentData.centerName = document.getElementById("regCenterName").value.trim();
                    studentData.groupPref = document.getElementById("regGroupPref").value.trim();
                    studentData.status = "pending";

                    await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/join_requests/${Date.now()}.json`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentData)
                    });

                    msgEl.style.color = "var(--success)";
                    msgEl.innerText = "✅ تم إرسال طلبك بنجاح! في انتظار موافقة الإدارة.";
                    setTimeout(() => { closeAuthModal(); msgEl.innerText = ""; }, 3000);

                } else {
                    // طالب الأونلاين (تفعيل فوري)
                    studentData.gov = document.getElementById("regGov").value.trim();
                    studentData.school = document.getElementById("regSchool").value.trim();
                    
                    let targetGroup = "أونلاين - " + studentData.level;
                    studentData.group = targetGroup; 
                    studentData.behaviorPoints = 0;

                    let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`);
                    let studentsArray = await res.json() || [];
                    studentsArray = Array.isArray(studentsArray) ? studentsArray : Object.values(studentsArray).filter(s => s !== null);
                    
                    // --- 🚨 الحماية من التكرار 🚨 ---
                    let duplicate = studentsArray.find(s => 
                        (studentData.phone !== "0" && s.phone === studentData.phone) || 
                        (studentData.parentPhone !== "0" && s.parentPhone === studentData.parentPhone) || 
                        (s.name.trim() === studentData.name.trim())
                    );

                    if (duplicate) {
                        msgEl.style.color = "var(--danger)";
                        msgEl.innerText = "❌ مسجل مسبقاً! استخدم 'نسيت كود الطالب' لاسترجاع الكود.";
                        btn.innerText = 'إنشاء حساب أونلاين 🚀'; 
                        btn.disabled = false;
                        return; // وقف التسجيل هنا ومنع التكرار
                    }
                    // ---------------------------------

                    let baseNum = 0;
                    if (studentData.level.includes("الأول")) baseNum = 1000;
                    else if (studentData.level.includes("الثاني")) baseNum = 2000;
                    else if (studentData.level.includes("الثالث")) baseNum = 3000;

                    let lastNum = baseNum;
                    for (let i = studentsArray.length - 1; i >= 0; i--) {
                        let s = studentsArray[i];
                        if (s.code && String(s.code).startsWith("O-") && s.level === studentData.level) {
                            let num = parseInt(String(s.code).split("-")[1], 10);
                            if (!isNaN(num)) {
                                lastNum = num;
                                break;
                            }
                        }
                    }

                    studentData.code = "O-" + (lastNum + 1).toString();

                    studentsArray.push(studentData);
                    await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentsArray)
                    });

                    let groupsRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/groups.json`);
                    let groupsArray = await groupsRes.json() || [];
                    groupsArray = Array.isArray(groupsArray) ? groupsArray : Object.values(groupsArray).filter(g => g !== null);

                    let groupExists = groupsArray.some(g => g.name === targetGroup);
                    if (!groupExists) {
                        groupsArray.push({ name: targetGroup, level: studentData.level, payType: "session", price: 0 });
                        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/groups.json`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupsArray)
                        });
                    }

                    document.getElementById('auth-modal').classList.remove('active');
                    document.getElementById('newOnlineCodeDisplay').innerText = studentData.code;
                    document.getElementById('successOnlineModal').style.display = 'flex';
                    
                    document.getElementById("studentCode").value = studentData.code;
                    document.getElementById("parentPhone").value = studentData.parentPhone;
                }
            } catch(e) {
                msgEl.style.color = "var(--danger)";
                msgEl.innerText = "❌ حدث خطأ أثناء الاتصال بالإنترنت!";
            }
            btn.innerText = type === 'center' ? 'إرسال طلب الانضمام 🚀' : 'إنشاء حساب أونلاين 🚀';
            btn.disabled = false;
        }
        

        async function retrieveStudentCode() {
            let phone = document.getElementById("forgotPhoneInput").value.trim();
            let msgEl = document.getElementById("forgotMsg");
            let btn = document.getElementById("retrieveCodeBtn");
            
            if(!phone || phone === "0" || phone.length < 10) {
                msgEl.style.display = "block";
                msgEl.style.color = "var(--danger)";
                msgEl.style.background = "rgba(239, 68, 68, 0.1)";
                msgEl.innerText = "يرجى إدخال رقم الهاتف بشكل صحيح!";
                return;
            }

            btn.innerText = "جاري البحث... ⏳"; btn.disabled = true;
            msgEl.style.display = "none";

            try {
                let globalTeacherId = "AlQaisar_System";
                let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`);
                let studentsArray = await res.json() || [];
                studentsArray = Array.isArray(studentsArray) ? studentsArray : Object.values(studentsArray).filter(s => s !== null);

                let foundStudent = studentsArray.find(s => s && (s.parentPhone === phone || s.phone === phone));

                msgEl.style.display = "block";
                if(foundStudent) {
    msgEl.style.color = "var(--success)";
    msgEl.style.background = "rgba(16, 185, 129, 0.1)";
    msgEl.style.padding = "20px";
    
    msgEl.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 16px; margin-bottom: 10px; font-weight: bold;">✅ تم العثور على حسابك!</div>
            <div style="font-size: 15px; margin-bottom: 15px; color: var(--text-main);">الاسم: <strong style="color: var(--secondary);">${foundStudent.name}</strong></div>
            <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 5px; font-weight: bold;">الكود الخاص بك:</div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 2px dashed #10b981; padding: 10px 15px; border-radius: 12px; margin-top: 10px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.1);">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: var(--primary); margin-right: 10px;">${foundStudent.code}</span>
                <button onclick="navigator.clipboard.writeText('${foundStudent.code}'); this.innerHTML='✅ تم النسخ'; this.style.background='#10b981'; this.style.color='white'; this.style.borderColor='#10b981'; setTimeout(()=> {this.innerHTML='📋 نسخ الكود'; this.style.background='#f8fafc'; this.style.color='var(--text-main)'; this.style.borderColor='#cbd5e1';}, 2000);" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-weight: 900; font-size: 13px; cursor: pointer; transition: 0.3s; color: var(--text-main); font-family: 'Cairo';">
                    📋 نسخ الكود
                </button>
            </div>
            
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 15px; font-weight: bold;">انسخ الكود واضغط على (العودة لتسجيل الدخول) لاستخدامه.</p>
        </div>
    `;
} else {
                    msgEl.style.color = "var(--danger)";
                    msgEl.style.background = "rgba(239, 68, 68, 0.1)";
                    msgEl.innerText = "❌ لم يتم العثور على أي طالب بهذا الرقم!";
                }
            } catch(e) {
                msgEl.style.display = "block";
                msgEl.style.color = "var(--danger)";
                msgEl.style.background = "rgba(239, 68, 68, 0.1)";
                msgEl.innerText = "❌ خطأ في الاتصال بالإنترنت!";
            }

            btn.innerText = "البحث عن الكود 🔍"; btn.disabled = false;
        }
        window.studentHasAccess = function(lec) {
    try {
        if (!currentStudent) return false;
        
        // 1. فحص الشراء المباشر للكورس أو الفيديو
        if (currentStudent.purchasedCourses && Array.isArray(currentStudent.purchasedCourses)) {
            if (currentStudent.purchasedCourses.includes(lec.id)) return true;
        }

        // 2. تجميع كل الحصص المرتبطة بهذا الفيديو (سواء النظام القديم أو المصفوفة الجديدة)
        let linkedArr = [];
        if (lec.videos && Array.isArray(lec.videos)) {
            lec.videos.forEach(v => {
                if (v.linkedSessions && Array.isArray(v.linkedSessions)) {
                    linkedArr = linkedArr.concat(v.linkedSessions);
                }
                if (v.linkedSession && !linkedArr.includes(v.linkedSession)) {
                    linkedArr.push(v.linkedSession);
                }
            });
        }
        if (lec.linkedSessions) {
            if (Array.isArray(lec.linkedSessions)) linkedArr = linkedArr.concat(lec.linkedSessions);
            else linkedArr.push(String(lec.linkedSessions));
        }
        if (lec.linkedSession && !linkedArr.includes(lec.linkedSession)) linkedArr.push(lec.linkedSession);

        // 3. التحقق مما إذا كان الطالب حضر في "أي" حصة من هذه الحصص
        if (linkedArr.length > 0 && window.allClassSessions) {
            let sessionsArray = Array.isArray(window.allClassSessions) ? window.allClassSessions : Object.values(window.allClassSessions);
            for (let sessId of linkedArr) {
                if (!sessId) continue;
                let session = sessionsArray.find(s => s && String(s.id) === String(sessId));
                if (session && session.attendance) {
                    let attendanceStatus = session.attendance[String(currentStudent.code)] || session.attendance[String(currentStudent.phone)];
                    if (attendanceStatus === 'present' || attendanceStatus === 'late') {
                        return true; // لو حضر في سنتر أو حضر تعويض في سنتر تاني، هيفتح معاه فوراً!
                    }
                }
            }
        }
        return false; 
    } catch(err) { return false; }
};
        async function fetchStudentNotifications() {
            try {
                let notifRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/notifications.json`);
                let notifsData = await notifRes.json() || {};
                let notifsList = Object.values(notifsData).filter(n => {
                    if (!n || !n.target) return false;
                    if (n.target === 'all' || n.target === currentStudent.phone || n.target === currentStudent.group || n.target === currentStudent.level) return true;
                    return false;
                }).reverse();
                let readNotifs = JSON.parse(localStorage.getItem(`read_notifs_${currentStudent.code}`)) || [];
                let unreadCount = 0; let notifHtml = "";
                notifsList.forEach(n => {
                    let isRead = readNotifs.includes(n.id);
                    if (!isRead) unreadCount++;
                    notifHtml += `
                    <div style="background: ${isRead ? 'var(--card-bg)' : '#eff6ff'}; padding: 12px 15px; border-radius: 8px; border-right: 4px solid ${isRead ? 'var(--text-muted)' : 'var(--primary)'}; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border: 1px solid var(--border); border-right-width: 4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
                            <h5 style="margin: 0; color: var(--text-main); font-size: 14px; font-weight: bold;">${n.title}</h5>
                            ${!isRead ? '<span style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%;"></span>' : ''}
                        </div>
                        <p style="margin: 0 0 5px 0; font-size: 13px; color: var(--text-muted); line-height: 1.5;">${n.message}</p>
                        <span style="font-size: 10px; color: #94a3b8; display: block; text-align: left;">🕒 ${n.date || ''}</span>
                    </div>`;
                });
                window.currentLoadedNotifsIds = notifsList.map(n => n.id);
                let notifListContainer = document.getElementById("notif-list");
                let notifBadge = document.getElementById("notif-badge");
                if(notifsList.length > 0) {
                    if(notifListContainer) notifListContainer.innerHTML = notifHtml;
                    if(notifBadge) {
                        if (unreadCount > 0) { notifBadge.style.display = "inline-block"; notifBadge.innerText = unreadCount; }
                        else { notifBadge.style.display = "none"; }
                    }
                } else {
                    if(notifListContainer) notifListContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding: 15px; font-size: 13px; font-weight:bold;">لا توجد إشعارات حالياً 📭</div>`;
                    if(notifBadge) notifBadge.style.display = "none";
                }
            } catch(e) {}
        }

        window.toggleNotifications = function() {
            let dropdown = document.getElementById("notif-dropdown");
            if (!dropdown) return;
            let isOpening = dropdown.style.display === "none";
            dropdown.style.display = isOpening ? "block" : "none";
            if (isOpening && window.currentLoadedNotifsIds && window.currentLoadedNotifsIds.length > 0 && currentStudent) {
                let readNotifs = JSON.parse(localStorage.getItem(`read_notifs_${currentStudent.code}`)) || [];
                window.currentLoadedNotifsIds.forEach(id => { if (!readNotifs.includes(id)) readNotifs.push(id); });
                localStorage.setItem(`read_notifs_${currentStudent.code}`, JSON.stringify(readNotifs));
                let notifBadge = document.getElementById("notif-badge");
                if (notifBadge) notifBadge.style.display = "none";
            }
        };

        window.loadStudentStore = async function() {
            let container = document.getElementById("student-store-grid");
            if(!container) return;
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; font-weight:bold;">جاري تحميل المتجر... ⏳</div>`;
            try {
                let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/store/items.json`);
                let items = await res.json() || {};
                let itemsArray = Object.values(items).reverse();
                if(itemsArray.length === 0) {
                    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:30px; font-weight:bold;">لا توجد عناصر.</div>`;
                } else {
                    container.innerHTML = itemsArray.map(item => {
                        let priceText = item.currency === 'points' ? `${item.price} نقطة` : `${item.price} ج.م`;
                        let icon = item.currency === 'points' ? '⭐' : '💰';
                        return `
                        <div style="background:var(--bg-color); border-radius:20px; overflow:hidden; border:1px solid var(--border); display:flex; flex-direction:column; box-shadow: 0 5px 15px rgba(0,0,0,0.03);">
                            <img src="${item.image}" style="width:100%; height:160px; object-fit:cover; border-bottom:4px solid var(--primary);">
                            <div style="padding:20px; display:flex; flex-direction:column; flex:1;">
                                <h4 style="margin:0 0 8px 0; font-size:18px;">${item.name}</h4>
                                <div style="margin-top:auto; background:white; padding:12px; border-radius:12px; text-align:center; margin-bottom:15px; border: 1px dashed var(--border);">
                                    <span style="font-weight:900; color:var(--primary); font-size:16px;">${icon} ${priceText}</span>
                                </div>
                                <button id="btn_buy_${item.id}" class="btn" style="border-radius:12px; font-size:15px;" onclick="purchaseStoreItem('${item.id}', '${item.name}', ${item.price}, '${item.currency}')">استبدال / شراء 🎁</button>
                            </div>
                        </div>`;
                    }).join('');
                }
                loadStudentOrdersHistory();
            } catch(e) {}
        };

        window.loadStudentOrdersHistory = async function() {
            let tbody = document.getElementById("student-orders-tbody");
            if(!tbody) return;
            try {
                let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/store/logs.json`);
                let logs = await res.json() || {};
                let myOrders = Object.values(logs).filter(log => log.studentCode === currentStudent.code).reverse();
                if(myOrders.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-weight:bold;">لم تقم بأي عمليات شراء.</td></tr>`; return; }
                tbody.innerHTML = myOrders.map(o => `<tr><td>${o.date}</td><td><strong style="color:var(--primary);">${o.itemName}</strong></td><td><span class="badge" style="background:#f1f5f9; color:var(--text-muted);">${o.currency==='points'?'نقاط ⭐':'محفظة 💰'}</span></td><td><span class="badge badge-present">نجاح ✅</span></td></tr>`).join('');
            } catch(e) {}
        };

        window.purchaseStoreItem = async function(itemId, itemName, price, currency) {
            price = parseFloat(price);
            if (currency === 'points') {
                if ((currentStudent.totalScore || 0) < price) return alert("مجموع النقاط الشامل لا يكفي لتنفيذ العملية.");
                if (!confirm("تأكيد العملية؟ سيتم خصم النقاط من مجموعك الشامل.")) return; 
                
                // 💡 نقوم بالخصم من نقاط السلوك الأساسية لكي يتم تقليل المجموع الشامل نهائياً
                currentStudent.behaviorPoints -= price; 
                currentStudent.totalScore -= price;
            } else {
                if ((currentStudent.walletBalance || 0) < price) return alert("الرصيد في المحفظة لا يكفي.");
                if (!confirm("تأكيد العملية؟")) return; 
                currentStudent.walletBalance -= price;
            }
            try {
                let dataRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data.json`);
                let data = await dataRes.json();
                let sIdx = data.students.findIndex(s => s && s.code === currentStudent.code);
                if (sIdx > -1) {
                    let updates = currency === 'points' ? { behaviorPoints: currentStudent.behaviorPoints } : { walletBalance: currentStudent.walletBalance };
                    await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students/${sIdx}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
                    await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/store/logs/${"order_" + Date.now()}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: "order_" + Date.now(), date: new Date().toLocaleString('ar-EG'), studentName: currentStudent.name, studentCode: currentStudent.code, itemName: itemName, price: price, currency: currency }) });
                    alert("تم إتمام العملية بنجاح!"); location.reload(); 
                }
            } catch (e) { alert("حدث خطأ أثناء تنفيذ العملية."); }
        };

        window.submitForumQuestion = async function() {
            let text = document.getElementById("forumQuestionInput").value.trim();
            if(!text) return alert("اكتب السؤال أولاً!");
            let questionObj = { id: "q_" + Date.now(), studentName: currentStudent.name, studentGroup: currentStudent.group, studentPhone: currentStudent.phone, questionText: text, replyText: "", date: new Date().toLocaleDateString('ar-EG') };
            try {
                await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/forum/${questionObj.id}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(questionObj) });
                document.getElementById("forumQuestionInput").value = ""; alert("تم نشر سؤالك! 🚀"); loadForumQuestions();
            } catch(e) {}
        };

        window.loadForumQuestions = async function() {
            let container = document.getElementById("forum-questions-list");
            if(!container) return;
            try {
                let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/forum.json`);
                let data = await res.json() || {}; container.innerHTML = "";
                let myGroupQuestions = Object.values(data).filter(q => q && q.studentGroup === currentStudent.group).reverse();
                if(myGroupQuestions.length === 0) { container.innerHTML = `<div style="text-align:center; padding:20px; font-weight:bold; color:var(--text-muted);">لا توجد نقاشات.</div>`; return; }
                container.innerHTML = myGroupQuestions.map(q => `
                    <div style="background:#f8fafc; padding:20px; border-radius:16px; border:1px solid var(--border); box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold; color:var(--text-muted); margin-bottom:10px;"><span>👤 ${q.studentName}</span><span>🕒 ${q.date}</span></div>
                        <p style="font-weight:900; color:var(--secondary); font-size:16px;">❓ السؤال: ${q.questionText}</p>
                        <div style="background:white; padding:15px; border-radius:12px; border-right:4px solid ${q.replyText ? 'var(--success)' : 'var(--danger)'}; border-left:1px solid var(--border); border-top:1px solid var(--border); border-bottom:1px solid var(--border);">
                            ${q.replyText ? `💡 <strong>الرد:</strong> <span style="color:#059669; font-weight:bold;">${q.replyText}</span>` : '⏳ <em>بانتظار الرد...</em>'}
                        </div>
                    </div>`).join('');
            } catch(e) {}
        };

        
        window.showOnlineExams = async function(isRenderOnly = false) {
            if(!isRenderOnly) {
                document.getElementById("app-layout").style.display = "none";
                document.getElementById("online-exams-list-screen").style.display = "block";
            }
            const container = document.getElementById("available-exams-container");
            container.innerHTML = `<div style="text-align:center; font-weight:bold; grid-column:1/-1;">جاري جلب الامتحانات...</div>`;
            try {
                let subRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions.json`);
                let allSubs = await subRes.json() || {};
                window.studentSubmissions = allSubs;
                let myExams = allOnlineExams.filter(e => {
    if(!e || (e.status !== "open" && e.status !== "closed")) return false;
    let groupArray = Array.isArray(e.group) ? e.group : [e.group];
    let groupMatch = groupArray.includes(currentStudent.group) || groupArray.includes("all");
    let trackMatch = !e.track || e.track === 'all' || e.track === (currentStudent.track || 'عام');
    return groupMatch && trackMatch;
});
                container.innerHTML = "";
                if (myExams.length === 0) { container.innerHTML = `<div style="text-align:center; grid-column:1/-1; font-weight:bold;">لا توجد امتحانات إلكترونية حالياً.</div>`; return; }
                
                myExams.forEach(exam => {
                    let examSubs = allSubs[exam.id] || {};
                    let isSubmitted = examSubs[currentStudent.code];
                    if (!isSubmitted && currentStudent.phone && String(currentStudent.phone).trim() !== "0") {
                        isSubmitted = examSubs[currentStudent.phone];
                    }

                    let actionBtn = "";
                    if (isSubmitted) {
                        let canViewResult = exam.autoShowResult || isSubmitted.isGraded;
                        let viewBtn = canViewResult ? `<button class="btn" style="width: auto; background: var(--secondary); font-size: 14px; padding: 8px 15px;" onclick="reviewExam('${exam.id}')">عرض الإجابات</button>` : `<button class="btn" style="width: auto; background: #cbd5e1; color:#475569; font-size: 14px; padding: 8px 15px;" disabled>مخفية للتقييم</button>`;
                        actionBtn = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%; border-top: 1px solid var(--border); padding-top: 15px; margin-top:15px;"><span style="font-weight:900; color:var(--text-main);">النتيجة: <span style="color:var(--primary); font-size:18px;">${canViewResult ? `${isSubmitted.score}/${exam.totalScore}` : "قيد المراجعة"}</span></span> ${viewBtn}</div>`;
                    } else {
                        actionBtn = exam.status === "closed" ? `<div style="text-align:center; width:100%; color:var(--danger); font-weight:900; background:#fee2e2; padding:10px; border-radius:10px;">انتهى وقت الامتحان</div>` : `<button class="btn" style="background:linear-gradient(45deg, #10b981, #059669); width:100%; padding:15px; border-radius:12px; font-weight:900;" onclick="startExam('${exam.id}')">بدء الامتحان 🚀</button>`;
                    }
                    container.innerHTML += `<div class="exam-card" style="flex-direction:column; align-items:flex-start;"><h3 style="margin:0 0 10px 0; color:var(--secondary); font-size:20px; font-weight:900;">${exam.title}</h3><span style="font-weight:bold; color:var(--text-muted); font-size:14px;">⏱️ المدة: ${exam.duration} دقيقة</span>${actionBtn}</div>`;
                });
            } catch(e) {}
        };

       // ==========================================
// 🚀 نظام الامتحانات الإلكترونية (Slideshow LTR)
// ==========================================

// دالة التنقل بين الأسئلة (السلايدز)
window.currentSlideIndex = 0;


window.submitOnlineExam = async function(isTimeOut = false) {
    if (!isTimeOut && !confirm("هل أنت متأكد من تسليم الامتحان؟ (تأكد من إجابتك على جميع الأسئلة)")) return; 
    clearInterval(examTimerInterval);
    
    let totalScore = 0; let studentAnswers = {};
    currentExam.questions.forEach(q => {
        let qScore = 0;
        if (q.type === 'mcq') { let selected = document.querySelector(`input[name="ans_${q.id}"]:checked`); let ansVal = selected ? parseInt(selected.value) : -1; studentAnswers[q.id] = ansVal; if (ansVal === q.correctAnswerIndex) qScore = q.points; } 
        else if (q.type === 'tf') { let selected = document.querySelector(`input[name="ans_${q.id}"]:checked`); let ansVal = selected ? selected.value : ""; studentAnswers[q.id] = ansVal; if (ansVal === String(q.correctAnswerTF || q.correctAnswer)) qScore = q.points; } 
        else if (q.type === 'blank') { let ansVal = document.getElementById(`ans_${q.id}`).value.trim(); studentAnswers[q.id] = ansVal; if (ansVal.toLowerCase() === (q.correctAnswerText || "").toLowerCase()) qScore = q.points; } 
        else if (q.type === 'essay') { studentAnswers[q.id] = document.getElementById(`ans_${q.id}`).value.trim(); }
        totalScore += qScore;
    });
    
    try {
        // تغيير حالة زراير التسليم
        document.querySelectorAll(".slide-submit-btn, #submitExamBtn").forEach(btn => {
            if(btn) { btn.innerText = "جاري الحفظ... ⏳"; btn.disabled = true; }
        });

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions/${currentExam.id}/${currentStudent.code}.json`, { 
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ score: totalScore, maxScore: currentExam.totalScore, answers: studentAnswers, timestamp: new Date().toISOString() }) 
        });
        
        alert("تم التسليم بنجاح! 🎯"); 
        document.getElementById("active-exam-screen").style.display = "none"; 
        showOnlineExams(); 
        
    } catch (e) { 
        alert("خطأ بالاتصال بالإنترنت!"); 
    } finally { 
        document.querySelectorAll(".slide-submit-btn, #submitExamBtn").forEach(btn => {
            if(btn) { btn.innerText = "تسليم الامتحان نهائياً ✅"; btn.disabled = false; }
        }); 
    }
}


        window.closeReviewScreen = function() { document.getElementById("review-exam-screen").style.display = "none"; document.getElementById("online-exams-list-screen").style.display = "block"; };
        window.backToDashboard = function() { document.getElementById("online-exams-list-screen").style.display = "none"; document.getElementById("app-layout").style.display = "block"; }

        

        window.toggleCustomFullscreen = function() {
            let player = document.getElementById("video-wrapper");
            let btn = document.getElementById("custom-fs-btn");
            if (!document.fullscreenElement) {
                if (player.requestFullscreen) { player.requestFullscreen(); }
                else if (player.webkitRequestFullscreen) { player.webkitRequestFullscreen(); }
                else if (player.msRequestFullscreen) { player.msRequestFullscreen(); }
                btn.innerText = "🗗 تصغير الشاشة";
            } else {
                if (document.exitFullscreen) { document.exitFullscreen(); }
                else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
                else if (document.msExitFullscreen) { document.msExitFullscreen(); }
                btn.innerText = "⛶ تكبير الشاشة";
            }
        };
        

        // ==========================================
// 🎬 مشغل الكورسات (Playlist & Video Player) المحدث
// ==========================================

// ==========================================
// 🎬 مشغل الكورسات (Playlist & Video Player) المحدث
// ==========================================

window.historiaPlyrInstance = null;
window.videoProgressTimer = null;

window.playCourseVideo = async function(url, videoTitle, courseId, videoIndex, element = null) {
    let course = window.allLectures.find(l => l.id === courseId);
    if (!course) return;

    let maxViews = parseInt(course.maxViews) || 0; 
    let usedKey = currentStudent.code;
    let trackingUrlCode = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking/${courseId}/${usedKey}/${videoIndex}.json`;
    let resCode = await fetch(trackingUrlCode);
    let data = await resCode.json();

    if (!data && currentStudent.phone && currentStudent.phone !== "0") {
        let trackingUrlPhone = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking/${courseId}/${currentStudent.phone}/${videoIndex}.json`;
        let resPhone = await fetch(trackingUrlPhone);
        data = await resPhone.json();
        if (data && data.views > 0) usedKey = currentStudent.phone;
    }
    
    data = data || { views: 0 };
    let extraViews = parseInt(data.extraViews) || 0;
    let totalAllowed = maxViews + extraViews;

    let now = new Date();
    let isViewCounted = false;

    if (data.lastRawTime) {
        let lastTime = new Date(data.lastRawTime);
        let diffMins = Math.floor((now - lastTime) / 60000);
        if (diffMins < 10) {
            if(typeof showToast === 'function') showToast("إعادة استكمال المشاهدة (لن تُخصم فرصة مشاهدة جديدة) 🔄", "info");
        } else {
            isViewCounted = true;
        }
    } else {
        isViewCounted = true;
    }

    if (isViewCounted && maxViews > 0 && data.views >= totalAllowed) {
        if(typeof showToast === 'function') showToast("🚫 لقد استنفدت العدد المسموح لمشاهدة هذا الفيديو. يرجى مراجعة إدارة المستر.", "error");
        else alert("🚫 لقد استنفدت العدد المسموح لمشاهدة هذا الفيديو.");
        return; 
    }

    // تحديث الشكل في القائمة الجانبية
    if (element) {
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.setAttribute('data-active', 'false');
            item.style.background = 'transparent';
            item.style.color = '#94a3b8';
            item.style.borderRight = '4px solid transparent';
            item.style.fontWeight = 'bold';
            let iconSpan = item.querySelector('.vid-icon');
            if(iconSpan) iconSpan.innerText = '📺'; 
        });

        element.setAttribute('data-active', 'true');
        element.style.background = 'rgba(59, 130, 246, 0.15)';
        element.style.color = '#3b82f6';
        element.style.borderRight = '4px solid #3b82f6';
        element.style.fontWeight = '900';
        let activeIconSpan = element.querySelector('.vid-icon');
        if(activeIconSpan) activeIconSpan.innerText = '▶';
    }

    // استخراج كود فيديو اليوتيوب
    let youtubeId = null;
    try {
        let parsedUrl = new URL(url);
        if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
            youtubeId = parsedUrl.searchParams.get('v');
            if (!youtubeId && parsedUrl.hostname === 'youtu.be') youtubeId = parsedUrl.pathname.substring(1);
            if (youtubeId) youtubeId = youtubeId.split('&')[0];
        }
    } catch(e) {}

    // تنظيف أي مشغل سابق
    if (window.videoProgressTimer) clearInterval(window.videoProgressTimer);
    if (window.historiaPlyrInstance) {
        try { window.historiaPlyrInstance.destroy(); } catch(e) {}
        window.historiaPlyrInstance = null;
    }

    let mountEl = document.getElementById("plyr-video-Mount");
    let progressStorageKey = `AlQaisar_System_vid_pos_${currentStudent.code}_${courseId}_${videoIndex}`;
    let savedSeconds = parseFloat(localStorage.getItem(progressStorageKey)) || 0;

    if (youtubeId && typeof Plyr !== 'undefined' && mountEl) {
        mountEl.innerHTML = `<div id="plyr-active-player" data-plyr-provider="youtube" data-plyr-embed-id="${youtubeId}"></div>`;
        
        window.historiaPlyrInstance = new Plyr('#plyr-active-player', {
            controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
            settings: ['speed', 'quality'],
            speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
            seekTime: 10,
            youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });

        window.historiaPlyrInstance.on('ready', () => {
            if (savedSeconds > 15) {
                window.historiaPlyrInstance.currentTime = savedSeconds;
                let mins = Math.floor(savedSeconds / 60);
                let secs = Math.floor(savedSeconds % 60);
                if (typeof showToast === 'function') {
                    showToast(`▶️ تم استكمال المحاضرة تلقائياً من الدقيقة ${mins}:${secs < 10 ? '0'+secs : secs}`, "success");
                }
            }
        });

        // حفظ ثانية المشاهدة كل 5 ثوانٍ لاستكمالها لاحقاً
        window.videoProgressTimer = setInterval(() => {
            if (window.historiaPlyrInstance && window.historiaPlyrInstance.playing) {
                let cur = window.historiaPlyrInstance.currentTime;
                let dur = window.historiaPlyrInstance.duration;
                if (cur > 10 && (!dur || cur < dur - 15)) {
                    localStorage.setItem(progressStorageKey, cur);
                }
            }
        }, 5000);

    } else if (mountEl) {
        // دعم روابط Google Drive أو أي منصة خارجية
        mountEl.innerHTML = `<iframe id="video-iframe" src="${url}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>`;
    }

    // إظهار ملزمة الـ PDF ومفكرة الطالب
    if (typeof window.renderLectureToolsBox === 'function') {
        window.renderLectureToolsBox(courseId, videoIndex);
    }

    // تحديث عدد المشاهدات في الفايربيز
    let newViewsCount = isViewCounted ? data.views + 1 : data.views;
    let dateStr = now.toLocaleDateString('ar-EG') + " | " + now.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    let updateUrl = `https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking/${courseId}/${usedKey}/${videoIndex}.json`;
    await fetch(updateUrl, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            videoTitle: videoTitle, 
            views: newViewsCount, 
            lastSeen: dateStr, 
            lastRawTime: now.toISOString(),
            extraViews: extraViews 
        })
    });
};

window.closeCoursePlayer = function() {
    if (window.videoProgressTimer) clearInterval(window.videoProgressTimer);
    if (window.historiaPlyrInstance) {
        try { window.historiaPlyrInstance.destroy(); } catch(e) {}
        window.historiaPlyrInstance = null;
    }
    let mountEl = document.getElementById("plyr-video-Mount");
    if (mountEl) mountEl.innerHTML = "";

    document.body.classList.remove("no-select");
    document.getElementById("protected-course-screen").style.display = "none";
    document.getElementById("app-layout").style.display = "block";
    
    document.removeEventListener('contextmenu', blockContext);
    document.removeEventListener('keydown', blockKeys);
    window.removeEventListener('blur', applyBlackout);
    window.removeEventListener('focus', removeBlackout);
};
// دالة مساعدة سريعة للفحص
function canPlay(idx, vids, courseId, hasPurchasedWholeCourse) {
    if(idx >= vids.length || idx < 0) return false;
    let v = vids[idx];
    let specificVideoId = `${courseId}_v${idx}`; 
    let isVideoFree = v.type === 'free' || !v.type; 
    let hasPurchasedVideo = currentStudent.purchasedCourses && (currentStudent.purchasedCourses.includes(specificVideoId) || hasPurchasedWholeCourse);
    let didAttend = false;
    let linkedArr = [];
    if (v.linkedSessions && Array.isArray(v.linkedSessions)) linkedArr = linkedArr.concat(v.linkedSessions);
    if (v.linkedSession && !linkedArr.includes(v.linkedSession)) linkedArr.push(v.linkedSession);
    if (linkedArr.length > 0 && window.allClassSessions) {
        for (let sessId of linkedArr) {
            let sessionObj = window.allClassSessions.find(s => String(s.id) === String(sessId));
            if (sessionObj && sessionObj.attendance) {
                let status = sessionObj.attendance[currentStudent.code] || sessionObj.attendance[currentStudent.phone];
                if (status === 'present' || status === 'late' || (typeof status === 'object' && status.status === 'makeup')) { didAttend = true; break; }
            }
        }
    }
    let isLockedByExam = false;
    if (v.requiredExam) {
        let examSubs = window.studentSubmissions ? window.studentSubmissions[v.requiredExam] : null;
        let studentSub = examSubs ? (examSubs[currentStudent.code] || examSubs[currentStudent.phone]) : null;
        if (!studentSub) isLockedByExam = true;
        else {
            let requiredExamObj = allOnlineExams.find(e => e.id === v.requiredExam);
            if (requiredExamObj) {
                let passScore = requiredExamObj.passScore || (requiredExamObj.totalScore / 2);
                if (studentSub.score < passScore) isLockedByExam = true;
            }
        }
    }
    return (isVideoFree || hasPurchasedVideo || didAttend) && !isLockedByExam;
}

// ==========================================
// 🌙 1. تفعيل الوضع الليلي للطالب
// ==========================================
window.toggleStudentDarkMode = function() {
    document.body.classList.toggle('dark-mode');
    let isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('AlQaisar_System_student_dark', isDark ? 'true' : 'false');
    let btn = document.getElementById('student-theme-btn');
    if (btn) btn.innerText = isDark ? '☀️' : '🌙';
};
if (localStorage.getItem('AlQaisar_System_student_dark') === 'true') {
    document.body.classList.add('dark-mode');
    setTimeout(() => {
        let btn = document.getElementById('student-theme-btn');
        if (btn) btn.innerText = '☀️';
    }, 300);
}

// ==========================================
// 🚀 2. نظام الامتحانات العالمي لمادة التاريخ والجغرافيا (RTL + خرائط + شبكة أسئلة)
// ==========================================
window.currentSlideIndex = 0;

window.goToSlide = function(targetIndex) {
    let slides = document.querySelectorAll('.q-slide');
    if (slides.length === 0 || targetIndex < 0 || targetIndex >= slides.length) return;
    slides[window.currentSlideIndex].style.display = 'none';
    window.currentSlideIndex = targetIndex;
    slides[window.currentSlideIndex].style.display = 'block';
    window.updateQuestionNavigatorUI();
};

window.navigateSlide = function(step) {
    window.goToSlide(window.currentSlideIndex + step);
};

window.markQuestionAnswered = function(index) {
    let navBtn = document.getElementById(`q_nav_btn_${index}`);
    if (navBtn) navBtn.setAttribute('data-answered', 'true');
    window.updateQuestionNavigatorUI();
};

window.updateQuestionNavigatorUI = function() {
    document.querySelectorAll('.q-nav-dot').forEach((btn, idx) => {
        let isAnswered = btn.getAttribute('data-answered') === 'true';
        let isCurrent = idx === window.currentSlideIndex;
        if (isCurrent) {
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
            btn.style.transform = 'scale(1.12)';
            btn.style.borderColor = 'var(--primary)';
        } else if (isAnswered) {
            btn.style.background = '#d1fae5';
            btn.style.color = '#047857';
            btn.style.borderColor = '#10b981';
            btn.style.transform = 'scale(1)';
        } else {
            btn.style.background = 'var(--card-bg)';
            btn.style.color = 'var(--text-muted)';
            btn.style.borderColor = 'var(--border)';
            btn.style.transform = 'scale(1)';
        }
    });
};

window.startExam = function(examId) {
    currentExam = allOnlineExams.find(e => e.id === examId); 
    if(!currentExam) return;
    if(!confirm(`هل أنت مستعد لبدء الامتحان؟\n⏱️ المدة: ${currentExam.duration} دقيقة.`)) return;
    
    document.getElementById("online-exams-list-screen").style.display = "none"; 
    document.getElementById("active-exam-screen").style.display = "block";
    document.getElementById("active-exam-title").innerText = currentExam.title;
    
    let oldSubmitBtn = document.getElementById("submitExamBtn");
    if(oldSubmitBtn) oldSubmitBtn.style.display = "none";

    const container = document.getElementById("exam-questions-render"); 
    window.currentSlideIndex = 0;

    // 🧭 شريط شبكة أرقام الأسئلة العلوي (Question Navigator)
    let navBarHtml = `
    <div style="background: var(--card-bg); padding: 15px; border-radius: 18px; border: 1px solid var(--border); margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; box-shadow: var(--glass-shadow); direction: rtl;">
        ${currentExam.questions.map((q, idx) => `
            <button type="button" id="q_nav_btn_${idx}" class="q-nav-dot" onclick="goToSlide(${idx})" style="width: 38px; height: 38px; border-radius: 10px; border: 2px solid var(--border); font-weight: 900; font-size: 14px; cursor: pointer; transition: 0.2s;">
                ${idx + 1}
            </button>
        `).join('')}
    </div>`;

    let slidesHtml = "";
    const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];

    currentExam.questions.forEach((q, index) => {
        let displayStyle = index === 0 ? "block" : "none";
        let imageHtml = q.imageUrl ? `
            <div style="margin: 0 0 20px 0; text-align: center;">
                <img src="${q.imageUrl}" alt="خريطة / صورة السؤال" style="max-width: 100%; max-height: 320px; border-radius: 16px; border: 2px solid var(--border); box-shadow: 0 8px 20px rgba(0,0,0,0.08); cursor: zoom-in;" onclick="window.open(this.src, '_blank')">
                <span style="display: block; font-size: 11px; color: var(--text-muted); margin-top: 5px;">🔍 اضغط على الخريطة/الصورة لتكبيرها</span>
            </div>` : "";

        let qHtml = `<div class="q-slide" id="slide_${index}" style="display: ${displayStyle}; background: var(--card-bg); padding: 30px 25px; border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); border: 1px solid var(--border); margin-bottom: 20px; direction: rtl; text-align: right;">`;
        
        qHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px dashed var(--border); padding-bottom: 15px;">
            <span style="color: var(--secondary); font-weight: 900; background: var(--bg-color); padding: 8px 16px; border-radius: 12px;">📜 السؤال ${index + 1} من ${currentExam.questions.length}</span>
            <span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 8px 20px; border-radius: 12px; font-weight: 900; font-size: 15px; border: 1px solid rgba(245, 158, 11, 0.3);">🎯 ${q.points} درجات</span>
        </div>`;

        qHtml += `<h3 style="color: var(--secondary); font-size: 21px; line-height: 1.7; margin: 0 0 20px 0; font-weight: 900;">${index + 1}. ${q.text}</h3>`;
        qHtml += imageHtml;

        if (q.type === 'mcq') { 
            qHtml += `<div class="q-options" style="display: flex; flex-direction: column; gap: 12px;">`; 
            q.options.forEach((opt, optIndex) => { 
                let letterBadge = arabicLetters[optIndex] || (optIndex + 1);
                
                // دعم ذكي: قراءة الاختيار كنص (الامتحانات القديمة) أو كصورة ونص (الامتحانات الجديدة)
                let optText = typeof opt === 'object' ? opt.text : opt;
                let optImage = (typeof opt === 'object' && opt.image) ? `<img src="${opt.image}" style="max-height: 90px; border-radius: 8px; margin-right: 15px; border: 1px solid var(--border);">` : '';

                qHtml += `<label style="display: flex; align-items: center; gap: 15px; background: var(--bg-color); border: 2px solid var(--border); padding: 15px 20px; border-radius: 16px; cursor: pointer; transition: 0.25s; font-size: 17px; font-weight: 700;"
                onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(inp => {inp.parentElement.style.borderColor='var(--border)'; inp.parentElement.style.background='var(--bg-color)';}); this.style.borderColor='var(--primary)'; this.style.background='rgba(152, 0, 0, 0.06)'; markQuestionAnswered(${index});">
                    <input type="radio" name="ans_${q.id}" value="${optIndex}" style="width: 20px; height: 20px; accent-color: var(--primary);"> 
                    <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900;">${letterBadge}</span>
                    <span style="flex: 1; display: flex; align-items: center;">${optText} ${optImage}</span>
                </label>`; 
            }); 
            qHtml += `</div>`; 
        }
        else if (q.type === 'tf') { 
            qHtml += `
            <div class="q-options" style="display: flex; gap: 15px;">
                <label style="flex: 1; text-align: center; background: rgba(16, 185, 129, 0.05); border: 2px solid #10b981; padding: 18px; border-radius: 16px; cursor: pointer; font-size: 20px; font-weight: 900; color: #10b981; transition: 0.3s;" onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(i=>{i.parentElement.style.background='transparent'; i.parentElement.style.opacity='0.5'}); this.style.background='rgba(16, 185, 129, 0.15)'; this.style.opacity='1'; markQuestionAnswered(${index});">
                    <input type="radio" name="ans_${q.id}" value="true" style="display:none;"> ✔️ العبارة صحيحة
                </label>
                <label style="flex: 1; text-align: center; background: rgba(239, 68, 68, 0.05); border: 2px solid #ef4444; padding: 18px; border-radius: 16px; cursor: pointer; font-size: 20px; font-weight: 900; color: #ef4444; transition: 0.3s;" onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(i=>{i.parentElement.style.background='transparent'; i.parentElement.style.opacity='0.5'}); this.style.background='rgba(239, 68, 68, 0.15)'; this.style.opacity='1'; markQuestionAnswered(${index});">
                    <input type="radio" name="ans_${q.id}" value="false" style="display:none;"> ❌ العبارة خاطئة
                </label>
            </div>`; 
        } 
        else if (q.type === 'blank') { 
            qHtml += `<input type="text" id="ans_${q.id}" oninput="markQuestionAnswered(${index})" placeholder="اكتب إجابتك هنا..." style="font-size: 17px; padding: 15px; border-radius: 14px; border: 2px solid var(--border); width: 100%; direction: rtl; text-align: right; font-weight: bold;">`; 
        } 
        else if (q.type === 'essay') { 
            qHtml += `<textarea id="ans_${q.id}" oninput="markQuestionAnswered(${index})" rows="4" placeholder="اكتب إجابتك المقالية بالتفصيل هنا..." style="font-size: 17px; padding: 15px; border-radius: 14px; border: 2px solid var(--border); resize: vertical; width: 100%; direction: rtl; text-align: right; font-weight: bold;"></textarea>`; 
        }

        qHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border);">
            <button class="btn btn-secondary" style="width: auto; padding: 12px 28px; font-size: 16px; border-radius: 12px; opacity: ${index === 0 ? '0.3' : '1'}; pointer-events: ${index === 0 ? 'none' : 'auto'};" onclick="navigateSlide(-1)">➡️ السؤال السابق</button>
            ${index === currentExam.questions.length - 1 ? 
                `<button class="btn slide-submit-btn" style="width: auto; background: var(--success); padding: 12px 30px; font-size: 17px; font-weight: 900; border-radius: 12px;" onclick="submitOnlineExam()">تسليم الامتحان نهائياً ✅</button>` : 
                `<button class="btn" style="width: auto; padding: 12px 35px; font-size: 17px; font-weight: 900; border-radius: 12px;" onclick="navigateSlide(1)">السؤال التالي ⬅️</button>`
            }
        </div></div>`;

        slidesHtml += qHtml;
    });

    container.innerHTML = navBarHtml + slidesHtml;
    window.updateQuestionNavigatorUI();
    
    let timeInSeconds = currentExam.duration * 60; 
    const timerDisplay = document.getElementById('exam-timer');
    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimerInterval = setInterval(() => { 
        let m = Math.floor(timeInSeconds / 60), s = timeInSeconds % 60; 
        timerDisplay.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`; 
        if(timeInSeconds <= 60) timerDisplay.parentElement.style.background = "var(--danger)";
        if (timeInSeconds <= 0) { clearInterval(examTimerInterval); submitOnlineExam(true); } 
        timeInSeconds--; 
    }, 1000);
};

// شاشة المراجعة بالعربية مع عرض الخريطة وتفسير ناتج التعلم
window.reviewExam = function(examId) {
    let exam = allOnlineExams.find(e => e.id === examId); 
    let examSubs = window.studentSubmissions[examId] || {};
    let sub = examSubs[currentStudent.code] || (currentStudent.phone !== "0" ? examSubs[currentStudent.phone] : null);

    if(!exam || !sub) return;
    document.getElementById("online-exams-list-screen").style.display = "none"; 
    document.getElementById("review-exam-screen").style.display = "block";
    
    document.getElementById("review-exam-title").innerText = exam.title; 
    document.getElementById("review-exam-score").innerText = sub.score; 
    document.getElementById("review-exam-total").innerText = exam.totalScore;
    
    let container = document.getElementById("review-questions-render"); 
    container.innerHTML = "";
    
    exam.questions.forEach((q, index) => {
        let studentAns = sub.answers ? sub.answers[q.id] : undefined; 
        let qScore = 0; let isCorrect = false; let ansHtml = "";
        
        if (q.type === 'mcq') { 
            qHtml += `<div class="q-options" style="display: flex; flex-direction: column; gap: 12px;">`; 
            q.options.forEach((opt, optIndex) => { 
                let letterBadge = arabicLetters[optIndex] || (optIndex + 1);
                
                // دعم ذكي: قراءة الاختيار كنص (الامتحانات القديمة) أو كصورة ونص (الامتحانات الجديدة)
                let optText = typeof opt === 'object' ? opt.text : opt;
                let optImage = (typeof opt === 'object' && opt.image) ? `<img src="${opt.image}" style="max-height: 90px; border-radius: 8px; margin-right: 15px; border: 1px solid var(--border);">` : '';

                qHtml += `<label style="display: flex; align-items: center; gap: 15px; background: var(--bg-color); border: 2px solid var(--border); padding: 15px 20px; border-radius: 16px; cursor: pointer; transition: 0.25s; font-size: 17px; font-weight: 700;"
                onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(inp => {inp.parentElement.style.borderColor='var(--border)'; inp.parentElement.style.background='var(--bg-color)';}); this.style.borderColor='var(--primary)'; this.style.background='rgba(152, 0, 0, 0.06)'; markQuestionAnswered(${index});">
                    <input type="radio" name="ans_${q.id}" value="${optIndex}" style="width: 20px; height: 20px; accent-color: var(--primary);"> 
                    <span style="background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900;">${letterBadge}</span>
                    <span style="flex: 1; display: flex; align-items: center;">${optText} ${optImage}</span>
                </label>`; 
            }); 
            qHtml += `</div>`; 
        } else if (q.type === 'tf') {
            isCorrect = (String(studentAns) === String(q.correctAnswerTF || q.correctAnswer)); qScore = isCorrect ? q.points : 0;
            ansHtml = `<div style="background: ${isCorrect?'#d1fae5':'#fee2e2'}; color: #0f172a; padding:15px; border-radius:12px; font-weight:bold; border:2px solid ${isCorrect?'#10b981':'#ef4444'}; font-size: 16px;">إجابتك: ${studentAns==='true'?'صحيحة ✔️':'خاطئة ❌'} <br> الإجابة النموذجية: ${(q.correctAnswerTF || q.correctAnswer)==='true'?'صحيحة ✔️':'خاطئة ❌'}</div>`;
        } else {
            qScore = (sub.manualGrades && sub.manualGrades[q.id] !== undefined) ? sub.manualGrades[q.id] : (studentAns === q.correctAnswerText ? q.points : 0);
            ansHtml = `<div style="background:var(--bg-color); padding:15px; border-radius:12px; border:2px solid var(--border); font-weight:bold; font-size: 16px;">إجابتك: <span style="color: var(--primary);">${studentAns || 'لم يتم الإجابة'}</span></div>`;
        }

        let explanationHtml = q.explanation ? `
            <div style="margin-top: 15px; background: rgba(16, 185, 129, 0.08); border-right: 4px solid #10b981; padding: 12px 15px; border-radius: 10px; font-size: 14px; font-weight: bold; color: var(--secondary);">
                💡 <strong style="color: #059669;">تفسير ناتج التعلم:</strong> ${q.explanation}
            </div>` : '';

        let imgHtml = q.imageUrl ? `<img src="${q.imageUrl}" style="max-width:100%; max-height:220px; border-radius:12px; margin-bottom:15px; display:block;">` : '';

        container.innerHTML += `
        <div style="background: var(--card-bg); padding: 25px; border-radius: 20px; border: 1px solid var(--border); margin-bottom: 20px; text-align: right; direction: rtl;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px dashed var(--border); padding-bottom: 12px;">
                <span style="color: var(--secondary); font-weight: 900;">السؤال ${index + 1}</span>
                <span style="background: ${qScore > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${qScore > 0 ? '#10b981' : '#ef4444'}; padding: 6px 16px; border-radius: 10px; font-weight: 900;">الدرجة: ${qScore} / ${q.points}</span>
            </div>
            <h3 style="color: var(--secondary); font-size: 19px; line-height: 1.6; margin: 0 0 15px 0;">${q.text}</h3>
            ${imgHtml}
            ${ansHtml}
            ${explanationHtml}
        </div>`;
    });
};

// ==========================================
// 📄📝 3. عرض ملزمة الـ PDF ومفكرة الملاحظات داخل مشغل الفيديو
// ==========================================
window.renderLectureToolsBox = function(courseId, videoIndex) {
    let course = window.allLectures.find(l => l.id === courseId);
    if (!course) return;
    let vid = (course.videos || [])[videoIndex] || {};
    let playlistEl = document.getElementById("player-playlist");
    if (!playlistEl) return;

    let oldBox = document.getElementById("student-lecture-tools-box");
    if (oldBox) oldBox.remove();

    let noteKey = `AlQaisar_System_note_${currentStudent.code}_${courseId}_${videoIndex}`;
    let savedNote = localStorage.getItem(noteKey) || "";

    let pdfBtnHtml = vid.pdfUrl ? `
        <a href="${vid.pdfUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(45deg, #8b5cf6, #6d28d9); color: white; text-decoration: none; padding: 12px; border-radius: 12px; font-weight: 900; font-size: 14px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
            📄 تحميل ملزمة المحاضرة (PDF)
        </a>` : '';

    let toolsDiv = document.createElement("div");
    toolsDiv.id = "student-lecture-tools-box";
    toolsDiv.style.cssText = "margin-top: 25px; padding-top: 20px; border-top: 1px dashed #334155;";
    toolsDiv.innerHTML = `
        ${pdfBtnHtml}
        <h4 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 14px;">📝 دون ملاحظاتك على المحاضرة:</h4>
        <textarea id="studentLectureNoteInput" rows="4" placeholder="اكتب أهم التواريخ والشخصيات هنا ليتم حفظها لك..." style="width: 100%; background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: bold; resize: vertical;">${savedNote}</textarea>
        <button onclick="localStorage.setItem('${noteKey}', document.getElementById('studentLectureNoteInput').value); alert('✅ تم حفظ ملاحظاتك على هذه المحاضرة بنجاح!');" style="width: 100%; margin-top: 8px; background: #10b981; color: white; border: none; padding: 10px; border-radius: 10px; font-weight: 900; cursor: pointer;">💾 حفظ الملاحظات</button>
    `;
    playlistEl.appendChild(toolsDiv);
};

        

        function blockContext(e) { e.preventDefault(); }
        function blockKeys(e) { if(e.keyCode == 123 || e.keyCode == 44) { e.preventDefault(); return false; } }
        
        function applyBlackout() { 
            let courseScreen = document.getElementById("protected-course-screen");
            let iframe = document.getElementById("video-iframe");
            if (document.activeElement === iframe) return; 
            if (courseScreen && courseScreen.style.display === "flex") { 
                if(iframe) iframe.style.filter = "blur(30px)"; 
                let blackout = document.getElementById("blackout-screen");
                if(blackout) blackout.style.display = "flex"; 
            } 
        }
        
        function removeBlackout() { 
            let courseScreen = document.getElementById("protected-course-screen");
            if(courseScreen && courseScreen.style.display === "flex") { 
                let iframe = document.getElementById("video-iframe");
                if(iframe) iframe.style.filter = "none"; 
                let blackout = document.getElementById("blackout-screen");
                if(blackout) blackout.style.display = "none"; 
                window.focus(); 
            } 
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                let courseScreen = document.getElementById("protected-course-screen");
                if (courseScreen && courseScreen.style.display === "flex") {
                    let iframe = document.getElementById("video-iframe");
                    if(iframe) iframe.style.filter = "blur(30px)";
                    let blackout = document.getElementById("blackout-screen");
                    if(blackout) blackout.style.display = "flex";
                }
            }
        });

        window.addEventListener('blur', applyBlackout);
        window.addEventListener('focus', removeBlackout);

        // 1. عرض الكروت من بره (شيلنا زرار الشراء، خلينا الدخول مجاني عشان يشتري من جوه)
        // --- 🎬 عرض الكورسات المفلترة (حسب صف ومسار الطالب) ---
window.renderStudentLectures = function() {
    let list = document.getElementById("studentLecturesList");
    if(!list) return; 
    list.innerHTML = "";
    
    let filteredLectures = window.allLectures.filter(lec => {
        if (!lec || lec.isHidden === true) return false; 
        
        // 🔴 التعديل السحري: لو الطالب ضيف ومربوط بكورس معين، هيشوف الكورس ده بس (ويتجاهل أي فلتر تاني للصف)
        if (currentStudent.guestCourseOnly) {
            return lec.id === currentStudent.guestCourseOnly;
        }

        let levelMatch = (lec.level === "all" || lec.level === currentStudent.level);
        let trackMatch = (!lec.track || lec.track === 'all' || lec.track === (currentStudent.track || 'عام'));
        return levelMatch && trackMatch;
    });

    if(filteredLectures.length === 0) {
        list.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; font-weight:bold; color:var(--text-muted); background: var(--card-bg); border-radius: 20px; border: 2px dashed var(--border);">لا توجد كورسات متاحة لصفك الدراسي حالياً.</div>`;
        return;
    }

    // رسم الكروت للكورسات المفلترة فقط
    filteredLectures.forEach(lec => {
        let maxViews = parseInt(lec.maxViews) || 0;
        let viewsInfo = maxViews > 0 ? ` 👁️ ${maxViews} مشاهدة` : ` 👁️ غير محدود`;
        
        let badgeHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center; justify-content:flex-end;">
                            <span style="background: rgba(245, 158, 11, 0.95); color: white; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 900;">${viewsInfo}</span>
                            <span style="background: rgba(14, 165, 233, 0.95); color: white; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 900;">${(lec.videos||[]).length} محاضرات</span>
                         </div>`;

        let actionBtns = `<button class="btn" style="width: 100%; background: #3b82f6; font-weight: 900; padding: 15px; border-radius: 12px; box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);" onclick="openStudentCourseDetails('${lec.id}')">▶️ تصفح محتوى الكورس</button>`;

        list.innerHTML += `
        <div style="background: var(--card-bg); border-radius: 20px; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 10px 20px rgba(0,0,0,0.04); display: flex; flex-direction: column; transition: all 0.3s ease;">
            <div style="position: relative;">
                <img src="${lec.image}" style="width: 100%; height: 200px; object-fit: cover; border-bottom: 4px solid var(--primary);">
                <div style="position: absolute; top: 15px; right: 15px; width: calc(100% - 30px);">${badgeHtml}</div>
            </div>
            <div style="padding: 25px; display: flex; flex-direction: column; flex: 1;">
                <h3 style="margin: 0 0 15px 0; color: var(--secondary); font-size: 20px; font-weight: 900; line-height: 1.4;">${lec.title}</h3>
                <p style="margin: 0 0 25px 0; font-size: 14px; color: var(--text-muted); font-weight: bold; line-height: 1.8;">${lec.desc || 'لا توجد تفاصيل إضافية لهذا الكورس.'}</p>
                <div style="margin-top: auto;">${actionBtns}</div>
            </div>
        </div>`;
    });
};


// 2. النافذة المنبثقة للفيديوهات (هنا السحر كله: بيقيم كل فيديو لوحده)
window.openStudentCourseDetails = async function(courseId) {
    let course = window.allLectures.find(l => l.id === courseId);
    if(!course) return;

    let allSubs = {};
    let safeExams = [];
    try {
        // جلب الإجابات عشان نتأكد الطالب امتحن ولا لا
        let subRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions.json`);
        allSubs = await subRes.json() || {};
        window.studentSubmissions = allSubs;

        // جلب الامتحانات من السيرفر مباشرة عشان نجيب اسم الامتحان المطلوب
        let examsRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/onlineExams.json`);
        let fetchedExams = await examsRes.json() || [];
        safeExams = Array.isArray(fetchedExams) ? fetchedExams : Object.values(fetchedExams).filter(e => e !== null);
    } catch(e) {}

    document.getElementById("detailsCourseTitle").innerText = course.title;
    document.getElementById("detailsCourseImage").src = course.image || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop';
    document.getElementById("detailsCourseDesc").innerText = course.desc || "تفاصيل المحاضرات بالأسفل.";

    let vids = course.videos || [];
    let playlistHtml = "";
    
    // دعم النظام القديم (لو الطالب كان شاري الكورس القديم كله يتفتحله)
    let hasPurchasedWholeCourse = currentStudent.purchasedCourses && currentStudent.purchasedCourses.includes(courseId);

    vids.forEach((v, idx) => {
        let safeTitle = v.title.replace(/'/g, "\\'");
        let specificVideoId = `${courseId}_v${idx}`; 
        
        let isVideoFree = v.type === 'free' || !v.type; 
        let videoPrice = v.price || 0;
        
        let hasPurchasedVideo = currentStudent.purchasedCourses && (currentStudent.purchasedCourses.includes(specificVideoId) || hasPurchasedWholeCourse);

        // فحص شرط الحضور (لو الفيديو مربوط بحصة)
        // فحص شرط الحضور (لو الفيديو مربوط بحصة أو أكثر)
        let didAttend = false;
        let linkedArr = [];
        if (v.linkedSessions && Array.isArray(v.linkedSessions)) linkedArr = linkedArr.concat(v.linkedSessions);
        if (v.linkedSession && !linkedArr.includes(v.linkedSession)) linkedArr.push(v.linkedSession);

        if (linkedArr.length > 0 && window.allClassSessions) {
            for (let sessId of linkedArr) {
                let sessionObj = window.allClassSessions.find(s => String(s.id) === String(sessId));
                if (sessionObj && sessionObj.attendance) {
                    let status = sessionObj.attendance[currentStudent.code] || sessionObj.attendance[currentStudent.phone];
                    if (status === 'present' || status === 'late' || (typeof status === 'object' && status.status === 'makeup')) {
                        didAttend = true;
                        break; // لو حضر حصة واحدة منهم تكفي لفتح الفيديو مجاناً
                    }
                }
            }
        }

        // فحص شرط الامتحان
        let isLockedByExam = false;
        let requiredExamObj = null;
        
        if (v.requiredExam) {
    requiredExamObj = safeExams.find(e => e.id === v.requiredExam); 
    
    let examSubs = allSubs[v.requiredExam];
    let studentSub = examSubs ? (examSubs[currentStudent.code] || examSubs[currentStudent.phone]) : null;
    
    if (!studentSub) {
        isLockedByExam = true; // لم يمتحن بعد
    } else {
        // حساب درجة النجاح أو الاعتماد على النصف لو لم تكن مسجلة قديماً
        let passScore = requiredExamObj.passScore || (requiredExamObj.totalScore / 2);
        if (studentSub.score < passScore) {
            isLockedByExam = true; // رسب في الامتحان!
            requiredExamObj.failed = true; // علامة لمعرفة أنه امتحن ولكنه رسب
        }
    }
}

        let canWatch = isVideoFree || hasPurchasedVideo || didAttend;

        if (isLockedByExam && requiredExamObj) {
    if (requiredExamObj.failed) {
        // ❌ حالة الرسوب (جاب درجة أقل من درجة النجاح)
        playlistHtml += `
        <div style="background: var(--bg-color); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--danger); margin-bottom: 10px; opacity: 0.9;">
            <span style="font-weight: 900; color: var(--secondary); font-size: 15px;">🔒 ${v.title} <br><span style="font-size:13px; color:var(--danger);">لم تجتز الامتحان (${requiredExamObj.title}) - تواصل مع الإدارة للإعادة</span></span>
            <button class="btn" style="background: var(--danger); padding: 8px 15px; width: auto; font-size: 13px; font-weight: bold; border-radius: 10px; cursor: not-allowed;" disabled>راسب ❌</button>
        </div>`;
    } else {
        // 🔒 حالة لم يمتحن من الأساس
        playlistHtml += `
        <div style="background: var(--bg-color); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 10px; opacity: 0.9;">
            <span style="font-weight: 900; color: var(--secondary); font-size: 15px;">🔒 ${v.title} <br><span style="font-size:13px; color:#f59e0b;">مغلق بامتحان: (${requiredExamObj.title})</span></span>
            <button class="btn" style="background: #f59e0b; padding: 8px 15px; width: auto; font-size: 13px; font-weight: bold; border-radius: 10px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3); animation: pulse-glow 2s infinite;" onclick="document.getElementById('studentCourseDetailsModal').style.display='none'; showOnlineExams();">انتقل للامتحان 📝</button>
        </div>`;
    }
} else if (isLockedByExam && !requiredExamObj) {
            // لو المدرس مسح الامتحان من السيستم بس لسه مربوط هنا (أمان)
            playlistHtml += `
            <div style="background: var(--bg-color); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 10px; opacity: 0.7;">
                <span style="font-weight: 900; color: var(--secondary); font-size: 15px;">🔒 ${v.title} <br><span style="font-size:12px; color:var(--danger);">الامتحان المطلوب غير متاح حالياً</span></span>
                <button class="btn" style="background: #94a3b8; padding: 8px 15px; width: auto; font-size: 13px; font-weight: bold; border-radius: 10px; cursor: not-allowed;" disabled>مغلق 🔐</button>
            </div>`;
        } else if (canWatch) {
            // إضافة زر الـ PDF إذا كان متوفراً
            let pdfBtn = v.pdfUrl ? `<a href="${v.pdfUrl}" target="_blank" class="btn" style="background: #8b5cf6; padding: 8px 15px; width: auto; font-size: 14px; font-weight: bold; border-radius: 10px; color: white; text-decoration: none;">📄 الملزمة</a>` : "";
            
            playlistHtml += `
            <div style="background: #f0fdf4; padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #10b981; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                <span style="font-weight: 900; color: #065f46; font-size: 16px;">▶️ ${v.title}</span>
                <div style="display: flex; gap: 10px;">
                    ${pdfBtn}
                    <button class="btn" style="background: var(--success); padding: 8px 20px; width: auto; font-size: 14px; font-weight: bold; border-radius: 10px;" onclick="document.getElementById('studentCourseDetailsModal').style.display='none'; openCoursePlayer('${course.id}', ${idx})">تشغيل المحاضرة ▶️</button>
                </div>
            </div>`;
        } else {
            // محتاج يشتري
            playlistHtml += `
            <div style="background: var(--bg-color); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 10px;">
                <span style="font-weight: 900; color: var(--secondary); font-size: 15px;">🔒 ${v.title}</span>
                <button class="btn" style="background: #10b981; padding: 8px 15px; width: auto; font-size: 14px; font-weight: bold; border-radius: 10px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);" onclick="purchaseVideo('${course.id}', ${idx}, ${videoPrice}, '${safeTitle}')">شراء (${videoPrice} ج.م) 🛒</button>
            </div>`;
        }
    });

    document.getElementById("detailsCoursePlaylist").innerHTML = playlistHtml;
    document.getElementById("studentCourseDetailsModal").style.display = "flex";
};


        // ==========================================
// 🔙 نظام التنقل الذكي وزر الرجوع (History API) - خاص بمنصة الطالب
// ==========================================

window.isHistoryNavigating = false;

// 1. تسجيل الرئيسية كأول نقطة عند فتح المنصة
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (document.getElementById("app-layout").style.display === "block") {
            history.replaceState({ type: 'tab', id: 'tab-home' }, '', '#tab-home');
        }
    }, 1500);
});

// 2. تحديث دالة switchTab بالكامل عشان تشتغل مع زرار الرجوع بدون مشاكل
window.switchTab = function(tabId, fromHistory = false) {
    // إخفاء كل التابات
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    // إظهار التاب المطلوب
    let targetTab = document.getElementById(tabId);
    if(targetTab) targetTab.classList.add('active');
    
    // تفعيل الزرار الجانبي (Sidebar) الخاص بيه
    document.querySelectorAll('.nav-item').forEach(nav => {
        if (nav.getAttribute('onclick') && nav.getAttribute('onclick').includes(tabId)) {
            nav.classList.add('active');
        }
    });

    // تسجيل في الهيستوري
    if (!fromHistory && !window.isHistoryNavigating) {
        history.pushState({ type: 'tab', id: tabId }, '', `#${tabId}`);
    }
};

// 3. تتبع شاشة الامتحانات الإلكترونية المباشرة
const originalShowOnlineExams = window.showOnlineExams;


const originalBackToDashboard = window.backToDashboard;
window.backToDashboard = function(fromHistory = false) {
    if (originalBackToDashboard) originalBackToDashboard();
    if (!fromHistory && !window.isHistoryNavigating) {
        history.pushState({ type: 'tab', id: 'tab-exams' }, '', '#tab-exams');
    }
};

// 4. تتبع مشغل المحاضرات (الفيديو DRM)
const originalOpenCoursePlayer = window.openCoursePlayer;
window.openCoursePlayer = function(courseId, startVideoIndex = 0, fromHistory = false) {
    if (originalOpenCoursePlayer) originalOpenCoursePlayer(courseId, startVideoIndex);
    if (!fromHistory && !window.isHistoryNavigating) {
        history.pushState({ type: 'player', id: courseId }, '', `#player-${courseId}`);
    }
};

const originalCloseCoursePlayer = window.closeCoursePlayer;
window.closeCoursePlayer = function(fromHistory = false) {
    if (originalCloseCoursePlayer) originalCloseCoursePlayer();
    if (!fromHistory && !window.isHistoryNavigating) {
        history.pushState({ type: 'tab', id: 'tab-lectures' }, '', '#tab-lectures');
    }
};

// 5. صائد زرار الرجوع 🔙 في الموبايل والمتصفح
window.addEventListener('popstate', function(event) {
    window.isHistoryNavigating = true;
    const state = event.state;

    // قفل أي Popups أو Modals مفتوحة
    let detailsModal = document.getElementById('studentCourseDetailsModal');
    if(detailsModal) detailsModal.style.display = 'none';

    if (state) {
        if (state.type === 'tab') {
            // لو بيرجع لتاب عادي، نقفل أي شاشة كاملة كانت مفتوحة
            let onlineExams = document.getElementById('online-exams-list-screen');
            let activeExam = document.getElementById('active-exam-screen');
            let reviewExam = document.getElementById('review-exam-screen');
            let courseScreen = document.getElementById('protected-course-screen');
            let appLayout = document.getElementById('app-layout');

            if(onlineExams) onlineExams.style.display = 'none';
            if(activeExam) activeExam.style.display = 'none';
            if(reviewExam) reviewExam.style.display = 'none';
            if(courseScreen) courseScreen.style.display = 'none';
            if(appLayout) appLayout.style.display = 'block';

            // استدعاء التاب المطلوب
            window.switchTab(state.id, true);
        } 
        else if (state.type === 'screen' && state.id === 'online-exams') {
            window.showOnlineExams(false, true);
        }
        else if (state.type === 'player') {
            window.openCoursePlayer(state.id, 0, true);
        }
    } else {
        // لو الهيستوري فاضي نرجعه للرئيسية كأمان
        let onlineExams = document.getElementById('online-exams-list-screen');
        let courseScreen = document.getElementById('protected-course-screen');
        let appLayout = document.getElementById('app-layout');

        if(onlineExams) onlineExams.style.display = 'none';
        if(courseScreen) courseScreen.style.display = 'none';
        if(appLayout) appLayout.style.display = 'block';

        window.switchTab('tab-home', true);
    }

    setTimeout(() => { window.isHistoryNavigating = false; }, 100);
});


// تأثير الآلة الكاتبة
const texts = ["التاريخ والجغرافيا", "الأحداث والشخصيات", "نواتج التعلم", "حل الامتحانات"];
let count = 0;
let index = 0;
let currentText = '';
let letter = '';

(function type() {
    if (count === texts.length) { count = 0; }
    currentText = texts[count];
    letter = currentText.slice(0, ++index);
    
    let typewriterEl = document.getElementById('typewriter-text');
    if (typewriterEl) typewriterEl.textContent = letter;
    
    if (letter.length === currentText.length) {
        count++;
        index = 0;
        setTimeout(type, 2000); // يستنى ثانيتين قبل ما يكتب الكلمة اللي بعدها
    } else {
        setTimeout(type, 100); // سرعة الكتابة
    }
}());

 

// ==========================================
// 🚀 نظام دخول الضيوف باستخدام أكواد الشحن والكاميرا
// ==========================================
window.validatedGuestCodeAmount = 0;
window.validatedGuestCodeString = "";
let guestHtml5QrcodeScanner = null;

// تشغيل الكاميرا
window.startGuestScanner = function() {
    document.getElementById('guest-scanner-box').style.display = 'block';
    if (!guestHtml5QrcodeScanner) {
        guestHtml5QrcodeScanner = new Html5QrcodeScanner("guest-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    }
    guestHtml5QrcodeScanner.render((decodedText) => {
        // عند التقاط الكود بنجاح
        document.getElementById('guestChargeCode').value = decodedText;
        stopGuestScanner();
        verifyGuestCode(); // ⚡ تفعيل التحقق التلقائي فوراً
    }, (error) => { /* تجاهل أخطاء القراءة المستمرة */ });
};

// إيقاف الكاميرا
window.stopGuestScanner = function() {
    if (guestHtml5QrcodeScanner) {
        guestHtml5QrcodeScanner.clear().then(() => {
            document.getElementById('guest-scanner-box').style.display = 'none';
        }).catch(e => {
            document.getElementById('guest-scanner-box').style.display = 'none';
        });
    } else {
        document.getElementById('guest-scanner-box').style.display = 'none';
    }
};

// 1. التحقق من صحة الكود وقيمته
window.verifyGuestCode = async function() {
    let code = document.getElementById("guestChargeCode").value.trim().toUpperCase();
    let errorMsg = document.getElementById("guestErrorMsg1");
    let btn = document.getElementById("verifyGuestCodeBtn");

    if(!code) {
        errorMsg.innerText = "يرجى إدخال كود الشحن أولاً!";
        errorMsg.style.display = "block";
        return;
    }

    errorMsg.style.display = "none";
    btn.innerText = "جاري التحقق... ⏳";
    btn.disabled = true;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${code}.json`);
        let codeData = await res.json();

        if(!codeData || codeData.status === 'used') {
            errorMsg.innerText = "الكود غير صحيح أو تم استخدامه مسبقاً!";
            errorMsg.style.display = "block";
        } else {
            // الكود سليم، ننتقل للخطوة الثانية
            window.validatedGuestCourseId = codeData.linkedCourseId || null; // 🔴 حفظ مسار الكورس المربوط
            window.validatedGuestCodeAmount = parseFloat(codeData.amount);
            window.validatedGuestCodeString = code;
            document.getElementById("guestCodeValueDisplay").innerText = window.validatedGuestCodeAmount;
            
            document.getElementById("guest-step-1").style.display = "none";
            document.getElementById("guest-step-2").style.display = "block";
        }
    } catch(e) {
        errorMsg.innerText = "خطأ في الاتصال بالإنترنت!";
        errorMsg.style.display = "block";
    }
    btn.innerText = "التحقق من الكود 🔍";
    btn.disabled = false;
};

// 2. إنشاء حساب الضيف وتوزيع المجموعة بذكاء
window.createGuestAccount = async function() {
    let name = document.getElementById("guestName").value.trim();
    let level = document.getElementById("guestLevel").value;
    let phone = document.getElementById("guestPhone").value.trim(); // 🔴 سحب رقم الهاتف الجديد
    let errorMsg = document.getElementById("guestErrorMsg2");
    let btn = document.getElementById("createGuestAccountBtn");

    if(!name || !phone) {
        errorMsg.innerText = "يرجى كتابة الاسم ورقم الهاتف!";
        errorMsg.style.display = "block";
        return;
    }
    
    if(phone.length < 10) {
        errorMsg.innerText = "رقم الهاتف غير صحيح!";
        errorMsg.style.display = "block";
        return;
    }

    errorMsg.style.display = "none";
    btn.innerText = "جاري التجهيز... ⏳";
    btn.disabled = true;

    try {
        // تحديد اسم المجموعة بناءً على الصف
        let targetGroup = "ضيوف أونلاين";
        if (level.includes("الأول")) targetGroup = "ضيف 1ث";
        else if (level.includes("الثاني")) targetGroup = "ضيف 2ث";
        else if (level.includes("الثالث")) targetGroup = "ضيف 3ث";

        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`);
        let studentsArray = await res.json() || [];
        studentsArray = Array.isArray(studentsArray) ? studentsArray : Object.values(studentsArray).filter(s => s !== null);

        // توليد كود طالب مميز (ضيف)
        let randomNum = Math.floor(10000 + Math.random() * 90000);
        let guestCode = "GUEST-" + randomNum;

        let newStudent = {
            code: guestCode,
            name: name + " (ضيف)",
            level: level,
            group: targetGroup, 
            phone: phone, // 🔴 تسجيل رقم الهاتف الفعلي
            parentPhone: phone, // 🔴 استخدام نفس الرقم ككلمة مرور (خانة ولي الأمر)
            gender: "غير محدد",
            track: "عام",
            walletBalance: window.validatedGuestCodeAmount, 
            behaviorPoints: 0,
            guestCourseOnly: window.validatedGuestCourseId,
            timestamp: new Date().toISOString()
        };

        studentsArray.push(newStudent);

        // إنشاء المجموعة إن لم تكن موجودة مسبقاً
        let groupsRes = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/groups.json`);
        let groupsArray = await groupsRes.json() || [];
        groupsArray = Array.isArray(groupsArray) ? groupsArray : Object.values(groupsArray).filter(g => g !== null);

        let groupExists = groupsArray.some(g => g.name === targetGroup);
        if (!groupExists) {
            groupsArray.push({ name: targetGroup, level: level, payType: "session", price: 0 });
            await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/groups.json`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupsArray)
            });
        }

        // حفظ الطالب الجديد + حرق كود الشحن
        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentsArray)
        });

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${window.validatedGuestCodeString}/status.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify("used")
        });

        // الدخول الفوري
        document.getElementById("studentCode").value = guestCode;
        document.getElementById("parentPhone").value = phone; // 🔴 الدخول برقم الهاتف
        document.getElementById('auth-modal').classList.remove('active');
        
        let successModal = document.getElementById('successOnlineModal');
        if(successModal) {
            // 🔴 تعديل رسالة النجاح لتنبيه الطالب بطريقة الدخول المستقبلية
            successModal.innerHTML = `
                <div style="text-align: center; color: white; animation: fadeIn 0.5s ease;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🎉</div>
                    <h1 style="font-size: 35px; margin-bottom: 10px; font-weight: 900;">تم إنشاء الحساب بنجاح!</h1>
                    <p style="font-size: 18px; margin-bottom: 30px;">تم إيداع <strong style="color:var(--accent); font-size:24px;">${window.validatedGuestCodeAmount} ج.م</strong> في محفظتك.<br><br>💡 <strong>ملاحظة هامة: للدخول لاحقاً:</strong><br>استخدم الكود بالأسفل، واكتب رقم هاتفك ككلمة مرور.</p>
                    <div style="background: white; color: var(--success); font-size: 35px; font-weight: 900; padding: 15px 40px; border-radius: 20px; letter-spacing: 5px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); display: inline-block;">${guestCode}</div>
                    <br>
                    <button class="btn-solid" style="background: var(--secondary); margin-top: 30px; width: auto; padding: 15px 40px; display: inline-block;" onclick="document.getElementById('successOnlineModal').style.display='none'; fetchStudentData(true);">الدخول للمنصة الآن ➡</button>
                </div>
            `;
            successModal.style.display = 'flex';
        } else {
            fetchStudentData(true);
        }

    } catch(e) {
        errorMsg.innerText = "حدث خطأ أثناء الإنشاء!";
        errorMsg.style.display = "block";
        btn.innerText = "إنشاء الحساب والدخول 🚀";
        btn.disabled = false;
    }
};


// ==========================================
// 📷 نظام الكاميرا لشحن المحفظة من داخل المنصة
// ==========================================
let walletHtml5QrcodeScanner = null;

// تشغيل كاميرا المحفظة
window.startWalletScanner = function() {
    document.getElementById('wallet-scanner-box').style.display = 'block';
    
    if (!walletHtml5QrcodeScanner) {
        walletHtml5QrcodeScanner = new Html5QrcodeScanner(
            "wallet-reader", 
            { fps: 10, qrbox: { width: 250, height: 250 } }, 
            false
        );
    }
    
    walletHtml5QrcodeScanner.render((decodedText) => {
        // عند التقاط الكود بنجاح:
        document.getElementById('rechargeCodeInput').value = decodedText; // 1. وضع الكود في الخانة
        stopWalletScanner(); // 2. قفل الكاميرا
        redeemCode(); // 3. ⚡ تنفيذ الشحن فوراً وتلقائياً
    }, (error) => { 
        // تجاهل أخطاء القراءة المستمرة أثناء البحث عن الـ QR
    });
};

// إيقاف كاميرا المحفظة
window.stopWalletScanner = function() {
    if (walletHtml5QrcodeScanner) {
        walletHtml5QrcodeScanner.clear().then(() => {
            document.getElementById('wallet-scanner-box').style.display = 'none';
        }).catch(e => {
            document.getElementById('wallet-scanner-box').style.display = 'none';
        });
    } else {
        document.getElementById('wallet-scanner-box').style.display = 'none';
    }
};

// ==========================================
// 📲 نظام طلبات شحن المحفظة بالصورة (فودافون كاش / InstaPay)
// ==========================================
window.compressStudentReceiptImage = function(fileInputId) {
    return new Promise((resolve) => {
        let fileInput = document.getElementById(fileInputId);
        if (!fileInput || !fileInput.files || !fileInput.files[0]) return resolve(null);
        let file = fileInput.files[0];
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = new Image();
            img.onload = function() {
                let canvas = document.createElement('canvas');
                let max = 650;
                let w = img.width, h = img.height;
                if (w > h && w > max) { h *= max / w; w = max; }
                else if (h > max) { w *= max / h; h = max; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

window.submitWalletTopupRequest = async function() {
    if (!currentStudent || !currentStudent.code) return alert("يرجى تسجيل الدخول أولاً!");
    let method = document.getElementById("topupMethod").value;
    let amount = parseFloat(document.getElementById("topupAmount").value);
    let senderPhone = document.getElementById("topupSenderPhone").value.trim();
    let fileInput = document.getElementById("topupReceiptFile");

    if (!amount || amount <= 0 || !senderPhone) {
        return alert("⚠️ يرجى إدخال المبلغ المحول والرقم المحول منه!");
    }
    if (!fileInput.files || fileInput.files.length === 0) {
        return alert("📸 يرجى إرفاق صورة إيصال التحويل (Screenshot) لتأكيد العملية!");
    }

    let btn = document.getElementById("submitTopupReqBtn");
    let origText = btn.innerHTML;
    btn.innerHTML = "جاري رفع الإيصال وإرسال الطلب... ⏳";
    btn.disabled = true;

    try {
        let receiptBase64 = await window.compressStudentReceiptImage("topupReceiptFile");
        let reqId = "topup_" + Date.now();
        let reqData = {
            id: reqId,
            studentCode: currentStudent.code,
            studentName: currentStudent.name,
            studentGroup: currentStudent.group,
            method: method,
            amount: amount,
            senderPhone: senderPhone,
            receiptImage: receiptBase64,
            status: "pending", // pending | approved | rejected
            date: new Date().toLocaleString('ar-EG')
        };

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/wallet_requests/${reqId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData)
        });

        document.getElementById("topupAmount").value = "";
        document.getElementById("topupSenderPhone").value = "";
        fileInput.value = "";

        alert("🎉 تم إرسال طلب الشحن بنجاح! سيتم مراجعته من الإدارة وإضافة الرصيد لمحفظتك قريباً.");
        window.loadStudentTopupRequests();
    } catch (e) {
        alert("حدث خطأ في الاتصال بالإنترنت!");
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
};

window.loadStudentTopupRequests = async function() {
    let tbody = document.getElementById("student-topup-requests-tbody");
    if (!tbody || !currentStudent) return;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/wallet_requests.json`);
        let allReqs = await res.json() || {};
        let myReqs = Object.values(allReqs).filter(r => r && String(r.studentCode) === String(currentStudent.code)).reverse();

        if (myReqs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">لا توجد طلبات شحن سابقة.</td></tr>`;
            return;
        }

        tbody.innerHTML = myReqs.map(r => {
            let badge = r.status === 'approved' 
                ? `<span class="badge badge-present">تم الشحن ✅</span>` 
                : r.status === 'rejected' 
                ? `<span class="badge badge-absent">مرفوض ❌</span>` 
                : `<span class="badge" style="background: #fef3c7; color: #d97706;">قيد المراجعة ⏳</span>`;
            return `<tr>
                <td style="font-size: 13px;">${r.date}</td>
                <td>${r.method}</td>
                <td><strong style="color: var(--primary);">${r.amount} ج.م</strong></td>
                <td>${badge}</td>
            </tr>`;
        }).join('');
    } catch (e) {}
};



// =========================================================
// 💳 1. أنيميشن الكتابة الحية على بطاقة بنك القيصر (16 رقماً)
// =========================================================
window.formatAndAnimateBankCard = function(input) {
    // قبول الأرقام فقط بحد أقصى 16 رقماً
    let rawDigits = input.value.replace(/\D/g, '').substring(0, 16);
    
    // تقسيم الأرقام في حقل الإدخال كل 4 أرقام بمسافة
    let formattedInput = rawDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = formattedInput;

    // تحديث اسم الطالب على البطاقة
    let holderEl = document.getElementById('cardHolderStudentName');
    if (holderEl && window.currentStudent && window.currentStudent.name) {
        holderEl.innerText = window.currentStudent.name;
    }

    // تحريك البطاقة وإضاءة المجموعات الأربع أثناء الكتابة
    let cardEl = document.getElementById('historiaVisualCard');
    if (cardEl) {
        cardEl.classList.add('typing-active');
        clearTimeout(window.cardTypingTimer);
        window.cardTypingTimer = setTimeout(() => cardEl.classList.remove('typing-active'), 600);
    }

    for (let g = 0; g < 4; g++) {
        let groupSpan = document.getElementById(`cg-${g}`);
        if (!groupSpan) continue;
        let part = rawDigits.substring(g * 4, (g + 1) * 4);
        let padded = part.padEnd(4, '#');
        groupSpan.innerText = padded;

        // تمييز المجموعة التي يكتب فيها الطالب الآن باللون الذهبي
        let currentGroupIndex = Math.floor(Math.max(0, rawDigits.length - 1) / 4);
        if (rawDigits.length > 0 && g === currentGroupIndex) {
            groupSpan.classList.add('active-group');
        } else {
            groupSpan.classList.remove('active-group');
        }
    }
};

// =========================================================
// 💰 2. دالة شحن الكود المحدثة (تقرأ الـ 16 رقماً الصافية)
// =========================================================
window.redeemCode = async function() {
    if (window.isProcessingTransaction) return;

    const codeInput = document.getElementById("rechargeCodeInput");
    if (!codeInput) return;

    // استخراج الأرقام فقط (إزالة المسافات أو الشرطات)
    const cleanCode = codeInput.value.replace(/\D/g, '');
    
    const notify = (msg, type = 'success') => {
        if (typeof showToast === 'function') showToast(msg, type);
        else alert(msg);
    };

    if (!cleanCode || cleanCode.length !== 16) {
        return notify("⚠️ يرجى إدخال رقم كارت الشحن كاملاً (16 رقماً)!", "error");
    }
    if (!currentStudent || !currentStudent.code) {
        return notify("يرجى تسجيل الدخول أولاً!", "error");
    }

    window.isProcessingTransaction = true;
    let btn = document.querySelector('button[onclick="redeemCode()"]');
    let origText = btn ? btn.innerHTML : "شحن البطاقة الآن 🚀";
    
    if (btn) {
        btn.innerHTML = "جاري التحقق والشحن... ⏳";
        btn.disabled = true;
        btn.style.opacity = "0.7";
    }

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${cleanCode}.json`);
        let codeData = await res.json();
        
        if (!codeData) {
            notify(`❌ رقم البطاقة (${cleanCode}) غير صحيح! تأكد من الأرقام.`, "error");
            return;
        }
        
        if (codeData.status === 'used') {
            notify("⚠️ هذا الكارت تم شحنه واستخدامه مسبقاً!", "error");
            return;
        }

        let amount = parseFloat(codeData.amount) || 0;

        await window.syncStudentSafeVault();
        currentStudent.walletBalance = (parseFloat(currentStudent.walletBalance) || 0) + amount;
        await window.saveToStudentSafeVault();

        await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${cleanCode}.json`, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                status: "used",
                usedBy: `${currentStudent.name} (${currentStudent.code})`,
                usedAt: new Date().toLocaleString('ar-EG')
            }) 
        });

        window.updateWalletUI();
        codeInput.value = "";
        window.formatAndAnimateBankCard(codeInput); // تصفير شكل البطاقة
        notify(`🎉 تم شحن ${amount} ج.م بنجاح! رصيدك الآن ${currentStudent.walletBalance} ج.م`, "success");

    } catch (e) { 
        notify("حدث خطأ في الاتصال بالإنترنت!", "error"); 
    } finally {
        window.isProcessingTransaction = false;
        if (btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }
};

// تحديث التحقق من كود الضيف ليقرأ الـ 16 رقماً بدون مسافات
window.verifyGuestCode = async function() {
    let rawInput = document.getElementById("guestChargeCode").value;
    let code = rawInput.replace(/\D/g, ''); // أرقام صافية فقط
    let errorMsg = document.getElementById("guestErrorMsg1");
    let btn = document.getElementById("verifyGuestCodeBtn");

    if (!code || code.length !== 16) {
        errorMsg.innerText = "يرجى إدخال رقم الكارت المكون من 16 رقماً!";
        errorMsg.style.display = "block";
        return;
    }

    errorMsg.style.display = "none";
    btn.innerText = "جاري التحقق... ⏳";
    btn.disabled = true;

    try {
        let res = await fetch(`https://saad-62e70-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${code}.json`);
        let codeData = await res.json();

        if (!codeData || codeData.status === 'used') {
            errorMsg.innerText = "رقم الكارت غير صحيح أو تم استخدامه مسبقاً!";
            errorMsg.style.display = "block";
        } else {
            window.validatedGuestCourseId = codeData.linkedCourseId || null;
            window.validatedGuestCodeAmount = parseFloat(codeData.amount);
            window.validatedGuestCodeString = code;
            document.getElementById("guestCodeValueDisplay").innerText = window.validatedGuestCodeAmount;
            document.getElementById("guest-step-1").style.display = "none";
            document.getElementById("guest-step-2").style.display = "block";
        }
    } catch(e) {
        errorMsg.innerText = "خطأ في الاتصال بالإنترنت!";
        errorMsg.style.display = "block";
    }
    btn.innerText = "التحقق من الكود 🔍";
    btn.disabled = false;
};



// =========================================================
// ⚡ محرك OTP Animation V15 للدخول التلقائي الفوري
// =========================================================
window.focusFirstOtpBox = function() {
    const boxes = document.querySelectorAll('#parentPhoneOtpContainer .otp-digit-box');
    if (boxes.length > 0) boxes[0].focus();
};

window.syncOtpBoxesFromHiddenPhone = function(phoneStr) {
    const boxes = document.querySelectorAll('#parentPhoneOtpContainer .otp-digit-box');
    if (!boxes.length) return;
    const clean = String(phoneStr || '').replace(/\D/g, '').substring(0, 11);
    boxes.forEach((box, i) => {
        box.value = clean[i] || '';
        box.classList.toggle('filled', !!clean[i]);
        box.classList.remove('error-state', 'success-state');
    });
    const hiddenInput = document.getElementById('parentPhone');
    if (hiddenInput) hiddenInput.value = clean;
};

window.initOtpLoginSystem = function() {
    const boxes = document.querySelectorAll('#parentPhoneOtpContainer .otp-digit-box');
    const hiddenInput = document.getElementById('parentPhone');
    if (!boxes.length || !hiddenInput) return;

    const updateHiddenAndCheckAutoSubmit = () => {
        let combined = '';
        boxes.forEach(b => { combined += (b.value || ''); });
        hiddenInput.value = combined;

        // إذا اكتمل الـ 11 رقم (أو كتب 0 للطالب بدون رقم)، نفذ الدخول التلقائي فوراً
        if (combined.length === 11) {
            let codeVal = document.getElementById('studentCode')?.value.trim();
            if (!codeVal) {
                document.getElementById('studentCode')?.focus();
                return;
            }
            // تفعيل أنيميشن Verifying مثل الصورة
            let btn = document.getElementById('login-btn-action');
            let btnTxt = document.getElementById('login-btn-text');
            if (btn) btn.classList.add('verifying');
            if (btnTxt) btnTxt.innerText = 'جاري التحقق والدخول...';
            boxes.forEach(b => b.classList.add('success-state'));

            setTimeout(() => {
                fetchStudentData(false);
            }, 250);
        }
    };

    boxes.forEach((box, idx) => {
        // عند كتابة رقم
        box.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            e.target.value = val ? val[val.length - 1] : '';
            
            boxes.forEach(b => b.classList.remove('error-state'));
            document.getElementById('error-msg').style.display = 'none';

            if (e.target.value) {
                e.target.classList.add('filled');
                if (idx < boxes.length - 1) {
                    boxes[idx + 1].focus();
                } else {
                    e.target.blur(); // إغلاق الكيبورد على الموبايل عند آخر رقم
                }
            } else {
                e.target.classList.remove('filled');
            }
            updateHiddenAndCheckAutoSubmit();
        });

        // التعامل مع زر المسح Backspace والأسهم
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!box.value && idx > 0) {
                    boxes[idx - 1].value = '';
                    boxes[idx - 1].classList.remove('filled', 'success-state');
                    boxes[idx - 1].focus();
                    e.preventDefault();
                    updateHiddenAndCheckAutoSubmit();
                } else {
                    box.classList.remove('filled', 'success-state');
                }
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                boxes[idx - 1].focus();
            } else if (e.key === 'ArrowRight' && idx < boxes.length - 1) {
                boxes[idx + 1].focus();
            }
        });

        // دعم لصق الرقم كاملاً (Paste) في أي مربع
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            let pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').substring(0, 11);
            if (!pasted) return;
            boxes.forEach((b, i) => {
                b.value = pasted[i] || '';
                b.classList.toggle('filled', !!pasted[i]);
            });
            let nextFocus = Math.min(pasted.length, boxes.length - 1);
            boxes[nextFocus].focus();
            updateHiddenAndCheckAutoSubmit();
        });
    });
};

// تهيئة الـ OTP فور تحميل الصفحة وربط حالة الخطأ
document.addEventListener('DOMContentLoaded', () => {
    window.initOtpLoginSystem();

    // لو كان هناك رقم محفوظ في الـ localStorage، نوزعه في المربعات
    const savedPhone = localStorage.getItem("AlQaisar_System_parent_phone");
    if (savedPhone) window.syncOtpBoxesFromHiddenPhone(savedPhone);
});

// مراقبة رسائل الخطأ لإعادة زر الـ OTP لحالته وتنبيه المربعات باللون الأحمر
const otpErrorObserver = new MutationObserver(() => {
    const errEl = document.getElementById('error-msg');
    const btn = document.getElementById('login-btn-action');
    const btnTxt = document.getElementById('login-btn-text');
    if (errEl && errEl.style.display === 'block') {
        if (btn) { btn.classList.remove('verifying'); btn.disabled = false; }
        if (btnTxt) btnTxt.innerText = 'تسجيل الدخول 🚀';
        document.querySelectorAll('#parentPhoneOtpContainer .otp-digit-box').forEach(b => {
            b.classList.remove('success-state');
            b.classList.add('error-state');
        });
    }
});
if (document.getElementById('error-msg')) {
    otpErrorObserver.observe(document.getElementById('error-msg'), { attributes: true, attributeFilter: ['style'] });
}


// =========================================================
// 🎨 تطوير واجهة كروت الكورسات، الامتحانات، المتجر، والمشغل (V14 UI)
// =========================================================

// 1. دالة فتح مشغل الكورس المحمي وبناء القائمة الجانبية
window.openCoursePlayer = function(courseId, startVideoIndex = 0) {
    let course = window.allLectures.find(l => l.id === courseId);
    if (!course) return;

    document.getElementById("app-layout").style.display = "none";
    let screen = document.getElementById("protected-course-screen");
    screen.style.display = "flex";
    document.body.classList.add("no-select");

    document.getElementById("player-course-title").innerText = `🎬 ${course.title}`;
    
    let wm = document.getElementById("video-watermark");
    if (wm && currentStudent) {
        wm.innerHTML = `${currentStudent.name}<br>${currentStudent.code}`;
    }

    let playlistEl = document.getElementById("player-playlist");
    let vids = course.videos || [];
    let hasPurchasedWholeCourse = currentStudent.purchasedCourses && currentStudent.purchasedCourses.includes(courseId);

    let html = `<h4 style="color:#f8fafc; margin:0 0 15px 0; font-size:16px; border-bottom:1px solid #1e293b; padding-bottom:12px;">📋 قائمة محاضرات الكورس</h4>`;
    vids.forEach((v, idx) => {
        let allowed = canPlay(idx, vids, courseId, hasPurchasedWholeCourse);
        let safeTitle = (v.title || "").replace(/'/g, "\\'");
        if (allowed) {
            html += `
            <div class="playlist-item" id="pl_item_${idx}" onclick="playCourseVideo('${v.url}', '${safeTitle}', '${course.id}', ${idx}, this)"
                 style="padding: 14px 16px; border-radius: 14px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #94a3b8; font-weight: bold; transition: 0.25s; background: rgba(255,255,255,0.03);">
                <span class="vid-icon">📺</span>
                <span style="flex: 1; font-size: 14px;">${v.title}</span>
            </div>`;
        } else {
            html += `
            <div style="padding: 14px 16px; border-radius: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; color: #475569; font-weight: bold; background: rgba(0,0,0,0.2); cursor: not-allowed;">
                <span>🔒</span>
                <span style="flex: 1; font-size: 14px;">${v.title} (مغلق)</span>
            </div>`;
        }
    });

    playlistEl.innerHTML = html;

    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);

    // تشغيل الفيديو المختار تلقائياً
    let targetEl = document.getElementById(`pl_item_${startVideoIndex}`);
    if (vids[startVideoIndex] && canPlay(startVideoIndex, vids, courseId, hasPurchasedWholeCourse)) {
        playCourseVideo(vids[startVideoIndex].url, vids[startVideoIndex].title, course.id, startVideoIndex, targetEl);
    }
};

// 2. تحديث شكل كروت الكورسات (Bento Course Cards)
window.renderStudentLectures = function() {
    let list = document.getElementById("studentLecturesList");
    if (!list) return;
    list.innerHTML = "";

    let filteredLectures = window.allLectures.filter(lec => {
        if (!lec || lec.isHidden === true) return false;
        if (currentStudent.guestCourseOnly) return lec.id === currentStudent.guestCourseOnly;
        let levelMatch = (lec.level === "all" || lec.level === currentStudent.level);
        let trackMatch = (!lec.track || lec.track === 'all' || lec.track === (currentStudent.track || 'عام'));
        return levelMatch && trackMatch;
    });

    if (filteredLectures.length === 0) {
        list.innerHTML = `<div class="v14-surface-card" style="grid-column: 1/-1; text-align:center; padding: 45px; font-weight:bold; color:var(--text-muted);">📭 لا توجد كورسات متاحة لصفك الدراسي حالياً.</div>`;
        return;
    }

    filteredLectures.forEach(lec => {
        let maxViews = parseInt(lec.maxViews) || 0;
        let viewsInfo = maxViews > 0 ? `👁️ ${maxViews} مشاهدات` : `👁️ مفتوح`;
        let videosCount = (lec.videos || []).length;
        let pdfCount = (lec.videos || []).filter(v => v && v.pdfUrl).length;

        list.innerHTML += `
        <div class="v14-course-card">
            <div style="position: relative; height: 195px; overflow: hidden;">
                <img src="${lec.image}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.85), transparent 60%);"></div>
                <div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <span style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); color: #fbbf24; padding: 5px 12px; border-radius: 50px; font-size: 12px; font-weight: 900;">${viewsInfo}</span>
                    <span style="background: var(--primary); color: white; padding: 5px 12px; border-radius: 50px; font-size: 12px; font-weight: 900;">🎬 ${videosCount} محاضرة</span>
                    ${pdfCount > 0 ? `<span style="background: #8b5cf6; color: white; padding: 5px 12px; border-radius: 50px; font-size: 12px; font-weight: 900;">📄 ${pdfCount} ملزمة</span>` : ''}
                </div>
                <h3 style="position: absolute; bottom: 14px; right: 18px; left: 18px; margin: 0; color: #ffffff; font-size: 20px; font-weight: 900;">${lec.title}</h3>
            </div>
            <div style="padding: 22px; display: flex; flex-direction: column; flex: 1;">
                <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--text-muted); font-weight: bold; line-height: 1.7;">${lec.desc || 'شاهد محاضرات الكورس وحمل ملازم الـ PDF الخاصة بالشرح.'}</p>
                <button class="btn" style="margin-top: auto; border-radius: 16px; padding: 14px;" onclick="openStudentCourseDetails('${lec.id}')">▶️ استعراض محتويات الكورس</button>
            </div>
        </div>`;
    });
};