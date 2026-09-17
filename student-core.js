
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
            if(forgotView) forgotView.style.display = 'none';

            if(type === 'login') {
                document.getElementById('login-form-view').style.display = 'block';
            } else if (type === 'register') {
                document.getElementById('register-form-view').style.display = 'block';
            } else if (type === 'forgot') {
                if(forgotView) forgotView.style.display = 'block';
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
                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/settings.json`);
                let settings = await res.json();
                
                if (settings) {
                    let tName = settings.teacherName || "بدر على";
                    let cName = settings.centerName || "El-Senior";

                    // أسماء المستر في الصفحة الرئيسية والمودال والمنصة
                   if(document.getElementById("nav-brand-name")) document.getElementById("nav-brand-name").innerText ="الفيزيائى: بدر على"; // مؤقت لحد ما الطالب يسجل
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
            const savedCode = localStorage.getItem("alqaisar_student_code");
            const savedPhone = localStorage.getItem("alqaisar_parent_phone");
            
            loadTeacherInfoInitial(); 

            // لو كان مسجل دخول قبل كده، هيدخل أوتوماتيك ويخفي الـ Landing
            if (savedCode && savedPhone) {
                document.getElementById("studentCode").value = savedCode;
                document.getElementById("parentPhone").value = savedPhone;
                fetchStudentData(true); 
            }
        };      

        // ==========================================
        // 🌟 2. دالة الدخول (التحقق وتلوين المنصة وبناء الكارت)
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
                let licRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/settings.json`);
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
                        errorMsg.innerText = "عفواً، المنصة متوقفة حالياً. يرجى مراجعة إدارة السنتر!";
                        if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
                        if(isAutoLogin) {
                            localStorage.removeItem("alqaisar_student_code"); localStorage.removeItem("alqaisar_parent_phone"); localStorage.removeItem("alqaisar_teacher_id");
                        }
                        return; 
                    }
                }

                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data.json`);
                let data = await res.json() || {};

                // 🚀 استرجاع البيانات المحمية (المحفظة والكورسات) لتجنب مسحها من قبل تطبيق المدرس
                let extRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/platformData/${code}.json`);
                let extData = await extRes.json() || {};

                let safeStudents = Array.isArray(data.students) ? data.students : Object.values(data.students || {}).filter(i => i !== null);
                let safeGroups = Array.isArray(data.groups) ? data.groups : Object.values(data.groups || {}).filter(i => i !== null);
                let safeClassSessions = Array.isArray(data.classSessions) ? data.classSessions : Object.values(data.classSessions || {}).filter(i => i !== null);
                let safeExams = Array.isArray(data.exams) ? data.exams : Object.values(data.exams || {}).filter(i => i !== null);
                let safeHomeworks = Array.isArray(data.homeworks) ? data.homeworks : Object.values(data.homeworks || {}).filter(i => i !== null);

                window.allClassSessions = safeClassSessions;

                let lecRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/lectures.json`);
                let lecturesData = await lecRes.json() || {};
                
                if (Array.isArray(lecturesData)) window.allLectures = lecturesData.filter(l => l !== null).reverse();
                else window.allLectures = Object.values(lecturesData).filter(l => l !== null).reverse();

                if (safeStudents.length === 0) {
                    errorMsg.style.display = "block"; errorMsg.innerText = "لا يوجد طلاب مسجلين!";
                    if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
                    return;
                }

                currentStudent = safeStudents.find(s => s && String(s.code) === String(code) && String(s.parentPhone) === String(phone));
                
                if (!currentStudent) {
                    errorMsg.style.display = "block"; errorMsg.innerText = "البيانات غير مسجلة!";
                    if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
                    return;
                }

                // 🚀 دمج البيانات المحمية لضمان عدم ضياع الكورسات والرصيد
                if (extData.walletBalance !== undefined) currentStudent.walletBalance = extData.walletBalance;
                if (extData.behaviorPoints !== undefined) currentStudent.behaviorPoints = extData.behaviorPoints;
                
                if (extData.purchasedCourses) {
                    currentStudent.purchasedCourses = Array.isArray(extData.purchasedCourses) ? extData.purchasedCourses : Object.values(extData.purchasedCourses);
                } else if (currentStudent.purchasedCourses) {
                    currentStudent.purchasedCourses = Array.isArray(currentStudent.purchasedCourses) ? currentStudent.purchasedCourses : Object.values(currentStudent.purchasedCourses);
                } else {
                    currentStudent.purchasedCourses = [];
                }

                let studentGroupObj = safeGroups.find(g => typeof g === 'object' && g.name === currentStudent.group);
                currentStudent.level = (studentGroupObj && studentGroupObj.level) ? studentGroupObj.level : (currentStudent.level || "غير محدد");

                if (currentStudent.level === "غير محدد") {
                    let gName = currentStudent.group || "";
                    if (gName.includes("1ث") || gName.includes("الأول")) currentStudent.level = "الصف الأول الثانوي";
                    else if (gName.includes("2ث") || gName.includes("الثاني")) currentStudent.level = "الصف الثاني الثانوي";
                    else if (gName.includes("3ث") || gName.includes("الثالث")) currentStudent.level = "الصف الثالث الثانوي";
                }

                applyDynamicTheme(currentStudent.level);

                localStorage.setItem("alqaisar_student_code", code);
                localStorage.setItem("alqaisar_parent_phone", phone);
                localStorage.setItem("alqaisar_teacher_id", globalTeacherId);

                allOnlineExams = data.onlineExams || [];
                window.studentCode = code;

                document.getElementById("top-name").innerText = currentStudent.name;
                document.getElementById("top-group").innerText = currentStudent.group;
                
                let cName = document.getElementById("card-student-name"); if(cName) cName.innerText = currentStudent.name;
                let cLevel = document.getElementById("card-student-level"); if(cLevel) cLevel.innerText = currentStudent.level;
                let cGroup = document.getElementById("card-student-group-name"); if(cGroup) cGroup.innerText = currentStudent.group;
                let cCodeNum = document.getElementById("card-student-code-num"); if(cCodeNum) cCodeNum.innerText = code;
                let cPoints = document.getElementById("card-behavior-points"); if(cPoints) cPoints.innerText = currentStudent.behaviorPoints || 0;

                if (typeof JsBarcode !== 'undefined' && document.getElementById("digitalIdBarcode")) {
                    JsBarcode("#digitalIdBarcode", currentStudent.code, { format: "CODE128", lineColor: "#0f172a", width: 2, height: 45, displayValue: false });
                }

                let balance = currentStudent.walletBalance || 0;
                document.getElementById("top-balance").innerText = balance;
                if(document.getElementById("walletBalanceDisplay")) document.getElementById("walletBalanceDisplay").innerText = balance;
                if(document.getElementById("wallet-page-balance")) document.getElementById("wallet-page-balance").innerHTML = `${balance} <span style="font-size: 24px; color: rgba(255,255,255,0.7);">ج.م</span>`;

                let totalItems = 0; let completedItems = 0; let missingLectures = 0; let missingExams = 0;
                try {
                    let subRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions.json`);
                    let allSubs = await subRes.json() || {};
                    let myExams = allOnlineExams.filter(e => e && (e.status === "open" || e.status === "closed") && (Array.isArray(e.group) ? e.group.includes(currentStudent.group) || e.group.includes("all") : e.group === currentStudent.group || e.group === "all"));
                    totalItems += myExams.length;
                    myExams.forEach(e => { if (allSubs[e.id] && (allSubs[e.id][currentStudent.code] || allSubs[e.id][currentStudent.phone])) completedItems++; else if (e.status === "open") missingExams++; });

                   let myLectures = window.allLectures.filter(l => {
                        if (!l) return false;
                        let levelMatch = l.level === "all" || l.level === currentStudent.level;
                        let trackMatch = !l.track || l.track === 'all' || l.track === (currentStudent.track || 'عام');
                        return levelMatch && trackMatch;
                    });
                    totalItems += myLectures.length;
                    let trackRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking.json`);
                    let allTracks = await trackRes.json() || {};
                    myLectures.forEach(l => { let hasWatched = allTracks[l.id] && allTracks[l.id][currentStudent.phone]; if (hasWatched) completedItems++; else missingLectures++; });

                    let percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;
                    if(document.getElementById("tracker-bar")) document.getElementById("tracker-bar").style.width = percent + "%";
                    if(document.getElementById("tracker-percentage")) document.getElementById("tracker-percentage").innerText = percent + "%";
                    if(document.getElementById("tracker-text")) document.getElementById("tracker-text").innerText = percent === 100 ? "🎉 ممتاز! لقد أتممت خطتك الدراسية!" : "📈 خطة المذاكرة:";
                    let reminder = "";
                    if (missingLectures > 0) reminder += `🎬 متبقي (${missingLectures}) محاضرة. `;
                    if (missingExams > 0) reminder += `📝 متبقي (${missingExams}) امتحان. `;
                    if(document.getElementById("tracker-reminder")) document.getElementById("tracker-reminder").innerText = reminder || "🎯 واصل تقدمك!";
                } catch(err) {}

                let attHtml = `<tr><th>التاريخ</th><th>الموضوع</th><th>حالة الحضور</th></tr>`;
                let hasAtt = false;
                safeClassSessions.filter(s => s && s.group === currentStudent.group).reverse().forEach(s => {
                    hasAtt = true;
                    let stat = (s.attendance || {})[currentStudent.code] || (s.attendance || {})[currentStudent.phone];
                  let badge = stat === 'present' ? `<span class="badge badge-present">حاضر ✓</span>` : stat === 'late' ? `<span class="badge" style="background:#fef3c7; color:#d97706;">متأخر ⏳</span>` : stat === 'absent' ? `<span class="badge badge-absent">غائب ✗</span>` : `<span style="color:var(--text-muted); font-weight:bold;">لم يسجل</span>`;
                    attHtml += `<tr><td>${s.date}</td><td>${s.topic || 'حصة عادية'}</td><td>${badge}</td></tr>`;
                });
                if(!hasAtt) attHtml += `<tr><td colspan="3" style="text-align:center; padding: 30px; font-weight:bold;">لا توجد حصص مسجلة.</td></tr>`;
                document.getElementById("attendance-details").innerHTML = attHtml;

                let exHtml = `<tr><th>التاريخ</th><th>اسم التقييم</th><th>الدرجة التي حصلت عليها</th></tr>`;
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

            } catch (e) {
                console.error("🔥 Crash Details:", e); 
                errorMsg.style.display = "block"; errorMsg.innerText = "خطأ في الاتصال بالسيرفر! يرجى التأكد من البيانات أو الإنترنت.";
                if(btn) { btn.innerHTML = "تسجيل الدخول 🚀"; btn.disabled = false; }
            }
        }
        // ==========================================
        // 🌟 باقي الدوال
        // ==========================================
        function logoutStudent() {
            localStorage.removeItem("alqaisar_student_code");
            localStorage.removeItem("alqaisar_parent_phone");
            localStorage.removeItem("alqaisar_teacher_id");
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
                    // طالب السنتر
                    studentData.centerName = document.getElementById("regCenterName").value.trim();
                    studentData.groupPref = document.getElementById("regGroupPref").value.trim();
                    studentData.status = "pending";

                    await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/join_requests/${Date.now()}.json`, {
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

                    let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`);
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
                    await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentsArray)
                    });

                    let groupsRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/groups.json`);
                    let groupsArray = await groupsRes.json() || [];
                    groupsArray = Array.isArray(groupsArray) ? groupsArray : Object.values(groupsArray).filter(g => g !== null);

                    let groupExists = groupsArray.some(g => g.name === targetGroup);
                    if (!groupExists) {
                        groupsArray.push({ name: targetGroup, level: studentData.level, payType: "session", price: 0 });
                        await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/groups.json`, {
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
                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students.json`);
                let studentsArray = await res.json() || [];
                studentsArray = Array.isArray(studentsArray) ? studentsArray : Object.values(studentsArray).filter(s => s !== null);

                let foundStudent = studentsArray.find(s => s && (s.parentPhone === phone || s.phone === phone));

                msgEl.style.display = "block";
                if(foundStudent) {
                    msgEl.style.color = "var(--success)";
                    msgEl.style.background = "rgba(16, 185, 129, 0.1)";
                    msgEl.innerHTML = `✅ تم العثور على حسابك!<br><br>الاسم: <strong>${foundStudent.name}</strong><br>الكود الخاص بك: <br><span style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: var(--primary); display: inline-block; margin-top: 5px;">${foundStudent.code}</span>`;
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
                let notifRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/notifications.json`);
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
                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/store/items.json`);
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
                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/store/logs.json`);
                let logs = await res.json() || {};
                let myOrders = Object.values(logs).filter(log => log.studentCode === currentStudent.code).reverse();
                if(myOrders.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-weight:bold;">لم تقم بأي عمليات شراء.</td></tr>`; return; }
                tbody.innerHTML = myOrders.map(o => `<tr><td>${o.date}</td><td><strong style="color:var(--primary);">${o.itemName}</strong></td><td><span class="badge" style="background:#f1f5f9; color:var(--text-muted);">${o.currency==='points'?'نقاط ⭐':'محفظة 💰'}</span></td><td><span class="badge badge-present">نجاح ✅</span></td></tr>`).join('');
            } catch(e) {}
        };

        window.purchaseStoreItem = async function(itemId, itemName, price, currency) {
            price = parseFloat(price);
            if (currency === 'points') {
                if ((currentStudent.behaviorPoints || 0) < price) return alert("النقاط لا تكفي.");
                if (!confirm("تأكيد العملية؟")) return; currentStudent.behaviorPoints -= price;
            } else {
                if ((currentStudent.walletBalance || 0) < price) return alert("الرصيد لا تكفي.");
                if (!confirm("تأكيد العملية؟")) return; currentStudent.walletBalance -= price;
            }
            try {
                let updates = currency === 'points' ? { behaviorPoints: currentStudent.behaviorPoints } : { walletBalance: currentStudent.walletBalance };

                // 🚀 الحفظ المحمي في مسار منفصل
                await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/platformData/${currentStudent.code}.json`, { 
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(updates) 
                });

                let dataRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data.json`);
                let data = await dataRes.json();
                
                let sIdx = -1;
                if (Array.isArray(data.students)) {
                    sIdx = data.students.findIndex(s => s && s.code === currentStudent.code);
                } else if (data.students && typeof data.students === 'object') {
                    let keys = Object.keys(data.students);
                    for(let k of keys) {
                        if(data.students[k] && data.students[k].code === currentStudent.code) {
                            sIdx = k; break;
                        }
                    }
                }

                if (sIdx !== -1) {
                    await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students/${sIdx}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
                    await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/store/logs/${"order_" + Date.now()}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: "order_" + Date.now(), date: new Date().toLocaleString('ar-EG'), studentName: currentStudent.name, studentCode: currentStudent.code, itemName: itemName, price: price, currency: currency }) });
                    alert("تم الشراء بنجاح!"); location.reload(); 
                }
            } catch (e) { alert("حدث خطأ."); }
        };
        window.submitForumQuestion = async function() {
            let text = document.getElementById("forumQuestionInput").value.trim();
            if(!text) return alert("اكتب السؤال أولاً!");
            let questionObj = { id: "q_" + Date.now(), studentName: currentStudent.name, studentGroup: currentStudent.group, studentPhone: currentStudent.phone, questionText: text, replyText: "", date: new Date().toLocaleDateString('ar-EG') };
            try {
                await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/forum/${questionObj.id}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(questionObj) });
                document.getElementById("forumQuestionInput").value = ""; alert("تم نشر سؤالك! 🚀"); loadForumQuestions();
            } catch(e) {}
        };

        window.loadForumQuestions = async function() {
            let container = document.getElementById("forum-questions-list");
            if(!container) return;
            try {
                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/forum.json`);
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
                let subRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions.json`);
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
window.navigateSlide = function(step) {
    let slides = document.querySelectorAll('.q-slide');
    if(slides.length === 0) return;
    
    // إخفاء السؤال الحالي
    slides[window.currentSlideIndex].style.display = 'none';
    
    // حساب الاندكس الجديد
    window.currentSlideIndex += step;
    
    // إظهار السؤال الجديد بأنيميشن
    slides[window.currentSlideIndex].style.display = 'block';
    slides[window.currentSlideIndex].style.animation = 'none';
    setTimeout(() => slides[window.currentSlideIndex].style.animation = 'fadeInUp 0.4s ease forwards', 10);
};

window.startExam = function(examId) {
    currentExam = allOnlineExams.find(e => e.id === examId); 
    if(!currentExam) return;
    if(!confirm(`هل أنت مستعد؟ المدة: ${currentExam.duration} دقيقة.`)) return;
    
    document.getElementById("online-exams-list-screen").style.display = "none"; 
    document.getElementById("active-exam-screen").style.display = "block";
    document.getElementById("active-exam-title").innerText = currentExam.title;
    
    // إخفاء الزرار القديم لأننا هنضيفه جوه آخر سلايد
    let oldSubmitBtn = document.getElementById("submitExamBtn");
    if(oldSubmitBtn) oldSubmitBtn.style.display = "none";

    const container = document.getElementById("exam-questions-render"); 
    container.innerHTML = "";
    window.currentSlideIndex = 0; // تصفير السلايد
    
    currentExam.questions.forEach((q, index) => {
        let displayStyle = index === 0 ? "block" : "none";
        
        // الكارت الأساسي للسؤال
        let qHtml = `<div class="q-slide" id="slide_${index}" style="display: ${displayStyle}; background: white; padding: 35px 30px; border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); border: 1px solid var(--border); margin-bottom: 20px;">`;
        
        // الهيدر بتاع السؤال (الدرجات والترتيب من اليمين)
        qHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px dashed var(--border); padding-bottom: 15px; direction: rtl;">
            <span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 8px 20px; border-radius: 12px; font-weight: 900; font-size: 16px; border: 1px solid rgba(245, 158, 11, 0.3);">🎯 ${q.points} درجات</span>
            <span style="color: var(--text-muted); font-weight: 900; background: var(--bg-color); padding: 8px 15px; border-radius: 12px;">السؤال ${index + 1} من ${currentExam.questions.length}</span>
        </div>`;

        // نص السؤال والاختيارات (بالإنجليزي من الشمال لليمين LTR)
        qHtml += `<div style="direction: ltr; text-align: left; font-family: 'Segoe UI', Tahoma, sans-serif;">`;
        qHtml += `<h3 style="color: var(--secondary); font-size: 24px; line-height: 1.6; margin: 0 0 25px 0;">${index + 1}. ${q.text}</h3>`;

        if (q.type === 'mcq') { 
            qHtml += `<div class="q-options" style="display: flex; flex-direction: column; gap: 12px;">`; 
            q.options.forEach((opt, optIndex) => { 
                qHtml += `<label style="display: flex; align-items: center; gap: 15px; background: var(--bg-color); border: 2px solid var(--border); padding: 15px 20px; border-radius: 15px; cursor: pointer; transition: 0.3s; font-size: 18px; font-weight: 600;"
                onmouseover="this.style.borderColor='var(--primary)'" 
                onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='var(--border)'"
                onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(inp => {inp.parentElement.style.borderColor='var(--border)'; inp.parentElement.style.background='var(--bg-color)';}); this.style.borderColor='var(--primary)'; this.style.background='rgba(14, 165, 233, 0.05)';">
                    <input type="radio" name="ans_${q.id}" value="${optIndex}" style="width: 22px; height: 22px; accent-color: var(--primary);"> 
                    <span style="flex: 1;">${opt}</span>
                </label>`; 
            }); 
            qHtml += `</div>`; 
        } 
        else if (q.type === 'tf') { 
            qHtml += `
            <div class="q-options" style="display: flex; gap: 20px;">
                <label style="flex: 1; text-align: center; background: rgba(16, 185, 129, 0.05); border: 2px solid #10b981; padding: 20px; border-radius: 15px; cursor: pointer; font-size: 22px; font-weight: bold; color: #10b981; transition: 0.3s;" onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(i=>{i.parentElement.style.background='transparent'; i.parentElement.style.opacity='0.5'}); this.style.background='rgba(16, 185, 129, 0.15)'; this.style.opacity='1';">
                    <input type="radio" name="ans_${q.id}" value="true" style="display:none;"> ✔️ True
                </label>
                <label style="flex: 1; text-align: center; background: rgba(239, 68, 68, 0.05); border: 2px solid #ef4444; padding: 20px; border-radius: 15px; cursor: pointer; font-size: 22px; font-weight: bold; color: #ef4444; transition: 0.3s;" onclick="document.querySelectorAll('input[name=ans_${q.id}]').forEach(i=>{i.parentElement.style.background='transparent'; i.parentElement.style.opacity='0.5'}); this.style.background='rgba(239, 68, 68, 0.15)'; this.style.opacity='1';">
                    <input type="radio" name="ans_${q.id}" value="false" style="display:none;"> ❌ False
                </label>
            </div>`; 
        } 
        else if (q.type === 'blank') { 
            qHtml += `<input type="text" id="ans_${q.id}" class="custom-input" placeholder="Type your answer here..." style="font-size: 18px; padding: 15px; border-radius: 12px; border: 2px solid var(--border); width: 100%; direction: ltr; text-align: left;">`; 
        } 
        else if (q.type === 'essay') { 
            qHtml += `<textarea id="ans_${q.id}" class="custom-input" rows="5" placeholder="Write your detailed answer here..." style="font-size: 18px; padding: 15px; border-radius: 12px; border: 2px solid var(--border); resize: vertical; width: 100%; direction: ltr; text-align: left;"></textarea>`; 
        }
        qHtml += `</div>`; // إغلاق ديف الـ LTR

        // زراير التنقل (السابق والتالي)
        qHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 35px; padding-top: 25px; border-top: 1px solid var(--border); direction: rtl;">
            <button class="btn btn-secondary" style="width: auto; padding: 12px 30px; font-size: 16px; border-radius: 12px; opacity: ${index === 0 ? '0.3' : '1'}; pointer-events: ${index === 0 ? 'none' : 'auto'};" onclick="navigateSlide(-1)">السابق</button>
            
            ${index === currentExam.questions.length - 1 ? 
                `<button class="btn slide-submit-btn" style="width: auto; background: var(--success); padding: 12px 30px; font-size: 18px; font-weight: 900; border-radius: 12px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);" onclick="submitOnlineExam()">تسليم الامتحان نهائياً ✅</button>` : 
                `<button class="btn" style="width: auto; padding: 12px 40px; font-size: 18px; font-weight: 900; border-radius: 12px; box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);" onclick="navigateSlide(1)">التالي ⬅️</button>`
            }
        </div>`;

        container.innerHTML += qHtml + `</div>`;
    });
    
    // تفعيل التايمر
    let timeInSeconds = currentExam.duration * 60; const timerDisplay = document.getElementById('exam-timer');
    examTimerInterval = setInterval(() => { 
        let m = Math.floor(timeInSeconds / 60), s = timeInSeconds % 60; 
        timerDisplay.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`; 
        
        // تلوين التايمر بالأحمر لو فاضل دقيقة واحدة
        if(timeInSeconds <= 60) timerDisplay.parentElement.style.background = "var(--danger)";
        
        if (timeInSeconds <= 0) { clearInterval(examTimerInterval); submitOnlineExam(true); } 
        timeInSeconds--; 
    }, 1000);
}

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

        await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions/${currentExam.id}/${currentStudent.code}.json`, { 
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

// تعديل شاشة عرض الإجابات عشان تظهر LTR برضه
window.reviewExam = function(examId) {
    let exam = allOnlineExams.find(e => e.id === examId); 
    let examSubs = window.studentSubmissions[examId] || {};
    let sub = examSubs[currentStudent.code];
    if (!sub && currentStudent.phone && String(currentStudent.phone).trim() !== "0") sub = examSubs[currentStudent.phone];

    if(!exam || !sub) return;
    document.getElementById("online-exams-list-screen").style.display = "none"; 
    document.getElementById("review-exam-screen").style.display = "block";
    
    document.getElementById("review-exam-title").innerText = exam.title; 
    document.getElementById("review-exam-score").innerText = sub.score; 
    document.getElementById("review-exam-total").innerText = exam.totalScore;
    
    let container = document.getElementById("review-questions-render"); 
    container.innerHTML = "";
    
    exam.questions.forEach((q, index) => {
        let studentAns = sub.answers[q.id]; let qScore = 0; let isCorrect = false; let ansHtml = "";
        
        if (q.type === 'mcq') {
            isCorrect = (studentAns === q.correctAnswerIndex); qScore = isCorrect ? q.points : 0;
            ansHtml = `<div class="q-options" style="display: flex; flex-direction: column; gap: 10px;">`;
            q.options.forEach((opt, optIndex) => {
                let bg = "var(--bg-color)"; let border = "var(--border)"; let icon = "";
                if (optIndex === q.correctAnswerIndex) { bg = "#d1fae5"; border = "#10b981"; icon = "✅"; }
                else if (optIndex === studentAns && !isCorrect) { bg = "#fee2e2"; border = "#ef4444"; icon = "❌"; }
                ansHtml += `<div style="background:${bg}; border: 2px solid ${border}; padding: 12px 15px; border-radius: 12px; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between;"><span>${opt}</span> <span>${icon}</span></div>`;
            });
            ansHtml += `</div>`;
        } else if (q.type === 'tf') {
            isCorrect = (String(studentAns) === String(q.correctAnswerTF || q.correctAnswer)); qScore = isCorrect ? q.points : 0;
            ansHtml = `<div style="background: ${isCorrect?'#d1fae5':'#fee2e2'}; padding:15px; border-radius:12px; font-weight:bold; border:2px solid ${isCorrect?'#10b981':'#ef4444'}; font-size: 18px;">Your Answer: ${studentAns==='true'?'True ✔️':'False ❌'} <br> Correct: ${(q.correctAnswerTF || q.correctAnswer)==='true'?'True ✔️':'False ❌'}</div>`;
        } else {
            qScore = (sub.manualGrades && sub.manualGrades[q.id] !== undefined) ? sub.manualGrades[q.id] : (studentAns === q.correctAnswerText ? q.points : 0);
            ansHtml = `<div style="background:var(--bg-color); padding:15px; border-radius:12px; border:2px solid var(--border); font-weight:bold; font-size: 16px;">Your Answer: <span style="color: var(--primary);">${studentAns || 'No Answer'}</span></div>`;
        }

        container.innerHTML += `
        <div style="background: white; padding: 30px; border-radius: 20px; border: 1px solid var(--border); box-shadow: 0 5px 15px rgba(0,0,0,0.03); margin-bottom: 20px; text-align: left; direction: ltr; font-family: 'Segoe UI', Tahoma, sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px dashed var(--border); padding-bottom: 15px; direction: rtl;">
                <span style="background: ${qScore > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${qScore > 0 ? '#10b981' : '#ef4444'}; padding: 8px 20px; border-radius: 12px; font-weight: 900; font-size: 16px; border: 1px solid ${qScore > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">الدرجة: ${qScore} / ${q.points}</span>
                <span style="color: var(--secondary); font-weight: 900; background: var(--bg-color); padding: 8px 15px; border-radius: 12px;">السؤال ${index + 1}</span>
            </div>
            <h3 style="color: var(--secondary); font-size: 22px; line-height: 1.5; margin: 0 0 20px 0;">${q.text}</h3>
            ${ansHtml}
        </div>`;
    });
};
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

window.openCoursePlayer = function(courseId, startVideoIndex = 0) {
    let course = window.allLectures.find(l => l.id === courseId);
    if(!course) return;

    document.body.classList.add("no-select");
    document.getElementById("app-layout").style.display = "none";
    document.getElementById("protected-course-screen").style.display = "flex";
    document.getElementById("player-course-title").innerText = `${course.title}`;
    
    document.getElementById("video-watermark").innerHTML = `${currentStudent.name} <br> ${currentStudent.phone}`;

    let vids = course.videos || [];
    if(vids.length === 0 && course.url) vids.push({title: "المحاضرة كاملة", url: course.url});

    let playlistHtml = `<h4 style="color:#94a3b8; margin:0 0 20px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">محتويات الكورس</h4>`;
    
    vids.forEach((v, idx) => {
        let safeTitle = v.title.replace(/'/g, "\\'");
        let isActive = idx === startVideoIndex;
        
        // التعديل هنا: الأكتيف بياخد لون أزرق، والغير أكتيف بياخد لون رمادي وأيقونة شاشة بدل القفل
        let bgStyle = isActive ? "background: rgba(59, 130, 246, 0.15); border-right: 4px solid #3b82f6; color: #3b82f6; font-weight: 900;" : "background: transparent; color: #94a3b8; border-right: 4px solid transparent; font-weight: bold;";
        let icon = isActive ? '▶️' : '📺';

        playlistHtml += `
        <div class="playlist-item" data-index="${idx}" style="${bgStyle} padding:15px; border-radius:8px; margin-bottom:8px; cursor:pointer; transition:0.3s; display: flex; align-items: center; gap: 10px;" 
             onmouseover="if(this.getAttribute('data-active') !== 'true') this.style.background='rgba(255,255,255,0.05)'" 
             onmouseout="if(this.getAttribute('data-active') !== 'true') this.style.background='transparent'" 
             onclick="playCourseVideo('${btoa(encodeURIComponent(v.url))}', '${safeTitle}', '${course.id}', ${idx}, this)"
             data-active="${isActive ? 'true' : 'false'}">
            <span class="vid-icon" style="font-size: 18px;">${icon}</span> 
            <span style="flex: 1; font-size: 15px;">${v.title}</span>
        </div>`;
    });
    document.getElementById("player-playlist").innerHTML = playlistHtml;

    if(vids.length > startVideoIndex) {
    // بنبعت العنصر الأولاني كـ Reference
    let firstElement = document.querySelector('.playlist-item[data-index="'+startVideoIndex+'"]');
    // 🔥 التعديل هنا: تشفير الرابط قبل إرساله للتشغيل التلقائي
    playCourseVideo(btoa(encodeURIComponent(vids[startVideoIndex].url)), vids[startVideoIndex].title, course.id, startVideoIndex, firstElement);
}
    
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    window.addEventListener('blur', applyBlackout);
    window.addEventListener('focus', removeBlackout);
};

window.playCourseVideo = async function(url, videoTitle, courseId, videoIndex, element = null) {

    // فك التشفير في الخفاء
    try {
        url = decodeURIComponent(atob(url));
    } catch(e) {
        console.error("Invalid URL format");
        return;
    }
    let course = window.allLectures.find(l => l.id === courseId);
    if (!course) return;

    let maxViews = parseInt(course.maxViews) || 0; 
    
    // جلب داتا التراكر الخاصة بالطالب (نجرب بالكود الأول، ولو ملقيناش نجرب بالرقم عشان الداتا القديمة)
    let usedKey = currentStudent.code;
    let trackingUrlCode = `https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking/${courseId}/${usedKey}/${videoIndex}.json`;
    let resCode = await fetch(trackingUrlCode);
    let data = await resCode.json();

    if (!data) {
        let trackingUrlPhone = `https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking/${courseId}/${currentStudent.phone}/${videoIndex}.json`;
        let resPhone = await fetch(trackingUrlPhone);
        data = await resPhone.json();
        if (data && data.views > 0) usedKey = currentStudent.phone;
    }
    
    data = data || { views: 0 };
    
    // 💡 التعديل هنا: قراءة السماحية الإضافية من السنتر
    let extraViews = parseInt(data.extraViews) || 0;
    let totalAllowed = maxViews + extraViews;

    if (maxViews > 0 && data.views >= totalAllowed) {
        if(typeof showToast === 'function') {
            showToast("🚫 لقد استنفدت العدد المسموح لمشاهدة هذا الفيديو. يرجى مراجعة إدارة السنتر لتجديد الفرصة.", "error");
        } else {
            alert("🚫 لقد استنفدت العدد المسموح لمشاهدة هذا الفيديو.");
        }
        return; 
    }

    // التعديل الديناميكي للشكل في القائمة الجانبية
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
        if(activeIconSpan) activeIconSpan.innerText = '▶️';
    }

    let embedUrl = url;
    try {
        let parsedUrl = new URL(url);
        if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')) {
            let videoId = parsedUrl.searchParams.get('v');
            if (!videoId && parsedUrl.hostname === 'youtu.be') videoId = parsedUrl.pathname.substring(1);
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId.split('&')[0]}?rel=0&modestbranding=1`;
        }
    } catch(e) { 
        if(url.includes("watch?v=")) embedUrl = url.replace("watch?v=", "embed/");
        else if(url.includes("youtu.be/")) embedUrl = url.replace("youtu.be/", "youtube.com/embed/");
    }
    
    document.getElementById("video-iframe").src = embedUrl;

    // تسجيل المشاهدة وإضافة التاريخ
    let now = new Date();
    let dateStr = now.toLocaleDateString('ar-EG') + " | " + now.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: 'numeric', hour12: true });
    
    let updateUrl = `https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/course_tracking/${courseId}/${usedKey}/${videoIndex}.json`;
    await fetch(updateUrl, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ videoTitle: videoTitle, views: data.views + 1, lastSeen: dateStr, extraViews: extraViews })
    });
};

        window.closeCoursePlayer = function() {
            document.getElementById("video-iframe").src = ""; 
            document.body.classList.remove("no-select");
            document.getElementById("protected-course-screen").style.display = "none";
            document.getElementById("app-layout").style.display = "block";
            
            document.removeEventListener('contextmenu', blockContext);
            document.removeEventListener('keydown', blockKeys);
            window.removeEventListener('blur', applyBlackout);
            window.removeEventListener('focus', removeBlackout);
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
window.renderStudentLectures = function() {
    let list = document.getElementById("studentLecturesList");
    if(!list) return; list.innerHTML = "";
    
    if(window.allLectures.length === 0) {
        list.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; font-weight:bold; color:var(--text-muted); background: var(--card-bg); border-radius: 20px; border: 2px dashed var(--border);">لا توجد كورسات متاحة حالياً.</div>`;
        return;
    }

    window.allLectures.forEach(lec => {
        let maxViews = parseInt(lec.maxViews) || 0;
        let viewsInfo = maxViews > 0 ? ` 👁️ ${maxViews} مشاهدة` : ` 👁️ غير محدود`;
        
        // إظهار بادج بيعرفه إن الكورس جواه محاضرات
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
        let subRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/onlineSubmissions.json`);
        allSubs = await subRes.json() || {};
        window.studentSubmissions = allSubs;

        // جلب الامتحانات من السيرفر مباشرة عشان نجيب اسم الامتحان المطلوب
        let examsRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/onlineExams.json`);
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

        // فحص شرط الحضور (دعم مصفوفة الحصص المتعددة والحالات المختلفة)
        let didAttend = false;
        let linkedArr = [];
        if (v.linkedSessions && Array.isArray(v.linkedSessions)) linkedArr = linkedArr.concat(v.linkedSessions);
        if (v.linkedSession && !linkedArr.includes(v.linkedSession)) linkedArr.push(v.linkedSession);

        if (linkedArr.length > 0 && window.allClassSessions) {
            for (let sessId of linkedArr) {
                let sessionObj = window.allClassSessions.find(s => String(s.id) === String(sessId));
                if (sessionObj && sessionObj.attendance) {
                    let stat = sessionObj.attendance[currentStudent.code] || sessionObj.attendance[currentStudent.phone];
                    if (stat === 'present' || stat === 'late' || stat === 'makeup' || stat === 'platform_makeup') {
                        didAttend = true;
                        break; // لو حضر أي حصة منهم، يفتحله مجاناً فوراً
                    }
                }
            }
        }

        // فحص شرط الامتحان
        let isLockedByExam = false;
        let requiredExamObj = null;
        
        if (v.requiredExam) {
            // البحث عن تفاصيل الامتحان من الداتا
            requiredExamObj = safeExams.find(e => e.id === v.requiredExam); 
            
            let examSubs = allSubs[v.requiredExam];
            let didSubmitExam = examSubs && (examSubs[currentStudent.code] || examSubs[currentStudent.phone]);
            
            // لو ممتحنش، هنقفل الفيديو
            if (!didSubmitExam) isLockedByExam = true;
        }

        let canWatch = isVideoFree || hasPurchasedVideo || didAttend;

        if (isLockedByExam && requiredExamObj) {
            // 🚨 التعديل الجديد: إظهار اسم الامتحان وزرار الانتقال للامتحان
            playlistHtml += `
            <div style="background: var(--bg-color); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 10px; opacity: 0.9;">
                <span style="font-weight: 900; color: var(--secondary); font-size: 15px;">🔒 ${v.title} <br><span style="font-size:13px; color:#f59e0b;">مغلق بامتحان: (${requiredExamObj.title})</span></span>
                <button class="btn" style="background: #f59e0b; padding: 8px 15px; width: auto; font-size: 13px; font-weight: bold; border-radius: 10px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3); animation: pulse-glow 2s infinite;" onclick="document.getElementById('studentCourseDetailsModal').style.display='none'; showOnlineExams();">انتقل للامتحان 📝</button>
            </div>`;
        } else if (isLockedByExam && !requiredExamObj) {
            // لو المدرس مسح الامتحان من السيستم بس لسه مربوط هنا (أمان)
            playlistHtml += `
            <div style="background: var(--bg-color); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); margin-bottom: 10px; opacity: 0.7;">
                <span style="font-weight: 900; color: var(--secondary); font-size: 15px;">🔒 ${v.title} <br><span style="font-size:12px; color:var(--danger);">الامتحان المطلوب غير متاح حالياً</span></span>
                <button class="btn" style="background: #94a3b8; padding: 8px 15px; width: auto; font-size: 13px; font-weight: bold; border-radius: 10px; cursor: not-allowed;" disabled>مغلق 🔐</button>
            </div>`;
        } else if (canWatch) {
            // مفتوح وجاهز للتشغيل
            playlistHtml += `
            <div style="background: #f0fdf4; padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #10b981; margin-bottom: 10px;">
                <span style="font-weight: 900; color: #065f46; font-size: 16px;">▶️ ${v.title}</span>
                <button class="btn" style="background: var(--success); padding: 8px 20px; width: auto; font-size: 14px; font-weight: bold; border-radius: 10px;" onclick="document.getElementById('studentCourseDetailsModal').style.display='none'; openCoursePlayer('${course.id}', ${idx})">تشغيل المحاضرة ▶️</button>
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


window.purchaseVideo = async function(courseId, videoIndex, videoPrice, videoTitle) {
    let price = parseFloat(videoPrice) || 0;
    
    if ((currentStudent.walletBalance || 0) < price) {
        alert("عفواً، رصيد المحفظة لا يكفي لشراء هذه المحاضرة. يرجى شحن الرصيد أولاً.");
        return;
    }

    if (!confirm(`هل أنت متأكد من شراء "${videoTitle}" بمبلغ ${price} ج.م؟`)) return;

    try {
        currentStudent.walletBalance -= price;
        let specificVideoId = `${courseId}_v${videoIndex}`;
        
        if (!currentStudent.purchasedCourses) currentStudent.purchasedCourses = [];
        if (!currentStudent.purchasedCourses.includes(specificVideoId)) {
            currentStudent.purchasedCourses.push(specificVideoId);
        }

        let firebaseBaseUrl = `https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app`; 
        
        // 🚀 1. الحفظ المحمي في مسار منفصل لضمان عدم مسحه من قبل المدرس
        await fetch(`${firebaseBaseUrl}/${globalTeacherId}/platformData/${currentStudent.code}.json`, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                walletBalance: currentStudent.walletBalance,
                purchasedCourses: currentStudent.purchasedCourses
            }) 
        });

        // 2. الحفظ في قاعدة البيانات العامة (بشكل آمن لتجنب خطأ الـ Object)
        let dataRes = await fetch(`${firebaseBaseUrl}/${globalTeacherId}/data.json`);
        let data = await dataRes.json();
        
        let sIdx = -1;
        if (Array.isArray(data.students)) {
            sIdx = data.students.findIndex(s => s && s.code === currentStudent.code);
        } else if (data.students && typeof data.students === 'object') {
            let keys = Object.keys(data.students);
            for(let k of keys) {
                if(data.students[k] && data.students[k].code === currentStudent.code) {
                    sIdx = k; break;
                }
            }
        }
        
        if (sIdx !== -1) {
            await fetch(`${firebaseBaseUrl}/${globalTeacherId}/data/students/${sIdx}.json`, { 
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    walletBalance: currentStudent.walletBalance,
                    purchasedCourses: currentStudent.purchasedCourses
                }) 
            });

            // كود تعويض الغياب التلقائي
            let courseObj = window.allLectures.find(l => l.id === courseId);
            if (courseObj && courseObj.videos && courseObj.videos[videoIndex]) {
                let purchasedVideo = courseObj.videos[videoIndex];
                if (purchasedVideo.linkedSessions && purchasedVideo.linkedSessions.length > 0) {
                    let targetSession = window.allClassSessions.find(s => 
                        purchasedVideo.linkedSessions.includes(s.id) && s.group === currentStudent.group
                    );

                    if (targetSession) {
                        fetch(`${firebaseBaseUrl}/${globalTeacherId}/data/classSessions.json`)
                        .then(res => res.json())
                        .then(sessionsData => {
                            let sessionsArray = Array.isArray(sessionsData) ? sessionsData : Object.values(sessionsData);
                            let sIndex = sessionsArray.findIndex(s => s && s.id === targetSession.id);
                            
                            if (sIndex > -1) {
                                let currentAtt = sessionsArray[sIndex].attendance || {};
                                let studentStatus = currentAtt[currentStudent.code] || currentAtt[currentStudent.phone];
                                
                                if (!studentStatus || studentStatus === 'absent') {
                                    fetch(`${firebaseBaseUrl}/${globalTeacherId}/data/classSessions/${sIndex}/attendance.json`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ [currentStudent.code]: 'platform_makeup' })
                                    });
                                }
                            }
                        });
                    }
                }
            }

            alert("تم الشراء بنجاح! 🎉 يرجى الاستمتاع بالمشاهدة.");
            
            document.getElementById("top-balance").innerText = currentStudent.walletBalance;
            if(document.getElementById("walletBalanceDisplay")) document.getElementById("walletBalanceDisplay").innerText = currentStudent.walletBalance;
            if(document.getElementById("wallet-page-balance")) document.getElementById("wallet-page-balance").innerHTML = `${currentStudent.walletBalance} <span style="font-size: 24px; color: rgba(255,255,255,0.7);">ج.م</span>`;
            
            window.openStudentCourseDetails(courseId);
        }
    } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء الاتصال بالسيرفر، يرجى المحاولة لاحقاً.");
    }
};

window.redeemCode = async function() {
            const code = document.getElementById("rechargeCodeInput").value.trim();
            if(!code) return alert("أدخل الكود!");
            try {
                let res = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${code}.json`);
                let codeData = await res.json();
                if(!codeData || codeData.status === 'used') return alert("الكود غير صحيح أو مستخدم!");
                
                let amount = parseFloat(codeData.amount);
                currentStudent.walletBalance = (currentStudent.walletBalance || 0) + amount;
                
                // 🚀 الحفظ المحمي في مسار منفصل
                await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/platformData/${currentStudent.code}.json`, { 
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ walletBalance: currentStudent.walletBalance }) 
                });

                let dataRes = await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data.json`);
                let data = await dataRes.json();
                
                let sIdx = -1;
                if (Array.isArray(data.students)) {
                    sIdx = data.students.findIndex(s => s && s.code === currentStudent.code);
                } else if (data.students && typeof data.students === 'object') {
                    let keys = Object.keys(data.students);
                    for(let k of keys) {
                        if(data.students[k] && data.students[k].code === currentStudent.code) {
                            sIdx = k; break;
                        }
                    }
                }

                if(sIdx !== -1) {
                    await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/data/students/${sIdx}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletBalance: currentStudent.walletBalance }) });
                }
                
                await fetch(`https://el-senior-system-default-rtdb.europe-west1.firebasedatabase.app/${globalTeacherId}/chargeCodes/${code}/status.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify("used") });
                alert(`تم شحن ${amount} ج.م بنجاح!`); document.getElementById("rechargeCodeInput").value = ""; fetchStudentData(true);
            } catch (e) { alert("حدث خطأ!"); }
        }
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
window.showOnlineExams = async function(isRenderOnly = false, fromHistory = false) {
    if (originalShowOnlineExams) await originalShowOnlineExams(isRenderOnly);
    if (!isRenderOnly && !fromHistory && !window.isHistoryNavigating) {
        history.pushState({ type: 'screen', id: 'online-exams' }, '', '#online-exams');
    }
};

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
const texts = ["التاريخ والجغرافيا", "الخرائط والتواريخ", "الربط والاستنتاج", "حل الامتحانات"];
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
// 🛡️ نظام الحماية القاسي (Anti-DevTools)
// ==========================================
(function() {
    // 1. منع الكليك يمين في المنصة كلها
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // 2. منع اختصارات الكيبورد الخاصة بالمطورين
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') || 
            (e.ctrlKey && e.shiftKey && e.key === 'C') || 
            (e.ctrlKey && e.shiftKey && e.key === 'J') || 
            (e.ctrlKey && e.key === 'U') || 
            (e.ctrlKey && e.key === 'S')
        ) {
            e.preventDefault();
            return false;
        }
    });

    // 3. فخ الـ Debugger المستمر (بيهنج الشاشة لو فتحوا الكونسول)
    setInterval(function() {
        var before = new Date().getTime();
        debugger;
        var after = new Date().getTime();
        if (after - before > 100) {
            // لو فتحوا الـ Console الكود هيقف هنا ويعملهم إزعاج
            document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top:20%; font-family:Cairo;'>ممنوع استخدام أدوات المطور 🚫</h1>";
            window.location.reload();
        }
    }, 1000);
})();

    