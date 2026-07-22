// ============================================================
// app.js  -  Main Application Logic + Dark/Light Mode Toggle
// ============================================================

// ---- Theme System (Dark / Light Mode) ----
console.log("Evaluator v1.0.9: Loading main logic...");
(function initTheme() {
    var saved = localStorage.getItem('evaluator-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    function makeToggleBtn() {
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        var btn = document.createElement('button');
        btn.id = 'themeToggleBtn';
        btn.type = 'button';
        btn.innerHTML = dark ? '\u2600\uFE0F Light Mode' : '\uD83C\uDF19 Dark Mode';
        btn.setAttribute('aria-label', 'Toggle dark/light mode');
        btn.onclick = window.toggleTheme;
        return btn;
    }

    function injectToggleButtons() {
        document.querySelectorAll('#themeToggleBtn').forEach(function(b) { b.remove(); });
        document.querySelectorAll('.dashboard-header .user-info').forEach(function(userInfo) {
            var btn = makeToggleBtn();
            userInfo.insertBefore(btn, userInfo.firstChild);
        });
        var authHeader = document.querySelector('.auth-header');
        if (authHeader && !authHeader.querySelector('#themeToggleBtn')) {
            var btn = makeToggleBtn();
            btn.style.cssText = 'position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.18);border-color:rgba(255,255,255,0.3);font-size:11px;padding:4px 10px;';
            authHeader.style.position = 'relative';
            authHeader.appendChild(btn);
        }
        updateAllBtns();
    }

    function updateAllBtns() {
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.querySelectorAll('#themeToggleBtn').forEach(function(btn) {
            btn.innerHTML = dark ? '\u2600\uFE0F Light Mode' : '\uD83C\uDF19 Dark Mode';
        });
    }

    window.toggleTheme = function() {
        var html = document.documentElement;
        var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('evaluator-theme', next);
        updateAllBtns();
    };

    document.addEventListener('DOMContentLoaded', injectToggleButtons);
    window._injectThemeToggles = injectToggleButtons;
})();


        // Universal Firebase Bridging Layer
        let _evalExamCache = {};
        // The following functions are now provided globally by firebase-init.js
        // to support both cloud and local file modes.


        function getAcademicYear() { var el = document.getElementById('academicYear'); return el ? el.value : ''; }
        function getSemester() { var el = document.getElementById('semester'); return el ? el.value : ''; }
        window.addEventListener('unhandledrejection', function (event) {
            var reason = event.reason;
            var msg = (reason && reason.message) ? reason.message : String(reason || '');
            if (msg.indexOf('permission-denied') >= 0) {
                if (typeof showToast === 'function') showToast('Permission denied. Please log in again.', 'danger');
            } else if (msg.indexOf('Failed to fetch') >= 0 || msg.indexOf('unavailable') >= 0) {
                if (typeof showToast === 'function') showToast('Network error. Check your connection.', 'danger');
            } else {
                console.error('Unhandled rejection:', reason);
            }
            event.preventDefault();
        });

        // UI Loading Functions
        function sanitizeString(str, maxLength = 120) {
            if (!str) return 'N/A';
            let s = String(str).trim();
            // Basic HTML escaping
            s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (s.length > maxLength) s = s.substring(0, maxLength) + '...';
            // Remove NULL and dangerous control chars but keep most others
            return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        }

        window.deleteStudent = async function(studentId, name) {
            if (!confirm(`Are you sure you want to delete student "${sanitizeString(name)}" and all their associated results?`)) return;
            
            _showLoading('Deleting student...');
            try {
                // Delete results first
                const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'), window.where('studentId', '==', studentId)));
                for (const d of resultsSnap.docs) {
                    await window.deleteDoc(window.doc(window.db, 'results', d.id));
                }
                
                // Delete student
                await window.deleteDoc(window.doc(window.db, 'students', studentId));
                
                showToast('Student deleted successfully', 'success');
                if (typeof loadStudentsList === 'function') loadStudentsList();
            } catch (err) {
                console.error(err);
                showToast('Failed to delete student: ' + err.message, 'danger');
            } finally {
                _hideLoading();
            }
        };

        // UI Loading Functions (Defined globally early to prevent errors)
        var _showLoading = function (message) {
            const overlay = document.getElementById('globalLoadingMsg');
            const textEl = document.getElementById('globalLoadingText');
            if (overlay && textEl) {
                textEl.textContent = message || 'Processing...';
                overlay.style.display = 'flex';
            }
        };
        var _hideLoading = function () {
            const overlay = document.getElementById('globalLoadingMsg');
            if (overlay) overlay.style.display = 'none';
        };

        window.showLoadingMessage = _showLoading;
        window.hideLoadingMessage = _hideLoading;

        async function logAuditEvent(action, metadata = {}) {
            if (!window.currentUser) return;
            try {
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    performedByRole: window.currentUser.role,
                    timestamp: new Date().toISOString(),
                    metadata
                });
            } catch (e) {
                console.error('Audit log failed:', e);
            }
        }
        window.logAuditEvent = logAuditEvent;

        /**
         * Generic form validation helper
         */
        function validateForm(data, schema) {
            const errors = [];
            let valid = true;

            for (const field in schema) {
                const rules = schema[field];
                const value = data[field];

                if (rules.required && (value === undefined || value === null || value === '')) {
                    errors.push(`${field} is required`);
                    valid = false;
                }

                if (rules.minLength && value && value.toString().length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                    valid = false;
                }

                if (rules.custom && !rules.custom(value)) {
                    errors.push(rules.customMessage || `${field} failed custom validation`);
                    valid = false;
                }
            }

            return { valid, errors };
        }
        window.validateForm = validateForm;


        function showForgotPassword() {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('signupForm').classList.add('hidden');
            document.getElementById('forgotPasswordForm').classList.remove('hidden');
        }

        function showLogin() {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('signupForm').classList.add('hidden');
            document.getElementById('forgotPasswordForm').classList.add('hidden');
        }
        async function sendPasswordReset() {
            const email = document.getElementById('resetEmail').value.trim();

            if (!email) {
                showToast('Please enter your email address', 'warning');
                return;
            }

            try {
                await window.sendPasswordResetEmail(window.auth, email);
                showToast('Password reset email sent! Check your inbox.', 'success', 6000);
                showLogin();
                document.getElementById('resetEmail').value = '';
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    showToast('No account found with this email address.', 'danger');
                } else if (error.code === 'auth/invalid-email') {
                    showToast('Invalid email address.', 'danger');
                } else {
                    showToast('Error: ' + error.message, 'danger');
                }
            }
        }
        function toggleAuth() {
            document.getElementById('loginForm').classList.toggle('hidden');
            document.getElementById('signupForm').classList.toggle('hidden');
        }
        function toggleSignupFields() {
            const role = document.getElementById('signupRole').value;
            const enrollmentGroup = document.getElementById('enrollmentGroup');
            const departmentGroup = document.getElementById('departmentGroup');
            const approvalNotice = document.getElementById('approvalNotice');

            if (role === 'student') {
                enrollmentGroup.classList.remove('hidden');
                departmentGroup.classList.add('hidden');
                approvalNotice.classList.add('hidden');
            } else if (role === 'coordinator' || role === 'teacher') {
                enrollmentGroup.classList.add('hidden');
                departmentGroup.classList.remove('hidden');
                approvalNotice.classList.remove('hidden');
            } else if (role === 'hod') {
                enrollmentGroup.classList.add('hidden');
                departmentGroup.classList.remove('hidden');
                approvalNotice.classList.add('hidden');
            } else {
                enrollmentGroup.classList.add('hidden');
                departmentGroup.classList.add('hidden');
                approvalNotice.classList.add('hidden');
            }
        }
        async function signup() {
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const role = document.getElementById('signupRole').value;
            const enrollment = document.getElementById('signupEnrollment').value;
            const department = document.getElementById('signupDepartment').value;

            if (!name || !email || !password) {
                showToast('Please fill in all fields', 'warning');
                return;
            }

            if (role === 'student' && !enrollment) {
                showToast('Please enter enrollment number for student role', 'warning');
                return;
            }

            if ((role === 'hod' || role === 'coordinator') && !department) {
                showToast('Please enter department', 'warning');
                return;
            }

            const btn = document.getElementById('signupBtn');
            if (btn) { btn.classList.add('loading'); btn.textContent = 'Creating account...'; }

            try {
                if (role === 'student' && enrollment) {
                    const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'users'),
                        window.where('enrollment', '==', enrollment)));

                    if (!duplicateCheck.empty) {
                        showToast('Enrollment number already exists! Please use a unique enrollment number.', 'danger');
                        if (btn) { btn.classList.remove('loading'); btn.textContent = 'Create Account'; }
                        return;
                    }
                }

                const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
                const user = userCredential.user;

                const userData = {
                    name,
                    email,
                    role,
                    createdAt: new Date().toISOString(),
                    approved: (['student', 'hod'].includes(role)),
                    approvalStatus: (['student', 'hod'].includes(role)) ? 'approved' : 'pending',
                    isActive: true
                };

                if (role === 'student') {
                    userData.enrollment = enrollment;
                }
                if (role === 'hod' || role === 'coordinator' || role === 'teacher') {
                    userData.department = department;
                    userData.requestedRole = role;
                }
                if (role === 'teacher') {
                    userData.examRestricted = false;
                }

                await window.setDoc(window.doc(window.db, 'users', user.uid), userData);
                if (role !== 'student') {
                    try {
                        await window.sendEmailVerification(user);
                    } catch (verifyError) { }
                }
                await window.signOut(window.auth);

                if (role === 'hod') {
                    showToast('HOD account created! You can now login.', 'success', 6000);
                } else if (role === 'student') {
                    showToast('Account created successfully! You can now login.', 'success');
                } else {
                    showToast('Registration submitted! Your account requires HOD approval before access.', 'info', 6000);
                }
                document.getElementById('signupName').value = '';
                document.getElementById('signupEmail').value = '';
                document.getElementById('signupPassword').value = '';
                document.getElementById('signupEnrollment').value = '';
                document.getElementById('signupDepartment').value = '';

                if (btn) { btn.classList.remove('loading'); btn.textContent = 'Create Account'; }
                toggleAuth();
            } catch (error) {
                if (btn) { btn.classList.remove('loading'); btn.textContent = 'Create Account'; }
                if (error.code === 'auth/email-already-in-use') {
                    showToast('This email is already registered. Please login instead.', 'danger');
                } else if (error.code === 'auth/weak-password') {
                    showToast('Password should be at least 6 characters.', 'danger');
                } else if (error.code === 'auth/invalid-email') {
                    showToast('Invalid email address.', 'danger');
                } else {
                    showToast('Error: ' + error.message, 'danger');
                }
            }
        }
        async function adminCreateUser() {
            if (!window.currentUser || window.currentUser.role !== 'hod') {
                showToast('Access Denied: Only HOD can create user accounts', "danger");
                return;
            }

            const name = document.getElementById('adminCreateName').value.trim();
            const email = document.getElementById('adminCreateEmail').value.trim().toLowerCase();
            const password = document.getElementById('adminCreatePassword').value;
            const role = document.getElementById('adminCreateRole').value;
            const enrollment = document.getElementById('adminCreateEnrollment').value.trim();
            const department = document.getElementById('adminCreateDepartment').value.trim();

            if (!name || !email || !password) {
                showToast('Please fill in all required fields', "danger");
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast('Invalid email format', 'danger');
                return;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters', "danger");
                return;
            }

            if (role === 'student' && !enrollment) {
                showToast('Please enter enrollment number for student role', "danger");
                return;
            }

            if ((role === 'hod' || role === 'coordinator' || role === 'teacher') && !department) {
                showToast('Please enter department for this role', 'danger');
                return;
            }

            const btn = document.getElementById('adminCreateBtn');
            if (btn) {
                btn.disabled = true;
                btn.classList.add('loading');
                btn.textContent = 'Creating Account...';
            }

            try {
                const duplicateEmailCheck = await window.getDocs(
                    window.query(
                        window.collection(window.db, 'users'),
                        window.where('email', '==', email)
                    )
                );

                if (!duplicateEmailCheck.empty) {
                    showToast('Error: A user with this email already exists!', 'danger', 5000);
                    if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Create Account'; }
                    return;
                }

                const duplicateNameCheck = await window.getDocs(
                    window.query(
                        window.collection(window.db, 'users'),
                        window.where('name', '==', name)
                    )
                );

                if (!duplicateNameCheck.empty) {
                    if (!confirm(`\u26A0\uFE0F WARNING: A user with name "${name}" already exists.\n\nContinue creating account anyway?`)) {
                        if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Create Account'; }
                        return;
                    }
                }

                if (role === 'student') {
                    const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'users'),
                        window.where('enrollment', '==', enrollment)));

                    if (!duplicateCheck.empty) {
                        showToast('Enrollment number already exists!', "danger");
                        if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Create Account'; }
                        return;
                    }
                }

                const userCredential = await window.createUserWithEmailAndPassword(window.secondaryAuth || window.auth, email, password);
                const newUser = userCredential.user;

                const userData = {
                    name,
                    email,
                    role,
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.uid,
                    createdByName: window.currentUser.name,
                    createdByRole: window.currentUser.role,
                    adminCreated: true,
                    isDeleted: false,
                    isActive: true,
                    lastModifiedBy: window.currentUser.uid,
                    lastModifiedAt: new Date().toISOString(),
                    modificationHistory: []
                };

                if (role === 'student') {
                    userData.enrollment = enrollment;
                }

                if (role === 'hod' || role === 'coordinator' || role === 'teacher') {
                    userData.department = department;
                }

                if (role === 'teacher') {
                    userData.examRestricted = false;
                }

                const autoApprove = true;
                userData.approved = autoApprove;
                userData.approvalStatus = autoApprove ? 'approved' : 'pending';

                await window.setDoc(window.doc(window.db, 'users', newUser.uid), userData);
                await window.signOut(window.secondaryAuth || window.auth);

                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ADMIN_CREATE_USER',
                    createdUserId: newUser.uid,
                    createdUserEmail: email,
                    createdUserName: name,
                    createdUserRole: role,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    performedByRole: window.currentUser.role,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        department: department || null,
                        enrollment: enrollment || null,
                        autoApproved: autoApprove
                    }
                });

                document.getElementById('adminCreateName').value = '';
                document.getElementById('adminCreateEmail').value = '';
                document.getElementById('adminCreatePassword').value = '';
                document.getElementById('adminCreateEnrollment').value = '';
                document.getElementById('adminCreateDepartment').value = '';
                loadAllUsers();
                showToast(`\u2705 User created successfully!\n\nEmail: ${email}\nTemporary Password: ${password}\n\n\u26A0\uFE0F Important: Ask user to change password after first login.`, 'success', 10000);

            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    showToast('This email is already registered in the system.', "danger");
                } else if (error.code === 'auth/weak-password') {
                    showToast('Password should be at least 6 characters.', "danger");
                } else if (error.code === 'auth/invalid-email') {
                    showToast('Invalid email address format.', "danger");
                } else {
                    showToast('Error: ' + error.message, 'danger');
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('loading');
                    btn.textContent = 'Create Account';
                }
            }
        }
        function toggleAdminCreateFields() {
            const role = document.getElementById('adminCreateRole').value;
            const enrollmentGroup = document.getElementById('adminEnrollmentGroup');
            const departmentGroup = document.getElementById('adminDepartmentGroup');

            if (role === 'student') {
                enrollmentGroup.classList.remove('hidden');
                departmentGroup.classList.add('hidden');
            } else if (role === 'hod' || role === 'coordinator' || role === 'teacher') {
                enrollmentGroup.classList.add('hidden');
                departmentGroup.classList.remove('hidden');
            } else {
                enrollmentGroup.classList.add('hidden');
                departmentGroup.classList.add('hidden');
            }
        }
        async function loadAllUsers() {
            const tbody = document.getElementById('allUsersList');
            if (!tbody) return;

            const roleFilter = document.getElementById('userFilterRole').value;

            tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

            try {
                let q = window.collection(window.db, 'users');
                if (roleFilter) {
                    q = window.query(q, window.where('role', '==', roleFilter));
                }

                const snapshot = await window.getDocs(q);
                tbody.innerHTML = '';

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const created = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A';
                    const extraInfo = data.enrollment || data.department || '-';
                    const isActive = data.isActive !== false;
                    const isTeacher = data.role === 'teacher';

                    const row = tbody.insertRow();
                    if (!isActive) row.classList.add('teacher-row-disabled');
                    const approvalBadge = data.approvalStatus === 'approved'
                        ? '<span class="badge badge-success">Approved</span>'
                        : '<span class="badge badge-warning">Pending</span>';
                    const accountBadge = isActive
                        ? '<span class="account-status-on">ON</span>'
                        : '<span class="account-status-off">OFF</span>';
                    row.innerHTML = `
 <td><strong>${sanitizeString(data.name)}</strong></td>
<td style="font-size:12px;">${data.email}</td>
<td><span class="badge badge-info">${data.role.toUpperCase()}</span></td>
<td>${extraInfo}</td>
<td>${accountBadge}</td>
<td>${approvalBadge}</td>
<td>${created}</td>
<td style="white-space:nowrap;">
${data.approvalStatus !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="approveUser('${docSnap.id}')">Approve</button> ` : ''}
${isTeacher ? `<button class="btn btn-sm ${isActive ? 'btn-off' : 'btn-on'}" onclick="toggleTeacherAccount('${docSnap.id}','${data.email}',${isActive})">${isActive ? 'Disable' : 'Enable'}</button> ` : ''}
<button class="btn btn-danger btn-sm" onclick="deleteUserFromManage('${docSnap.id}','${data.email}')">Delete</button>
</td> `;
                });

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No users found</td></tr>';
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="8">Error loading users</td></tr>';
            }
        }
        async function login() {
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                showToast('Please fill in all fields', 'warning');
                return;
            }

            const failedAttempts = window.failedLoginAttempts.get(email) || 0;
            if (failedAttempts >= 5) {
                showToast('Account locked due to too many failed attempts. Please contact administrator.', 'danger', 7000);
                return;
            }

            const btn = document.getElementById('loginBtn');
            if (btn) { btn.classList.add('loading'); btn.textContent = 'Logging in...'; }

            if (!window.signInWithEmailAndPassword) {
                showToast('Firebase failed to load. You must use a local web server (like VS Code Live Server) to run this application.', 'danger', 10000);
                if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }
                return;
            }

            try {
                if (!email || !password) {
                    showToast('Please enter both email and password', 'warning');
                    if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }
                    return;
                }
                const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
                const user = userCredential.user;

                if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }

                const userDoc = await window.getDoc(window.doc(window.db, 'users', user.uid));
                if (!userDoc.exists()) {
                    showToast('User record not found. Please contact the administrator.', 'danger');
                    await window.signOut(window.auth);
                    return;
                }

                const userData = userDoc.data();

                if (userData.isLocked) {
                    await window.signOut(window.auth);
                    if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }
                    showToast('Your account has been locked. Please contact administrator.', 'danger', 7000);
                    return;
                }

                if (userData.isDeleted || userData.isActive === false) {
                    await window.signOut(window.auth);
                    if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }
                    showToast('Your account has been deactivated. Please contact administrator.', 'danger', 7000);
                    return;
                }

                if (userData.role === 'teacher' && userData.isActive === false) {
                    await window.signOut(window.auth);
                    if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }
                    showToast('Your account has been disabled by the coordinator. Please contact your department.', 'danger', 7000);
                    return;
                }

                if (window.clearFailedAttempts) await window.clearFailedAttempts(email);

                try {
                    await window.addDoc(window.collection(window.db, 'audit_logs'), {
                        action: 'LOGIN_SUCCESS',
                        userEmail: email,
                        userId: userCredential.user.uid,
                        emailVerified: user.emailVerified,
                        timestamp: new Date().toISOString()
                    });
                } catch (logError) { }

                if (typeof window.resetIdleTimer === "function") window.resetIdleTimer();

            } catch (error) {
                if (btn) { btn.classList.remove('loading'); btn.textContent = 'Login'; }

                const attempts = window.logFailedLogin ? await window.logFailedLogin(email, error.code) : 0;

                try {
                    await window.addDoc(window.collection(window.db, 'audit_logs'), {
                        action: 'LOGIN_FAILED',
                        userEmail: email,
                        errorCode: error.code,
                        attemptNumber: attempts,
                        timestamp: new Date().toISOString()
                    });
                } catch (logError) { }

                if (attempts >= 5) {
                if (window.lockAccount) await window.lockAccount(email);
                    showToast('Account locked due to too many failed attempts. Please contact administrator.', 'danger', 7000);
                    return;
                }

                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    showToast(`Invalid email or password. ${5 - attempts} attempts remaining before account lock.`, 'danger', 5000);
                } else if (error.code === 'auth/too-many-requests') {
                    showToast('Too many failed login attempts. Please try again later or reset your password.', 'warning', 6000);
                } else {
                    showToast('Error: ' + error.message, 'danger');
                }
            }
        }
        async function logout() {
            // BUG-18 FIX: Clear ALL caches so stale data isn't visible on next login
            _evalExamCache = {};
            if (typeof allStudentsData !== 'undefined') allStudentsData = [];
            if (typeof _teacherAccountCache !== 'undefined') _teacherAccountCache = [];
            if (typeof csvData !== 'undefined') csvData = [];
            window._facultyImportData = [];
            try {
                await window.signOut(window.auth);
            } catch (error) {
                showToast('Error signing out: ' + error.message, 'danger');
            }
        }
        function showDashboard(role) {
            document.getElementById('authContainer').style.display = 'none';
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) { loginBtn.classList.remove('loading'); loginBtn.textContent = 'Login'; }
            hideAllDashboards();

            switch (role) {
                case 'hod':
                    document.getElementById('hodDashboard').classList.add('active');
                    const badge = document.getElementById('hodRoleBadge');
                    if (badge && window.currentUser) badge.textContent = 'HOD';
                    loadHODData();
                    loadCoordinatorsDropdown();
                    break;
                case 'coordinator':
                    document.getElementById('coordinatorDashboard').classList.add('active');
                    loadCoordinatorData();
                    loadTeachersDropdown();
                    break;
                case 'teacher':
                    document.getElementById('teacherDashboard').classList.add('active');
                    loadTeacherData();
                    break;
                case 'student':
                    document.getElementById('studentDashboard').classList.add('active');
                    loadStudentData();
                    break;
                default:
                    showToast('Unknown role "' + role + '". Please contact the administrator.', 'danger');
                    document.getElementById('authContainer').style.display = 'block';
                    window.signOut(window.auth);
                    break;
            }
            // Re-inject theme toggle button after dashboard becomes active
            if (typeof window._injectThemeToggles === 'function') {
                setTimeout(window._injectThemeToggles, 60);
            }
            // Update Sync UI
            if (window.OfflineSyncManager && typeof window.OfflineSyncManager.updateUI === 'function') {
                window.OfflineSyncManager.updateUI();
            }
        }

        function hideAllDashboards() {
            document.getElementById('hodDashboard').classList.remove('active');
            document.getElementById('coordinatorDashboard').classList.remove('active');
            document.getElementById('teacherDashboard').classList.remove('active');
            document.getElementById('studentDashboard').classList.remove('active');
        }

        
        

        async function createDepartment() {
            const name = document.getElementById('deptName').value.trim();
            const code = document.getElementById('deptCode').value.trim().toUpperCase();

            if (!name || !code) {
                showToast('Please fill in all fields', "danger");
                return;
            }

            try {
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'departments'),
                    window.where('code', '==', code)));

                if (!duplicateCheck.empty) {
                    showToast('Department code already exists!', "danger");
                    return;
                }

                await window.addDoc(window.collection(window.db, 'departments'), {
                    name,
                    code,
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString(),
                    isActive: true
                });

                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'CREATE_DEPARTMENT',
                    departmentName: name,
                    departmentCode: code,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });

                showToast('Department created successfully!', "success");
                document.getElementById('deptName').value = '';
                document.getElementById('deptCode').value = '';
                loadDepartments();
                loadHODData();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function loadDepartments() {
            const tbody = document.getElementById('departmentsList');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

            try {
                const snapshot = await window.getDocs(window.collection(window.db, 'departments'));
                tbody.innerHTML = '';

                for (const deptDoc of snapshot.docs) {
                    const data = deptDoc.data();
                    const created = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A';

                    const row = tbody.insertRow();
                    row.innerHTML = `
 <td><strong>${sanitizeString(data.name)}</strong></td>
<td>${data.code}</td>
<td>${created}</td> `;
                }

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No departments created yet</td></tr>';
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="3">Error loading departments</td></tr>';
            }
        }

        async function loadPendingApprovals() {
            const tbody = document.getElementById('pendingApprovalsList');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

            try {
                const snapshot = await window.getDocs(window.query(window.collection(window.db, 'users'),
                    window.where('approvalStatus', '==', 'pending')));

                tbody.innerHTML = '';

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const created = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A';

                    const row = tbody.insertRow();
                    row.innerHTML = `
 <td><strong>${sanitizeString(data.name)}</strong></td>
<td>${data.email}</td>
<td><span class="badge badge-warning">${data.role.toUpperCase()}</span></td>
<td>${data.department || '-'}</td>
<td>${created}</td>
<td>
<button class="btn btn-success btn-sm" onclick="approveUser('${doc.id}')">Approve</button>
<button class="btn btn-danger btn-sm" onclick="rejectUser('${doc.id}')">Reject</button>
</td> `;
                });

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No pending approvals</td></tr>';
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="6">Error loading approvals</td></tr>';
            }
        }

        async function approveUser(userId) {
            if (!window.currentUser) return;
            try {
                const userDoc = await window.getDoc(window.doc(window.db, 'users', userId));
                const userData = userDoc.data();

                await window.updateDoc(window.doc(window.db, 'users', userId), {
                    approved: true,
                    approvedBy: window.currentUser.uid,
                    approvedAt: new Date().toISOString(),
                    approvalStatus: 'approved'
                });

                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'APPROVE_USER',
                    userId: userId,
                    userEmail: userData.email,
                    userRole: userData.role,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });

                showToast('User approved successfully!', "success");
                loadPendingApprovals();
                loadHODData();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function rejectUser(userId) {
            if (!confirm('Reject and delete this user? This cannot be undone.')) return;
            if (!window.currentUser) return;
            try {
                const userDoc = await window.getDoc(window.doc(window.db, 'users', userId));
                const userData = userDoc.data();

                await window.deleteDoc(window.doc(window.db, 'users', userId));

                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'REJECT_USER',
                    userEmail: userData.email,
                    userRole: userData.role,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });

                showToast('User rejected and removed!', "success");
                loadPendingApprovals();
                loadHODData();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function exportDepartmentsExcel() {
            try {
                const snapshot = await window.getDocs(window.collection(window.db, 'departments'));
                if (snapshot.empty) {
                    showToast('No departments to export', "warning");
                    return;
                }

                const data = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return {
                        'Department Name': d.name,
                        'Code': d.code,
                        'Created Date': d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A'
                    };
                });

                exportToExcel(data, `departments_${Date.now()}`, 'Departments');
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        function showHODSection(section, btn) {
            document.querySelectorAll('#hodDashboard .section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('#hodDashboard .nav-btn').forEach(b => b.classList.remove('active'));

            document.getElementById('hod' + section.charAt(0).toUpperCase() + section.slice(1)).classList.add('active');
            if (btn) btn.classList.add('active');
            if (section === 'analytics') {
                loadAuditLogs();
            } else if (section === 'coordinators') {
                loadCoordinatorsList();
            } else if (section === 'approvals') {
                loadPendingApprovals();
            } else if (section === 'departments') {
                loadDepartments();
            } else if (section === 'users') {
                loadAllUsers();
                loadTeacherAccountList();
            } else if (section === 'results') {
                loadResultsForHOD();
            }
        }

        async function loadHODData() {
            try {
                const hodDept = window.currentUser.department || window.currentUser.departmentId;
                
                // Departments are global usually, but stats should be filtered
                const deptsSnap = await window.getDocs(window.collection(window.db, 'departments'));
                
                // Pending approvals filtered by department
                let pendingQuery = window.query(window.collection(window.db, 'users'), window.where('approvalStatus', '==', 'pending'));
                if (hodDept) {
                    pendingQuery = window.query(window.collection(window.db, 'users'), 
                        window.where('approvalStatus', '==', 'pending'),
                        window.where('department', '==', hodDept));
                }
                const pendingSnap = await window.getDocs(pendingQuery);

                let coordQuery = window.query(window.collection(window.db, 'users'),
                    window.where('role', '==', 'coordinator'),
                    window.where('approved', '==', true));
                if (hodDept) {
                    coordQuery = window.query(window.collection(window.db, 'users'),
                        window.where('role', '==', 'coordinator'),
                        window.where('approved', '==', true),
                        window.where('department', '==', hodDept));
                }
                
                let teacherQuery = window.query(window.collection(window.db, 'users'),
                    window.where('role', '==', 'teacher'),
                    window.where('approved', '==', true));
                if (hodDept) {
                    teacherQuery = window.query(window.collection(window.db, 'users'),
                        window.where('role', '==', 'teacher'),
                        window.where('approved', '==', true),
                        window.where('department', '==', hodDept));
                }
                
                // Filter students by department if they have the field, or count all for now if not
                // Based on current schema, let's check if we can filter subjects first then students
                let studentQuery = window.query(window.collection(window.db, 'students'), window.limit(1000));
                if (hodDept) {
                    studentQuery = window.query(window.collection(window.db, 'students'), 
                        window.where('department', '==', hodDept), 
                        window.limit(1000));
                }

                let examQuery = window.collection(window.db, 'exams');
                if (hodDept) {
                    examQuery = window.query(window.collection(window.db, 'exams'), 
                        window.where('department', '==', hodDept));
                }

                const [coordinatorsSnap, teachersSnap, studentsSnap, examsSnap] = await Promise.all([
                    window.getDocs(coordQuery),
                    window.getDocs(teacherQuery),
                    window.getDocs(studentQuery),
                    window.getDocs(examQuery)
                ]);

                document.getElementById('hodTotalDepts').textContent = deptsSnap.size;
                document.getElementById('hodPendingApprovals').textContent = pendingSnap.size;
                document.getElementById('totalCoordinators').textContent = coordinatorsSnap.size;
                document.getElementById('totalTeachers').textContent = teachersSnap.size;
                document.getElementById('totalStudents').textContent = studentsSnap.size;
                document.getElementById('totalExams').textContent = examsSnap.size;

                loadCoordinatorsList();
                loadTeacherAccountList().catch(() => { });
            } catch (error) {
                showToast('Error loading dashboard: ' + error.message, 'danger');
            }
        }

        async function assignCoordinator() {
            const department = document.getElementById('coordDept').value;
            const emailSelect = document.getElementById('coordEmail').value;
            const emailManual = document.getElementById('coordEmailManual').value.trim();
            const email = emailSelect || emailManual;

            if (!department || !email) {
                showToast('Please fill in all fields', "danger");
                return;
            }

            try {
                const userQuery = await window.getDocs(window.query(window.collection(window.db, 'users'),
                    window.where('email', '==', email),
                    window.where('role', '==', 'coordinator')));

                if (userQuery.empty) {
                    showToast('User not found or not registered as Coordinator!\n\nThe user must first register with role "Coordinator".', "danger");
                    return;
                }

                const coordUser = userQuery.docs[0].data();
                const coordUserId = userQuery.docs[0].id;
                if (!coordUser.approved || coordUser.approvalStatus !== 'approved') {
                    showToast('This coordinator account is not approved yet!\n\nPlease approve the user first in "Pending Approvals" section.', "danger");
                    return;
                }
                const hodDept = window.currentUser.department || window.currentUser.departmentId;
                if (hodDept && coordUser.department && coordUser.department !== hodDept) {
                    showToast('Cross-department assignment not allowed. Coordinator dept: ' + coordUser.department, 'danger');
                    return;
                }
                const existingByEmail = await window.getDocs(window.query(window.collection(window.db, 'coordinator_assignments'),
                    window.where('email', '==', email)));
                if (!existingByEmail.empty) {
                    const existingDept = existingByEmail.docs[0].data().department;
                    if (existingDept === department) {
                        showToast('This coordinator is already assigned to this department!', 'danger');
                    } else {
                        showToast('This coordinator is already assigned to department "' + existingDept + '". A coordinator can only manage one department at a time. Remove the existing assignment first.', 'danger');
                    }
                    return;
                }

                const existingByDept = await window.getDocs(window.query(window.collection(window.db, 'coordinator_assignments'),
                    window.where('department', '==', department)));
                if (!existingByDept.empty) {
                    const existingCoord = existingByDept.docs[0].data().coordinatorName || existingByDept.docs[0].data().email;
                    showToast('Department "' + department + '" already has coordinator "' + existingCoord + '" assigned. Remove them first before assigning a new one.', 'danger');
                    return;
                }

                await window.addDoc(window.collection(window.db, 'coordinator_assignments'), {
                    department,
                    email,
                    coordinatorId: coordUserId,
                    coordinatorName: coordUser.name,
                    assignedBy: window.currentUser.uid,
                    assignedByName: window.currentUser.name,
                    assignedAt: new Date().toISOString()
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ASSIGN_COORDINATOR',
                    department: department,
                    coordinatorEmail: email,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });

                showToast('Coordinator assigned successfully!', "success");
                document.getElementById('coordDept').value = '';
                document.getElementById('coordEmail').value = '';
                document.getElementById('coordEmailManual').value = '';
                loadCoordinatorsList();
                loadCoordinatorsDropdown();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function removeCoordinator(assignmentId, department, email) {
            if (!window._pendingRemoval) {
                window._pendingRemoval = assignmentId;
                showToast('Click Remove again to confirm removing ' + email + ' from "' + department + '"', 'warning', 4000);
                setTimeout(() => { window._pendingRemoval = null; }, 4000);
                return;
            }
            window._pendingRemoval = null;
            try {
                await window.deleteDoc(window.doc(window.db, 'coordinator_assignments', assignmentId));
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'REMOVE_COORDINATOR',
                    department: department,
                    coordinatorEmail: email,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });
                showToast('Coordinator removed from "' + department + '" successfully.', 'success');
                loadCoordinatorsList();
                loadCoordinatorsDropdown();
            } catch (error) {
                showToast('Error removing coordinator: ' + error.message, 'danger');
            }
        }

        async function loadCoordinatorsList() {
            const tbody = document.getElementById('coordinatorsList');
            tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

            try {
                const snapshot = await window.getDocs(window.collection(window.db, 'coordinator_assignments'));
                tbody.innerHTML = '';

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const assignedDate = data.assignedAt ? new Date(data.assignedAt).toLocaleDateString() : 'N/A';
                    const row = tbody.insertRow();
                    row.innerHTML = `
 <td><strong>${data.department}</strong></td>
<td>${data.coordinatorName || data.email.split('@')[0]}</td>
<td>${data.email}</td>
<td>${assignedDate}</td>
<td><button class="btn btn-danger btn-sm" onclick="removeCoordinator('${doc.id}','${data.department}','${data.email}')">Remove</button></td>`;
                });

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No coordinators assigned yet</td></tr>';
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
            }
        }

        async function loadAuditLogs() {
            const auditDiv = document.getElementById('auditLogsList');
            const filter = document.getElementById('auditFilter').value;

            auditDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading audit logs...</div>';

            try {
                let q = window.collection(window.db, 'audit_logs');

                if (filter) {
                    q = window.query(q, window.where('action', '==', filter));
                }

                // BUG-11 FIX: Compound query (where + orderBy) may require composite index.
                // Fallback to in-memory sort if index is missing.
                let snapshot;
                try {
                    snapshot = await window.getDocs(window.query(q, window.orderBy('timestamp', 'desc'), window.limit(100)));
                } catch (idxErr) {
                    console.warn('[AuditLog] Index missing, falling back to in-memory sort:', idxErr.message);
                    snapshot = await window.getDocs(window.query(q, window.limit(200)));
                    // Sort in-memory
                    const sorted = snapshot.docs.slice().sort((a, b) => {
                        const ta = a.data().timestamp || '';
                        const tb = b.data().timestamp || '';
                        return tb.localeCompare(ta);
                    });
                    snapshot = { docs: sorted.slice(0, 100), empty: sorted.length === 0 };
                }

                const snapshot2 = snapshot; // alias kept for reference

                if (snapshot.empty) {
                    auditDiv.innerHTML = '<div class="alert alert-info">No audit logs found</div>';
                    return;
                }

                let html = '<div class="table-container"><table><thead><tr><th>Date/Time</th><th>Action</th><th>Details</th><th>Performed By</th><th>Academic Session</th></tr></thead><tbody>';

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A';

                    let details = '';
                    switch (data.action) {
                        case 'TEACHER_FINALIZED_EVALUATION':
                            details = `Exam: ${data.examName || 'N/A'}`;
                            break;
                        case 'ADD_STUDENT':
                            details = `Student: ${sanitizeString(data.studentName)} (${data.studentEnrollment})`;
                            break;
                        case 'BULK_IMPORT_STUDENTS':
                            details = `Imported: ${data.successCount}, Skipped: ${data.skipCount}`;
                            break;
                        case 'EVALUATE_STUDENT':
                        case 'EVALUATE_STUDENT_CA':
                            details = `Marks: ${data.marks}`;
                            break;
                        case 'FINALIZE_EXAM_RESULTS':
                            details = `Exam: ${data.examName}<br>Students: ${data.totalStudents}<br>Reason: ${data.reason}`;
                            break;
                        default:
                            details = 'Action performed';
                    }

                    const badgeColor = data.irreversible ? 'danger' : 'info';

                    html += `
 <tr>
<td>${timestamp}</td>
<td><span class="badge badge-${badgeColor}">${data.action.replace(/_/g, ' ')}</span></td>
<td>${details}</td>
<td>${data.performedByName || data.performedBy || 'System'}</td>
<td>${data.academicYear || 'N/A'} / ${data.semester || 'N/A'}</td>
</tr> `;
                });
                html += '</tbody></table></div>';
                auditDiv.innerHTML = html;
            } catch (error) {
                auditDiv.innerHTML = '<div class="alert alert-danger">Error loading audit logs: ' + error.message + '</div>';
            }
        }
        function showCoordSection(section, btn) {
            document.querySelectorAll('#coordinatorDashboard .section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('#coordinatorDashboard .nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('coord' + section.charAt(0).toUpperCase() + section.slice(1)).classList.add('active');
            if (btn) btn.classList.add('active');
            if (section === 'classes') { loadClassesList(); loadClassesDropdown(); }
            else if (section === 'subjects') loadSubjectsList();
            else if (section === 'students') loadStudentsList();
            else if (section === 'exams') loadExamsList();
            else if (section === 'teachers') { loadTeacherAssignments(); loadTeachersDropdown(); loadTeacherAccountList(); }
            else if (section === 'results') { loadExamsList(); loadResultsForCoordinator(); loadResults(); }
            else if (section === 'questionbank') {
                loadQuestionBankSubjects();
                loadQuestions();

                const dateInput = document.getElementById('distDate');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            }
        }

        async function loadCoordinatorData() {
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;
            const coordDept = window.currentUser.department;
            try {
                let subjectsQuery = window.query(window.collection(window.db, 'subjects'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester));
                if (coordDept) {
                    subjectsQuery = window.query(subjectsQuery, window.where('department', '==', coordDept));
                }

                let studentsQuery = window.query(window.collection(window.db, 'students'), 
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester));
                if (coordDept) {
                    studentsQuery = window.query(studentsQuery, window.where('department', '==', coordDept));
                }

                let examsQuery = window.query(window.collection(window.db, 'exams'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester));
                if (coordDept) {
                    examsQuery = window.query(examsQuery, window.where('department', '==', coordDept));
                }

                const [subjectsSnap, studentsSnap, examsSnap] = await Promise.all([
                    window.getDocs(subjectsQuery),
                    window.getDocs(studentsQuery),
                    window.getDocs(examsQuery)
                ]);
                const nonFinalizedIds = examsSnap.docs.filter(d => d.data().status !== 'FINALIZED').map(d => d.id);
                let pendingCount = 0;
                if (nonFinalizedIds.length > 0) {
                    const pendingPromises = nonFinalizedIds.map(eid =>
                        window.getDocs(window.query(window.collection(window.db, 'results'),
                            window.where('examId', '==', eid),
                            window.where('status', '==', 'INCOMPLETE')))
                    );
                    const pendingSnaps = await Promise.all(pendingPromises);
                    pendingCount = pendingSnaps.reduce((s, snap) => s + snap.size, 0);
                }

                document.getElementById('coordTotalSubjects').textContent = subjectsSnap.size;
                document.getElementById('coordTotalStudents').textContent = studentsSnap.size;
                document.getElementById('coordTotalExams').textContent = examsSnap.size;
                document.getElementById('coordPendingEvals').textContent = pendingCount;

                loadSubjectsList();
                loadStudentsList();
                loadExamsList();
                loadTeacherAssignments();
                loadEvaluationProgress(examsSnap);
                loadClassesDropdown();
                loadTeacherAccountList().catch(() => { });

                loadQuestionBankSubjects();
            } catch (error) {
                showToast('Error loading dashboard: ' + error.message, 'danger');
            }
        }

        async function loadQuestionBankSubjects() {
            const year = document.getElementById('academicYear')?.value;
            const semester = document.getElementById('semester')?.value;

            if (!year || !semester) return;

            try {
                // BUG-02 FIX: use window. prefix — bare getDocs/query/etc are not in local scope
                const snapshot = await window.getDocs(
                    window.query(
                        window.collection(window.db, 'subjects'),
                        window.where('academicYear', '==', year),
                        window.where('semester', '==', semester)
                    )
                );

                const options = snapshot.docs.map(doc => {
                    const s = doc.data();
                    const shortId = doc.id.substring(0, 6);
                    return `<option value="${doc.id}">${s.name} (${s.code}) [ID:${shortId}] - ${s.class} ${s.division}</option>`;
                }).join('');

                const baseOption = '<option value="">Select Subject</option>';

                const dropdowns = [
                    'qbSubjectSelect',
                    'qbPDFSubjectSelect',
                    'qbFilterSubject',
                    'qDistSubject',
                    'historySubject'
                ];

                dropdowns.forEach(id => {
                    const elem = document.getElementById(id);
                    if (elem) elem.innerHTML = baseOption + options;
                });

            } catch (error) {
                console.error('Error loading QB subjects:', error);
            }
        }

        window.loadQuestionBankSubjects = loadQuestionBankSubjects;

        async function loadEvaluationProgress(examsSnap) {
            const progressDiv = document.getElementById('evaluationProgress');

            if (!examsSnap || examsSnap.empty) {
                progressDiv.innerHTML = '<p style="color: #6b7280;">No exams created yet</p>';
                return;
            }

            progressDiv.innerHTML = '<div class="loading">Calculating progress...</div>';

            try {
                let html = '<div class="table-container"><table><thead><tr><th>Exam</th><th>Status</th><th>Evaluated</th><th>Incomplete</th><th>Completion %</th><th>Action</th></tr></thead><tbody>';

                for (const examDoc of examsSnap.docs) {
                    const examData = examDoc.data();
                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                    const subjectData = subjectDoc.exists() ? subjectDoc.data() : { name: 'N/A' };

                    const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'),
                        window.where('examId', '==', examDoc.id)));

                    const completeCount = resultsSnap.docs.filter(d => d.data().status === 'COMPLETE').length;
                    const incompleteCount = resultsSnap.docs.filter(d => d.data().status === 'INCOMPLETE').length;
                    const totalEvaluated = resultsSnap.size;
                    const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                        window.where('class', '==', subjectData.class),
                        window.where('division', '==', subjectData.division)));

                    const expectedCount = studentsSnap.size;
                    const completionPercentage = expectedCount > 0 ? ((totalEvaluated / expectedCount) * 100).toFixed(1) : 0;

                    const statusBadge = examData.status === 'FINALIZED' ?
                        '<span class="badge badge-danger">FINALIZED</span>' :
                        '<span class="badge badge-success">ACTIVE</span>';

                    const progressColor = completionPercentage >= 100 ? 'success' :
                        completionPercentage >= 50 ? 'warning' : 'danger';

                    html += `
 <tr>
<td><strong>${examData.name}</strong><br><small>${subjectData.name}</small></td>
<td>${statusBadge}</td>
<td><span class="badge badge-success">${completeCount}</span></td>
<td><span class="badge badge-warning">${incompleteCount}</span></td>
<td><span class="badge badge-${progressColor}">${completionPercentage}% (${totalEvaluated}/${expectedCount})</span></td>
<td> ${examData.status !== 'FINALIZED' ?
                            `<button class="btn btn-primary btn-sm" onclick="previewEvaluationSubmission('${examDoc.id}', true)">Monitor Progress</button>` :
                            '<small>Locked</small>'}
 </td>
</tr> `;
                }

                html += '</tbody></table></div>';
                progressDiv.innerHTML = html;
            } catch (error) {
                progressDiv.innerHTML = '<p style="color: #ef4444;">Error loading progress</p>';
            }
        }

        async function addSubject() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const name = document.getElementById('subjectName').value.trim();
            const code = document.getElementById('subjectCode').value.trim();
            const classVal = document.getElementById('subjectClass').value.trim();
            const division = document.getElementById('subjectDivision').value.trim();
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;

            if (!name || !code || !classVal || !division) {
                showToast('Please fill in all fields', "danger");
                return;
            }

            try {
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'subjects'),
                    window.where('code', '==', code),
                    window.where('class', '==', classVal),
                    window.where('division', '==', division),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                if (!duplicateCheck.empty) {
                    const existingSubject = duplicateCheck.docs[0].data();
                    if (!existingSubject.isDeleted) {
                        showToast('This subject already exists for this class, division, and semester!', "danger");
                        return;
                    }
                }

                await window.addDoc(window.collection(window.db, 'subjects'), {
                    name,
                    code,
                    class: classVal,
                    division,
                    academicYear: year,
                    semester,
                    department: window.currentUser.department || '',
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString(),
                    isDeleted: false
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ADD_SUBJECT',
                    subjectCode: code,
                    subjectName: name,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString(),
                    academicYear: year,
                    semester: semester
                });

                showToast('Subject added successfully!', "success");
                document.getElementById('subjectName').value = '';
                document.getElementById('subjectCode').value = '';
                document.getElementById('subjectClass').value = '';
                document.getElementById('subjectDivision').value = '';
                loadSubjectsList();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function loadSubjectsList() {
            const tbody = document.getElementById('subjectsList');
            const assignSelect = document.getElementById('assignSubject');
            tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
            assignSelect.innerHTML = '<option value="">Select subject</option>';

            try {
                const year = document.getElementById('academicYear').value;
                const semester = document.getElementById('semester').value;
                const snapshot = await window.getDocs(window.query(window.collection(window.db, 'subjects'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));
                tbody.innerHTML = '';

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.isDeleted) return;

                    const row = tbody.insertRow();
                    row.innerHTML = `
 <td><code style="font-size:10px;color:#6b7280;">${docSnap.id.substring(0,6)}...</code></td>
 <td>${sanitizeString(data.name)}</td>
 <td>${data.code}</td>
 <td>${data.class}</td>
 <td>${data.division}</td>
 <td><button class="btn btn-danger btn-sm" onclick="deleteSubject('${docSnap.id}')">Delete</button></td> `;

                    const option = document.createElement('option');
                    option.value = docSnap.id;
                    option.textContent = `${data.code} - ${data.name} (${data.class}-${data.division})`;
                    assignSelect.appendChild(option);
                });

                if (tbody.rows.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No subjects added yet</td></tr>';
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="5">Error loading data</td></tr>';
            }
        }

        async function deleteSubject(id) {
            {
                try {
                    await window.updateDoc(window.doc(window.db, 'subjects', id), {
                        isDeleted: true,
                        deletedAt: new Date().toISOString(),
                        deletedBy: window.currentUser.uid
                    });
                    await window.addDoc(window.collection(window.db, 'audit_logs'), {
                        action: 'SOFT_DELETE_SUBJECT',
                        subjectId: id,
                        performedBy: window.currentUser.uid,
                        performedByName: window.currentUser.name,
                        timestamp: new Date().toISOString(),
                        academicYear: document.getElementById('academicYear').value,
                        semester: document.getElementById('semester').value
                    });

                    showToast('Subject deleted successfully (can be restored by admin)', "success");
                    loadSubjectsList();
                } catch (error) {
                    showToast('Error: ' + error.message, 'danger');
                }
            }
        }

        async function addStudent() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const enrollment = document.getElementById('studentEnrollment').value;
            const name = document.getElementById('studentName').value;
            const classVal = document.getElementById('studentClass').value;
            const division = document.getElementById('studentDivision').value;

            if (!enrollment || !name || !classVal || !division) {
                showToast('Please fill in all fields', "warning");
                return;
            }

            try {
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('enrollment', '==', enrollment)));

                if (!duplicateCheck.empty) {
                    showToast('ERROR: Enrollment number already exists!\nEnrollment numbers must be unique.', "danger");
                    return;
                }

                await window.addDoc(window.collection(window.db, 'students'), {
                    enrollment,
                    name,
                    class: classVal,
                    division,
                    academicYear: document.getElementById('academicYear').value,
                    semester: document.getElementById('semester').value,
                    // BUG-09 FIX: Attach department so HOD dashboard stats can count this student
                    department: window.currentUser.department || '',
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString(),
                    isActive: true
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ADD_STUDENT',
                    studentEnrollment: enrollment,
                    studentName: name,
                    performedBy: window.currentUser.uid,
                    timestamp: new Date().toISOString(),
                    academicYear: document.getElementById('academicYear').value,
                    semester: document.getElementById('semester').value
                });

                showToast('Student added successfully!', "success");
                document.getElementById('studentEnrollment').value = '';
                document.getElementById('studentName').value = '';
                document.getElementById('studentClass').value = '';
                document.getElementById('studentDivision').value = '';
                loadStudentsList();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        let csvData = [];

        function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                parseCSV(text);
            };
            reader.readAsText(file);
        }

        function parseCSV(text) {
            const lines = text.split('\n').filter(line => line.trim());
            const preview = document.getElementById('csvPreview');
            csvData = [];
            let errors = [];
            const startIdx = lines[0].toLowerCase().includes('name') ? 1 : 0;

            for (let i = startIdx; i < lines.length; i++) {
                const parts = lines[i].split(',').map(p => p.trim());

                if (parts.length < 4) {
                    errors.push(`Line ${i + 1}: Incomplete data`);
                    continue;
                }

                const [name, enrollment, classVal, division] = parts;

                if (!name || !enrollment || !classVal || !division) {
                    errors.push(`Line ${i + 1}: Missing required fields`);
                    continue;
                }

                csvData.push({ name, enrollment, class: classVal, division });
            }

            let html = `<div class="alert alert-${errors.length > 0 ? 'warning' : 'success'}">
<strong>Preview:</strong> ${csvData.length} students ready to import`;

            if (errors.length > 0) {
                html += `<br><strong>Errors:</strong><br>${errors.join('<br>')}`;
            }
            html += '</div>';

            if (csvData.length > 0) {
                html += '<table style="margin-top: 10px;"><thead><tr><th>Name</th><th>Enrollment</th><th>Class</th><th>Division</th></tr></thead><tbody>';
                csvData.slice(0, 10).forEach(student => {
                    html += `<tr><td>${sanitizeString(student.name)}</td><td>${student.enrollment}</td><td>${student.class}</td><td>${student.division}</td></tr>`;
                });
                if (csvData.length > 10) {
                    html += `<tr><td colspan="4" style="text-align: center;">... and ${csvData.length - 10} more</td></tr>`;
                }
                html += '</tbody></table>';
                document.getElementById('importBtn').style.display = 'block';
            }

            preview.innerHTML = html;
        }

        function handleExcelUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.name.match(/\.(xlsx|xls)$/i)) {
                showToast('Please select a valid Excel file (.xlsx or .xls)', 'danger');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    if (typeof XLSX === "undefined") { showToast("Excel library not loaded", "danger"); return; } const workbook = XLSX.read(data, { type: 'array' });
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        showToast('Excel file has no sheets', 'danger');
                        return;
                    }
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
                    parseExcelStudents(jsonData);
                } catch (err) {
                    console.error('Excel parse error:', err);
                    showToast('Failed to parse Excel file. Please check the format.', 'danger');
                }
            };
            reader.onerror = function () { showToast('Failed to read Excel file', 'danger'); };
            reader.readAsArrayBuffer(file);
        }

        function parseExcelStudents(rows) {
            const preview = document.getElementById('csvPreview');
            csvData = [];
            const errors = [];

            rows.forEach((row, idx) => {
                const keys = Object.keys(row);
                const get = (variants) => {
                    const k = keys.find(k => variants.some(v => k.trim().toLowerCase() === v.toLowerCase()));
                    return k ? String(row[k]).trim() : '';
                };
                const name = sanitizeString(get(['name', 'studentname', 'student name', 'full name', 'fullname']), 100);
                const enrollment = get(['enrollmentno', 'enrollment', 'enrollno', 'enrollment no', 'enrollment number', 'enrollmentnumber']);
                const classVal = get(['class', 'classname', 'class name']);
                const division = get(['division', 'div', 'section']);

                if (!name || name === 'Invalid Name' || !enrollment || !classVal || !division) {
                    errors.push(`Row ${idx + 2}: Missing required field(s) or invalid name - Name, EnrollmentNo, Class, Division`);
                    return;
                }
                csvData.push({ name, enrollment, class: classVal, division });
            });

            let html = `<div class="alert alert-${errors.length > 0 ? 'warning' : 'success'}">
 <strong>Preview:</strong> ${csvData.length} student(s) ready to import`;
            if (errors.length > 0) {
                html += `<br><strong>Warnings:</strong><br>${errors.slice(0, 5).join('<br>')}${errors.length > 5 ? `<br>...and ${errors.length - 5} more` : ''}`;
            }
            html += '</div>';

            if (csvData.length > 0) {
                html += '<table style="margin-top:10px;"><thead><tr><th>Name</th><th>Enrollment</th><th>Class</th><th>Division</th></tr></thead><tbody>';
                csvData.slice(0, 10).forEach(s => {
                    html += `<tr><td>${s.name}</td><td>${s.enrollment}</td><td>${s.class}</td><td>${s.division}</td></tr>`;
                });
                if (csvData.length > 10) {
                    html += `<tr><td colspan="4" style="text-align:center;"> ... and ${csvData.length - 10} more</td></tr>`;
                }
                html += '</tbody></table>';
                document.getElementById('importBtn').style.display = 'block';
            } else {
                document.getElementById('importBtn').style.display = 'none';
            }
            preview.innerHTML = html;
        }

        async function importStudentsExcel() {
            const fileInput = document.getElementById('csvFile');
            if (!fileInput.files || !fileInput.files[0]) {
                showToast('Please select an Excel/CSV file first', 'warning');
                return;
            }
            
            const file = fileInput.files[0];
            try {
                window.showLoadingMessage('Parsing student data...');
                await window.importFromExcel(file, async (data) => {
                    csvData = data.map(item => {
                        const keys = Object.keys(item);
                        const get = (variants) => {
                            const k = keys.find(k => variants.some(v => k.trim().toLowerCase() === v.toLowerCase()));
                            return k ? String(item[k]).trim() : '';
                        };
                        return {
                            enrollment: get(['enrollmentno', 'enrollment', 'enrollno', 'enrollment no', 'enrollment number', 'enrollmentnumber', 'prn', 'id']),
                            name: get(['name', 'studentname', 'student name', 'full name', 'fullname', 'name of student']),
                            class: get(['class', 'classname', 'class name', 'year']),
                            division: get(['division', 'div', 'section']),
                            rollNo: get(['roll', 'sr', 'no', 'rollno', 'roll no']),
                            parentEmail: get(['parent', 'guardian', 'parent email']),
                            studentEmail: get(['email', 'student email', 'personal email']),
                            phone: get(['phone', 'mobile', 'contact', 'mobile no'])
                        };
                    }).filter(s => s.enrollment && s.name);
                    
                    if (csvData.length === 0) {
                        showToast('No valid student records found. Check headers: "Enrollment" and "Name" are required.', 'danger');
                        window.hideLoadingMessage();
                        return;
                    }
                    
                    await importStudentsCSV(); // Now that csvData is set
                });
            } catch (err) {
                console.error('Import failed:', err);
                showToast('Failed to read file: ' + err.message, 'danger');
            } finally {
                window.hideLoadingMessage();
            }
        }

        async function exportStudentsExcel() {
            try {
                const snapshot = await window.getDocs(window.collection(window.db, 'students'));
                if (snapshot.empty) {
                    showToast('No students to export', 'warning');
                    return;
                }
                const data = [];
                snapshot.forEach(docSnap => {
                    const d = docSnap.data();
                    data.push({
                        'Enrollment No': d.enrollment || '',
                        'Name': d.name || '',
                        'Class': d.class || '',
                        'Division': d.division || '',
                        'Academic Year': d.academicYear || '',
                        'Semester': d.semester || '',
                        'Status': d.isActive ? 'Active' : 'Inactive'
                    });
                });
                exportToExcel(data, `students_${Date.now()}`, 'Students');
                showToast('Students exported to Excel successfully!', 'success');
            } catch (error) {
                showToast('Error exporting students: ' + error.message, 'danger');
            }
        }

        async function importStudentsCSV() {
            if (csvData.length === 0) {
                showToast('No data to import', "warning");
                return;
            }

            const importBtn = document.getElementById('importBtn');
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';

            let successCount = 0;
            let skipCount = 0;
            let errors = [];

            try {
                for (const student of csvData) {
                    try {
                        const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'students'),
                            window.where('enrollment', '==', student.enrollment)));

                        if (!duplicateCheck.empty) {
                            skipCount++;
                            errors.push(`${student.enrollment} - Duplicate`);
                            continue;
                        }

                        await window.addDoc(window.collection(window.db, 'students'), {
                            name: student.name,
                            enrollment: student.enrollment,
                            class: student.class,
                            division: student.division,
                            rollNo: student.rollNo || '',
                            email: student.studentEmail || student.parentEmail || '',
                            parentEmail: student.parentEmail || '',
                            phone: student.phone || '',
                            academicYear: document.getElementById('academicYear')?.value || '',
                            semester: document.getElementById('semester')?.value || '',
                            createdBy: window.currentUser.uid,
                            createdAt: new Date().toISOString(),
                            importedViaCSV: true,
                            isActive: true,
                            department: window.currentUser.department || ''
                        });

                        successCount++;
                    } catch (error) {
                        errors.push(`${student.enrollment} - ${error.message}`);
                    }
                }
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'BULK_IMPORT_STUDENTS',
                    totalAttempted: csvData.length,
                    successCount,
                    skipCount,
                    performedBy: window.currentUser.uid,
                    timestamp: new Date().toISOString(),
                    academicYear: document.getElementById('academicYear').value,
                    semester: document.getElementById('semester').value
                });

                let message = ` Import Complete!\n\nSuccessfully imported: ${successCount}\nSkipped (duplicates): ${skipCount}`;

                if (errors.length > 0 && errors.length <= 5) {
                    message += '\n\nErrors:\n' + errors.join('\n');
                }

                showToast(message, 'warning');

                document.getElementById('csvFile').value = '';
                document.getElementById('csvPreview').innerHTML = '';
                importBtn.style.display = 'none';
                csvData = [];

                loadStudentsList();
            } catch (error) {
                showToast('Import error: ' + error.message, 'danger');
            } finally {
                importBtn.disabled = false;
                importBtn.textContent = 'Import Students';
            }
        }

        let allStudentsData = [];

        function displayStudents(students) {
            const tbody = document.getElementById('studentsList');
            tbody.innerHTML = '';

            students.forEach((data, index) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td style="color:#6b7280;font-size:12px;">${index + 1}</td>
                    <td>${data.enrollment}</td>
                    <td>${sanitizeString(data.name)}</td>
                    <td>${data.class}</td>
                    <td>${data.division}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${data.id}', \`${data.name.replace(/[`\\$]/g, '\\$&')}\`)">Delete</button>
                    </td> `;
            });

            if (students.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No students found</td></tr>';
            }
        }

        var _filterDebounce;
        function filterStudents() {
            clearTimeout(_filterDebounce);
            _filterDebounce = setTimeout(_doFilterStudents, 180);
        }

        async function loadStudentsList() {
            const tbody = document.getElementById('studentsList');
            const countDiv = document.getElementById('studentsCount');
            tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

            try {
                const year = document.getElementById('academicYear')?.value;
                const semester = document.getElementById('semester')?.value;
                let studentsQuery = year && semester
                    ? window.query(window.collection(window.db, 'students'),
                        window.where('academicYear', '==', year),
                        window.where('semester', '==', semester),
                        window.limit(1000))
                    : window.query(window.collection(window.db, 'students'),
                        window.limit(1000));
                const snapshot = await window.getDocs(studentsQuery);

                allStudentsData = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    data.id = docSnap.id; 
                    allStudentsData.push(data);
                });

                // Sort in memory to avoid Firestore Indexing issues
                allStudentsData.sort((a, b) => (a.enrollment || "").localeCompare(b.enrollment || ""));

                displayStudents(allStudentsData);

                if (countDiv) {
                    countDiv.textContent = `Total: ${allStudentsData.length} students`;
                    if (snapshot.size === 500) {
                        countDiv.textContent += ' (showing first 500)';
                    }
                }
            } catch (error) {
                console.error("Load Students Error:", error);
                tbody.innerHTML = `<tr><td colspan="8" style="color:red;text-align:center;">Error loading students: ${error.message}</td></tr>`;
            }
        }

        function _doFilterStudents() {
            const searchText = document.getElementById('studentSearch')?.value?.toLowerCase() || '';
            const countDiv = document.getElementById('studentsCount');

            if (!searchText) {
                displayStudents(allStudentsData);
                if (countDiv) countDiv.textContent = `Total: ${allStudentsData.length} students`;
                return;
            }

            const filtered = allStudentsData.filter(student => student.name.toLowerCase().includes(searchText) ||
                student.enrollment.toLowerCase().includes(searchText) ||
                student.class.toLowerCase().includes(searchText) ||
                student.division.toLowerCase().includes(searchText)
            );

            displayStudents(filtered);
            if (countDiv) countDiv.textContent = `Showing: ${filtered.length} of ${allStudentsData.length} students`;
        }

        function filterResults() {
            const searchText = document.getElementById('resultSearch')?.value?.toLowerCase() || '';
            const table = document.querySelector('#resultsTable table');
            if (!table) return;
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = !searchText || text.includes(searchText) ? '' : 'none';
            });
        }

        function openExamModal(type) {
            const modal = document.getElementById('examModal');
            const title = document.getElementById('examModalTitle');
            const body = document.getElementById('examModalBody');

            title.textContent = type === 'standard' ? 'Create Standard Exam' : 'Create CA Exam';

            if (type === 'standard') {
                body.innerHTML = `
 <div class="form-group">
<label>Exam Name</label>
<input type="text" id="examName" placeholder="e.g., Mid-Term Exam">
</div>
<div class="form-group">
<label>Subject</label>
<select id="examSubject"></select>
</div>
<div class="form-group">
<label>Exam Type</label>
<select id="examType">
<option value="theory">Theory</option>
<option value="practical">Practical</option>
<option value="viva">Viva</option>
<option value="assignment">Assignment</option>
</select>
</div>

<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin-bottom:16px;">
<strong>Quick Templates:</strong>
<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
<button type="button" class="btn btn-sm btn-warning" onclick="applyStandardTemplate('theory')" style="font-size:12px;">
Theory (5 criteria)
</button>
<button type="button" class="btn btn-sm btn-info" onclick="applyStandardTemplate('practical')" style="font-size:12px;">
Practical (4 criteria)
</button>
<button type="button" class="btn btn-sm btn-success" onclick="applyStandardTemplate('assignment')" style="font-size:12px;">
Assignment (3 criteria)
</button>
<button type="button" class="btn btn-sm btn-primary" onclick="addMultipleCriteria(5)" style="font-size:12px;">
Add 5 Blank
</button>
</div>
</div>

<div class="criteria-builder">
<label>Criteria (Add criteria with max marks)</label>
<div id="criteriaList"></div>
<button type="button" class="btn btn-secondary btn-sm" onclick="addCriterion()">+ Add One Criterion</button>
</div>
<div class="btn-group">
<button class="btn btn-primary" onclick="createStandardExam()">Create Exam</button>
<button class="btn btn-secondary" onclick="closeExamModal()">Cancel</button>
</div> `;
                loadSubjectsDropdown('examSubject');

            } else {
                body.innerHTML = `
 <div style="display:flex;gap:10px;margin-bottom:16px;border-bottom:2px solid #e5e7eb;padding-bottom:12px;">
<button id="caTab1" class="btn btn-primary btn-sm" onclick="switchCATab(1)" style="flex:1;">Step 1: Exam Info & Question Bank</button>
<button id="caTab2" class="btn btn-secondary btn-sm" onclick="switchCATab(2)" style="flex:1;">Step 2: CO Setup & Assignment</button>
</div>
<div id="caTabPanel1">
<div class="form-row">
<div class="form-group">
<label>Exam Name</label>
<input type="text" id="examName" placeholder="e.g., CA-1 Assessment">
</div>
<div class="form-group">
<label>Subject</label>
<select id="examSubject"></select>
</div>
</div>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:16px;">
<h4 style="margin:0 0 10px;color:#166534;">Question Bank - Upload Questions per Lesson</h4>
<p style="font-size:13px;color:#374151;margin:0 0 12px;">Add lessons and their questions. Each question will be available for random assignment to students per CO.</p>
<div id="lessonList"></div>
<button type="button" class="btn btn-success btn-sm" onclick="addLesson()" style="margin-top:8px;">+ Add Lesson</button>
</div>
<div class="btn-group">
<button class="btn btn-primary" onclick="switchCATab(2)">Next: CO Setup</button>
<button class="btn btn-secondary" onclick="closeExamModal()">Cancel</button>
</div>
</div>
<div id="caTabPanel2" style="display:none;">
<div class="alert alert-info" style="font-size:13px;margin-bottom:12px;">For each CO: write the outcome description, select which lesson to draw questions from, set how many questions each student gets randomly, and set marks per criterion.
</div>
<div id="coList"></div>
<div class="btn-group" style="margin-top:16px;">
<button class="btn btn-primary" onclick="createCAExam()">Create CA Exam</button>
<button class="btn btn-secondary" onclick="switchCATab(1)">Back</button>
<button class="btn btn-secondary" onclick="closeExamModal()">Cancel</button>
</div>
</div> `;
                loadSubjectsDropdown('examSubject');
                lessonCounter = 0;
                addLesson();
                buildCOStructure();
            }

            modal.classList.add('active');
            
            // Add Preset Handler
            window.applyProjectPreset = (p) => {
                let name = "";
                let cos = [];
                let strips = 3;
                let marks = 9;
                
                if(p === 'ca_unit1') { name = "Unit I Assessment (CO1-3)"; cos = [1,2,3]; strips = 3; }
                else if(p === 'ca_unit2') { name = "Unit II Assessment (CO4-5)"; cos = [4,5]; strips = 3; }
                else if(p === 'ese_full') { name = "End Semester Examination (CO1-5)"; cos = [1,2,3,4,5]; strips = 5; marks = 10; }
                
                document.getElementById('examName').value = name;
                document.getElementById('examModalTitle').textContent = p.includes('ese') ? 'Create ESE Exam' : 'Create CA Exam';
                
                // Set Strip Metadata
                modal.dataset.strips = strips;
                modal.dataset.preset = p;

                // Adjust COs in UI
                buildCOStructure(); // Rebuild with default 5
                
                // Hide non-relevant COs and set marks
                for(let i=1; i<=5; i++){
                    const coItem = document.querySelector(`.co-item[data-co="${i}"]`);
                    if(coItem) {
                        if(cos.includes(i)) {
                            coItem.style.display = 'block';
                            const mInput = coItem.querySelector(`.co${i}-c1`);
                            if(mInput) mInput.value = marks;
                            const qInput = coItem.querySelector(`.co${i}-qcount`);
                            if(qInput) qInput.value = 1;
                        } else {
                            coItem.style.display = 'none';
                        }
                    }
                }
                showToast(`${name} preset applied.`, "success");
            };
        }

        function closeExamModal() {
            document.getElementById('examModal').classList.remove('active');
        }

        async function loadSubjectsDropdown(selectId) {
            const select = document.getElementById(selectId);
            select.innerHTML = '<option value="">Select subject</option>';

            try {
                const year = document.getElementById('academicYear').value;
                const semester = document.getElementById('semester').value;
                const snapshot = await window.getDocs(window.query(window.collection(window.db, 'subjects'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const option = document.createElement('option');
                    option.value = docSnap.id;
                    option.textContent = `${data.code} - ${data.name}`;
                    select.appendChild(option);
                });
            } catch (error) { }
        }

        let criterionCount = 0;
        function addCriterion() {
            const list = document.getElementById('criteriaList');
            const div = document.createElement('div');
            div.className = 'criteria-item';
            div.innerHTML = `
 <input type="text" placeholder="Criterion name (e.g., Understanding)" class="criterion-name">
<input type="number" placeholder="Max marks" class="criterion-marks" style="width: 150px;">
<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">Remove</button> `;
            list.appendChild(div);

            const newInput = div.querySelector('.criterion-name');
            if (newInput) newInput.focus();

            criterionCount++;
        }

        function addMultipleCriteria(count = 5) {
            const names = ['Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];
            for (let i = 0; i < count; i++) {
                const list = document.getElementById('criteriaList');
                const div = document.createElement('div');
                div.className = 'criteria-item';
                div.innerHTML = `
 <input type="text" placeholder="Criterion name" class="criterion-name" value="${names[i] || ''}">
<input type="number" placeholder="Max marks" class="criterion-marks" value="20" style="width: 150px;">
<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">Remove</button> `;
                list.appendChild(div);
                criterionCount++;
            }
            showToast(`Added ${count} criteria`, 'success', 1500);
        }

        function applyStandardTemplate(type) {
            const criteriaList = document.getElementById('criteriaList');
            criteriaList.innerHTML = '';

            let templates = {
                'theory': [
                    { name: 'Knowledge & Understanding', marks: 25 },
                    { name: 'Application', marks: 25 },
                    { name: 'Analysis', marks: 20 },
                    { name: 'Problem Solving', marks: 20 },
                    { name: 'Critical Thinking', marks: 10 }
                ],
                'practical': [
                    { name: 'Procedure & Setup', marks: 25 },
                    { name: 'Execution', marks: 35 },
                    { name: 'Observations & Data', marks: 20 },
                    { name: 'Results & Conclusion', marks: 20 }
                ],
                'assignment': [
                    { name: 'Content Quality', marks: 40 },
                    { name: 'Presentation', marks: 30 },
                    { name: 'Timeliness', marks: 30 }
                ]
            };

            const criteria = templates[type] || [];
            criteria.forEach(c => {
                const div = document.createElement('div');
                div.className = 'criteria-item';
                div.innerHTML = `
 <input type="text" placeholder="Criterion name" class="criterion-name" value="${c.name}">
<input type="number" placeholder="Max marks" class="criterion-marks" value="${c.marks}" style="width: 150px;">
<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">Remove</button> `;
                criteriaList.appendChild(div);
            });

            showToast(`Applied ${type.toUpperCase()} template with ${criteria.length} criteria`, 'success', 2000);
        }

        let lessonCounter = 0;
        function addLesson() {
            lessonCounter++;
            const id = `lesson-${lessonCounter}`;
            const list = document.getElementById('lessonList');
            if (!list) return;
            const div = document.createElement('div');
            div.id = id;
            div.style.cssText = 'background:#fff;border:1px solid #d1fae5;border-radius:8px;padding:12px;margin-bottom:10px;';
            div.innerHTML = `
 <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
<input type="text" class="lesson-name" placeholder="Lesson name (e.g., Unit 1 - Arrays)" 
 style="flex:1;padding:8px 12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;" 
 oninput="refreshLessonDropdowns()">
<button type="button" onclick="removeLesson('${id}')" 
 style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:13px;">Remove</button>
</div>

<div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px;margin-bottom:8px;">
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
<button type="button" onclick="addBulkQuestions('${id}')" class="btn btn-sm btn-primary" style="font-size:12px;padding:4px 10px;">
Paste Multiple
</button>
<button type="button" onclick="addMultipleQuestions('${id}', 5)" class="btn btn-sm btn-success" style="font-size:12px;padding:4px 10px;">
Add 5 Blank
</button>
<button type="button" onclick="addMultipleQuestions('${id}', 10)" class="btn btn-sm btn-info" style="font-size:12px;padding:4px 10px;">
Add 10 Blank
</button>
</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;">
<label style="cursor:pointer;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;padding:4px 10px;font-size:12px;display:flex;align-items:center;gap:4px;">
Import CSV
 <input type="file" accept=".csv,.txt" style="display:none;" onchange="importQuestionsFromCSV(event,'${id}')">
</label>
<label style="cursor:pointer;background:#fdf4ff;color:#7c3aed;border:1px solid #e9d5ff;border-radius:6px;padding:4px 10px;font-size:12px;display:flex;align-items:center;gap:4px;">
Import PDF
 <input type="file" accept=".pdf" style="display:none;" onchange="importQuestionsFromPDF(event,'${id}')">
</label>
<a href="data:text/plain;charset=utf-8,What%20is%20an%20array%3F%0AExplain%20linked%20list%0AWhat%20is%20a%20stack%3F" 
 download="question_template.txt"
 style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:6px;padding:4px 10px;font-size:12px;text-decoration:none;">
Template
 </a>
</div>
</div>

<div class="question-list"></div>
<button type="button" onclick="addLessonQuestion('${id}')" 
 style="margin-top:6px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:13px;">+ Add Question Manually</button> `;
            list.appendChild(div);

            refreshLessonDropdowns();

            const nameInput = div.querySelector('.lesson-name');
            if (nameInput) nameInput.focus();
        }

        function removeLesson(id) {
            const el = document.getElementById(id);
            if (el) { el.remove(); refreshLessonDropdowns(); }
        }

        function addLessonQuestion(lessonId) {
            const lessonEl = document.getElementById(lessonId);
            if (!lessonEl) return;
            const ql = lessonEl.querySelector('.question-list');
            const qDiv = document.createElement('div');
            qDiv.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
            qDiv.innerHTML = `
 <input type="text" class="question-text" placeholder="Enter question text..." 
 style="flex:1;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
<button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:bold;">Remove</button> `;
            ql.appendChild(qDiv);

            const newInput = qDiv.querySelector('.question-text');
            if (newInput) newInput.focus();
        }

        function addMultipleQuestions(lessonId, count = 5) {
            for (let i = 0; i < count; i++) {
                addLessonQuestion(lessonId);
            }
            showToast(`Added ${count} question fields`, 'success', 1500);
        }

        function addBulkQuestions(lessonId) {
            const questions = prompt('Paste questions (one per line):');
            if (!questions) return;

            const lessonEl = document.getElementById(lessonId);
            if (!lessonEl) return;

            const lines = questions.split('\n').filter(line => line.trim());
            const ql = lessonEl.querySelector('.question-list');

            lines.forEach(line => {
                const qDiv = document.createElement('div');
                qDiv.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
                qDiv.innerHTML = `
 <input type="text" class="question-text" value="${line.trim()}" 
 style="flex:1;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
<button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:bold;">Remove</button> `;
                ql.appendChild(qDiv);
            });

            showToast(`Added ${lines.length} questions!`, 'success', 2000);
        }

        function getLessons() {
            const lessons = [];
            document.querySelectorAll('#lessonList >div[id^="lesson-"]').forEach(lessonEl => {
                const name = lessonEl.querySelector('.lesson-name')?.value?.trim() || '';
                const questions = [];
                lessonEl.querySelectorAll('.question-text').forEach(q => {
                    const txt = q.value.trim();
                    if (txt) questions.push(txt);
                });
                if (name) lessons.push({ name, questions, id: lessonEl.id });
            });
            return lessons;
        }

        function importQuestionsFromCSV(event, lessonId) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                const lessonEl = document.getElementById(lessonId);
                if (!lessonEl) return;
                const ql = lessonEl.querySelector('.question-list');
                let added = 0;
                lines.forEach(line => {
                    const cleaned = line.replace(/^["'\d\.\-\*]+\s*/, '').replace(/["']$/, '').trim();
                    if (cleaned.length > 3) {
                        const qDiv = document.createElement('div');
                        qDiv.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
                        qDiv.innerHTML = `
 <input type="text" class="question-text" value="${cleaned.replace(/"/g, '&quot;')}"
 style="flex:1;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
<button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:bold;">x</button> `;
                        ql.appendChild(qDiv);
                        added++;
                    }
                });
                showToast(`Imported ${added} questions from CSV`, 'success');
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        async function importQuestionsFromPDF(event, lessonId) {
            const file = event.target.files[0];
            if (!file) return;
            
            showToast('Reading PDF... Ensure it is a text-based PDF (not scanned images). Format: One question per line.', 'info', 6000);
            
            try {
                // Initialize pdf.js worker - force a more robust loading pattern
                if (window.pdfjsLib) {
                    const workerUrl = 'lib/pdf.worker.min.js';
                    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
                } else {
                    throw new Error('PDF library (pdf.js) not found. Please refresh.');
                }

                const arrayBuffer = await file.arrayBuffer();
                if (!arrayBuffer || arrayBuffer.byteLength === 0) throw new Error('File is empty or unreadable');
                
                const uint8Array = new Uint8Array(arrayBuffer);
                const pdf = await pdfjsLib.getDocument({ 
                    data: uint8Array,
                    verboseness: 0
                }).promise;
                let extractedQuestions = [];
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    // Group items by their vertical position (y-coordinate) to detect lines
                    const linesMap = {};
                    textContent.items.forEach(item => {
                        const y = Math.round(item.transform[5]); // y-coordinate
                        if (!linesMap[y]) linesMap[y] = [];
                        linesMap[y].push(item);
                    });

                    // Sort lines by y-coordinate (descending) and join items in each line
                    const sortedY = Object.keys(linesMap).sort((a, b) => b - a);
                    sortedY.forEach(y => {
                        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]); // Sort by x
                        const lineText = lineItems.map(item => item.str).join(' ').trim();
                        if (lineText.length > 5) {
                            extractedQuestions.push(lineText);
                        }
                    });
                }

                if (extractedQuestions.length === 0) {
                    showToast('Could not extract text from PDF. Please use CSV or type questions manually.', 'warning', 6000);
                    event.target.value = '';
                    return;
                }

                const lessonEl = document.getElementById(lessonId);
                if (!lessonEl) return;
                const ql = lessonEl.querySelector('.question-list');
                let added = 0;
                
                extractedQuestions.forEach(line => {
                    // Clean up: remove question numbers like "1.", "Q1:", "*)", etc.
                    const cleaned = line.replace(/^[\d\.\-\*\)Q]+\s*/i, '').trim();
                    if (cleaned.length > 5 && !/^(page|date|subject|exam|time|marks)/i.test(cleaned)) {
                        const qDiv = document.createElement('div');
                        qDiv.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
                        qDiv.innerHTML = `
                            <input type="text" class="question-text" value="${cleaned.replace(/"/g, '&quot;')}"
                            style="flex:1;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">
                            <button type="button" onclick="this.parentElement.remove()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:bold;">x</button> `;
                        ql.appendChild(qDiv);
                        added++;
                    }
                });

                if (added > 0) {
                    showToast(`Imported ${added} questions from PDF!`, 'success', 6000);
                } else {
                    showToast('No readable questions found in PDF. Try a text-based PDF or use CSV upload.', 'warning', 6000);
                }
            } catch (e) {
                console.error('PDF Extraction Error:', e);
                showToast('Failed to read PDF: ' + e.message, 'danger');
            }
            event.target.value = '';
        }

        function refreshLessonDropdowns() {
            const lessons = getLessons();
            document.querySelectorAll('.co-lesson-select').forEach(sel => {
                const cur = sel.value;
                sel.innerHTML = '<option value="">select lesson</option>';
                lessons.forEach((l, idx) => {
                    const opt = document.createElement('option');
                    opt.value = idx;
                    opt.textContent = l.name || `Lesson ${idx + 1}`;
                    sel.appendChild(opt);
                });
                if (cur !== '') sel.value = cur;
            });
        }
        function buildCOStructure() {
            const coList = document.getElementById('coList');
            if (!coList) return;
            coList.innerHTML = '';

            // SPEED: Add quick fill template
            const templateDiv = document.createElement('div');
            templateDiv.style.cssText = 'background:#fef3c7;border:2px solid #fbbf24;border-radius:10px;padding:14px;margin-bottom:16px;';
            templateDiv.innerHTML = `
                <div style="font-weight:700;color:#92400e;margin-bottom:10px;font-size:14px;">Quick Fill All COs</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                    <button onclick="fillAllCOMarks(5, 5, 5, 5)" class="btn btn-sm btn-warning" style="font-size:12px;">
                        Equal: 5+5+5+5 = 20 each
                    </button>
                    <button onclick="fillAllCOMarks(10, 5, 3, 2)" class="btn btn-sm btn-info" style="font-size:12px;">
                        Weighted: 10+5+3+2 = 20 each
                    </button>
                    <button onclick="fillAllCOMarks(8, 8, 4, 0)" class="btn btn-sm btn-success" style="font-size:12px;">
                        Top Heavy: 8+8+4+0 = 20 each
                    </button>
                </div>
                <div style="font-size:11px;color:#78350f;">Auto-fill all 5 COs with selected marks pattern</div>
            `;
            coList.appendChild(templateDiv);

            const isESE = document.getElementById('examModal').dataset.preset?.includes('ese');
            const coMarks = isESE ? 10 : 9;
            const stripCount = parseInt(document.getElementById('examModal').dataset.strips) || 3;

            for (let i = 1; i <= 5; i++) {
                const coDiv = document.createElement('div');
                coDiv.className = 'co-item';
                coDiv.dataset.co = i;
                coDiv.style.cssText = 'background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);';
                
                coDiv.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <span style="font-size:16px;font-weight:800;color:#1e40af;">CO${i} - Course Outcome ${i}</span>
                        <span style="background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">Standard: ${coMarks}M</span>
                    </div>
                    <div class="form-group" style="margin-bottom:12px;">
                        <label style="font-size:13px;color:#4b5563;font-weight:600;">Outcome Statement (CO Description)</label>
                        <textarea class="co${i}-desc" placeholder="Enter what students will learn..." rows="2" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;resize:none;box-sizing:border-box;"></textarea>
                    </div>
                    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;">
                        <div style="display:flex;gap:15px;align-items:flex-end;">
                            <div style="flex:2;">
                                <label style="font-size:12px;font-weight:700;color:#0369a1;display:block;margin-bottom:4px;">Question Strip Source (Lesson)</label>
                                <select class="co-lesson-select co${i}-lesson" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;">
                                    <option value="">select lesson</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:12px;font-weight:700;color:#0369a1;display:block;margin-bottom:4px;">Marks (C1)</label>
                                <input type="number" class="co${i}-c1" value="${coMarks}" style="width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-weight:700;text-align:center;">
                                <input type="hidden" class="co${i}-qcount" value="1">
                            </div>
                        </div>
                    </div>
                `;
                coList.appendChild(coDiv);
            }
            refreshLessonDropdowns();
        }

        // SPEED: Fill all COs with same marks pattern (Safe version)
        function fillAllCOMarks(c1, c2, c3, c4) {
            for (let i = 1; i <= 5; i++) {
                const el1 = document.querySelector(`.co${i}-c1`); if (el1) el1.value = c1;
                const el2 = document.querySelector(`.co${i}-c2`); if (el2) el2.value = c2;
                const el3 = document.querySelector(`.co${i}-c3`); if (el3) el3.value = c3;
                const el4 = document.querySelector(`.co${i}-c4`); if (el4) el4.value = c4;
            }
            const total = (c1||0) + (c2||0) + (c3||0) + (c4||0);
            showToast(`Preset Marks applied! Each CO = ${total}M`, 'success', 2000);
        }

        function switchCATab(tab) {
            document.getElementById('caTabPanel1').style.display = tab === 1 ? '' : 'none';
            document.getElementById('caTabPanel2').style.display = tab === 2 ? '' : 'none';
            document.getElementById('caTab1').className = tab === 1 ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            document.getElementById('caTab2').className = tab === 2 ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
            if (tab === 2) refreshLessonDropdowns();
        }

        async function createStandardExam() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const name = document.getElementById('examName').value.trim();
            const subjectId = document.getElementById('examSubject').value;
            const type = document.getElementById('examType').value;
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;

            const criteria = [];
            let totalMarks = 0;
            document.querySelectorAll('.criteria-item').forEach(item => {
                const criterionName = item.querySelector('.criterion-name').value;
                const marks = parseInt(item.querySelector('.criterion-marks').value) || 0;
                if (criterionName && marks > 0) {
                    criteria.push({ name: criterionName, maxMarks: marks });
                    totalMarks += marks;
                }
            });

            if (!name || !subjectId || criteria.length === 0) {
                showToast('Please fill in all required fields', "warning");
                return;
            }

            try {
                window.showLoadingMessage('Creating standard exam...');
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'exams'),
                    window.where('name', '==', name),
                    window.where('subjectId', '==', subjectId),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                if (!duplicateCheck.empty) {
                    showToast('An exam with this name already exists for this subject in this semester!', "danger");
                    return;
                }

                await window.addDoc(window.collection(window.db, 'exams'), {
                    name,
                    subjectId,
                    type,
                    examType: 'standard',
                    criteria,
                    totalMarks,
                    academicYear: year,
                    semester,
                    status: 'DRAFT',
                    lifecycleState: 'DRAFT',
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString()
                });

                window.hideLoadingMessage();
                showToast('Standard exam created successfully!', "success");
                closeExamModal();
                loadExamsList();
            } catch (error) {
                window.hideLoadingMessage();
                showToast('Error: ' + error.message, 'danger');
            }
        }
        function shuffleArray(arr) {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        function pickRandom(arr, count) {
            const shuffled = shuffleArray(arr);
            return shuffled.slice(0, Math.min(count, shuffled.length));
        }

        function applyCATemplate(type) {
            const nameInput = document.getElementById('teacherExamNameCA');
            const coCountInput = document.getElementById('teacherCOCountCA');
            const marksInput = document.getElementById('teacherCAMaxMarksCA');
            const totalLabel = document.getElementById('caTotalLabel');

            if (type === 'unit1') {
                nameInput.value = 'Continuous Assessment - JUnit I';
                coCountInput.value = 3; // CO1, CO2, CO3
                marksInput.value = 4;
            } else if (type === 'unit2') {
                nameInput.value = 'Continuous Assessment - JUnit II';
                coCountInput.value = 2; // CO4, CO5
                marksInput.value = 4;
            } else if (type === 'full') {
                nameInput.value = 'Continuous Assessment - Full (CO1-5)';
                coCountInput.value = 5;
                marksInput.value = 4;
            }
            if (totalLabel) totalLabel.textContent = coCountInput.value * marksInput.value;
            showToast(`Applied ${type.toUpperCase()} template`, 'success', 1500);
        }
        window.applyCATemplate = applyCATemplate;

        async function createCAExam() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const name = document.getElementById('examName').value.trim();
            const subjectId = document.getElementById('examSubject').value;
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;

            if (!name || !subjectId) {
                showToast('Please fill in all required fields', 'warning');
                return;
            }
            const lessons = getLessons();
            if (lessons.length === 0) {
                showToast('Please add at least one lesson with questions', 'danger');
                return;
            }

            const isESE = document.getElementById('examModal').dataset.preset?.includes('ese');
            const nameLower = name.toLowerCase();
            let subsetCOs = [1, 2, 3, 4, 5];
            
            if (isESE) {
                subsetCOs = [1, 2, 3, 4, 5];
            } else if (nameLower.includes('junit i') || nameLower.includes('unit 1')) {
                subsetCOs = [1, 2, 3];
            } else if (nameLower.includes('junit ii') || nameLower.includes('unit 2')) {
                subsetCOs = [4, 5];
            }

            if (isESE && subsetCOs.length < 5) {
                showToast('ESE exams must include all 5 Course Outcomes.', 'danger');
                return;
            }

            const courseOutcomes = [];
            let totalMarks = 0;

            subsetCOs.forEach(i => {
                const coDesc = document.querySelector(`.co${i}-desc`)?.value?.trim() || '';
                const lessonIdx = document.querySelector(`.co${i}-lesson`)?.value;
                const qCount = parseInt(document.querySelector(`.co${i}-qcount`)?.value) || 1;
                const assignedLesson = (lessonIdx !== '' && lessonIdx !== undefined) ? lessons[parseInt(lessonIdx)] : null;

                const co = {
                    name: `CO${i}`,
                    description: coDesc,
                    lessonName: assignedLesson ? assignedLesson.name : '',
                    questionPool: assignedLesson ? assignedLesson.questions : [],
                    questionsPerStudent: qCount,
                    criteria: []
                };
                let coTotal = 0;
                // Simplified for CA/ESE: normally 1 criterion, but flexible for more
                for (let j = 1; j <= 5; j++) {
                    const marksInput = document.querySelector(`.co${i}-c${j}`);
                    if (marksInput) {
                        const marks = parseInt(marksInput.value) || 0;
                        co.criteria.push({ name: `C${j}`, maxMarks: marks });
                        coTotal += marks;
                    }
                }
                co.totalMarks = coTotal;
                courseOutcomes.push(co);
                totalMarks += coTotal;
            });

            try {
                window.showLoadingMessage('Creating CA exam...');

                const dupCheck = await window.getDocs(window.query(window.collection(window.db, 'exams'),
                    window.where('name', '==', name),
                    window.where('subjectId', '==', subjectId),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));
                if (!dupCheck.empty) {
                    window.hideLoadingMessage();
                    showToast('Exam with this name already exists for this subject/semester', 'danger');
                    return;
                }

                const examRef = await window.addDoc(window.collection(window.db, 'exams'), {
                    name,
                    subjectId,
                    examType: document.getElementById('examModal').dataset.preset?.includes('ese') ? 'ese' : 'ca',
                    courseOutcomes,
                    lessons,
                    totalMarks,
                    questionsPerStrip: parseInt(document.getElementById('examModal').dataset.strips) || 3,
                    academicYear: year,
                    semester,
                    status: 'DRAFT',
                    lifecycleState: 'DRAFT',
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString()
                });

                window.showLoadingMessage('Fetching students...');
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', subjectId));
                const subjectData = subjectDoc.exists() ? subjectDoc.data() : null;

                if (subjectData) {
                    const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                        window.where('class', '==', subjectData.class),
                        window.where('division', '==', subjectData.division)));

                    if (studentsSnap.size > 0) {
                        window.showLoadingMessage(`Assigning questions to ${studentsSnap.size} students...`);
                        const studentDocs = studentsSnap.docs;
                        const assignmentPromises = studentDocs.map(studentDoc => {
                            const studentAssignment = {};
                            courseOutcomes.forEach((co) => {
                                if (co.questionPool && co.questionPool.length > 0) {
                                    studentAssignment[co.name] = pickRandom(co.questionPool, co.questionsPerStudent);
                                } else {
                                    studentAssignment[co.name] = [];
                                }
                            });
                            return window.setDoc(window.doc(window.db, 'ca_question_assignments', `${examRef.id}_${studentDoc.id}`), {
                                examId: examRef.id,
                                studentId: studentDoc.id,
                                studentName: studentDoc.data().name,
                                enrollment: studentDoc.data().enrollment,
                                assignments: studentAssignment,
                                assignedAt: new Date().toISOString()
                            });
                        });
                        await Promise.all(assignmentPromises);
                        window.hideLoadingMessage();
                        showToast(`CA Exam "${name}" created with ${courseOutcomes.length} COs! Questions assigned to ${studentsSnap.size} students.`, 'success', 5000);
                    } else {
                        window.hideLoadingMessage();
                        showToast('CA Exam created! (No students found to assign questions yet)', 'success');
                    }
                }
                closeExamModal();
                loadExamsList();
            } catch (error) {
                window.hideLoadingMessage();
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function createExamUnified(type) {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            
            let name, subjectId, coCount, maxMarks, year, semester;
            
            if (type === 'ca') {
                name = document.getElementById('teacherExamNameCA')?.value.trim();
                subjectId = document.getElementById('teacherExamSubjectCA')?.value;
                coCount = parseInt(document.getElementById('teacherCOCountCA')?.value) || 5;
                maxMarks = parseInt(document.getElementById('teacherCAMaxMarksCA')?.value) || 1;
            } else if (type === 'ese') {
                name = document.getElementById('teacherExamNameESE')?.value.trim();
                subjectId = document.getElementById('teacherExamSubjectESE')?.value;
                coCount = 5;
                maxMarks = parseInt(document.getElementById('teacherESEMarksESE')?.value) || 1;
            }
            
            year = document.getElementById('academicYear').value;
            semester = document.getElementById('semester').value;

            if (!name || !subjectId) { showToast('Please fill Exam Name and select Subject', 'warning'); return; }

            try {
                window.showLoadingMessage(`Initializing ${type.toUpperCase()} Exam creation...`);
                
                const lessons = getLessons();
                if (lessons.length === 0) {
                    window.hideLoadingMessage();
                    showToast('No lessons found. Please add lessons with questions first.', 'danger');
                    return;
                }

                let subsetCOIndices = [1, 2, 3, 4, 5];
                const nameLower = name.toLowerCase();
                if (type === 'ca') {
                    if (nameLower.includes('junit i') || nameLower.includes('unit 1')) subsetCOIndices = [1, 2, 3];
                    else if (nameLower.includes('junit ii') || nameLower.includes('unit 2')) subsetCOIndices = [4, 5];
                    else subsetCOIndices = Array.from({length: coCount}, (_, i) => i + 1);
                }

                const courseOutcomes = [];
                let totalMarks = 0;

                subsetCOIndices.forEach(i => {
                    const co = {
                        name: `CO${i}`,
                        description: `Course Outcome ${i}`,
                        totalMarks: maxMarks,
                        questionsPerStudent: 1,
                        criteria: [ { name: `Criterion 1`, maxMarks: maxMarks } ],
                        lessonName: lessons[Math.min(i-1, lessons.length-1)]?.name || 'General',
                        questionPool: lessons[Math.min(i-1, lessons.length-1)]?.questions || []
                    };
                    courseOutcomes.push(co);
                    totalMarks += maxMarks;
                });

                const examRef = await window.addDoc(window.collection(window.db, 'exams'), {
                    name, subjectId, examType: type,
                    courseOutcomes, totalMarks, academicYear: year, semester,
                    status: 'DRAFT', lifecycleState: 'DRAFT',
                    createdBy: window.currentUser.uid, createdAt: new Date().toISOString()
                });

                window.showLoadingMessage('Assigning question strips to students...');
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', subjectId));
                const subjectData = subjectDoc.data();

                const studentsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'students'),
                    window.where('class', '==', subjectData.class),
                    window.where('division', '==', subjectData.division)
                ));

                const promises = studentsSnap.docs.map(studentDoc => {
                    const studentAssignment = {};
                    courseOutcomes.forEach(co => {
                        studentAssignment[co.name] = pickRandom(co.questionPool, 1);
                    });
                    return window.setDoc(window.doc(window.db, 'ca_question_assignments', `${examRef.id}_${studentDoc.id}`), {
                        examId: examRef.id, studentId: studentDoc.id,
                        studentName: studentDoc.data().name, enrollment: studentDoc.data().enrollment,
                        assignments: studentAssignment, assignedAt: new Date().toISOString()
                    });
                });

                await Promise.all(promises);
                window.hideLoadingMessage();
                showToast(`${type.toUpperCase()} Exam "${name}" created successfully!`, 'success');
                loadExamsList();
            } catch (error) {
                window.hideLoadingMessage();
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function reassignCAQuestions(examId) {

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { showToast('Exam not found', 'danger'); return; }
                const exam = examDoc.data();

                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', exam.subjectId));
                const subjectData = subjectDoc.exists() ? subjectDoc.data() : null;
                if (!subjectData) { showToast('Subject not found', 'danger'); return; }

                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('class', '==', subjectData.class),
                    window.where('division', '==', subjectData.division)));

                const promises = [];
                studentsSnap.forEach(studentDoc => {
                    const studentAssignment = {};
                    exam.courseOutcomes.forEach((co, coIdx) => {
                        if (co.questionPool && co.questionPool.length > 0) {
                            studentAssignment[`CO${coIdx + 1}`] = pickRandom(co.questionPool, co.questionsPerStudent || 1);
                        } else {
                            studentAssignment[`CO${coIdx + 1}`] = [];
                        }
                    });
                    promises.push(window.setDoc(window.doc(window.db, 'ca_question_assignments', `${examId}_${studentDoc.id}`), {
                        examId,
                        studentId: studentDoc.id,
                        studentName: studentDoc.data().name,
                        enrollment: studentDoc.data().enrollment,
                        assignments: studentAssignment,
                        assignedAt: new Date().toISOString()
                    }));
                });
                await Promise.all(promises);
                showToast(`Questions reassigned to ${studentsSnap.size} students!`, 'success');
            } catch (err) {
                showToast('Error: ' + err.message, 'danger');
            }
        }

        async function loadExamsList() {
            const tbody = document.getElementById('examsList');
            const resultsSelect = document.getElementById('resultsExam');
            const importSelect = document.getElementById('coordImportExamSelect');

            tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
            if (resultsSelect) {
                resultsSelect.innerHTML = '<option value="">Select exam</option>';
            }
            if (importSelect) {
                importSelect.innerHTML = '<option value="">Choose exam</option>';
            }

            try {
                const year = document.getElementById('academicYear').value;
                const semester = document.getElementById('semester').value;
                let snapshot;
                try {
                    snapshot = await window.getDocs(window.query(window.collection(window.db, 'exams'),
                        window.where('academicYear', '==', year),
                        window.where('semester', '==', semester),
                        window.orderBy('createdAt', 'desc'),
                        window.limit(50)));
                } catch (idxErr) {
                    // Fallback if index is missing: Fetch without orderBy
                    console.warn("Index missing, falling back to unsorted fetch:", idxErr);
                    snapshot = await window.getDocs(window.query(window.collection(window.db, 'exams'),
                        window.where('academicYear', '==', year),
                        window.where('semester', '==', semester),
                        window.limit(50)));
                }
                tbody.innerHTML = '';

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', data.subjectId));
                    const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};

                    const row = tbody.insertRow();
                    row.innerHTML = `
 <td>${data.name}</td>
<td><span class="badge badge-info">${data.examType}</span></td>
<td>${subjectData.name || 'N/A'}</td>
<td>${data.totalMarks}</td>
<td><span class="badge badge-${data.status === 'FINALIZED' ? 'danger' : 'success'}">${data.status}</span></td>
<td style="display:flex;gap:4px;flex-wrap:wrap;">
<button class="btn btn-primary btn-sm" onclick="viewExamDetails('${docSnap.id}')">View</button> 
${data.status === 'DRAFT' ? `<button class="btn btn-success btn-sm" onclick="publishExam('${docSnap.id}')">Publish</button>` : ''}
${data.examType === 'ca' ? `<button class="btn btn-secondary btn-sm" onclick="reassignCAQuestions('${docSnap.id}')" title="Re-run random question assignment for all students">Reassign</button>` : ''}
 </td> `;

                    if (resultsSelect) {
                        const option = document.createElement('option');
                        option.value = docSnap.id;
                        option.textContent = `${data.name} - ${subjectData.name || 'N/A'}`;
                        resultsSelect.appendChild(option);
                    }
                    if (importSelect && data.status !== 'FINALIZED') {
                        const importOption = document.createElement('option');
                        importOption.value = docSnap.id;
                        importOption.textContent = `${data.name} - ${subjectData.name || 'N/A'}`;
                        importSelect.appendChild(importOption);
                    }
                }

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No exams created yet</td></tr>';
                } else if (snapshot.size === 50) {
                    const row = tbody.insertRow();
                    row.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #f59e0b; font-weight: bold;">Showing 50 most recent exams. Total may be more.</td></tr>';
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="6">Error loading data</td></tr>';
            }
        }

        async function publishExam(examId) {
            if (!confirm('Are you sure you want to publish this exam? This will make it active.')) return;
            try {
                await window.updateDoc(window.doc(window.db, 'exams', examId), {
                    status: 'ACTIVE',
                    publishedAt: new Date().toISOString()
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'PUBLISH_EXAM',
                    examId,
                    performedBy: window.currentUser.uid,
                    timestamp: new Date().toISOString()
                });
                showToast('Exam published successfully!', 'success');
                loadExamsList();
            } catch (err) {
                showToast('Error: ' + err.message, 'danger');
            }
        }
        window.publishExam = publishExam;

        async function viewExamDetails(examId) {
            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { showToast('Exam not found', 'danger'); return; }
                const exam = examDoc.data();

                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', exam.subjectId));
                const subject = subjectDoc.exists() ? subjectDoc.data() : {};

                let html = `
 <div style="max-height:80vh;overflow-y:auto;">
<div style="background:#1d4ed8;color:#fff;border-radius:10px;padding:16px;margin-bottom:16px;">
<h3 style="margin:0 0 6px;">${sanitizeString(exam.name)}</h3>
<div style="font-size:13px;opacity:0.85;">${subject.code || ''} - ${subject.name || 'N/A'} | ${exam.academicYear} Sem ${exam.semester}</div>
<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">
<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:12px;">${exam.examType?.toUpperCase()}</span>
<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:12px;">Total: ${exam.totalMarks} marks</span>
<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:12px;">${exam.status}</span>
</div>
</div> `;

                if (exam.examType === 'ca') {
                    if (exam.lessons && exam.lessons.length > 0) {
                        html += `<div style="margin-bottom:16px;"><h4 style="color:#374151;margin:0 0 8px;">Question Bank</h4>`;
                        exam.lessons.forEach((l, li) => {
                            html += `
 <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
<div style="font-weight:700;color:#1f2937;margin-bottom:4px;">Lesson ${li + 1}: ${l.name}</div>
<div style="color:#6b7280;font-size:12px;margin-bottom:4px;">${l.questions.length} questions</div> ${l.questions.map((q, qi) => `<div style="font-size:13px;color:#374151;padding:2px 0;">${qi + 1}. ${q}</div>`).join('')}
</div> `;
                        });
                        html += `</div>`;
                    }
                    html += `<h4 style="color:#374151;margin:0 0 8px;">Course Outcomes</h4>`;
                    exam.courseOutcomes?.forEach((co, ci) => {
                        html += `
 <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
<div style="font-weight:700;color:#1e40af;margin-bottom:4px;">${co.name}</div>
<div style="font-size:13px;color:#374151;margin-bottom:4px;">${co.description || ''}</div>
<div style="font-size:12px;color:#6b7280;">Source: ${co.lessonName || 'N/A'} | ${co.questionsPerStudent || 1} question(s) per student | Pool: ${co.questionPool?.length || 0} questions</div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;"> ${co.criteria?.map(c => `<span style="background:#dbeafe;color:#1e40af;border-radius:4px;padding:2px 8px;font-size:12px;">${c.name}: ${c.maxMarks}</span>`).join('')}
</div>
</div> `;
                    });
                } else {
                    html += `<h4 style="color:#374151;margin:0 0 8px;">Criteria</h4>`;
                    exam.criteria?.forEach(c => {
                        html += `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;">
<span>${c.name}</span><span style="font-weight:700;">${c.maxMarks} marks</span></div>`;
                    });
                }

                html += `</div>`;
                const modal = document.getElementById('examModal');
                document.getElementById('examModalTitle').textContent = ` Exam Details`;
                document.getElementById('examModalBody').innerHTML = html + `
 <div style="text-align:right;margin-top:12px;">
<button class="btn btn-secondary" onclick="closeExamModal()">Close</button>
</div>`;
                modal.classList.add('active');
            } catch (err) {
                showToast('Error loading exam details: ' + err.message, 'danger');
            }
        }

        async function assignTeacher() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const emailSelect = document.getElementById('assignTeacherEmail')?.value;
            const emailManual = document.getElementById('assignTeacherEmailManual')?.value?.trim();
            const email = emailSelect || emailManual;
            const subjectId = document.getElementById('assignSubject').value;

            if (!email || !subjectId) {
                showToast('Please fill in all fields', "danger");
                return;
            }

            try {
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', subjectId));
                const subjectData = subjectDoc.data();
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'teacher_assignments'),
                    window.where('teacherEmail', '==', email),
                    window.where('subjectId', '==', subjectId),
                    window.where('class', '==', subjectData.class),
                    window.where('division', '==', subjectData.division)));

                if (!duplicateCheck.empty) {
                    showToast('This teacher is already assigned to this subject for this class and division!', "danger");
                    return;
                }

                await window.addDoc(window.collection(window.db, 'teacher_assignments'), {
                    teacherEmail: email,
                    subjectId,
                    class: subjectData.class,
                    division: subjectData.division,
                    assignedBy: window.currentUser.uid,
                    assignedAt: new Date().toISOString()
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ASSIGN_TEACHER',
                    teacherEmail: email,
                    subjectId: subjectId,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString(),
                    academicYear: subjectData.academicYear,
                    semester: subjectData.semester
                });

                showToast('Teacher assigned successfully!', "success");
                if (document.getElementById('assignTeacherEmail')) document.getElementById('assignTeacherEmail').value = '';
                if (document.getElementById('assignTeacherEmailManual')) document.getElementById('assignTeacherEmailManual').value = '';
                loadTeacherAssignments();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function loadTeacherAssignments() {
            const tbody = document.getElementById('teacherAssignmentsList');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
            try {
                // BUG-14 FIX: Filter assignments to only those belonging to coordinator's department
                // We do this by fetching all assignments and then cross-referencing subject.department
                const coordDept = window.currentUser?.department || window.currentUser?.departmentId || null;
                const snapshot = await window.getDocs(window.collection(window.db, 'teacher_assignments'));
                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No teachers assigned yet</td></tr>';
                    return;
                }
                // Parallel fetch subjects + teacher user docs
                // BUG-14 FIX: Attach fetched docs to each asgn to avoid index mismatch after dept filtering
                let asgns = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                const [subjectDocs, teacherDocs] = await Promise.all([
                    Promise.all(asgns.map(a => window.getDoc(window.doc(window.db, 'subjects', a.subjectId)))),
                    Promise.all(asgns.map(a => window.getDocs(window.query(window.collection(window.db, 'users'), window.where('email', '==', a.teacherEmail), window.where('role', '==', 'teacher')))))
                ]);
                // Attach fetched docs to each entry so indices stay correct after filtering
                asgns = asgns.map((data, aIdx) => ({
                    ...data,
                    _subjectDoc: subjectDocs[aIdx],
                    _teacherSnap: teacherDocs[aIdx]
                }));
                // Filter asgns by dept if coordinator
                if (coordDept && window.currentUser?.role === 'coordinator') {
                    asgns = asgns.filter(data => {
                        const subjectData = data._subjectDoc.exists() ? data._subjectDoc.data() : {};
                        return !subjectData.department || subjectData.department === coordDept;
                    });
                }
                tbody.innerHTML = '';
                if (asgns.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No teachers assigned yet</td></tr>';
                    return;
                }
                asgns.forEach((data) => {
                    const subjectData = data._subjectDoc.exists() ? data._subjectDoc.data() : {};
                    const teacherSnap = data._teacherSnap;
                    const teacherData = !teacherSnap.empty ? teacherSnap.docs[0].data() : null;
                    const teacherId = !teacherSnap.empty ? teacherSnap.docs[0].id : null;
                    const isActive = teacherData ? teacherData.isActive !== false : true;
                    const row = tbody.insertRow();
                    if (!isActive) row.classList.add('teacher-row-disabled');
                    row.innerHTML = `
 <td><strong>${teacherData?.name || data.teacherEmail.split('@')[0]}</strong></td>
<td style="font-size:12px;">${data.teacherEmail}</td>
<td>${subjectData.name || 'N/A'}</td>
<td>${data.class}</td>
<td>${data.division}</td>
<td>${isActive ? '<span class="account-status-on">ON</span>' : '<span class="account-status-off">OFF</span>'}</td>
<td style="white-space:nowrap;">
${teacherId ? `<button class="btn btn-sm ${isActive ? 'btn-off' : 'btn-on'}" onclick="toggleTeacherAccount('${teacherId}','${data.teacherEmail}',${isActive})">${isActive ? 'Disable' : 'Enable'}</button> ` : ''}
<button class="btn btn-danger btn-sm" onclick="removeTeacherAssignment('${data.id}','${data.teacherEmail}')">Remove</button>
</td>`;
                });
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="7" style="color:#dc2626;">Error: ' + error.message + '</td></tr>';
            }
        }

        let allResultsData = [];
        let currentExamData = null;

        async function loadResults() {
            const examId = document.getElementById('resultsExam')?.value;
            const container = document.getElementById('resultsTable');

            if (!examId) {
                if (container) {
                    container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">Select an exam above to view results</p>';
                }
                return;
            }
            if (container) {
                container.innerHTML = `
 <div style="margin-bottom: 15px; text-align: right;">
<button class="btn btn-success btn-sm" onclick="exportAllStudentsResultsCSV('${examId}')">Export All Results to CSV</button>
</div>
<div style="padding: 40px; text-align: center;">
<div class="spinner"></div>
<p style="margin-top: 15px;">Loading all students and results...</p>
</div> `;
            }

            loadAllStudentsResults();
        }

        function calculateCOSummaryFromArray(results) {
            const coTotals = Array(5).fill(0);
            const coCounts = Array(5).fill(0);

            results.forEach(data => {
                if (data.coAttainment) {
                    data.coAttainment.forEach((co, idx) => {
                        if (co.status !== 'Not Evaluated' && co.percentage > 0) {
                            coTotals[idx] += co.percentage;
                            coCounts[idx]++;
                        }
                    });
                }
            });

            return coTotals.map((total, idx) => {
                const average = coCounts[idx] > 0 ? total / coCounts[idx] : 0;
                return {
                    name: `CO${idx + 1}`,
                    average,
                    evaluatedCount: coCounts[idx],
                    status: average >= 70 ? 'Strong' : average >= 50 ? 'Moderate' : 'Weak'
                };
            });
        }
        function validateMarks(input, maxMarks) {
            const value = parseFloat(input.value);

            if (isNaN(value) || value < 0) {
                input.value = 0;
                return;
            }

            if (value > maxMarks) {
                showToast(`Marks cannot exceed maximum: ${maxMarks}`, "warning");
                input.value = maxMarks;
                input.style.borderColor = '#ef4444';
                setTimeout(() => {
                    input.style.borderColor = '';
                }, 2000);
                return;
            }
            const rounded = Math.round(value * 2) / 2;
            if (value !== rounded) {
                input.value = rounded;
            }
        }

        async function finalizeResults() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const examId = document.getElementById('resultsExam')?.value;

            if (!examId) {
                showToast('Please select an exam', 'warning');
                return;
            }
            if (!window._finalizeConfirm) {
                window._finalizeConfirm = examId;
                showToast('Click Finalize again to confirm. This action cannot be undone!', 'warning', 4000);
                setTimeout(() => { window._finalizeConfirm = null; }, 4000);
                return;
            }
            window._finalizeConfirm = null;
            try {
                const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'), window.where('examId', '==', examId)));
                const incompleteCount = resultsSnap.docs.filter(doc => doc.data().status === 'INCOMPLETE').length;
                const absentCount = resultsSnap.docs.filter(doc => doc.data().status === 'ABSENT').length;

                if (incompleteCount > 0) {
                    showToast(`Note: ${incompleteCount} incomplete + ${absentCount} absent student(s). Proceeding with finalization.`, 'warning', 5000);
                }

                const reason = 'End of evaluation period';
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { showToast('Exam not found', 'danger'); return; }
                const examData = examDoc.data();
                await window.updateDoc(window.doc(window.db, 'exams', examId), {
                    status: 'FINALIZED',
                    finalizedBy: window.currentUser.uid,
                    finalizedByName: window.currentUser.name,
                    finalizedAt: new Date().toISOString(),
                    finalizationReason: reason,
                    totalStudentsEvaluated: resultsSnap.size,
                    incompleteStudents: incompleteCount
                });
                const batch = [];
                resultsSnap.forEach(resultDoc => {
                    batch.push(window.updateDoc(window.doc(window.db, 'results', resultDoc.id), {
                        finalStatus: 'FINALIZED',
                        publicationStatus: 'PUBLISHED',
                        finalizedAt: new Date().toISOString(),
                        publishedAt: new Date().toISOString()
                    }));
                });
                await Promise.all(batch);
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'FINALIZE_EXAM_RESULTS',
                    examId,
                    examName: examData.name,
                    totalStudents: resultsSnap.size,
                    incompleteStudents: incompleteCount,
                    reason: reason,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    performedByRole: window.currentUser.role,
                    timestamp: new Date().toISOString(),
                    academicYear: examData.academicYear,
                    semester: examData.semester,
                    irreversible: true
                });

                showToast(`Results finalized! Students: ${resultsSnap.size}`, 'success');

                loadExamsList();
                loadResults();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        function showTeacherSection(section, btn) {
            document.querySelectorAll('#teacherDashboard .section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('#teacherDashboard .nav-btn').forEach(b => b.classList.remove('active'));

            if (section === 'assignments') {
                document.getElementById('teacherAssignments').classList.add('active');
            } else if (section === 'students') {
                document.getElementById('teacherStudents').classList.add('active');
                loadTeacherStudentDropdowns();
            } else if (section === 'exams') {
                document.getElementById('teacherExams').classList.add('active');
                loadTeacherExamsTab();
            } else if (section === 'evaluate') {
                document.getElementById('teacherEvaluate').classList.add('active');
            } else if (section === 'results') {
                document.getElementById('teacherResults').classList.add('active');
                loadTeacherResultsExams();
            } else if (section === 'myquestions') {
                document.getElementById('teacherMyquestions').classList.add('active');
                loadTeacherQuestionsTab();
            }
            if (btn) btn.classList.add('active');
        }

        /**
         * Load Teacher Questions tab
         */
        async function loadTeacherQuestionsTab() {
            const subjectSelect = document.getElementById('teacherQuestionsSubject');
            if (!subjectSelect || !window.currentUser) return;

            subjectSelect.innerHTML = '<option value="">Choose Subject</option>';

            try {
                const assignmentsSnap = await getDocs(query(
                    collection(window.db, 'teacher_assignments'),
                    where('teacherEmail', '==', window.currentUser.email)
                ));

                for (const doc of assignmentsSnap.docs) {
                    const data = doc.data();
                    const subjectDoc = await getDoc(window.doc(window.db, 'subjects', data.subjectId));
                    const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};

                    const opt = document.createElement('option');
                    opt.value = data.subjectId;
                    opt.textContent = `${subjectData.name} (${data.class}-${data.division})`;
                    subjectSelect.appendChild(opt);
                }
            } catch (error) {
                console.error('Error loading teacher questions tab:', error);
            }
        }

        window.loadTeacherQuestionsTab = loadTeacherQuestionsTab;

        async function loadTeacherQuestionsForSubject() {
            const subjectId = document.getElementById('teacherQuestionsSubject')?.value;
            const container = document.getElementById('teacherQuestionsList');
            if (!container) return;

            if (!subjectId) {
                container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Select a subject to view assigned questions</p>';
                return;
            }

            container.innerHTML = '<p style="text-align:center;padding:20px;">Fetching assigned questions...</p>';

            try {
                // Fetch assignments for this specific teacher and subject
                const assignmentsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'teacher_question_assignments'),
                    window.where('teacherEmail', '==', window.currentUser.email),
                    window.where('subjectId', '==', subjectId),
                    window.orderBy('assignedAt', 'desc'),
                    window.limit(5)
                ));

                if (assignmentsSnap.empty) {
                    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No specific question sets assigned to you yet for this subject.</p>';
                    return;
                }

                let html = '';
                assignmentsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    const date = data.assignedAt ? new Date(data.assignedAt).toLocaleString() : 'N/A';
                    
                    html += `
                        <div class="card" style="margin-bottom:15px; border-left: 4px solid #2563eb;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <h4 style="margin:0;">Assigned Set: ${date}</h4>
                                <span class="badge badge-info">ID: ${docSnap.id.substring(0,8)}</span>
                            </div>
                            <div style="background:#f8fafc; border-radius:8px; padding:10px;">
                                ${data.questions.map((q, idx) => `
                                    <div style="padding:8px; border-bottom: 1px solid #e2e8f0; font-size:14px;">
                                        <strong>Q${idx + 1}.</strong> ${q.question} 
                                        <span style="font-size:11px; color:#64748b; margin-left:10px;">(Unit: ${q.unit}, Marks: ${q.marks})</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } catch (error) {
                console.error('Error loading teacher questions:', error);
                container.innerHTML = `<p style="color:#dc2626;text-align:center;">Error: ${error.message}</p>`;
            }
        }
        window.loadTeacherQuestionsForSubject = loadTeacherQuestionsForSubject;

        async function loadTeacherExamsTab() {
            const subjectSelect = document.getElementById('teacherExamSubject');
            const filterSelect = document.getElementById('teacherExamsFilter');

            if (!subjectSelect) return;

            subjectSelect.innerHTML = '<option value="">Choose Subject</option>';
            filterSelect.innerHTML = '<option value="">All Subjects</option>';

            try {
                const assignmentsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'teacher_assignments'),
                    window.where('teacherEmail', '==', window.currentUser.email)
                ));

                for (const doc of assignmentsSnap.docs) {
                    const data = doc.data();
                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', data.subjectId));
                    const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};

                    const opt1 = document.createElement('option');
                    opt1.value = data.subjectId;
                    opt1.textContent = `${subjectData.name} (${data.class}-${data.division})`;
                    opt1.setAttribute('data-class', data.class);
                    opt1.setAttribute('data-division', data.division);
                    opt1.setAttribute('data-year', subjectData.academicYear || '');
                    opt1.setAttribute('data-sem', subjectData.semester || '');
                        subjectSelect.appendChild(opt1);

                    const opt2 = opt1.cloneNode(true);
                    filterSelect.appendChild(opt2);
                }
                generateTeacherCriteriaFields();
                loadTeacherExamsList();

            } catch (error) { /* silent */ }
        }

        function toggleTeacherExamType() {
            const type = document.getElementById('teacherExamType').value;
            const standardFields = document.getElementById('teacherStandardExamFields');
            const caFields = document.getElementById('teacherCAExamFields');
            const eseFields = document.getElementById('teacherESEExamFields');

            if (type === 'ca') {
                standardFields.style.display = 'none';
                caFields.style.display = 'block';
                if (eseFields) eseFields.style.display = 'none';
            } else if (type === 'ese') {
                standardFields.style.display = 'none';
                caFields.style.display = 'none';
                if (eseFields) eseFields.style.display = 'block';
            } else {
                standardFields.style.display = 'block';
                caFields.style.display = 'none';
                if (eseFields) eseFields.style.display = 'none';
            }
        }

        window.applyCATemplate = function(template) {
            const nameInput = document.getElementById('teacherExamNameCA');
            const coInput = document.getElementById('teacherCOCountCA');
            const marksInput = document.getElementById('teacherCAMaxMarksCA');
            const totalLabel = document.getElementById('caTotalLabel');
            
            if (template === 'unit1') {
                nameInput.value = 'Continuous Assessment - JUnit I';
                coInput.value = 3;
                marksInput.value = 4;
            } else if (template === 'unit2') {
                nameInput.value = 'Continuous Assessment - JUnit II';
                coInput.value = 2;
                marksInput.value = 4;
            } else if (template === 'full') {
                nameInput.value = 'Continuous Assessment - (JUnit I & II)';
                coInput.value = 5;
                marksInput.value = 4;
            }
            if (totalLabel) totalLabel.textContent = coInput.value * marksInput.value;
            showToast('Template Applied', 'success');
        };

        window.createExamUnified = async function(type) {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            
            let subjectId, examName, examData;
            
            if (type === 'ca') {
                subjectId = document.getElementById('teacherExamSubjectCA').value;
                examName = document.getElementById('teacherExamNameCA').value.trim();
                const coCount = parseInt(document.getElementById('teacherCOCountCA').value);
                const maxMarks = parseFloat(document.getElementById('teacherCAMaxMarksCA').value);
                
                if (!subjectId || !examName) { showToast('Please fill all CA fields', "warning"); return; }
                
                const nameLower = examName.toLowerCase();
                let startCO = 1;
                if (nameLower.includes('junit ii') || nameLower.includes('unit 2')) startCO = 4;

                const courseOutcomes = [];
                let actualTotalMarks = 0;
                for (let i = 0; i < coCount; i++) {
                    const currentCONum = startCO + i;
                    courseOutcomes.push({
                        name: `CO${currentCONum}`,
                        criteria: [{ name: `Assignment 1`, maxMarks: maxMarks }]
                    });
                    actualTotalMarks += maxMarks;
                }

                examData = {
                    name: examName,
                    subjectId: subjectId,
                    examType: 'ca',
                    courseOutcomes,
                    totalMarks: actualTotalMarks,
                    coCount,
                    status: 'DRAFT',
                    lifecycleState: 'DRAFT',
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.uid
                };
            } else if (type === 'ese') {
                subjectId = document.getElementById('teacherExamSubjectESE').value;
                examName = document.getElementById('teacherExamNameESE').value.trim();
                const marksPerQ = parseFloat(document.getElementById('teacherESEMarksESE').value);
                
                if (!subjectId || !examName) { showToast('Please fill all ESE fields', "warning"); return; }
                
                const courseOutcomes = [];
                for (let co = 1; co <= 5; co++) {
                    courseOutcomes.push({
                        name: `CO${co}`,
                        criteria: [{ name: `Question ${co}`, maxMarks: marksPerQ }]
                    });
                }

                examData = {
                    name: examName,
                    subjectId: subjectId,
                    examType: 'ese',
                    courseOutcomes,
                    totalMarks: 5 * marksPerQ,
                    coCount: 5,
                    status: 'DRAFT',
                    lifecycleState: 'DRAFT',
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.uid
                };
            }

            try {
                window.showLoadingMessage('Saving exam...');
                const subjectSelect = document.getElementById(type === 'ca' ? 'teacherExamSubjectCA' : 'teacherExamSubjectESE');
                const selectedOption = subjectSelect.selectedOptions[0];
                examData.academicYear = selectedOption.getAttribute('data-year') || '';
                examData.semester = selectedOption.getAttribute('data-sem') || '';
                
                await window.addDoc(window.collection(window.db, 'exams'), examData);
                window.hideLoadingMessage();
                showToast('Exam created successfully', 'success');
                loadTeacherExamsList();
            } catch (error) {
                window.hideLoadingMessage();
                showToast('Error: ' + error.message, 'danger');
            }
        };

        window.applyExamTemplate = function(template) {
            const typeSelect = document.getElementById('teacherExamType');
            const nameInput = document.getElementById('teacherExamName');
            
            if (template.startsWith('ca_')) {
                typeSelect.value = 'ca';
                toggleTeacherExamType();
                const coInput = document.getElementById('teacherCOCount');
                const caInput = document.getElementById('teacherCACount');
                const marksInput = document.getElementById('teacherCAMaxMarks');
                
                if (template === 'ca_unit1') {
                    nameInput.value = 'Continuous Assessment - JUnit I';
                    coInput.value = 3;
                    marksInput.value = 4;
                    window.showToast('Applied JUnit I Template: CO1-3 @ 4m each', 'info');
                } else if (template === 'ca_unit2') {
                    nameInput.value = 'Continuous Assessment - JUnit II';
                    coInput.value = 2;
                    marksInput.value = 4;
                    window.showToast('Applied JUnit II Template: CO4-5 @ 4m each', 'info');
                } else if (template === 'ca_full') {
                    nameInput.value = 'Continuous Assessment - (JUnit I & II)';
                    coInput.value = 5;
                    marksInput.value = 4;
                    window.showToast('Applied Full CA Template: CO1-5 @ 4m each', 'info');
                }
            } else if (template === 'ese_standard') {
                typeSelect.value = 'ese';
                toggleTeacherExamType();
                nameInput.value = 'End Semester Exam (ESE)';
                const marksInput = document.getElementById('teacherESEMarks');
                marksInput.value = 5;
                document.getElementById('eseTotalLabel').textContent = 25;
                window.showToast('Applied ESE Template: 5 Questions @ 5m each', 'success');
            }
        };

        function generateTeacherCriteriaFields() {
            const count = parseInt(document.getElementById('teacherCriteriaCount')?.value || 5);
            const container = document.getElementById('teacherCriteriaFields');
            if (!container) return;

            let html = '<div class="criteria-grid">';
            for (let i = 1; i <= count; i++) {
                html += `
 <div class="form-group">
<label>Criterion ${i} Name</label>
<input type="text" id="teacherCriterion${i}Name" placeholder="e.g., Theory Knowledge" value="Criterion ${i}">
</div>
<div class="form-group">
<label>Max Marks</label>
<input type="number" id="teacherCriterion${i}Marks" placeholder="Max marks" value="10" min="1" max="100">
</div> `;
            }
            html += '</div>';
            container.innerHTML = html;
        }

        async function createTeacherExam() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const subjectId = document.getElementById('teacherExamSubject').value;
            const examType = document.getElementById('teacherExamType').value;
            const examName = document.getElementById('teacherExamName').value.trim();

            if (!subjectId || !examName) {
                showToast('Please fill in all required fields', "warning");
                return;
            }

            try {
                const subjectSelect = document.getElementById('teacherExamSubject');
                const selectedOption = subjectSelect.selectedOptions[0];
                const academicYear = selectedOption.getAttribute('data-year');
                const semester = selectedOption.getAttribute('data-sem');

                let examData = {
                    name: examName,
                    subjectId: subjectId,
                    examType: examType,
                    status: 'DRAFT',
                    lifecycleState: 'DRAFT',
                    academicYear: academicYear || '',
                    semester: semester || '',
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.uid,
                    createdByName: window.currentUser.name
                };

                if (examType === 'standard') {
                    const count = parseInt(document.getElementById('teacherCriteriaCount').value);
                    const criteria = [];
                    let totalMarks = 0;

                    for (let i = 1; i <= count; i++) {
                        const name = document.getElementById(`teacherCriterion${i}Name`).value;
                        const marks = parseFloat(document.getElementById(`teacherCriterion${i}Marks`).value);
                        criteria.push({ name, maxMarks: marks });
                        totalMarks += marks;
                    }

                    examData.criteria = criteria;
                    examData.totalMarks = totalMarks;
                } else if (examType === 'ca') {
                    const coCount = parseInt(document.getElementById('teacherCOCount').value);
                    const maxMarks = parseFloat(document.getElementById('teacherCAMaxMarks').value);
                    const nameLower = examName.toLowerCase();
                    
                    const courseOutcomes = [];
                    let actualTotalMarks = 0;
                    
                    // Logic based on diagram: JUnit I (CO1-3) or JUnit II (CO4-5) or Full
                    let startCO = 1;
                    if (nameLower.includes('junit ii') || nameLower.includes('unit 2')) {
                        startCO = 4;
                    }

                    for (let i = 0; i < coCount; i++) {
                        const currentCONum = startCO + i;
                        const coName = `CO${currentCONum}`;
                        courseOutcomes.push({
                            name: coName,
                            criteria: [{ name: `Assignment 1`, maxMarks: maxMarks }]
                        });
                        actualTotalMarks += maxMarks;
                    }

                    examData.courseOutcomes = courseOutcomes;
                    examData.totalMarks = actualTotalMarks;
                } else if (examType === 'ese') {
                    const marksPerQ = parseFloat(document.getElementById('teacherESEMarks').value);
                    const courseOutcomes = [];
                    let actualTotalMarks = 0;
                    
                    // ESE always has 5 questions (CO1-CO5) as per diagram
                    for (let co = 1; co <= 5; co++) {
                        courseOutcomes.push({
                            name: `CO${co}`,
                            criteria: [{ name: `Question ${co}`, maxMarks: marksPerQ }]
                        });
                        actualTotalMarks += marksPerQ;
                    }
                    examData.courseOutcomes = courseOutcomes;
                    examData.totalMarks = actualTotalMarks;
                }

                await window.addDoc(window.collection(window.db, 'exams'), examData);

                const detailsMsg = examType === 'ca'
                    ? `\n\nCOs: ${examData.coCount}\nCAs per CO: ${examData.caCount}\nTotal Marks: ${examData.totalMarks}`
                    : `\n\nCriteria: ${examData.criteria.length}\nTotal Marks: ${examData.totalMarks}`;

                showToast('Exam created successfully!', 'success');
                document.getElementById('teacherExamName').value = '';
                loadTeacherExamsList();

            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }

        async function loadTeacherExamsList() {
            const container = document.getElementById('teacherExamsList');
            const filterValue = document.getElementById('teacherExamsFilter').value;

            if (!container) return;

            container.innerHTML = '<p>Loading exams...</p>';

            try {
                const assignmentsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'teacher_assignments'),
                    window.where('teacherEmail', '==', window.currentUser.email)
                ));

                const assignedSubjectIds = [];
                assignmentsSnap.forEach(doc => assignedSubjectIds.push(doc.data().subjectId));

                if (assignedSubjectIds.length === 0) {
                    container.innerHTML = '<p>No subjects assigned</p>';
                    return;
                }

                // BUG-03 FIX: Empty array passed to 'in' query causes Firestore error.
                // Guard is already above, but also chunk to stay within Firestore 30-item limit.
                let examDocs = [];
                const _chunks = [];
                for (let ci = 0; ci < assignedSubjectIds.length; ci += 30) {
                    _chunks.push(assignedSubjectIds.slice(ci, ci + 30));
                }
                for (const _chunk of _chunks) {
                    const _snap = await window.getDocs(window.query(
                        window.collection(window.db, 'exams'),
                        window.where('subjectId', 'in', _chunk)
                    ));
                    _snap.forEach(d => examDocs.push(d));
                }
                // Wrap as snapshot-like object for compatibility
                const examsSnap = { docs: examDocs, empty: examDocs.length === 0, forEach: (cb) => examDocs.forEach(cb) };

                if (examsSnap.empty) {
                    container.innerHTML = '<p>No exams created yet</p>';
                    return;
                }

                let html = '<div class="table-container"><table><thead><tr><th>Exam Name</th><th>Subject</th><th>Type</th><th>Structure</th><th>Total Marks</th><th>Status</th><th>Created</th></tr></thead><tbody>';

                for (const examDoc of examsSnap.docs) {
                    const exam = examDoc.data();

                    if (filterValue && exam.subjectId !== filterValue) continue;

                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', exam.subjectId));
                    const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};

                    let structure = '';
                    if (exam.examType === 'ca') {
                        structure = `${exam.coCount || 5} COs x ${exam.caCount || 2} CAs`;
                    } else {
                        structure = `${exam.criteria?.length || 0} Criteria`;
                    }

                    html += `
 <tr>
<td><strong>${exam.name}</strong></td>
<td>${subjectData.name || 'N/A'}</td>
<td><span class="badge badge-${exam.examType === 'ca' ? 'info' : 'secondary'}">${exam.examType === 'ca' ? 'CA' : 'Standard'}</span></td>
<td><strong>${structure}</strong></td>
<td>${exam.totalMarks}</td>
<td><span class="badge badge-${exam.status === 'FINALIZED' ? 'success' : 'warning'}">${exam.status}</span></td>
<td>${new Date(exam.createdAt).toLocaleDateString()}</td>
</tr> `;
                }

                html += '</tbody></table></div>';
                container.innerHTML = html;

            } catch (error) {
                container.innerHTML = '<p>Error: ' + error.message + '</p>';
            }
        }
        async function loadTeacherStudentDropdowns() {
            // Handled by loadTeacherData - kept for backward compatibility
        }
        async function loadTeacherStudents() {
            const select = document.getElementById('teacherStudentSubject');
            const container = document.getElementById('teacherStudentsListContainer');

            if (!select || !select.value) {
                if (container) container.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:20px;">Select a subject to view students.</p>';
                return;
            }

            const rawValue = select.value;
            let subjectId, className, division;
            if (rawValue.includes('|')) {
                [subjectId, className, division] = rawValue.split('|');
            } else {
                subjectId = rawValue;
                const selectedOption = select.selectedOptions[0];
                className = selectedOption?.getAttribute('data-class') || '';
                division = selectedOption?.getAttribute('data-division') || '';
            }
            if (!className || !division) {
                if (container) container.innerHTML = '<div class="alert alert-warning">Class/division info missing for this subject. Contact your coordinator.</div>';
                return;
            }
            container.innerHTML = '<p>Loading students...</p>';

            try {
                const studentsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'students'),
                    window.where('class', '==', className),
                    window.where('division', '==', division)
                ));

                if (studentsSnap.empty) {
                    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No students found. Import students using the section above.</p>';
                    return;
                }

                let html = `
 <p style="margin-bottom: 10px;"><strong>Total Students:</strong> ${studentsSnap.size}</p>
<table>
<thead>
<tr>
<th>Sr. No.</th>
<th>Roll No.</th>
<th>Enrollment</th>
<th>Name</th>
<th>Email</th>
<th>Phone</th>
</tr>
</thead>
<tbody>`;

                let srNo = 1;
                studentsSnap.forEach(doc => {
                    const student = doc.data();
                    html += `
 <tr>
<td>${srNo}</td>
<td>${student.rollNo || '-'}</td>
<td>${student.enrollment}</td>
<td>${sanitizeString(student.name)}</td>
<td>${student.email || '-'}</td>
<td>${student.phone || '-'}</td>
</tr>`;
                    srNo++;
                });

                html += '</tbody></table></div>';
                container.innerHTML = html;
            } catch (error) {
                container.innerHTML = '<p style="color: red;">Error loading students: ' + error.message + '</p>';
            }
        }

        let teacherResultsData = [];

        async function loadTeacherResults() {
            // Delegates to loadAllStudentsResults which handles teacher context
            await loadAllStudentsResults();
        }

        function displayTeacherResults(results, examData) {
            const container = document.getElementById('teacherResultsContainer');

            if (results.length === 0) {
                container.innerHTML = '<p>No results found for this exam.</p>';
                return;
            }

            let html = '<table><thead><tr>';
            html += '<th>Enrollment</th><th>Name</th><th>Total Marks</th><th>Percentage</th><th>Grade</th><th>Status</th>';

            if (examData.examType === 'ca') {
                html += '<th>CO Attainment</th>';
            }
            html += '</tr></thead><tbody>';

            results.forEach(result => {
                const statusClass = result.status === 'COMPLETE' ? 'success' : 'warning';
                html += `
 <tr>
<td>${result.enrollment}</td>
<td>${sanitizeString(result.studentName)}</td>
<td>${result.totalMarks != null ? Number(result.totalMarks).toFixed(2) : 'N/A'} / ${examData.totalMarks || 'N/A'}</td>
<td>${(result.percentage != null ? Number(result.percentage).toFixed(2) : '0.00')}%</td>
<td><span class="badge badge-info">${result.grade}</span></td>
<td><span class="badge badge-${statusClass}">${result.status}</span></td> `;

                if (examData.examType === 'ca' && result.coAttainment) {
                    let coSummary = '<div style="font-size: 12px;">';
                    result.coAttainment.forEach(co => {
                        const color = co.percentage >= 70 ? '#10b981' : co.percentage >= 50 ? '#f59e0b' : '#ef4444';
                        coSummary += `<div>${co.co}: ${co.percentage != null ? Number(co.percentage).toFixed(0) : '0'}%</div>`;
                    });
                    coSummary += '</div>';
                    html += `<td>${coSummary}</td>`;
                }

                html += '</tr>';
            });

            html += '</tbody></table>';
            const complete = results.filter(r => r.status === 'COMPLETE').length;
            const avgPercentage = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;

            html += `
 <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
<strong>Summary:</strong><br>Total Students: ${results.length}<br>Complete: ${complete} | Incomplete: ${results.length - complete}<br>Class Average: ${(avgPercentage != null && !isNaN(avgPercentage) ? Number(avgPercentage).toFixed(2) : '0.00')}%
</div> `;

            container.innerHTML = html;
        }

        function filterTeacherResults() {
            const searchText = document.getElementById('teacherResultSearch')?.value?.toLowerCase() || '';
            if (!searchText) {
                const rows = document.querySelectorAll('#teacherResultsContainer table tbody tr');
                rows.forEach(row => row.style.display = '');
                return;
            }
            const rows = document.querySelectorAll('#teacherResultsContainer table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchText) ? '' : 'none';
            });
        }

        async function exportTeacherResults() {
            const examId = document.getElementById('teacherResultsExam')?.value;
            if (!examId) {
                showToast('Please select an exam first', 'warning');
                return;
            }
            try {
                await exportAllStudentsResultsCSV(examId);
            } catch (error) {
                showToast('Export failed: ' + error.message, 'danger');
            }
        }
        async function teacherImportStudents() {
            const classSelect = document.getElementById('teacherImportClass');
            const fileInput = document.getElementById('teacherStudentExcel');

            const classData = classSelect.value;
            if (!classData) {
                showToast('Please select a class first', "warning");
                return;
            }

            if (!fileInput.files[0]) {
                showToast('Please select a file (Excel or CSV)', "warning");
                return;
            }

            const parts = classData.split('|');
            const subjectId = parts[0] || '';
            const className = parts[1] || '';
            const division = parts[2] || '';
            
            const file = fileInput.files[0];
            
            try {
                window.showLoadingMessage('Importing students...');
                await window.importFromExcel(file, async (data) => {
                    let successCount = 0;
                    let skipCount = 0;
                    
                    for (const row of data) {
                        // Flexible header mapping
                        const getVal = (patterns) => {
                            const key = Object.keys(row).find(k => 
                                patterns.some(p => k.toLowerCase().trim().includes(p.toLowerCase()))
                            );
                            return key ? String(row[key]).trim() : '';
                        };

                        const rollNo = getVal(['roll', 'sr', 'no']);
                        const enrollment = getVal(['enrollment', 'prn', 'id', 'urn']);
                        const name = getVal(['name', 'student', 'full']);
                        const parentEmail = getVal(['parent', 'guardian']);
                        const studentEmail = getVal(['email', 'student email', 'personal email']);
                        const phone = getVal(['phone', 'mobile', 'contact']);
                        const batch = getVal(['batch', 'group']);

                        if (!enrollment || !name) {
                            skipCount++;
                            continue;
                        }

                        // Check for duplicate enrollment in this class/division
                        const existingSnap = await window.getDocs(window.query(
                            window.collection(window.db, 'students'),
                            window.where('enrollment', '==', enrollment)
                        ));

                        if (!existingSnap.empty) {
                            skipCount++;
                            continue;
                        }

                        await window.addDoc(window.collection(window.db, 'students'), {
                            rollNo: rollNo || '',
                            enrollment: enrollment,
                            name: name,
                            email: studentEmail || parentEmail || '',
                            parentEmail: parentEmail || '',
                            phone: phone || '',
                            class: className,
                            division: division,
                            batch: batch || division,
                            createdAt: new Date().toISOString(),
                            createdBy: window.currentUser.uid
                        });

                        successCount++;
                    }

                    window.hideLoadingMessage();
                    showToast(`Import Complete! Added: ${successCount}, Skipped: ${skipCount} (duplicates/invalid)`, "success");
                    fileInput.value = '';
                    if (typeof loadTeacherStudents === 'function') loadTeacherStudents();
                });
            } catch (error) {
                window.hideLoadingMessage();
                console.error('Import Error:', error);
                showToast('Import failed: ' + error.message, 'danger');
            }
        }

        async function loadTeacherData() {
            const tbody = document.getElementById('teacherAssignmentsList');
            const examSelect = document.getElementById('teacherExamSelect');
            const subjectSelect = document.getElementById('teacherResultsSubject');
            const studentSubjectSelect = document.getElementById('teacherStudentSubject');
            if (studentSubjectSelect) studentSubjectSelect.innerHTML = '<option value="">Select Subject</option>';
            const importClassSelect = document.getElementById('teacherImportClass');

            if (!tbody || !examSelect) {
                return;
            }

            tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
            examSelect.innerHTML = '<option value="">Select exam to evaluate</option>';
            if (subjectSelect) subjectSelect.innerHTML = '<option value="">Select Subject First</option>';
            if (importClassSelect) importClassSelect.innerHTML = '<option value="">Select Class</option>';

            try {
                const assignmentsSnap = await window.getDocs(window.query(window.collection(window.db, 'teacher_assignments'),
                    window.where('teacherEmail', '==', window.currentUser.email)));
                tbody.innerHTML = '';

                if (assignmentsSnap.empty) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No assignments yet. Contact your coordinator to assign you to subjects.</td></tr>';
                }
                const assignedSubjectIds = [];
                const subjectsMap = new Map();

                for (const docSnap of assignmentsSnap.docs) {
                    const data = docSnap.data();
                    assignedSubjectIds.push(data.subjectId);

                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', data.subjectId));
                    const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};
                    const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                        window.where('class', '==', data.class),
                        window.where('division', '==', data.division)));
                    if (!subjectsMap.has(data.subjectId)) {
                        subjectsMap.set(data.subjectId, {
                            name: subjectData.name || 'N/A',
                            class: data.class,
                            division: data.division,
                            academicYear: subjectData.academicYear || '',
                            semester: subjectData.semester || ''
                        });
                    }
                    if (importClassSelect) {
                        const option = document.createElement('option');
                        option.value = `${data.subjectId}|${data.class}|${data.division}`;
                        option.textContent = `${subjectData.name} - ${data.class}-${data.division}`;
                        importClassSelect.appendChild(option);
                    }

                    const row = tbody.insertRow();
                    row.innerHTML = `
 <td><strong>${subjectData.name || 'N/A'}</strong></td>
<td>${subjectData.code || '-'}</td>
<td>${data.class}</td>
<td>${data.division}</td>
<td><span class="badge badge-info">${studentsSnap.size}</span></td>
<td>${subjectData.academicYear || '-'}</td>
<td>${subjectData.semester || '-'}</td> `;
                }
                const evalSubjectSelect = document.getElementById('teacherSubjectSelect');
                if (evalSubjectSelect) evalSubjectSelect.innerHTML = '<option value="">Choose Subject</option>';
                const createExamSubjectSelect = document.getElementById('teacherExamSubject');
                const caSubjectSelect = document.getElementById('teacherExamSubjectCA');
                const eseSubjectSelect = document.getElementById('teacherExamSubjectESE');
                const createExamFilterSelect = document.getElementById('teacherExamsFilter');
                
                if (createExamSubjectSelect) createExamSubjectSelect.innerHTML = '<option value="">Choose Subject</option>';
                if (caSubjectSelect) caSubjectSelect.innerHTML = '<option value="">Choose Subject</option>';
                if (eseSubjectSelect) eseSubjectSelect.innerHTML = '<option value="">Choose Subject</option>';
                if (createExamFilterSelect) createExamFilterSelect.innerHTML = '<option value="">All Subjects</option>';
                
                if (subjectSelect) {
                    subjectsMap.forEach((subjectInfo, subjectId) => {
                        const option = document.createElement('option');
                        option.value = subjectId;
                        option.textContent = `${subjectInfo.name} (${subjectInfo.class}-${subjectInfo.division})`;
                        option.setAttribute('data-class', subjectInfo.class);
                        option.setAttribute('data-division', subjectInfo.division);
                        option.setAttribute('data-year', subjectInfo.academicYear || '');
                        option.setAttribute('data-sem', subjectInfo.semester || '');
                        
                        if (subjectSelect) subjectSelect.appendChild(option.cloneNode(true));
                        if (evalSubjectSelect) evalSubjectSelect.appendChild(option.cloneNode(true));
                        if (studentSubjectSelect) studentSubjectSelect.appendChild(option.cloneNode(true));
                        if (createExamSubjectSelect) createExamSubjectSelect.appendChild(option.cloneNode(true));
                        if (caSubjectSelect) caSubjectSelect.appendChild(option.cloneNode(true));
                        if (eseSubjectSelect) eseSubjectSelect.appendChild(option.cloneNode(true));
                        
                        if (createExamFilterSelect) {
                            const filterOpt = option.cloneNode(true);
                            createExamFilterSelect.appendChild(filterOpt);
                        }
                    });
                }
                if (assignedSubjectIds.length > 0) {
                    // Firestore 'in' query max 30 items - chunk if needed
                    const chunks = [];
                    for (let i = 0; i < assignedSubjectIds.length; i += 30) {
                        chunks.push(assignedSubjectIds.slice(i, i + 30));
                    }
                    const examDocs = [];
                    for (const chunk of chunks) {
                        const snap = await window.getDocs(window.query(window.collection(window.db, 'exams'),
                            window.where('subjectId', 'in', chunk)));
                        snap.forEach(d => examDocs.push(d));
                    }
                    const examsSnap = { forEach: (cb) => examDocs.forEach(cb), docs: examDocs };
                    const importSelect = document.getElementById('importExamSelect');

                    if (importSelect) importSelect.innerHTML = '<option value="">Choose exam</option>';

                    examsSnap.forEach(docSnap => {
                        const data = docSnap.data();
                        if (data.status !== 'FINALIZED') {
                            const option = document.createElement('option');
                            option.value = docSnap.id;
                            option.textContent = data.name;
                            examSelect.appendChild(option);
                            if (importSelect) {
                                const importOption = document.createElement('option');
                                importOption.value = docSnap.id;
                                importOption.textContent = data.name;
                                importSelect.appendChild(importOption);
                            }
                        }
                    });
                }

                // BUG-06 FIX: Show helpful message when exam dropdown has no active exams
                if (examSelect && examSelect.options.length <= 1) {
                    const noExamOpt = document.createElement('option');
                    noExamOpt.value = '';
                    noExamOpt.disabled = true;
                    noExamOpt.textContent = '— No active exams available —';
                    examSelect.appendChild(noExamOpt);
                }

                // Load Question Assignments
                const qList = document.getElementById('teacherQuestionAssignmentsList');
                if (qList) {
                    const qSnap = await window.getDocs(window.query(
                        window.collection(window.db, 'teacher_question_assignments'),
                        window.where('teacherEmail', '==', window.currentUser.email)
                    ));
                    qList.innerHTML = '';
                    if (qSnap.empty) {
                        qList.innerHTML = '<tr><td colspan="6" style="text-align:center;">No question sets assigned yet.</td></tr>';
                    } else {
                        qSnap.forEach(d => {
                            const qa = d.data();
                            const row = qList.insertRow();
                            row.innerHTML = `
                                <td><strong>${qa.subjectId}</strong></td>
                                <td>${qa.assignmentDate}</td>
                                <td>${qa.units} Units</td>
                                <td>${qa.totalQuestions} Questions</td>
                                <td><span class="badge badge-success">Assigned</span></td>
                                <td><button class="btn btn-info btn-sm" onclick="viewQuestionAssignment('${d.id}')">View Questions</button></td>
                            `;
                        });
                    }
                }
            } catch (error) {
                tbody.innerHTML = '<tr><td colspan="4">Error loading data: ' + error.message + '</td></tr>';
                showToast('Error loading dashboard: ' + error.message, 'danger');
            }
        }
        async function loadTeacherExamsDropdown() {
            const subjectId = document.getElementById('teacherSubjectSelect').value;
            const examSelect = document.getElementById('teacherExamSelect');
            const formDiv = document.getElementById('evaluationForm');
            if (!subjectId) {
                examSelect.innerHTML = '<option value="">Choose Exam</option>';
                if (formDiv) formDiv.innerHTML = '';
                return;
            }
            examSelect.innerHTML = '<option value="">Loading...</option>';
            try {
                const examsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'exams'),
                    window.where('subjectId', '==', subjectId)
                ));
                examSelect.innerHTML = '<option value="">Choose Exam</option>';
                examsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    const option = document.createElement('option');
                    option.value = docSnap.id;
                    option.textContent = data.name + (data.status === 'FINALIZED' ? ' [Finalized]' : '');
                    examSelect.appendChild(option);
                });
                if (examsSnap.empty) {
                    examSelect.innerHTML = '<option value="">No exams for this subject</option>';
                }
            } catch (error) {
                examSelect.innerHTML = '<option value="">Error loading exams</option>';
            }
        }
        async function loadTeacherResultsExams() {
            const subjectId = document.getElementById('teacherResultsSubject').value;
            const examSelect = document.getElementById('teacherResultsExam');
            const container = document.getElementById('teacherResultsContainer');

            if (!subjectId) {
                examSelect.innerHTML = '<option value="">Select Subject First</option>';
                container.innerHTML = '';
                return;
            }

            examSelect.innerHTML = '<option value="">Loading...</option>';

            try {
                const examsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'exams'),
                    window.where('subjectId', '==', subjectId)
                ));

                examSelect.innerHTML = '<option value="">Select Exam</option>';

                examsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    const option = document.createElement('option');
                    option.value = docSnap.id;
                    option.textContent = data.name + (data.status === 'FINALIZED' ? ' [Finalized]' : '');
                    examSelect.appendChild(option);
                });

                if (examsSnap.empty) {
                    examSelect.innerHTML = '<option value="">No exams found for this subject</option>';
                }
            } catch (error) {
                examSelect.innerHTML = '<option value="">Error loading exams</option>';
            }
        }
        function toggleStudent(studentId) {
            const content = document.getElementById(studentId);
            if (!content) return;
            const arrow = document.getElementById('arrow-' + studentId);

            if (content.style.display === 'none') {
                content.style.display = 'block';
                if (arrow) arrow.style.transform = 'rotate(90deg)';
            } else {
                content.style.display = 'none';
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        }

        // -- EVAL CACHE: exam doc cached so save doesn't re-fetch each time --
        _evalExamCache = {};

        function markAsModified(studentId) {
            const statusBadge = document.getElementById('status-student-' + studentId);
            if (statusBadge && statusBadge.textContent !== 'Saving...') {
                statusBadge.className = 'badge badge-warning';
                statusBadge.textContent = 'Modified';
            }
        }

        function toggleAbsent(studentId, examId, examType) {
            const exData = _evalExamCache[examId];
            if (exData && (exData.status === 'FINALIZED' || exData.teacherFinalized)) {
                showToast('This evaluation is finalized and locked.', 'warning');
                return;
            }
            const card = document.getElementById('student-' + studentId);
            const btn = document.getElementById('absent-btn-' + studentId);
            const badge = document.getElementById('status-student-' + studentId);

            if (!btn) {
                console.warn('Absent button not found for student:', studentId);
                return;
            }
            if (!badge) {
                console.warn('Status badge not found for student:', studentId);
                // We create a dummy or just ignore
            }

            const isAbsent = btn.dataset.absent === '1';
            if (isAbsent) {
                btn.dataset.absent = '0';
                btn.textContent = 'Mark Absent';
                btn.className = 'btn btn-warning btn-sm';
                if (card) card.style.opacity = '1';
                if (badge) { badge.className = 'badge badge-warning'; badge.textContent = 'Modified'; }
                if (card) card.querySelectorAll('input').forEach(i => i.disabled = false);
            } else {
                btn.dataset.absent = '1';
                btn.textContent = 'Absent';
                btn.className = 'btn btn-danger btn-sm';
                if (card) card.style.opacity = '0.45';
                if (badge) { badge.className = 'badge badge-secondary'; badge.textContent = 'Absent'; }
                if (card) card.querySelectorAll('input').forEach(i => { i.disabled = true; i.value = ''; });
                saveStudentEvaluation(studentId, examId, examType);
            }
        }

        async function saveStudentEvaluation(studentId, examId, examType) {
            try {
                const statusBadge = document.getElementById('status-student-' + studentId);
                
                let examData = _evalExamCache[examId];
                if (!examData) {
                    const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                    examData = examDoc.data();
                    _evalExamCache[examId] = examData;
                }

                if (examData.status === 'FINALIZED' || examData.teacherFinalized) {
                    showToast('This evaluation is finalized and locked.', 'warning');
                    return;
                }

                if (statusBadge) { statusBadge.className = 'badge badge-info'; statusBadge.textContent = 'Saving...'; }

                const absentBtn = document.getElementById('absent-btn-' + studentId);
                const isAbsent = absentBtn && absentBtn.dataset.absent === '1';

                let marks = [], coMarks = {}, totalMarks = 0, allFilled = true, coAttainment = [];

                if (isAbsent) {
                    marks = examType === 'standard' ? (examData.criteria || []).map(() => null) : [];
                    if (examType === 'ca') {
                        (examData.courseOutcomes || []).forEach((co, coIdx) => {
                            (co.criteria || []).forEach((c, cIdx) => { coMarks[`CO${coIdx + 1}_C${cIdx + 1}`] = null; });
                        });
                    }
                    allFilled = false;
                } else if (examType === 'standard') {
                    examData.criteria.forEach((criterion, idx) => {
                        const input = document.querySelector(`#input-${studentId}-${idx}`);
                        const val = input?.value;
                        if (val === '' || val == null) { marks.push(null); allFilled = false; }
                        else { 
                            const m = parseFloat(val); 
                            if (m < 0) { showToast(`Marks cannot be negative. Student: ${studentId}`, 'danger'); throw new Error('Negative marks'); }
                            if (m > criterion.maxMarks) { showToast(`Marks for ${criterion.name} exceed max (${criterion.maxMarks}). Student: ${studentId}`, 'danger'); throw new Error('Marks exceeded'); }
                            marks.push(m); totalMarks += m; 
                        }
                    });
                } else {
                    examData.courseOutcomes.forEach((co, coIdx) => {
                        co.criteria.forEach((c, cIdx) => {
                            const input = document.querySelector(`#input-${studentId}-${coIdx}-${cIdx}`);
                            const val = input?.value;
                            const key = `CO${coIdx + 1}_C${cIdx + 1}`;
                            if (val === '' || val == null) { coMarks[key] = null; allFilled = false; }
                            else { 
                                const m = parseFloat(val); 
                                if (m < 0) { showToast(`Marks cannot be negative. student ${studentId}`, 'danger'); throw new Error('Negative marks'); }
                                if (m > c.maxMarks) { showToast(`Marks for ${co.name} exceed max (${c.maxMarks}). Student: ${studentId}`, 'danger'); throw new Error('Marks exceeded'); }
                                coMarks[key] = m; totalMarks += m; 
                            }
                        });
                    });
                }

                const maxTotalMarks = examType === 'standard'
                    ? examData.criteria.reduce((s, c) => s + c.maxMarks, 0)
                    : examData.courseOutcomes.reduce((s, co) => s + co.criteria.reduce((ss, c) => ss + c.maxMarks, 0), 0);

                let finalMarks = totalMarks;
                let criteriaCount = examType === 'standard' ? examData.criteria.length :
                    examData.courseOutcomes.reduce((sum, co) => sum + co.criteria.length, 0);

                if (examType === 'ca' && criteriaCount > 0) {
                    finalMarks = totalMarks / criteriaCount;
                }

                finalMarks = Math.round(finalMarks);

                const percentage = (!isAbsent && maxTotalMarks > 0) ? window.calculatePercentage(finalMarks, maxTotalMarks / (examType === 'ca' ? criteriaCount : 1)) : 0;
                const grade = isAbsent ? 'AB' : calculateGrade(percentage);

                if (!isAbsent && examType === 'ca') {
                    coAttainment = examData.courseOutcomes.map((co, coIdx) => {
                        const coMax = co.criteria.reduce((s, c) => s + c.maxMarks, 0);
                        let coTotal = 0;
                        let coCount = 0;
                        co.criteria.forEach((c, cIdx) => {
                            const key = `CO${coIdx + 1}_C${cIdx + 1}`;
                            if (coMarks[key] != null) {
                                coTotal += coMarks[key];
                                coCount++;
                            }
                        });

                        const coAvg = coCount > 0 ? coTotal / coCount : 0;
                        const coPct = window.calculatePercentage(coAvg, coMax / coCount);
                        return { co: co.name, percentage: Math.round(coPct), status: calculateCOStatus(coPct) };
                    });
                }

                const studentCard = document.querySelector(`.card[data-student="${studentId}"]`);
                const studentDisplayName = studentCard?.querySelector('div[style*="font-weight:700"]')?.textContent?.replace(/\u25B6/g, '').trim() || studentId;
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectData = subjectDoc.data();
                const studentDoc = await window.getDoc(window.doc(window.db, 'students', studentId));
                const studentData = studentDoc.data();

                const resultData = {
                    examId, studentId,
                    studentName: studentDisplayName,
                    enrollment: studentData?.enrollment || studentId, // CRITICAL FIX: Added enrollment for Marksheet Print
                    marks: (examType === 'standard') ? marks : [],
                    coMarks: (examType === 'ca' || examType === 'ese') ? coMarks : {},
                    coAttainment: (examType === 'ca' || examType === 'ese') ? coAttainment : [],
                    totalMarks: isAbsent ? -1 : finalMarks,
                    maxMarks: (examType === 'ca' || examType === 'ese') ? Math.round(maxTotalMarks / criteriaCount) : maxTotalMarks,
                    percentage: isAbsent ? 'AB' : Math.round(percentage),
                    grade,
                    absent: isAbsent || false,
                    status: isAbsent ? 'ABSENT' : (allFilled ? 'COMPLETE' : 'INCOMPLETE'),
                    evaluatedAt: new Date().toISOString(),
                    evaluatedBy: window.currentUser.uid,
                    division: subjectData?.division || '',
                    batch: studentData?.batch || subjectData?.division || '',
                    academicYear: subjectData?.academicYear || '',
                    semester: subjectData?.semester || ''
                };

                // --- LOCAL DATABASE SYNC (As requested in diagram) ---
                const localKey = `evaluator_local_${examId}`;
                let localData = JSON.parse(localStorage.getItem(localKey) || '{}');
                localData[studentId] = { ...resultData, syncStatus: 'LOCAL' };
                localStorage.setItem(localKey, JSON.stringify(localData));

                try {
                    const existingSnap = await window.getDocs(window.query(
                        window.collection(window.db, 'results'),
                        window.where('examId', '==', examId),
                        window.where('studentId', '==', studentId)
                    ));
                    
                    const isOnline = navigator.onLine;

                    if (!existingSnap.empty) {
                        await window.updateDoc(window.doc(window.db, 'results', existingSnap.docs[0].id), resultData);
                    } else {
                        await window.addDoc(window.collection(window.db, 'results'), resultData);
                    }
                    
                    if (isOnline) {
                        // Mark as cloud-saved in local cache
                        localData[studentId].syncStatus = 'CLOUD';
                        localStorage.setItem(localKey, JSON.stringify(localData));
                        if (statusBadge) {
                            statusBadge.className = isAbsent ? 'badge badge-secondary' : 'badge badge-success';
                            statusBadge.textContent = isAbsent ? 'Absent' : 'Saved (Cloud) (Synced)';
                        }
                    } else {
                        if (statusBadge) {
                            statusBadge.className = 'badge badge-warning';
                            statusBadge.textContent = isAbsent ? 'Absent (Queued)' : 'Saved (Local) (Pending Sync)';
                        }
                    }
                    
                    // Auto-scroll to next student for better UX
                    const nextCard = studentCard?.nextElementSibling;
                    if (nextCard && nextCard.classList.contains('card') && nextCard.dataset.student) {
                        setTimeout(() => {
                            nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            const nextSid = nextCard.dataset.student;
                            const nextContent = document.getElementById('student-' + nextSid);
                            if (nextContent && nextContent.style.display === 'none') {
                                toggleStudent('student-' + nextSid);
                            }
                        }, 500);
                    }
                } catch (cloudError) {
                    console.warn('Cloud save failed, data preserved locally:', cloudError);
                    if (statusBadge) {
                        statusBadge.className = 'badge badge-warning';
                        statusBadge.textContent = isAbsent ? 'Absent (Local)' : 'Saved (Local) (Cached)';
                    }
                    showToast('Marks saved locally. Will sync when online.', 'info', 2000);
                }
            } catch (error) {
                const badge = document.getElementById('status-student-' + studentId);
                if (badge) { badge.className = 'badge badge-danger'; badge.textContent = 'Error'; }
                showToast('Error saving ' + studentId + ': ' + error.message, 'danger');
                throw error;
            }
        }

        async function saveAllEvaluations(examId, examType) {
            const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
            if (examDoc.exists() && (examDoc.data().status === 'FINALIZED' || examDoc.data().teacherFinalized)) {
                showToast('This evaluation is finalized and locked.', 'warning');
                return;
            }
            const btn = document.querySelector(`button[onclick*="saveAllEvaluations"]`);
            if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
            const studentIds = new Set();
            document.querySelectorAll('[data-student]').forEach(el => studentIds.add(el.getAttribute('data-student')));

            const results = await Promise.allSettled([...studentIds].map(id => saveStudentEvaluation(id, examId, examType)));
            const saved = results.filter(r => r.status === 'fulfilled').length;
            const errors = results.filter(r => r.status === 'rejected').length;

            if (btn) { btn.disabled = false; btn.textContent = `Save All Students (${studentIds.size} students)`; }
            showToast(`Saved ${saved} student(s)${errors > 0 ? ' | ' + errors + ' error(s)' : ''}`, errors > 0 ? 'warning' : 'success');
        }

        async function loadExistingEvaluations(examId, examType) {
            try {
                const resultsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'results'),
                    window.where('examId', '==', examId)
                ));
                resultsSnap.forEach(doc => {
                    const result = doc.data();
                    const sid = result.studentId;
                    const badge = document.getElementById('status-student-' + sid);
                    const absentBtn = document.getElementById('absent-btn-' + sid);
                    const card = document.getElementById('student-' + sid);

                    if (result.absent) {
                        if (absentBtn) { absentBtn.dataset.absent = '1'; absentBtn.textContent = 'Absent'; absentBtn.className = 'btn btn-danger btn-sm'; }
                        if (card) { card.style.opacity = '0.45'; card.querySelectorAll('input').forEach(i => i.disabled = true); }
                        if (badge) { badge.className = 'badge badge-secondary'; badge.textContent = 'Absent'; }
                        return;
                    }
                    if (badge) { badge.className = 'badge badge-success'; badge.textContent = 'Saved'; }
                    if (examType === 'standard' && result.marks) {
                        result.marks.forEach((mark, idx) => {
                            const input = document.querySelector(`#input-${sid}-${idx}`);
                            if (input && mark !== null) input.value = mark;
                        });
                    } else if ((examType === 'ca' || examType === 'ese') && result.coMarks) {
                        Object.keys(result.coMarks).forEach(key => {
                            const match = key.match(/CO(\d+)_C(\d+)/);
                            if (match) {
                                const coIdx = parseInt(match[1]) - 1;
                                const cIdx = parseInt(match[2]) - 1;
                                const input = document.querySelector(`#input-${sid}-${coIdx}-${cIdx}`);
                                if (input && result.coMarks[key] !== null) input.value = result.coMarks[key];
                            }
                        });
                    }
                });
            } catch (e) { }
        }

        async function loadEvaluationForm() {
            _evalExamCache = {};
            const examId = document.getElementById('teacherExamSelect').value;
            const formDiv = document.getElementById('evaluationForm');
            if (!examId) { formDiv.innerHTML = ''; return; }
            
            formDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading evaluation...</div>';
            
            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { formDiv.innerHTML = 'Exam not found'; return; }
                const examData = examDoc.data();
                _evalExamCache[examId] = examData;

                const teacherSnap = await window.getDocs(window.query(window.collection(window.db, 'teacher_assignments'), 
                    window.where('teacherEmail', '==', window.currentUser.email)));
                
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                if (!subjectDoc.exists()) { formDiv.innerHTML = 'Subject not found'; return; }
                const sd = subjectDoc.data();

                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'), 
                    window.where('class', '==', sd.class), window.where('division', '==', sd.division)));
                const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'), 
                    window.where('examId', '==', examId)));
                
                const resultsMap = {};
                resultsSnap.forEach(d => resultsMap[d.data().studentId] = d.data());

                let html = `<div style="background:var(--bg-surface);padding:15px;border-radius:10px;border:1px solid var(--border);margin-bottom:20px;">
                    <h4 style="margin:0;">${examData.name}</h4>
                    <p style="margin:0;font-size:12px;color:var(--text-muted);">${sd.name} | ${sd.class}-${sd.division}</p>
                </div>`;

                studentsSnap.docs.forEach(studentDoc => {
                    const student = studentDoc.data();
                    const sid = studentDoc.id;
                    const res = resultsMap[sid];
                    const isAbsent = res?.absent === true;

                    html += `<div class="card" style="margin-bottom:10px;padding:0;border-left:5px solid ${isAbsent?'#ef4444':(res?'#22c55e':'#e5e7eb')};" data-student="${sid}">
                        <div onclick="toggleStudent('student-${sid}')" style="padding:15px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-weight:700;">
                                     <span id="arrow-student-${sid}" style="display:inline-block;transition:transform 0.3s;margin-right:8px;">\u25B6</span> 
                                    ${sanitizeString(student.name)}
                                </div>
                                <div style="font-size:11px;color:var(--text-muted);">${student.enrollment}</div>
                            </div>
                            <span id="status-student-${sid}" class="badge ${res?(isAbsent?'badge-danger':'badge-success'):'badge-secondary'}">${res?(isAbsent?'Absent':'Saved'):'Pending'}</span>
                        </div>
                        <div id="student-${sid}" style="display:none;padding:15px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                            <div style="display:flex;gap:10px;margin-bottom:15px;">
                                <button id="absent-btn-${sid}" data-absent="${isAbsent?'1':'0'}" class="btn btn-sm ${isAbsent?'btn-danger':'btn-secondary'}" onclick="toggleAbsent('${sid}','${examId}','${examData.examType}')">${isAbsent?'Marked Absent':'Mark Absent'}</button>
                                <button class="btn btn-success btn-sm" onclick="saveStudentEvaluation('${sid}','${examId}','${examData.examType}')">Save Marks</button>
                            </div>`;

                    if(examData.examType === 'ca' || examData.examType === 'ese') {
                        html += `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">`;
                        examData.courseOutcomes.forEach((co, cidx) => {
                            const val = res?.coMarks?.[`CO${cidx+1}_C1`] || '';
                            html += `<div style="text-align:center;">
                                <label style="font-size:10px;font-weight:700;display:block;">${co.name}</label>
                                <input type="number" class="eval-input-ca" id="input-${sid}-${cidx}-0" step="0.5" value="${val}"
                                    style="width:100%;text-align:center;padding:8px;border:1px solid #d1d5db;border-radius:8px;">
                                <div style="font-size:9px;color:#6b7280;">Max: ${co.criteria[0]?.maxMarks || 0}</div>
                            </div>`;
                        });
                        html += `</div>`;
                    } else {
                        html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;">`;
                        examData.criteria.forEach((c, idx) => {
                            const val = res?.marks?.[idx] || '';
                            html += `<div>
                                <label style="font-size:11px;display:block;">${c.name}</label>
                                <input type="number" class="eval-input" id="input-${sid}-${idx}" value="${val}" min="0" step="0.5"
                                    style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;">
                            </div>`;
                        });
                        html += `</div>`;
                    }
                    html += `</div></div>`;
                });

                html += `<div style="padding:20px;text-align:center;">
                    <button class="btn btn-success btn-lg" onclick="saveAllEvaluations('${examId}','${examData.examType}')">Save All ${studentsSnap.size} Students</button>
                </div>`;
                
                formDiv.innerHTML = html;
                setTimeout(() => window.setupEvaluationHelpers?.(), 50);

            } catch (error) {
                console.error(error);
                formDiv.innerHTML = '<div class="alert alert-danger">Error: ' + error.message + '</div>';
            }
        }

        async function loadStudentData() {
            const resultsDiv = document.getElementById('studentResults');
            resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading your results...</div>';

            try {
                // BUG-13 FIX: Guard against missing enrollment field to prevent bad Firestore query
                const enrollment = window.currentUser?.enrollment;
                if (!enrollment) {
                    resultsDiv.innerHTML = '<div class="alert alert-warning"><strong>Enrollment number not linked.</strong><br>Your account does not have an enrollment number set. Please contact your coordinator to link your account to a student record.</div>';
                    return;
                }

                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('enrollment', '==', enrollment)));

                if (studentsSnap.empty) {
                    resultsDiv.innerHTML = '<div class="alert alert-warning">No student record found for enrollment <strong>' + enrollment + '</strong>. Please contact your coordinator to ensure your enrollment number matches.</div>';
                    return;
                }

                const studentId = studentsSnap.docs[0].id;
                const studentData = studentsSnap.docs[0].data();
                const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'),
                    window.where('studentId', '==', studentId)));

                if (resultsSnap.empty) {
                    resultsDiv.innerHTML = '<div class="alert alert-info" style="text-align:center;padding:30px;"><h4>No Results Yet</h4><p>Results will appear here once your teacher evaluates your performance.</p></div>';
                    return;
                }
                let totalPercentage = 0;
                let completedExams = 0;
                resultsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.percentage !== undefined) {
                        totalPercentage += data.percentage;
                        completedExams++;
                    }
                });
                const averagePercentage = completedExams > 0 ? (totalPercentage / completedExams).toFixed(2) : 0;

                let html = `
 <div class="alert alert-success" style="margin-bottom:16px;">
<strong>${studentData.name}</strong> | Enrollment: ${studentData.enrollment} | Class: ${studentData.class}-${studentData.division}<br>
<strong>Total Exams:</strong> ${resultsSnap.size} &nbsp;|&nbsp; <strong>Average Score:</strong> ${(isNaN(averagePercentage) ? 0 : averagePercentage)}%
</div>
<div class="table-container"><table><thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Status</th></tr></thead><tbody>`;

                for (const resultDoc of resultsSnap.docs) {
                    const result = resultDoc.data();
                    let examName = result.examId;
                    let subjectName = 'N/A';
                    let totalM = 'N/A';
                    let maxM = 'N/A';
                    try {
                        const examDoc = await window.getDoc(window.doc(window.db, 'exams', result.examId));
                        if (examDoc.exists()) {
                            const examData = examDoc.data();
                            examName = examData.name;
                            maxM = examData.totalMarks || result.maxMarks || 'N/A';
                            const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                            if (subjectDoc.exists()) subjectName = subjectDoc.data().name;
                        }
                    } catch (e) { }
                    const isAbsent = result.absent === true || result.status === 'ABSENT';
                    totalM = isAbsent ? 'AB' : (result.totalMarks !== undefined ? Number(result.totalMarks).toFixed(2) : 'N/A');
                    const pct = isAbsent ? '-' : (result.percentage !== undefined ? (result.percentage != null ? Number(result.percentage).toFixed(2) : '0.00') : 'N/A');
                    const grade = isAbsent ? 'AB' : (result.grade || (result.percentage ? calculateGrade(result.percentage) : 'N/A'));
                    const displayStatus = isAbsent ? 'ABSENT' : (result.finalStatus || result.status || 'INCOMPLETE');

                    html += `
 <tr>
<td><strong>${examName}</strong></td>
<td>${subjectName}</td>
<td>${totalM} / ${maxM}</td>
<td>${pct}%</td>
<td><span class="badge badge-info">${grade}</span></td>
<td><span class="badge badge-${displayStatus === 'ABSENT' ? 'secondary' : displayStatus === 'FINALIZED' ? 'danger' : displayStatus === 'COMPLETE' ? 'success' : 'warning'}">${displayStatus}</span></td>
</tr> `;
                    if (result.coAttainment && result.coAttainment.length > 0) {
                        html += `
 <tr>
<td colspan="6" style="background: #f9fafb; padding: 12px;">
<strong>CO Attainment:</strong>
<div style="margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap;"> `;
                        (result.coAttainment || []).forEach(co => {
                            const color = co.status === 'Strong' ? 'success' : co.status === 'Moderate' ? 'warning' : 'danger';
                            html += `<span class="badge badge-${color}" style="padding:6px 10px;">${co.co}: ${(co.percentage != null ? Number(co.percentage).toFixed(1) : '0.0')}% - ${co.status}</span>`;
                        });
                        html += `</div></td></tr>`;
                    }
                }

                html += '</tbody></table></div>';
                resultsDiv.innerHTML = html;
            } catch (error) {
                resultsDiv.innerHTML = '<div class="alert alert-danger">Error loading results: ' + error.message + '<br><small>Check that your enrollment number is correctly registered.</small></div>';
            }
        }

        function showStudentSection(section, btn) {
            document.querySelectorAll('#studentDashboard .section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('#studentDashboard .nav-btn').forEach(b => b.classList.remove('active'));
            const el = document.getElementById(`studentSection${section.charAt(0).toUpperCase() + section.slice(1)}`);
            if (el) el.classList.add('active');
            if (btn) btn.classList.add('active');
            if (section === 'questions') loadStudentAssignedQuestions();
        }

        async function loadStudentAssignedQuestions() {
            const container = document.getElementById('studentAssignedQuestions');
            if (!container) return;
            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

            try {
                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('enrollment', '==', window.currentUser.enrollment)));
                if (studentsSnap.empty) {
                    container.innerHTML = '<div class="alert alert-warning">No student record found.</div>';
                    return;
                }
                const studentId = studentsSnap.docs[0].id;
                const assignSnap = await window.getDocs(window.query(window.collection(window.db, 'ca_question_assignments'),
                    window.where('studentId', '==', studentId)));

                if (assignSnap.empty) {
                    container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">No question assignments found yet. Assignments are created when the coordinator creates a CA exam.</div>';
                    return;
                }

                let html = '';

                const asnList = assignSnap.docs.map(d => d.data());
                const examDocs = await Promise.all(asnList.map(asn => window.getDoc(window.doc(window.db, 'exams', asn.examId))));
                const subjectDocs = await Promise.all(examDocs.map(ed => ed.exists() ? window.getDoc(window.doc(window.db, 'subjects', ed.data().subjectId)) : Promise.resolve(null)));
                for (let _i = 0; _i < asnList.length; _i++) {
                    const asn = asnList[_i];
                    const examDoc = examDocs[_i];
                    if (!examDoc.exists()) continue;
                    const exam = examDoc.data();
                    const subjectDoc = subjectDocs[_i];
                    const subject = subjectDoc && subjectDoc.exists() ? subjectDoc.data() : {};

                    html += `
 <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px;">
<div style="font-weight:700;font-size:16px;color:#1d4ed8;margin-bottom:4px;"> ${exam.name}</div>
<div style="font-size:13px;color:#6b7280;margin-bottom:12px;">${subject.code || ''} - ${subject.name || 'N/A'}</div> `;

                    const assignments = asn.assignments || {};
                    exam.courseOutcomes?.forEach((co, ci) => {
                        const coKey = `CO${ci + 1}`;
                        const qs = assignments[coKey] || [];
                        html += `
 <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
<div style="font-weight:600;color:#1e40af;margin-bottom:4px;">${co.name} - ${co.description || ''}</div> ${qs.length > 0 ? qs.map((q, qi) => `
 <div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #dbeafe;">
<span style="background:#1d4ed8;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">${qi + 1}</span>
<span style="font-size:14px;color:#1f2937;">${q}</span>
</div> `).join('') : '<div style="font-size:13px;color:#9ca3af;font-style:italic;">No questions assigned for this CO</div>'}
</div> `;
                    });

                    html += `</div>`;
                }

                container.innerHTML = html || '<div class="alert alert-info">No assignments yet.</div>';
            } catch (err) {
                container.innerHTML = '<div class="alert alert-danger">Error: ' + err.message + '</div>';
            }
        }
        function calculateGrade(percentage) {
            if (percentage === 'AB' || percentage === -1) return 'AB';
            const p = parseFloat(percentage);
            if (isNaN(p)) return 'N/A';
            if (p >= 90) return 'A+';
            if (p >= 80) return 'A';
            if (p >= 70) return 'B+';
            if (p >= 60) return 'B';
            if (p >= 50) return 'C';
            if (p >= 40) return 'D';
            return 'F';
        }
        function calculateCOStatus(percentage) {
            if (percentage >= 70) return 'Strong';
            if (percentage >= 50) return 'Moderate';
            return 'Weak';
        }
        async function addClass() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const name = document.getElementById('className').value.trim();
            const code = document.getElementById('classCode').value.trim().toUpperCase();
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;

            if (!name || !code) {
                showToast('Please fill in all fields', "danger");
                return;
            }

            try {
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'classes'),
                    window.where('code', '==', code),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                if (!duplicateCheck.empty) {
                    showToast('This class already exists for this academic session!', "danger");
                    return;
                }

                await window.addDoc(window.collection(window.db, 'classes'), {
                    name,
                    code,
                    academicYear: year,
                    semester,
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString(),
                    isDeleted: false
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ADD_CLASS',
                    className: name,
                    classCode: code,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString(),
                    academicYear: year,
                    semester: semester
                });

                showToast('Class added successfully!', "success");
                document.getElementById('className').value = '';
                document.getElementById('classCode').value = '';
                loadClassesList();
                loadClassesDropdown();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        async function addDivision() {
            if (!window.currentUser) { showToast('Session expired. Please log in again.', 'danger'); return; }
            const classId = document.getElementById('divisionClass').value;
            const divisionName = document.getElementById('divisionName').value.trim().toUpperCase();
            const teacherEmail = document.getElementById('classTeacherEmail').value.trim();

            if (!classId || !divisionName) {
                showToast('Please fill in required fields', "danger");
                return;
            }

            try {
                const classDoc = await window.getDoc(window.doc(window.db, 'classes', classId));
                const classData = classDoc.data();
                const duplicateCheck = await window.getDocs(window.query(window.collection(window.db, 'divisions'),
                    window.where('classId', '==', classId),
                    window.where('name', '==', divisionName)));

                if (!duplicateCheck.empty) {
                    showToast('This division already exists for this class!', "danger");
                    return;
                }

                await window.addDoc(window.collection(window.db, 'divisions'), {
                    classId,
                    className: classData.name,
                    classCode: classData.code,
                    name: divisionName,
                    classTeacher: teacherEmail || null,
                    academicYear: classData.academicYear,
                    semester: classData.semester,
                    createdBy: window.currentUser.uid,
                    createdAt: new Date().toISOString(),
                    isDeleted: false
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'ADD_DIVISION',
                    className: classData.name,
                    divisionName: divisionName,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString(),
                    academicYear: classData.academicYear,
                    semester: classData.semester
                });

                showToast('Division added successfully!', "success");
                document.getElementById('divisionName').value = '';
                document.getElementById('classTeacherEmail').value = '';
                loadClassesList();
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        async function loadClassesDropdown() {
            const select = document.getElementById('divisionClass');
            if (!select) return;

            select.innerHTML = '<option value="">Select class</option>';

            try {
                const year = document.getElementById('academicYear').value;
                const semester = document.getElementById('semester').value;
                const snapshot = await window.getDocs(window.query(window.collection(window.db, 'classes'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (!data.isDeleted) {
                        const option = document.createElement('option');
                        option.value = docSnap.id;
                        option.textContent = `${data.code} - ${data.name}`;
                        select.appendChild(option);
                    }
                });
            } catch (error) { }
        }
        async function loadClassesList() {
            const container = document.getElementById('classesList');
            if (!container) return;

            container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading classes...</div>';

            try {
                const year = document.getElementById('academicYear').value;
                const semester = document.getElementById('semester').value;
                const classesSnap = await window.getDocs(window.query(window.collection(window.db, 'classes'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                if (classesSnap.empty) {
                    container.innerHTML = '<p style="color: #6b7280;">No classes created yet</p>';
                    return;
                }

                let html = '';

                for (const classDoc of classesSnap.docs) {
                    const classData = classDoc.data();
                    if (classData.isDeleted) continue;
                    const divisionsSnap = await window.getDocs(window.query(window.collection(window.db, 'divisions'),
                        window.where('classId', '==', classDoc.id)));
                    const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                        window.where('class', '==', classData.code)));

                    html += `
 <div class="card" style="background: #f9fafb; margin-bottom: 16px;">
<h4 style="color: var(--primary); margin-bottom: 12px;"> ${classData.code} - ${classData.name}
 <span class="badge badge-info" style="margin-left: 8px;">${studentsSnap.size} students</span>
</h4>
<div style="margin-top: 12px;">
<strong>Divisions:</strong> `;

                    if (divisionsSnap.empty) {
                        html += '<p style="color: #6b7280; margin-left: 16px;">No divisions added yet</p>';
                    } else {
                        html += '<table style="margin-top: 8px;"><thead><tr><th>Division</th><th>Class Teacher</th><th>Students</th></tr></thead><tbody>';

                        for (const divDoc of divisionsSnap.docs) {
                            const divData = divDoc.data();
                            if (divData.isDeleted) continue;

                            const divStudents = await window.getDocs(window.query(window.collection(window.db, 'students'),
                                window.where('class', '==', classData.code),
                                window.where('division', '==', divData.name)));

                            html += `
 <tr>
<td><strong>${divData.name}</strong></td>
<td>${divData.classTeacher || '-'}</td>
<td><span class="badge badge-success">${divStudents.size}</span></td>
</tr> `;
                        }

                        html += '</tbody></table>';
                    }

                    html += `
</div>
</div> `;
                }

                container.innerHTML = html;
            } catch (error) {
                container.innerHTML = '<p style="color: #ef4444;">Error loading classes</p>';
            }
        }
        async function exportClassesExcel() {
            try {
                const year = document.getElementById('academicYear').value;
                const semester = document.getElementById('semester').value;
                const classesSnap = await window.getDocs(window.query(window.collection(window.db, 'classes'),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', semester)));

                if (classesSnap.empty) {
                    showToast('No classes to export', "warning");
                    return;
                }

                const data = [];

                for (const classDoc of classesSnap.docs) {
                    const classData = classDoc.data();
                    if (classData.isDeleted) continue;

                    const divisionsSnap = await window.getDocs(window.query(window.collection(window.db, 'divisions'),
                        window.where('classId', '==', classDoc.id)));

                    if (divisionsSnap.empty) {
                        data.push({
                            'Class Code': classData.code,
                            'Class Name': classData.name,
                            'Division': '-',
                            'Class Teacher': '-',
                            'Students Count': 0,
                            'Academic Year': classData.academicYear,
                            'Semester': classData.semester
                        });
                    } else {
                        for (const divDoc of divisionsSnap.docs) {
                            const divData = divDoc.data();
                            if (divData.isDeleted) continue;

                            const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                                window.where('class', '==', classData.code),
                                window.where('division', '==', divData.name)));

                            data.push({
                                'Class Code': classData.code,
                                'Class Name': classData.name,
                                'Division': divData.name,
                                'Class Teacher': divData.classTeacher || '-',
                                'Students Count': studentsSnap.size,
                                'Academic Year': classData.academicYear,
                                'Semester': classData.semester
                            });
                        }
                    }
                }

                exportToExcel(data, `classes_${year}_${semester}_${Date.now()}`, 'Classes');
            } catch (error) {
                showToast('Error exporting classes: ' + error.message, 'danger');
            }
        }

        function downloadCSV(filename, csvContent) {
            console.warn('downloadCSV is deprecated. Please use exportToExcel()');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        function escapeCSV(field) {
            if (field === null || field === undefined) return '';
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }
        async function deleteUserFromManage(userId, email) {
            if (!confirm('Permanently delete user ' + email + '? This cannot be undone.')) return;
            try {
                await window.deleteDoc(window.doc(window.db, 'users', userId));
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'DELETE_USER',
                    userEmail: email,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });
                showToast('User ' + email + ' deleted.', 'success');
                loadAllUsers();
                loadHODData();
            } catch (error) {
                showToast('Error deleting user: ' + error.message, 'danger');
            }
        }
        async function downloadBlankTemplate() {
            const examId = document.getElementById('importExamSelect').value;

            if (!examId) {
                showToast('Please select an exam first', "danger");
                return;
            }

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) {
                    showToast('Exam not found', "danger");
                    return;
                }

                const examData = examDoc.data();
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};
                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('class', '==', subjectData.class),
                    window.where('division', '==', subjectData.division)));

                if (studentsSnap.empty) {
                    showToast('No students found for this exam', "warning");
                    return;
                }
                let csv = 'Enrollment,Name';

                if (examData.examType === 'standard') {
                    examData.criteria.forEach(criterion => {
                        csv += `,${escapeCSV(criterion.name)} (Max: ${criterion.maxMarks})`;
                    });
                } else if (examData.examType === 'ca') {
                    examData.courseOutcomes.forEach(co => {
                        co.criteria.forEach(criterion => {
                            csv += `,${co.name}-${criterion.name} (Max: ${criterion.maxMarks})`;
                        });
                    });
                }
                csv += '\n';
                studentsSnap.forEach(docSnap => {
                    const student = docSnap.data();
                    csv += `${student.enrollment},${escapeCSV(sanitizeString(student.name, 100))}`;
                    if (examData.examType === 'standard') {
                        examData.criteria.forEach(() => csv += ',');
                    } else if (examData.examType === 'ca') {
                        examData.courseOutcomes.forEach(co => {
                            co.criteria.forEach(() => csv += ',');
                        });
                    }
                    csv += '\n';
                });

                (function () { const _wb = XLSX.utils.book_new(); const _rows = csv.trim().split('\n').map(r => r.split(',')); XLSX.utils.book_append_sheet(_wb, XLSX.utils.aoa_to_sheet(_rows), 'Data'); XLSX.writeFile(_wb, `template_${examData.name}_${Date.now()}.xlsx`); })();
                showToast('Blank template downloaded!\n\nFill in the marks and upload to import.', "success");
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        async function downloadCoordBlankTemplate() {
            const examId = document.getElementById('coordImportExamSelect').value;

            if (!examId) {
                showToast('Please select an exam first', "danger");
                return;
            }

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) {
                    showToast('Exam not found', "danger");
                    return;
                }

                const examData = examDoc.data();
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};

                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('class', '==', subjectData.class),
                    window.where('division', '==', subjectData.division)));

                if (studentsSnap.empty) {
                    showToast('No students found for this exam', "warning");
                    return;
                }

                let csv = 'Enrollment,Name';

                if (examData.examType === 'standard') {
                    examData.criteria.forEach(criterion => {
                        csv += `,${escapeCSV(criterion.name)} (Max: ${criterion.maxMarks})`;
                    });
                } else if (examData.examType === 'ca') {
                    examData.courseOutcomes.forEach(co => {
                        co.criteria.forEach(criterion => {
                            csv += `,${co.name}-${criterion.name} (Max: ${criterion.maxMarks})`;
                        });
                    });
                }
                csv += '\n';

                studentsSnap.forEach(docSnap => {
                    const student = docSnap.data();
                    csv += `${student.enrollment},${escapeCSV(sanitizeString(student.name, 100))}`;

                    if (examData.examType === 'standard') {
                        examData.criteria.forEach(() => csv += ',');
                    } else if (examData.examType === 'ca') {
                        examData.courseOutcomes.forEach(co => {
                            co.criteria.forEach(() => csv += ',');
                        });
                    }
                    csv += '\n';
                });

                (function () { const _wb = XLSX.utils.book_new(); const _rows = csv.trim().split('\n').map(r => r.split(',')); XLSX.utils.book_append_sheet(_wb, XLSX.utils.aoa_to_sheet(_rows), 'Data'); XLSX.writeFile(_wb, `template_${examData.name}_${Date.now()}.xlsx`); })();
                showToast('Blank template downloaded!\n\nFill in the marks and upload to import.', "success");
            } catch (error) {
                showToast('Error: ' + error.message, 'danger');
            }
        }
        async function loadCoordinatorsDropdown() {
            const select = document.getElementById('coordEmail');
            if (!select) return;

            try {
                // BUG-08 FIX: Filter coordinators by HOD's department so cross-dept assignment is prevented
                const hodDept = window.currentUser?.department || window.currentUser?.departmentId;
                let q = window.query(
                    window.collection(window.db, 'users'),
                    window.where('role', '==', 'coordinator'),
                    window.where('approved', '==', true)
                );
                if (hodDept) {
                    q = window.query(
                        window.collection(window.db, 'users'),
                        window.where('role', '==', 'coordinator'),
                        window.where('approved', '==', true),
                        window.where('department', '==', hodDept)
                    );
                }
                const snapshot = await window.getDocs(q);

                select.innerHTML = '<option value="">Select Coordinator</option>';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const option = document.createElement('option');
                    option.value = data.email;
                    option.textContent = `${data.name} (${data.email}) - ${data.department || 'No Dept'}`;
                    select.appendChild(option);
                });
            } catch (error) { /* silent */ }
        }
        async function loadTeachersDropdown() {
            const select = document.getElementById('assignTeacherEmail');
            if (!select) return;

            try {
                // BUG-07 FIX: Filter teachers by coordinator's department to prevent cross-dept assignments
                const coordDept = window.currentUser?.department || window.currentUser?.departmentId;
                let q = window.query(
                    window.collection(window.db, 'users'),
                    window.where('role', '==', 'teacher'),
                    window.where('approved', '==', true)
                );
                if (coordDept) {
                    q = window.query(
                        window.collection(window.db, 'users'),
                        window.where('role', '==', 'teacher'),
                        window.where('approved', '==', true),
                        window.where('department', '==', coordDept)
                    );
                }
                const snapshot = await window.getDocs(q);

                select.innerHTML = '<option value="">Select Teacher</option>';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const option = document.createElement('option');
                    option.value = data.email;
                    option.textContent = `${data.name} (${data.email}) - ${data.department || 'No Dept'}`;
                    select.appendChild(option);
                });
            } catch (error) { /* silent */ }
        }
        function fillCoordinatorEmail() {
            const select = document.getElementById('coordEmail');
            const manual = document.getElementById('coordEmailManual');
            if (select && manual && select.value) {
                manual.value = select.value;
            }
        }

        function fillTeacherEmail() {
            const select = document.getElementById('assignTeacherEmail');
            const manual = document.getElementById('assignTeacherEmailManual');
            if (select && manual && select.value) {
                manual.value = select.value;
            }
        }
        async function loadAllStudentsResults() {
            const coordExamId = document.getElementById('resultsExam')?.value;
            const teacherExamId = document.getElementById('teacherResultsExam')?.value;
            const examId = teacherExamId || coordExamId;
            const container = teacherExamId
                ? document.getElementById('teacherResultsContainer')
                : document.getElementById('resultsTable');
            if (!examId || !container) {
                if (container) container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">Please select an exam to view results</p>';
                return;
            }

            container.innerHTML = '<div style="padding: 20px; text-align: center;"><div class="spinner"></div>Loading all students...</div>';

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) {
                    container.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Exam not found</p>';
                    return;
                }
                const examData = examDoc.data();
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};
                if (!subjectData.class) {
                    container.innerHTML = '<div class="alert alert-warning">Subject class/division data is missing. Please check the subject configuration.</div>';
                    return;
                }
                let studentsSnap;
                if (subjectData.division) {
                    studentsSnap = await window.getDocs(window.query(
                        window.collection(window.db, 'students'),
                        window.where('class', '==', subjectData.class),
                        window.where('division', '==', subjectData.division)
                    ));
                } else {
                    studentsSnap = await window.getDocs(window.query(
                        window.collection(window.db, 'students'),
                        window.where('class', '==', subjectData.class)
                    ));
                }
                const resultsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'results'),
                    window.where('examId', '==', examId)
                ));
                const resultsMap = {};
                resultsSnap.forEach(doc => {
                    const data = doc.data();
                    resultsMap[data.studentId] = data;
                });
                let html = `
 <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
<div>
<strong>Subject:</strong> ${subjectData.name || 'N/A'} | 
 <strong>Class:</strong> ${subjectData.class || 'N/A'}-${subjectData.division || 'N/A'} | 
 <strong>Total Students:</strong> ${studentsSnap.size}
</div>
<button class="btn btn-success btn-sm" onclick="exportAllStudentsResultsCSV('${examId}')">Export All Results to CSV</button>
</div>
<table>
<thead>
<tr>
<th>Sr. No.</th>
<th>Roll No.</th>
<th>Enrollment</th>
<th>Student Name</th>
<th>Email</th>
<th>Phone</th>`;

                if (examData.examType === 'ca') {
                    examData.courseOutcomes.forEach((co, idx) => {
                        html += `<th>${co.name}<br>Average</th>`;
                    });
                    html += `<th>Overall<br>Average</th><th>Status</th>`;
                } else {
                    examData.criteria.forEach(c => {
                        html += `<th>${c.name}<br>(Max: ${c.maxMarks})</th>`;
                    });
                    html += `<th>Total<br>Marks</th><th>Status</th>`;
                }

                html += `</tr></thead><tbody>`;

                let srNo = 1;
                studentsSnap.forEach(studentDoc => {
                    const student = studentDoc.data();
                    const result = resultsMap[studentDoc.id];

                    html += `<tr>
<td>${srNo}</td>
<td>${student.rollNo || '-'}</td>
<td>${student.enrollment}</td>
<td style="font-weight: 500;">${sanitizeString(student.name)}</td>
<td style="font-size: 12px;">${student.email || '-'}</td>
<td style="font-size: 12px;">${student.phone || '-'}</td>`;

                    if (result) {
                        if (result.absent) {
                            const absCols = examData.examType === 'ca' ? (examData.courseOutcomes?.length || 0) + 1 : (examData.criteria?.length || 0) + 1;
                            html += `<td colspan="${absCols}" style="text-align:center;background:#f3f4f6;color:#6b7280;font-style:italic;">Absent</td>`;
                            html += `<td><span class="badge badge-secondary">ABSENT</span></td>`;
                        } else if (examData.examType === 'ca') {
                            examData.courseOutcomes.forEach((co, coIdx) => {
                                const coAvg = calculateCOAverageForStudent(result, coIdx, examData);
                                html += `<td><strong style="color:#2196f3;">${(coAvg != null ? coAvg.toFixed(2) : '0.00')}</strong></td>`;
                            });
                            html += `<td style="background:#e3f2fd;"><strong style="font-size:16px;color:#1565c0;">${(result.totalMarks != null ? Number(result.totalMarks).toFixed(2) : '0.00')}</strong></td>`;
                            html += `<td><span class="badge badge-${result.status === 'COMPLETE' ? 'success' : 'warning'}">${result.status || 'INCOMPLETE'}</span></td>`;
                        } else {
                            (result.marks || []).forEach(mark => {
                                html += `<td><strong>${mark !== null && mark !== undefined ? mark : '-'}</strong></td>`;
                            });
                            html += `<td style="background:#e8f5e9;"><strong style="font-size:16px;color:#2e7d32;">${(result.totalMarks != null ? Number(result.totalMarks).toFixed(2) : '0.00')}</strong></td>`;
                            html += `<td><span class="badge badge-${result.status === 'COMPLETE' ? 'success' : 'warning'}">${result.status || 'INCOMPLETE'}</span></td>`;
                        }
                    } else {
                        const colspan = examData.examType === 'ca' ? (examData.courseOutcomes?.length || 5) + 2 : (examData.criteria?.length || 0) + 2;
                        html += `<td colspan="${colspan}" style="text-align:center;color:#999;font-style:italic;">Not Evaluated</td>`;
                    }

                    html += `</tr>`;
                    srNo++;
                });

                html += '</tbody></table>';

                if (studentsSnap.empty) {
                    html = `
 <div style="margin-bottom: 15px;">
<button class="btn btn-success btn-sm" onclick="exportAllStudentsResultsCSV('${examId}')">Export All Results to CSV</button>
</div>
<p style="text-align: center; color: #999; padding: 40px;">No students found for this class/division. Please add students first.</p> `;
                }
                container.innerHTML = html;
            } catch (error) {
                container.innerHTML = `
 <div style="padding: 20px;">
<div style="margin-bottom: 15px;">
<button class="btn btn-success btn-sm" onclick="exportAllStudentsResultsCSV('${examId}')">Export All Results to CSV</button>
</div>
<div style="padding: 20px; text-align: center; color: red; background: #fee; border-radius: 8px;">
<h4>Error Loading Results</h4>
<p><strong>${error.message}</strong></p>
<p style="font-size: 12px; color: #666; margin-top: 10px;">Press F12 to open console for details.<br>Common issues: No students added, class/division mismatch, or Firebase connection error.
</p>
</div>
</div> `;
            }
        }
        function calculateCOAverageForStudent(result, coIndex, examData) {
            if (!result.coMarks || examData.examType !== 'ca') return 0;

            let total = 0;
            let count = 0;
            const co = examData.courseOutcomes[coIndex];
            co.criteria.forEach((criterion, caIndex) => {
                const key = `CO${coIndex + 1}_C${caIndex + 1}`;
                if (result.coMarks[key] !== null && result.coMarks[key] !== undefined) {
                    total += result.coMarks[key];
                    count++;
                }
            });

            return count > 0 ? total / count : 0;
        }
        function calculateCAAverageForStudent(result, caIndex, examData) {
            if (!result.coMarks || examData.examType !== 'ca') return 0;

            let total = 0;
            let count = 0;
            examData.courseOutcomes.forEach((co, coIdx) => {
                const key = `CO${coIdx + 1}_C${caIndex + 1}`;
                if (result.coMarks[key] !== null && result.coMarks[key] !== undefined) {
                    total += result.coMarks[key];
                    count++;
                }
            });

            return count > 0 ? total / count : 0;
        }
        async function exportAllStudentsResultsCSV(examId) {
            if (!examId) {
                showToast('Please select an exam first', "warning");
                return;
            }

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                const examData = examDoc.data();
                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectData = subjectDoc.exists() ? subjectDoc.data() : {};

                let studentsSnap;
                if (subjectData.division) {
                    studentsSnap = await window.getDocs(window.query(
                        window.collection(window.db, 'students'),
                        window.where('class', '==', subjectData.class),
                        window.where('division', '==', subjectData.division)
                    ));
                } else {
                    studentsSnap = await window.getDocs(window.query(
                        window.collection(window.db, 'students'),
                        window.where('class', '==', subjectData.class)
                    ));
                }

                const resultsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'results'),
                    window.where('examId', '==', examId)
                ));

                const resultsMap = {};
                resultsSnap.forEach(doc => {
                    const data = doc.data();
                    resultsMap[data.studentId] = data;
                });
                let csv = 'Sr. No.,Roll No.,Enrollment,Student Name,Email,Phone,';

                if (examData.examType === 'ca') {
                    examData.courseOutcomes.forEach((co, idx) => {
                        csv += `${co.name} Average,`;
                    });
                    csv += 'Overall Average,Status\n';
                } else {
                    examData.criteria.forEach(c => {
                        csv += `${escapeCSV(c.name)} (Max ${c.maxMarks}),`;
                    });
                    csv += 'Total Marks,Status\n';
                }
                let srNo = 1;
                studentsSnap.forEach(studentDoc => {
                    const student = studentDoc.data();
                    const result = resultsMap[studentDoc.id];

                    csv += `${srNo},${student.rollNo || ''},${student.enrollment},${escapeCSV(sanitizeString(student.name, 100))},${student.email || ''},${student.phone || ''},`;

                    if (result) {
                        if (result.absent) {
                            const blanks = examData.examType === 'ca' ? (examData.courseOutcomes?.length || 0) + 1 : (examData.criteria?.length || 0) + 1;
                            csv += ','.repeat(blanks) + 'ABSENT';
                        } else if (examData.examType === 'ca') {
                            (examData.courseOutcomes || []).forEach((co, coIdx) => {
                                const coAvg = calculateCOAverageForStudent(result, coIdx, examData);
                                csv += `${(coAvg != null ? coAvg.toFixed(2) : '0.00')},`;
                            });
                            csv += `${(result.totalMarks != null ? Number(result.totalMarks).toFixed(2) : '0.00')},${result.status}`;
                        } else {
                            (result.marks || []).forEach(mark => {
                                csv += `${mark !== null && mark !== undefined ? mark : ''},`;
                            });
                            csv += `${(result.totalMarks != null ? Number(result.totalMarks).toFixed(2) : '0.00')},${result.status}`;
                        }
                    } else {
                        const blanks = examData.examType === 'ca' ? (examData.courseOutcomes?.length || 0) + 1 : (examData.criteria?.length || 0) + 1;
                        csv += ','.repeat(blanks) + 'Not Evaluated';
                    }

                    csv += '\n';
                    srNo++;
                });

                (function () { const _wb = XLSX.utils.book_new(); const _rows = csv.trim().split('\n').map(r => r.split(',')); XLSX.utils.book_append_sheet(_wb, XLSX.utils.aoa_to_sheet(_rows), 'Data'); XLSX.writeFile(_wb, `results_${examData.name}_all_students_${Date.now()}.xlsx`); })();
                showToast('All students results exported successfully!', 'success');
            } catch (error) {
                showToast('Error exporting: ' + error.message, 'danger');
            }
        }

        function getGradeBadgeColor(grade) {
            if (grade === 'A' || grade === 'A+') return 'success';
            if (grade === 'B' || grade === 'B+') return 'info';
            if (grade === 'C') return 'warning';
            return 'danger';
        }

        // TEACHER ACCOUNT MANAGEMENT

        let _teacherAccountCache = []; // { id, name, email, isActive, examRestricted, dept }

        async function loadTeacherAccountList() {
            const hodDiv = document.getElementById('hodTeacherAccountList');
            const ccDiv = document.getElementById('coordTeacherAccountList');
            const loading = '<p style="color:var(--gray-400);padding:16px 0;text-align:center;">Loading...</p>';
            if (hodDiv) hodDiv.innerHTML = loading;
            if (ccDiv) ccDiv.innerHTML = loading;
            try {
                const userDept = window.currentUser?.department || window.currentUser?.departmentId;
                let teacherQuery = window.query(window.collection(window.db, 'users'), window.where('role', '==', 'teacher'));
                if (userDept) {
                    teacherQuery = window.query(window.collection(window.db, 'users'),
                        window.where('role', '==', 'teacher'),
                        window.where('department', '==', userDept));
                }
                const snap = await window.getDocs(teacherQuery);
                _teacherAccountCache = [];
                snap.forEach(d => {
                    const data = d.data();
                    _teacherAccountCache.push({
                        id: d.id,
                        name: data.name || 'Unknown',
                        email: data.email || '',
                        dept: data.department || '',
                        isActive: data.isActive !== false,
                        examRestricted: data.examRestricted === true,
                        approvalStatus: data.approvalStatus || 'pending'
                    });
                });
                _teacherAccountCache.sort((a, b) => a.name.localeCompare(b.name));
                renderTeacherAccountList('');
            } catch (e) {
                const err = '<p style="color:#dc2626;padding:12px;">Error loading teachers: ' + e.message + '</p>';
                if (hodDiv) hodDiv.innerHTML = err;
                if (ccDiv) ccDiv.innerHTML = err;
            }
        }

        function renderTeacherAccountList(filter) {
            const hodDiv = document.getElementById('hodTeacherAccountList');
            const ccDiv = document.getElementById('coordTeacherAccountList');
            const q = (filter || '').toLowerCase().trim();
            const list = q
                ? _teacherAccountCache.filter(t => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.dept.toLowerCase().includes(q))
                : _teacherAccountCache;

            if (list.length === 0) {
                const empty = q
                    ? '<p style="color:var(--gray-400);padding:16px 0;text-align:center;">No teachers match "' + filter + '"</p>'
                    : '<p style="color:var(--gray-400);padding:16px 0;text-align:center;">No teacher accounts found.</p>';
                if (hodDiv) hodDiv.innerHTML = empty;
                if (ccDiv) ccDiv.innerHTML = empty;
                return;
            }

            let on = 0, off = 0, restricted = 0;
            list.forEach(t => { if (t.isActive) on++; else off++; if (t.examRestricted) restricted++; });

            const summary = `<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#6b7280;margin-bottom:12px;padding:8px 12px;background:#f9fafb;border-radius:6px;">
 <span><strong style="color:#16a34a;">${on}</strong> Active</span>
 <span><strong style="color:#dc2626;">${off}</strong> Disabled</span>
 <span><strong style="color:#f59e0b;">${restricted}</strong> Exam-Restricted</span>
 <span style="color:#d1d5db;">|</span>
 <span><strong>${list.length}</strong> Total</span>
 </div>`;

            const cards = list.map(t => {
                const active = t.isActive;
                const examR = t.examRestricted;
                const statusBadge = active
                    ? '<span class="account-status-on">ON</span>'
                    : '<span class="account-status-off">OFF</span>';
                const examBadge = examR
                    ? '<span style="background:#f59e0b;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;font-weight:700;margin-left:4px;">EXAM RESTRICTED</span>'
                    : '';
                return `<div class="teacher-account-card${active ? '' : ' disabled'}">
 <div class="teacher-account-info">
 <strong>${t.name}</strong>
 <span>${t.email}${t.dept ? ' &bull; ' + t.dept : ''}</span>
 </div>
 <div class="teacher-account-actions">
 ${statusBadge}${examBadge}
 <button class="btn btn-sm ${active ? 'btn-off' : 'btn-on'}" onclick="toggleTeacherAccount('${t.id}','${t.email}',${active})">${active ? 'Disable' : 'Enable'}</button>
 </div>
 </div>`;
            }).join('');

            const html = summary + cards;
            if (hodDiv) hodDiv.innerHTML = html;
            if (ccDiv) ccDiv.innerHTML = html;
        }

        function filterTeacherAccountList(context) {
            const inputId = context === 'hod' ? 'hodTeacherSearchInput' : 'coordTeacherSearchInput';
            const val = document.getElementById(inputId)?.value || '';
            renderTeacherAccountList(val);
        }

        async function toggleTeacherAccount(userId, email, currentlyActive) {
            const newState = !currentlyActive;
            try {
                await window.updateDoc(window.doc(window.db, 'users', userId), {
                    isActive: newState,
                    accountToggledBy: window.currentUser.uid,
                    accountToggledByName: window.currentUser.name,
                    accountToggledAt: new Date().toISOString()
                });
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: newState ? 'TEACHER_ACCOUNT_ENABLED' : 'TEACHER_ACCOUNT_DISABLED',
                    targetEmail: email,
                    targetUserId: userId,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    performedByRole: window.currentUser.role,
                    timestamp: new Date().toISOString()
                });
                // Update local cache instantly -- no round trip
                const cached = _teacherAccountCache.find(t => t.id === userId);
                if (cached) cached.isActive = newState;
                const searchHod = document.getElementById('hodTeacherSearchInput')?.value || '';
                const searchCoord = document.getElementById('coordTeacherSearchInput')?.value || '';
                renderTeacherAccountList(searchHod || searchCoord);
                // Refresh allUsersList if visible
                if (document.getElementById('allUsersList')?.closest('.section.active')) loadAllUsers();
                // Refresh teacher assignments table if visible
                if (document.getElementById('teacherAssignmentsList')?.closest('.section.active')) loadTeacherAssignments();
                showToast(`${email} account ${newState ? 'enabled' : 'disabled'}.`, newState ? 'success' : 'warning');
            } catch (e) {
                showToast('Error updating account: ' + e.message, 'danger');
            }
        }

        async function setAllTeacherAccounts(makeActive, btn) {
            if (_teacherAccountCache.length === 0) {
                if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
                await loadTeacherAccountList();
                if (btn) { btn.disabled = false; btn.textContent = makeActive ? 'All Teachers ON' : 'All Teachers OFF'; }
            }
            const label = makeActive ? 'enable ALL teacher accounts' : 'disable ALL teacher accounts';
            if (!confirm(`Are you sure you want to ${label}? This affects ${_teacherAccountCache.length} teacher(s).`)) return;
            if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
            try {
                const updates = _teacherAccountCache.map(t =>
                    window.updateDoc(window.doc(window.db, 'users', t.id), {
                        isActive: makeActive,
                        accountToggledBy: window.currentUser.uid,
                        accountToggledByName: window.currentUser.name,
                        accountToggledAt: new Date().toISOString()
                    })
                );
                await Promise.all(updates);
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: makeActive ? 'ALL_TEACHERS_ENABLED' : 'ALL_TEACHERS_DISABLED',
                    count: _teacherAccountCache.length,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    performedByRole: window.currentUser.role,
                    timestamp: new Date().toISOString()
                });
                _teacherAccountCache.forEach(t => { t.isActive = makeActive; });
                renderTeacherAccountList('');
                if (document.getElementById('allUsersList')?.closest('.section.active')) loadAllUsers();
                if (document.getElementById('teacherAssignmentsList')?.closest('.section.active')) loadTeacherAssignments();
                showToast(`All ${_teacherAccountCache.length} teacher accounts ${makeActive ? 'enabled' : 'disabled'}.`, makeActive ? 'success' : 'warning');
            } catch (e) {
                showToast('Error: ' + e.message, 'danger');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = makeActive ? 'All Teachers ON' : 'All Teachers OFF'; }
            }
        }

        async function setExamPeriodMode(restrict, btn) {
            if (_teacherAccountCache.length === 0) {
                if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
                await loadTeacherAccountList();
                if (btn) { btn.disabled = false; }
            }
            const label = restrict ? 'restrict all teachers for exam period' : 'release exam period restriction';
            if (!confirm(`Are you sure you want to ${label}?`)) return;
            if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
            try {
                const updates = _teacherAccountCache.map(t =>
                    window.updateDoc(window.doc(window.db, 'users', t.id), {
                        examRestricted: restrict,
                        isActive: restrict ? false : (t.examRestricted ? true : t.isActive),
                        accountToggledBy: window.currentUser.uid,
                        accountToggledByName: window.currentUser.name,
                        accountToggledAt: new Date().toISOString()
                    })
                );
                await Promise.all(updates);
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: restrict ? 'EXAM_PERIOD_RESTRICT' : 'EXAM_PERIOD_RELEASE',
                    count: _teacherAccountCache.length,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    performedByRole: window.currentUser.role,
                    timestamp: new Date().toISOString()
                });
                _teacherAccountCache.forEach(t => {
                    if (restrict) {
                        t.isActive = false;
                        t.examRestricted = true;
                    } else {
                        // Only restore teachers that were exam-restricted; leave manually-disabled ones disabled
                        if (t.examRestricted) t.isActive = true;
                        t.examRestricted = false;
                    }
                });
                renderTeacherAccountList('');
                if (document.getElementById('allUsersList')?.closest('.section.active')) loadAllUsers();
                showToast(`Exam period mode ${restrict ? 'activated -- all teachers restricted.' : 'released -- all teachers re-enabled.'}`, restrict ? 'warning' : 'success');
            } catch (e) {
                showToast('Error: ' + e.message, 'danger');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = restrict ? 'Exam Period: Restrict All' : 'Exam Period: Release All'; }
            }
        }

        async function removeTeacherAssignment(assignmentId, teacherEmail) {
            if (!confirm(`Remove ${teacherEmail} from this subject assignment?`)) return;
            try {
                await window.deleteDoc(window.doc(window.db, 'teacher_assignments', assignmentId));
                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'REMOVE_TEACHER_ASSIGNMENT',
                    teacherEmail,
                    assignmentId,
                    performedBy: window.currentUser.uid,
                    performedByName: window.currentUser.name,
                    timestamp: new Date().toISOString()
                });
                showToast('Teacher assignment removed.', 'success');
                loadTeacherAssignments();
                loadTeachersDropdown();
            } catch (e) {
                showToast('Error: ' + e.message, 'danger');
            }
        }

        function showToast(message, type, duration) {
            type = type || 'info';
            duration = (duration === undefined) ? 4000 : duration;
            var container = document.getElementById('toast-container');
            if (!container) return;
            var toast = document.createElement('div');
            toast.className = 'toast ' + type;
            var icons = { success: '&#10003;', danger: '&#10005;', warning: '&#9888;', info: '&#8505;' };
            toast.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.2);animation:_toastSlide .25s ease;margin-bottom:6px;';
            var colors = { success: '#16a34a', danger: '#dc2626', warning: '#d97706', info: '#2563eb' };
            toast.style.background = colors[type] || colors.info;
            toast.innerHTML = '<span style="flex-shrink:0;font-size:15px;">' + (icons[type] || '') + '</span>'
                + '<span style="flex:1;line-height:1.4">' + message + '</span>'
                + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;font-size:18px;line-height:1;padding:0 0 0 8px;flex-shrink:0;">&times;</button>';
            container.appendChild(toast);
            setTimeout(function () {
                if (toast.parentElement) {
                    toast.style.transition = 'opacity .3s,transform .3s';
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(20px)';
                    setTimeout(function () { if (toast.parentElement) toast.remove(); }, 320);
                }
            }, duration);
        }

        // ========================================
        // RESULTS VIEWING & EXPORT FUNCTIONS
        // ========================================

        function showLoader(loaderId) {
            const loader = document.getElementById(loaderId);
            if (loader) loader.style.display = 'flex';
        }

        function hideLoader(loaderId) {
            const loader = document.getElementById(loaderId);
            if (loader) loader.style.display = 'none';
        }

        // HOD: Load Results
        async function loadResultsForHOD() {
            if (!window.currentUser || window.currentUser.role !== 'hod') {
                console.error('Unauthorized: Not HOD');
                return;
            }
            try {
                showLoader('hodResultsLoader');
                const resultsContainer = document.getElementById('hodResultsContainer');
                if (!resultsContainer) {
                    hideLoader('hodResultsLoader');
                    return;
                }
                resultsContainer.innerHTML = '';

                const hodDept = window.currentUser.department || window.currentUser.departmentId;
                if (!hodDept) {
                    showToast('Department not assigned to HOD', 'danger');
                    hideLoader('hodResultsLoader');
                    return;
                }

                // BUG-15 FIX: Compound query + orderBy requires composite index — add fallback
                let examsSnapshot;
                try {
                    const examsQuery = (function () {
                        const yr = document.getElementById('academicYear')?.value || '';
                        const sm = document.getElementById('semester')?.value || '';
                        let q = window.collection(window.db, 'exams');
                        let constraints = [window.where('status', '==', 'FINALIZED')];
                        if (yr) constraints.push(window.where('academicYear', '==', yr));
                        if (sm) constraints.push(window.where('semester', '==', sm));
                        if (hodDept) constraints.push(window.where('department', '==', hodDept));
                        return window.query(q, ...constraints, window.orderBy('createdAt', 'desc'));
                    })();
                    examsSnapshot = await window.getDocs(examsQuery);
                } catch (idxErr) {
                    console.warn('[HOD Results] Missing index, falling back to unordered fetch:', idxErr.message);
                    const yr = document.getElementById('academicYear')?.value || '';
                    const sm = document.getElementById('semester')?.value || '';
                    let q = window.collection(window.db, 'exams');
                    let constraints = [window.where('status', '==', 'FINALIZED')];
                    if (yr) constraints.push(window.where('academicYear', '==', yr));
                    if (sm) constraints.push(window.where('semester', '==', sm));
                    if (hodDept) constraints.push(window.where('department', '==', hodDept));
                    const fallbackSnap = await window.getDocs(window.query(q, ...constraints));
                    const sortedDocs = fallbackSnap.docs.slice().sort((a, b) => {
                        return (b.data().createdAt || '').localeCompare(a.data().createdAt || '');
                    });
                    examsSnapshot = { docs: sortedDocs, empty: sortedDocs.length === 0 };
                }

                if (examsSnapshot.empty) {
                    resultsContainer.innerHTML = '<p class="no-data">No finalized results available in your department.</p>';
                    hideLoader('hodResultsLoader');
                    return;
                }

                const table = document.createElement('table');
                table.className = 'results-table';
                table.innerHTML = `
 <thead>
 <tr>
 <th>Exam Name</th>
 <th>Subject</th>
 <th>Class</th>
 <th>Division</th>
 <th>Type</th>
 <th>Students</th>
 <th>Finalized</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody id="hodResultsTableBody"></tbody>
 `;
                resultsContainer.appendChild(table);

                const tbody = document.getElementById('hodResultsTableBody');
                for (const examDoc of examsSnapshot.docs) {
                    const examData = examDoc.data();
                    const examId = examDoc.id;

                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                    const subjectName = subjectDoc.exists() ? subjectDoc.data().name : 'Unknown';

                    const _subjectDataForRow = subjectDoc.exists() ? subjectDoc.data() : {};
                    const className = _subjectDataForRow.class || 'N/A';
                    const divisionName = _subjectDataForRow.division || 'N/A';

                    const resultsQuery = window.query(
                        window.collection(window.db, 'results'),
                        window.where('examId', '==', examId)
                    );
                    const resultsSnapshot = await window.getDocs(resultsQuery);

                    // BUG FIX: Handle both string and Timestamp types for finalizedAt
                    let finalizedDate = 'N/A';
                    if (examData.finalizedAt) {
                        try {
                            if (typeof examData.finalizedAt === 'string') {
                                finalizedDate = new Date(examData.finalizedAt).toLocaleString();
                            } else if (examData.finalizedAt.toDate) {
                                finalizedDate = examData.finalizedAt.toDate().toLocaleString();
                            }
                        } catch (e) {
                            finalizedDate = 'Invalid Date';
                        }
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
 <td>${examData.name || 'N/A'}</td>
 <td>${subjectName}</td>
 <td>${className}</td>
 <td>${divisionName}</td>
 <td><span class="badge badge-${examData.examType === 'standard' ? 'primary' : 'secondary'}">${examData.examType?.toUpperCase() || 'N/A'}</span></td>
 <td>${resultsSnapshot.size}</td>
 <td>${finalizedDate}</td>
 <td class="action-buttons">
 <button class="btn btn-sm btn-info" onclick="previewEvaluationSubmission('${examId}', true)">Monitor</button>
 <button class="btn btn-sm btn-success" onclick="exportResults('${examId}', 'excel')">Excel</button>
 <button class="btn btn-sm btn-danger" onclick="exportResults('${examId}', 'pdf')">PDF</button>
 </td>
 `;
                    tbody.appendChild(row);
                }
            } catch (error) {
                console.error('Error loading HOD results:', error);
                showToast('Failed to load results: ' + error.message, 'danger');
            } finally {
                // BUG-15 FIX: was using wrong loader ID 'coordinatorResultsLoader' — fixed to 'hodResultsLoader'
                hideLoader('hodResultsLoader');
            }
        }

        // Coordinator: Load Results
        async function loadResultsForCoordinator() {
            if (!window.currentUser || window.currentUser.role !== 'coordinator') {
                console.error('Unauthorized: Not Coordinator');
                return;
            }
            try {
                showLoader('coordinatorResultsLoader');
                const resultsContainer = document.getElementById('coordinatorResultsContainer');
                if (!resultsContainer) {
                    hideLoader('coordinatorResultsLoader');
                    return;
                }
                resultsContainer.innerHTML = '';

                // Load all finalized exams for current academic year/semester
                const coordDept = window.currentUser.department || window.currentUser.departmentId;
                const year = document.getElementById('academicYear')?.value || '';
                const sem = document.getElementById('semester')?.value || '';
                
                // BUG-04 FIX: Compound query + orderBy requires composite index — add in-memory sort fallback
                let examsSnapshot;
                try {
                    const examsQuery = (function() {
                        let q = window.collection(window.db, 'exams');
                        let constraints = [window.where('status', '==', 'FINALIZED')];
                        if (year) constraints.push(window.where('academicYear', '==', year));
                        if (sem) constraints.push(window.where('semester', '==', sem));
                        if (coordDept) constraints.push(window.where('department', '==', coordDept));
                        return window.query(q, ...constraints, window.orderBy('createdAt', 'desc'));
                    })();
                    examsSnapshot = await window.getDocs(examsQuery);
                } catch (idxErr) {
                    console.warn('[Coord Results] Missing index, falling back to unordered fetch:', idxErr.message);
                    let q = window.collection(window.db, 'exams');
                    let constraints = [window.where('status', '==', 'FINALIZED')];
                    if (year) constraints.push(window.where('academicYear', '==', year));
                    if (sem) constraints.push(window.where('semester', '==', sem));
                    if (coordDept) constraints.push(window.where('department', '==', coordDept));
                    const fallbackSnap = await window.getDocs(window.query(q, ...constraints));
                    const sortedDocs = fallbackSnap.docs.slice().sort((a, b) => {
                        return (b.data().createdAt || '').localeCompare(a.data().createdAt || '');
                    });
                    examsSnapshot = { docs: sortedDocs, empty: sortedDocs.length === 0 };
                }
                let allExams = examsSnapshot.docs;

                if (allExams.length === 0) {
                    resultsContainer.innerHTML = '<p class="no-data">No finalized results available for your subjects.</p>';
                    hideLoader('coordinatorResultsLoader');
                    return;
                }

                // BUG-05 FIX: Populate coordinatorResultsClassFilter dropdown with unique class values
                const classFilterSelect = document.getElementById('coordinatorResultsClassFilter');
                if (classFilterSelect) {
                    const existingFilter = classFilterSelect.value;
                    classFilterSelect.innerHTML = '<option value="">All Classes</option>';
                    const uniqueClasses = new Set();
                    // We'll populate after we fetch subjects below — collect them now
                    allExams.forEach(async (examDoc) => {
                        // Populate lazily in the loop below
                    });
                }

                const table = document.createElement('table');
                table.className = 'results-table';
                table.innerHTML = `
 <thead>
 <tr>
 <th>Exam Name</th>
 <th>Subject</th>
 <th>Class</th>
 <th>Division</th>
 <th>Type</th>
 <th>Students</th>
 <th>Finalized</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody id="coordinatorResultsTableBody"></tbody>
 `;
                resultsContainer.appendChild(table);

                const tbody = document.getElementById('coordinatorResultsTableBody');
                const _classSet = new Set(); // BUG-05: collect unique class names for filter
                for (const examDoc of allExams) {
                    const examData = examDoc.data();
                    const examId = examDoc.id;

                    const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                    const subjectName = subjectDoc.exists() ? subjectDoc.data().name : 'Unknown';

                    const _subjectDataForRow = subjectDoc.exists() ? subjectDoc.data() : {};
                    const className = _subjectDataForRow.class || 'N/A';
                    const divisionName = _subjectDataForRow.division || 'N/A';
                    if (className !== 'N/A') _classSet.add(className);

                    const resultsQuery = window.query(
                        window.collection(window.db, 'results'),
                        window.where('examId', '==', examId)
                    );
                    const resultsSnapshot = await window.getDocs(resultsQuery);

                    // BUG FIX: Handle both string and Timestamp types for finalizedAt
                    let finalizedDate = 'N/A';
                    if (examData.finalizedAt) {
                        try {
                            if (typeof examData.finalizedAt === 'string') {
                                finalizedDate = new Date(examData.finalizedAt).toLocaleString();
                            } else if (examData.finalizedAt.toDate) {
                                finalizedDate = examData.finalizedAt.toDate().toLocaleString();
                            }
                        } catch (e) {
                            finalizedDate = 'Invalid Date';
                        }
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
 <td>${examData.name || 'N/A'}</td>
 <td>${subjectName}</td>
 <td>${className}</td>
 <td>${divisionName}</td>
 <td><span class="badge badge-${examData.examType === 'standard' ? 'primary' : 'secondary'}">${examData.examType?.toUpperCase() || 'N/A'}</span></td>
 <td>${resultsSnapshot.size}</td>
 <td>${finalizedDate}</td>
 <td class="action-buttons">
 <button class="btn btn-sm btn-info" onclick="previewEvaluationSubmission('${examId}', true)">Monitor</button>
 <button class="btn btn-sm btn-success" onclick="exportResults('${examId}', 'excel')">Excel</button>
 <button class="btn btn-sm btn-danger" onclick="exportResults('${examId}', 'pdf')">PDF</button>
 </td>
 `;
                    tbody.appendChild(row);
                }

                // BUG-05 FIX: Now populate the class filter with collected unique classes
                const classFilterEl = document.getElementById('coordinatorResultsClassFilter');
                if (classFilterEl && _classSet.size > 0) {
                    const prevFilter = classFilterEl.value;
                    classFilterEl.innerHTML = '<option value="">All Classes</option>';
                    _classSet.forEach(cls => {
                        const opt = document.createElement('option');
                        opt.value = cls;
                        opt.textContent = `Class ${cls}`;
                        if (cls === prevFilter) opt.selected = true;
                        classFilterEl.appendChild(opt);
                    });
                }
            } catch (error) {
                console.error('Error loading Coordinator results:', error);
                showToast('Failed to load results: ' + error.message, 'danger');
            } finally {
                hideLoader('coordinatorResultsLoader');
            }
        }

        // View Result Details
        async function viewResultDetails(examId) {
            try {
                showLoader('detailsLoader');

                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) throw new Error('Exam not found');

                const examData = examDoc.data();

                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectName = subjectDoc.exists() ? subjectDoc.data().name : 'Unknown';
                const _sd = subjectDoc.exists() ? subjectDoc.data() : {};
                const className = _sd.class || 'N/A';
                const divisionName = _sd.division || 'N/A';

                const resultsQuery = window.query(
                    window.collection(window.db, 'results'),
                    window.where('examId', '==', examId),
                    window.orderBy('studentId')
                );
                const resultsSnapshot = await window.getDocs(resultsQuery);

                // BUG FIX: Handle both string and Timestamp types for finalizedAt
                let finalizedDate = 'N/A';
                if (examData.finalizedAt) {
                    try {
                        if (typeof examData.finalizedAt === 'string') {
                            finalizedDate = new Date(examData.finalizedAt).toLocaleString();
                        } else if (examData.finalizedAt.toDate) {
                            finalizedDate = examData.finalizedAt.toDate().toLocaleString();
                        }
                    } catch (e) {
                        finalizedDate = 'Invalid Date';
                    }
                }

                // BUG FIX: Sanitize text to prevent XSS
                const sanitize = (text) => {
                    const div = document.createElement('div');
                    div.textContent = text;
                    return div.innerHTML;
                };

                const detailsHTML = `
 <div class="result-details-modal">
 <div class="modal-content">
 <div class="modal-header">
 <h2>Result Details</h2>
 <button class="close-btn" onclick="closeResultDetails()">&times;</button>
 </div>
 <div class="modal-body">
 <div class="exam-info">
 <h3>${sanitize(examData.name)}</h3>
 <p><strong>Subject:</strong> ${sanitize(subjectName)}</p>
 <p><strong>Class:</strong> ${sanitize(className)} - ${sanitize(divisionName)}</p>
 <p><strong>Type:</strong> ${(examData.examType?.toUpperCase() || 'N/A')}</p>
 <p><strong>Total Marks:</strong> ${examData.totalMarks || 'N/A'}</p>
 <p><strong>Finalized:</strong> ${finalizedDate}</p>
 </div>
 <div class="results-table-container">
 <table class="results-detail-table">
 <thead>
 <tr>
 <th>Roll No</th>
 <th>Student Name</th>
 <th>Marks Obtained</th>
 <th>Total Marks</th>
 <th>Percentage</th>
 <th>Grade</th>
 </tr>
 </thead>
 <tbody id="resultDetailTableBody"></tbody>
 </table>
 </div>
 </div>
 <div class="modal-footer">
 <button class="btn btn-secondary" onclick="closeResultDetails()">Close</button>
 </div>
 </div>
 </div>
 `;

                document.body.insertAdjacentHTML('beforeend', detailsHTML);
                const tbody = document.getElementById('resultDetailTableBody');

                for (const resultDoc of resultsSnapshot.docs) {
                    const resultData = resultDoc.data();

                    const studentDoc = await window.getDoc(window.doc(window.db, 'students', resultData.studentId));
                    const studentData = studentDoc.exists() ? studentDoc.data() : {};

                    const marksObtained = resultData.totalMarks || 0;
                    const totalMarks = examData.totalMarks || 100;
                    const percentage = totalMarks > 0 ? ((marksObtained / totalMarks) * 100).toFixed(2) : '0.00';
                    const grade = calculateGrade(parseFloat(percentage));

                    const row = document.createElement('tr');
                    row.innerHTML = `
 <td>${sanitize(studentData.rollNumber || 'N/A')}</td>
 <td>${sanitize(studentData.name || 'Unknown')}</td>
 <td>${marksObtained}</td>
 <td>${totalMarks}</td>
 <td>${percentage}%</td>
 <td><span class="grade-badge grade-${grade}">${grade}</span></td>
 `;
                    tbody.appendChild(row);
                }

            } catch (error) {
                console.error('Error viewing result details:', error);
                showToast('Failed to load result details: ' + error.message, 'danger');
            } finally {
                hideLoader('detailsLoader');
            }
        }

        function closeResultDetails() {
            const modal = document.querySelector('.result-details-modal');
            if (modal) modal.remove();
        }

        // Export Results
        async function exportResults(examId, format) {
            try {
                showLoader('exportLoader');

                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) throw new Error('Exam not found');

                const examData = examDoc.data();

                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                const subjectName = subjectDoc.exists() ? subjectDoc.data().name : 'Unknown';
                const _sd = subjectDoc.exists() ? subjectDoc.data() : {};
                const className = _sd.class || 'N/A';
                const divisionName = _sd.division || 'N/A';

                const resultsQuery = window.query(
                    window.collection(window.db, 'results'),
                    window.where('examId', '==', examId),
                    window.orderBy('studentId')
                );
                const resultsSnapshot = await window.getDocs(resultsQuery);

                const resultsData = [];

                for (const resultDoc of resultsSnapshot.docs) {
                    const resultData = resultDoc.data();

                    const studentDoc = await window.getDoc(window.doc(window.db, 'students', resultData.studentId));
                    const studentData = studentDoc.exists() ? studentDoc.data() : {};

                    const isAbsent = resultData.isAbsent || resultData.totalMarks === -1;
                    const marksObtained = isAbsent ? 'AB' : (resultData.totalMarks || 0);
                    const totalMarks = examData.totalMarks || 100;

                    let percentage, grade;
                    if (isAbsent) {
                        percentage = 'AB';
                        grade = 'AB';
                    } else {
                        percentage = ((marksObtained / totalMarks) * 100).toFixed(2);
                        grade = calculateGrade(percentage);
                    }

                    resultsData.push({
                        rollNumber: studentData.rollNumber || 'N/A',
                        studentName: studentData.name || 'Unknown',
                        email: studentData.email || 'N/A',
                        marksObtained: marksObtained,
                        totalMarks: totalMarks,
                        percentage: percentage,
                        grade: grade
                    });
                }

                if (format === 'excel') {
                    exportResultsToExcel(examData, subjectName, className, divisionName, resultsData);
                } else if (format === 'pdf') {
                    exportToProtectedPDF(examData, subjectName, className, divisionName, resultsData);
                }

                showToast(`Results exported successfully as ${format.toUpperCase()}`, 'success');

            } catch (error) {
                console.error('Error exporting results:', error);
                showToast('Failed to export results: ' + error.message, 'danger');
            } finally {
                hideLoader('exportLoader');
            }
        }

        // Excel Export
        function exportResultsToExcel(examData, subjectName, className, divisionName, resultsData) {
            const headerData = [
                ['Academic Evaluation Report'],
                [''],
                ['Exam Name:', examData.name || 'N/A'],
                ['Subject:', subjectName],
                ['Class:', `${className} - ${divisionName}`],
                ['Exam Type:', examData.examType?.toUpperCase() || 'N/A'],
                ['Total Marks:', examData.totalMarks || 'N/A'],
                ['Finalized Date:', examData.finalizedAt ? new Date(examData.finalizedAt).toLocaleString() : 'N/A'],
                ['Total Students:', resultsData.length],
                [''],
                ['Roll No', 'Student Name', 'Email', 'Marks Obtained', 'Total Marks', 'Percentage (%)', 'Grade']
            ];

            const tableData = resultsData.map(result => [
                result.rollNumber,
                result.studentName,
                result.email,
                result.marksObtained,
                result.totalMarks,
                result.percentage,
                result.grade
            ]);

            const wsData = [...headerData, ...tableData];

            if (resultsData.length > 0) {
                const avgPercentage = (resultsData.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / resultsData.length).toFixed(2);
                const maxPercentage = Math.max(...resultsData.map(r => parseFloat(r.percentage)));
                const minPercentage = Math.min(...resultsData.map(r => parseFloat(r.percentage)));
                const passCount = resultsData.filter(r => parseFloat(r.percentage) >= 40).length;
                const failCount = resultsData.length - passCount;

                wsData.push(
                    [''],
                    ['Statistics'],
                    ['Average Percentage:', `${avgPercentage}%`],
                    ['Highest Percentage:', `${maxPercentage}%`],
                    ['Lowest Percentage:', `${minPercentage}%`],
                    ['Pass Count:', passCount],
                    ['Fail Count:', failCount],
                    ['Pass Rate:', `${((passCount / resultsData.length) * 100).toFixed(2)}%`]
                );
            }

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [
                { wch: 10 },
                { wch: 25 },
                { wch: 30 },
                { wch: 15 },
                { wch: 12 },
                { wch: 15 },
                { wch: 8 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Results');

            const fileName = `${examData.name}_${className}_${divisionName}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        }

        // --- NEW PROFESSIONAL PDF HEADER HELPER ---
        function drawPDFHeader(doc, school, title, metadata = []) {
            // Placeholder MIT Round Logo (Vector shape if actual image missing)
            doc.setDrawColor(100, 116, 139);
            doc.setLineWidth(0.5);
            doc.circle(25, 18, 10, 'S'); 
            doc.setFontSize(6);
            doc.text('MIT ADT', 25, 19, { align: 'center' });

            // University Branding
            doc.setTextColor(30, 58, 138); // MIT Blue
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('MIT ADT UNIVERSITY, PUNE', 110, 15, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Art, Design & Technology', 110, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text(school.toUpperCase(), 110, 26, { align: 'center' });

            doc.setDrawColor(30, 58, 138);
            doc.setLineWidth(0.8);
            doc.line(15, 28, 195, 28);

            // Document Title
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(title, 105, 36, { align: 'center' });

            // Meta Info
            let y = 42;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            metadata.forEach(line => {
                doc.text(line, 105, y, { align: 'center' });
                y += 5;
            });

            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.2);
            doc.line(15, y, 195, y);
            
            return y + 8;
        }

        // PDF Export with Password Protection
        async function exportToProtectedPDF(examData, subjectName, className, divisionName, resultsData) {
            const password = prompt('Enter a password to protect this PDF (leave blank for no password):');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            let yPos = drawPDFHeader(doc, 'School of Art, Design & Technology', 'ACADEMIC EVALUATION REPORT', [
                `Exam: ${examData.name || 'N/A'} | Subject: ${subjectName}`,
                `Class: ${className} - ${divisionName} | Type: ${examData.examType?.toUpperCase() || 'N/A'}`
            ]);

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Total Students: ${resultsData.length}`, 15, yPos);
            doc.text(`Finalized: ${examData.finalizedAt ? new Date(examData.finalizedAt).toLocaleDateString() : 'N/A'}`, 195, yPos, { align: 'right' });
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');

            const headers = ['Roll No', 'Student Name', 'Marks', 'Total', '%', 'Grade'];
            const colWidths = [20, 60, 20, 20, 20, 20];
            let xPos = 15;

            headers.forEach((header, i) => {
                doc.text(header, xPos, yPos);
                xPos += colWidths[i];
            });

            yPos += 7;
            doc.line(15, yPos, 195, yPos);
            yPos += 5;

            doc.setFont(undefined, 'normal');

            for (const result of resultsData) {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                xPos = 15;
                const rowData = [
                    result.rollNumber,
                    result.studentName.substring(0, 25),
                    result.marksObtained.toString(),
                    result.totalMarks.toString(),
                    result.percentage,
                    result.grade
                ];

                rowData.forEach((data, i) => {
                    doc.text(data, xPos, yPos);
                    xPos += colWidths[i];
                });

                yPos += 6;
            }

            if (resultsData.length > 0) {
                yPos += 10;

                if (yPos > 250) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFont(undefined, 'bold');
                doc.text('Statistics', 15, yPos);
                yPos += 7;
                doc.setFont(undefined, 'normal');

                const filteredResults = resultsData.filter(r => r.percentage !== 'AB');
                const avgPercentage = filteredResults.length > 0 ? (filteredResults.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / filteredResults.length).toFixed(2) : 'N/A';
                const maxPercentage = filteredResults.length > 0 ? Math.max(...filteredResults.map(r => parseFloat(r.percentage))) : 'N/A';
                const minPercentage = filteredResults.length > 0 ? Math.min(...filteredResults.map(r => parseFloat(r.percentage))) : 'N/A';
                const passCount = filteredResults.filter(r => parseFloat(r.percentage) >= 40).length;
                const absentCount = resultsData.length - filteredResults.length;
                const failCount = filteredResults.length - passCount;

                doc.text(`Average Percentage: ${avgPercentage}%`, 15, yPos);
                yPos += 6;
                doc.text(`Highest Percentage: ${maxPercentage}%`, 15, yPos);
                yPos += 6;
                doc.text(`Lowest Percentage: ${minPercentage}%`, 15, yPos);
                yPos += 6;
                doc.text(`Absent Count: ${absentCount}`, 15, yPos);
                yPos += 6;
                doc.text(`Pass Count: ${passCount}`, 15, yPos);
                yPos += 6;
                doc.text(`Fail Count: ${failCount}`, 15, yPos);
                yPos += 6;
                doc.text(`Pass Rate: ${filteredResults.length > 0 ? ((passCount / filteredResults.length) * 100).toFixed(2) : 0}%`, 15, yPos);
            }

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 290);
                if (password) {
                    doc.text(`Protected Document - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
                } else {
                    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
                }
                doc.text(`Evaluator System ?? ${new Date().getFullYear()}`, 195, 290, { align: 'right' });
            }

            if (password && password.trim() !== '') {
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setTextColor(200, 200, 200);
                    doc.setFontSize(40);
                    doc.text('CONFIDENTIAL', 105, 150, {
                        align: 'center',
                        angle: 45
                    });
                }

                alert(`PDF generated with CONFIDENTIAL watermark.\n\nPassword: ${password}\n\nNote: Please use Adobe Acrobat to add password protection for maximum security.`);
            }

            const fileName = `${examData.name}_${className}_${divisionName}_Results_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            if (password && password.trim() !== '') {
                setTimeout(() => {
                    console.log(`To add password protection:
1. Open the PDF in Adobe Acrobat
2. Go to Tools > Protect > Encrypt > Encrypt with Password
3. Set password: ${password}
4. Save the protected PDF`);
                }, 1000);
            }
        }

        // ========================================
        // END RESULTS VIEWING & EXPORT FUNCTIONS
        // ========================================

        // ========================================
        // QUESTION BANK FUNCTIONS
        // ========================================

        /**
         * Add a single question to the question bank
         */
        async function addQuestion() {
            const subjectId = document.getElementById('qbSubjectSelect').value;
            const unit = parseInt(document.getElementById('qbUnit').value);
            const marks = parseInt(document.getElementById('qbMarks').value);
            const difficulty = document.getElementById('qbDifficulty').value;
            const questionText = document.getElementById('qbQuestionText').value.trim();

            const validation = window.validateForm(
                { subject: subjectId, unit, questionText },
                {
                    subject: { required: true },
                    unit: { required: true, custom: (v) => v >= 1 && v <= 10, customMessage: 'Unit must be between 1 and 10' },
                    questionText: { required: true, minLength: 5 }
                }
            );

            if (!validation.valid) {
                showToast(validation.errors.join(', '), 'danger');
                return;
            }

            try {
                await addDoc(collection(window.db, 'questions'), {
                    subjectId,
                    unit,
                    marks,
                    difficulty,
                    text: questionText,
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.email
                });

                showToast('Question added successfully!', 'success');
                document.getElementById('qbQuestionText').value = '';
                await logAuditEvent('ADD_QUESTION', { subjectId, unit, marks });
                loadQuestions();
            } catch (error) {
                console.error('Error adding question:', error);
                showToast('Failed to add question', 'danger');
            }
        }

        /**
         * Download Question Bank Excel template
         */
        function downloadQuestionBankTemplate() {
            try {
                const headers = ['subjectId', 'unit', 'marks', 'difficulty', 'questionText'];
                const sampleData = [
                    {
                        'subjectId': '(use the Firestore document ID of the subject)',
                        'unit': '1',
                        'marks': '2',
                        'difficulty': 'medium',
                        'questionText': 'Sample question text here'
                    }
                ];

                // Use sample data instead of empty template
                exportToExcel(sampleData, 'question_bank_template', 'Template');
                showToast('Template downloaded with sample data', 'success');
            } catch (error) {
                console.error('Error downloading template:', error);
                showToast('Failed to download template', 'danger');
            }
        }

        /**
         * Import questions from Excel file
         */
        async function importQuestionsFromExcel() {
            const fileInput = document.getElementById('qbImportFile');

            if (!fileInput) {
                console.error('File input element not found');
                showToast('Upload interface not found', 'danger');
                return;
            }

            const file = fileInput.files[0];

            if (!file) {
                showToast('Please select an Excel file', 'warning');
                return;
            }

            // Validate file type
            if (!file.name.match(/\.(xlsx|xls)$/i)) {
                showToast('Please select a valid Excel file (.xlsx or .xls)', 'danger');
                return;
            }

            try {
                await importFromExcel(file, async (data) => {
                    let successCount = 0;
                    let errorCount = 0;
                    const errors = [];

                    for (let i = 0; i < data.length; i++) {
                        const row = data[i];
                        try {
                            // Validate required fields
                            if (!row.subjectId || row.subjectId.toString().trim() === '') {
                                errors.push(`Row ${i + 2}: Missing subjectId`);
                                errorCount++;
                                continue;
                            }
                            if (!row.unit) {
                                errors.push(`Row ${i + 2}: Missing unit`);
                                errorCount++;
                                continue;
                            }
                            if (!row.questionText || row.questionText.toString().trim() === '') {
                                errors.push(`Row ${i + 2}: Missing questionText`);
                                errorCount++;
                                continue;
                            }

                            // Parse and validate unit
                            const unitNum = parseInt(row.unit);
                            if (isNaN(unitNum) || unitNum < 1) {
                                errors.push(`Row ${i + 2}: Invalid unit number`);
                                errorCount++;
                                continue;
                            }

                            // Parse marks with validation
                            const marksNum = parseInt(row.marks || 2);
                            if (isNaN(marksNum) || marksNum < 1) {
                                errors.push(`Row ${i + 2}: Invalid marks value`);
                                errorCount++;
                                continue;
                            }

                            // Validate difficulty
                            const validDifficulties = ['easy', 'medium', 'hard'];
                            const difficulty = (row.difficulty || 'medium').toString().toLowerCase();
                            if (!validDifficulties.includes(difficulty)) {
                                errors.push(`Row ${i + 2}: Invalid difficulty (use: easy, medium, or hard)`);
                                errorCount++;
                                continue;
                            }

                            await addDoc(collection(window.db, 'questions'), {
                                subjectId: row.subjectId.toString().trim(),
                                unit: unitNum,
                                marks: marksNum,
                                difficulty: difficulty,
                                text: row.questionText.toString().trim(),
                                createdAt: new Date().toISOString(),
                                createdBy: window.currentUser.email
                            });
                            successCount++;
                        } catch (error) {
                            console.error(`Error importing question at row ${i + 2}:`, error);
                            errors.push(`Row ${i + 2}: ${error.message}`);
                            errorCount++;
                        }
                    }

                    // Show results
                    if (successCount > 0) {
                        showToast(`Successfully imported ${successCount} question(s). ${errorCount} failed.`, 'success');
                    } else {
                        showToast(`Import failed. ${errorCount} error(s) found.`, 'danger');
                    }

                    // Log detailed errors if any
                    if (errors.length > 0 && errors.length <= 10) {
                        console.warn('Import errors:', errors);
                    }

                    fileInput.value = '';
                    await logAuditEvent('BULK_IMPORT_QUESTIONS', { successCount, errorCount });

                    if (successCount > 0) {
                        loadQuestions();
                    }
                }, true /* suppressSuccessToast - callback shows its own result toast */);
            } catch (error) {
                console.error('Import process error:', error);
                showToast('Failed to import Excel file. Please check the file format.', 'danger');
            }
        }
        
        /**
         * Import questions from PDF for the Question Bank
         */
        async function importQuestionsFromQB_PDF() {
            const fileInput = document.getElementById('qbPDFImportFile');
            const subjectId = document.getElementById('qbPDFSubjectSelect')?.value;
            const unit = parseInt(document.getElementById('qbPDFUnit')?.value || '1');
            const marks = parseInt(document.getElementById('qbPDFMarks')?.value || '2');
            const difficulty = document.getElementById('qbPDFDifficulty')?.value || 'medium';

            if (!fileInput || !fileInput.files[0]) {
                showToast('Please select a PDF file', 'warning');
                return;
            }
            if (!subjectId) {
                showToast('Please select a target subject', 'warning');
                return;
            }

            const file = fileInput.files[0];
            showToast('Reading PDF... please wait', 'info', 3000);

            try {
                if (window.pdfjsLib) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
                } else {
                    throw new Error('PDF library not loaded');
                }

                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const pdf = await pdfjsLib.getDocument({ 
                    data: uint8Array,
                    disableAutoFetch: true,
                    disableStream: true
                }).promise;
                
                let extractedLines = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const linesMap = {};
                    
                    textContent.items.forEach(item => {
                        const y = Math.round(item.transform[5]);
                        if (!linesMap[y]) linesMap[y] = [];
                        linesMap[y].push(item);
                    });

                    const sortedY = Object.keys(linesMap).sort((a, b) => b - a);
                    sortedY.forEach(y => {
                        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
                        const lineText = lineItems.map(item => item.str).join(' ').trim();
                        if (lineText.length > 5) {
                            extractedLines.push(lineText);
                        }
                    });
                }

                if (extractedLines.length === 0) {
                    showToast('Could not extract text from PDF.', 'warning');
                    return;
                }

                window.showLoadingMessage(`Saving questions to Firestore...`);
                let successCount = 0;
                let errorCount = 0;

                for (const line of extractedLines) {
                    // Clean up and filter
                    const cleaned = line.replace(/^[\d\.\-\*\)Q]+\s*/i, '').trim();
                    if (cleaned.length > 8 && !/^(page|date|subject|exam|time|marks|unit)/i.test(cleaned)) {
                        try {
                            await addDoc(collection(window.db, 'questions'), {
                                subjectId: subjectId,
                                unit: unit,
                                marks: marks,
                                difficulty: difficulty,
                                text: cleaned,
                                createdAt: new Date().toISOString(),
                                createdBy: window.currentUser.email
                            });
                            successCount++;
                        } catch (err) {
                            errorCount++;
                        }
                    }
                }

                window.hideLoadingMessage();
                if (successCount > 0) {
                    showToast(`Successfully imported ${successCount} questions!`, 'success');
                    await logAuditEvent('BULK_IMPORT_QUESTIONS_PDF', { subjectId, successCount, errorCount });
                    loadQuestions();
                } else {
                    showToast('No valid questions found in PDF.', 'warning');
                }
                fileInput.value = '';
            } catch (error) {
                if (typeof window.hideLoadingMessage === 'function') window.hideLoadingMessage();
                console.error('PDF Import error:', error);
                showToast('Failed to import PDF: ' + error.message, 'danger');
            }
        }

        /**
         * Load and display questions
         */
        async function loadQuestions() {
            const filterSubject = document.getElementById('qbFilterSubject')?.value || '';
            const filterUnit = document.getElementById('qbFilterUnit')?.value || '';
            const container = document.getElementById('questionsList');

            if (!container) return;

            try {
                let q = collection(window.db, 'questions');
                let constraints = [];

                if (filterSubject) {
                    constraints.push(where('subjectId', '==', filterSubject));
                }
                if (filterUnit) {
                    constraints.push(where('unit', '==', parseInt(filterUnit)));
                }

                const snapshot = await getDocs(query(q, ...constraints));
                let questions = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
                
                // Sort by createdAt descending in JS to avoid composite index requirements
                questions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

                if (questions.length === 0) {
                    container.innerHTML = '<div class="alert alert-info">No questions found. Add questions to get started.</div>';
                    return;
                }

                let html = '<table><thead><tr><th>Unit</th><th>Marks</th><th>Difficulty</th><th>Question</th><th>Action</th></tr></thead><tbody>';

                questions.forEach(q => {
                    html += `
                 <tr>
                     <td>Unit ${q.unit}</td>
                     <td>${q.marks}M</td>
                     <td><span class="badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}">${q.difficulty}</span></td>
                     <td style="max-width:400px;">${q.text}</td>
                     <td><button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.id}')">Delete</button></td>
                 </tr>
             `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

            } catch (error) {
                console.error('Error loading questions:', error);

                container.innerHTML = '<div class="alert alert-danger">Failed to load questions</div>';
            }
        }

        /**
         * Delete a question
         */
        async function deleteQuestion(questionId) {
            if (!confirm('Are you sure you want to delete this question?')) return;

            try {
                await deleteDoc(doc(window.db, 'questions', questionId));
                showToast('Question deleted successfully', 'success');
                await logAuditEvent('DELETE_QUESTION', { questionId });
                loadQuestions();
            } catch (error) {
                console.error('Error deleting question:', error);
                showToast('Failed to delete question', 'danger');
            }
        }

        /**
         * Export questions to Excel
         */
        async function exportQuestionsToExcel() {
            const filterSubject = document.getElementById('qbFilterSubject')?.value || '';

            if (!filterSubject) {
                const confirmAll = confirm('No subject filter selected. Export ALL questions from the database?');
                if (!confirmAll) {
                    return;
                }
            }

            try {
                let q = collection(window.db, 'questions');
                const constraints = filterSubject ? [where('subjectId', '==', filterSubject)] : [];
                const snapshot = await getDocs(query(q, ...constraints));

                if (snapshot.empty) {
                    showToast('No questions to export', 'warning');
                    return;
                }

                const data = snapshot.docs.map(doc => {
                    const q = doc.data();
                    return {
                        'Question ID': doc.id,
                        'Subject ID': q.subjectId || '',
                        'Unit': q.unit || '',
                        'Marks': q.marks || '',
                        'Difficulty': q.difficulty || '',
                        'Question Text': q.text || '',
                        'Created At': q.createdAt || '',
                        'Created By': q.createdBy || ''
                    };
                });

                const fileName = filterSubject
                    ? `questions_${filterSubject}_${Date.now()}`
                    : `all_questions_${Date.now()}`;

                exportToExcel(data, fileName, 'Questions');
                showToast(`Exported ${data.length} question(s) successfully`, 'success');
            } catch (error) {
                console.error('Error exporting questions:', error);
                showToast('Failed to export questions', 'danger');
            }
        }

        /**
         * Load teachers for a subject for distribution
         */
        async function loadTeachersForDistribution() {
            const subjectId = document.getElementById('qDistSubject')?.value;
            const container = document.getElementById('distTeachersList');

            if (!subjectId) {
                container.innerHTML = '<em>Select a subject first</em>';
                return;
            }

            try {
                const snapshot = await getDocs(
                    query(collection(window.db, 'teacher_assignments'), where('subjectId', '==', subjectId))
                );

                if (snapshot.empty) {
                    container.innerHTML = '<div class="alert alert-warning">No teachers assigned to this subject</div>';
                    return;
                }

                const teachers = [...new Set(snapshot.docs.map(d => d.data().teacherEmail))];
                const unitsV = document.getElementById('qDistUnits')?.value || '0';
                const qpuV = document.getElementById('qDistQuestionsPerUnit')?.value || '0';
                const totalQ = parseInt(unitsV) * parseInt(qpuV);

                container.innerHTML = `<div style="color:#065f46;font-weight:600;margin-bottom:8px;">Select teachers to receive questions:</div>` +
                    teachers.map(t => `
                        <div style="display:flex;align-items:center;gap:10px;padding:6px;border-bottom:1px solid #e5e7eb;">
                            <input type="checkbox" id="teacher_${t}" value="${t}" checked style="width:18px;height:18px;">
                            <label for="teacher_${t}" style="font-size:14px;color:#374151;cursor:pointer;flex:1;">${t}</label>
                        </div>`).join('') +
                    `<div style="color:#6b7280;font-size:12px;margin-top:10px;">Each selected teacher will receive <strong>${totalQ || '?'} questions</strong> (~${qpuV} per unit).</div>`;

            } catch (error) {
                console.error('Error loading teachers:', error);
                container.innerHTML = '<div class="alert alert-danger">Failed to load teachers</div>';
            }
        }

        async function getTeacherAssignedQuestions(email, subjectId, date) {
            try {
                const docSnap = await window.getDoc(window.doc(window.db, 'teacher_question_assignments', `${subjectId}_${email}_${date}`));
                if (docSnap.exists()) {
                    return docSnap.data().questions || [];
                }
                return [];
            } catch (error) {
                console.error('Error fetching teacher questions:', error);
                return [];
            }
        }
        window.getTeacherAssignedQuestions = getTeacherAssignedQuestions;

        /**
         * Distribute questions to teachers
         */
        async function executeQuestionMigrationAndDistribution() {
            const subjectEl = document.getElementById('qDistSubject');
            const unitsEl = document.getElementById('qDistUnits');
            const qpuEl = document.getElementById('qDistQuestionsPerUnit');
            const marksEl = document.getElementById('qDistMarks');
            
            if (!subjectEl || !unitsEl || !qpuEl || !marksEl) {
                const missing = [];
                if (!subjectEl) missing.push('qDistSubject');
                if (!unitsEl) missing.push('qDistUnits');
                if (!qpuEl) missing.push('qDistQuestionsPerUnit');
                if (!marksEl) missing.push('qDistMarks');
                console.error('Missing form elements:', missing.join(', '));
                showToast('Form structure error. Please refresh.', 'danger');
                return;
            }

            const subjectId = subjectEl.value;
            const units = parseInt(unitsEl.value);
            const questionsPerUnit = parseInt(qpuEl.value);
            const marksType = marksEl.value;
            const assignmentDate = document.getElementById('qDistDate')?.value || new Date().toISOString().split('T')[0];
            
            if (!subjectId) { showToast('Please select a subject', 'warning'); return; }
            
            const listEl = document.getElementById('distTeachersList');
            const teacherChecks = listEl ? listEl.querySelectorAll('input[type="checkbox"]:checked') : [];
            const teachers = Array.from(teacherChecks).map(cb => cb.value);
            
            if (teachers.length === 0) { showToast('Please select at least one teacher', 'warning'); return; }
            
            try {
                window.showLoadingMessage('Distributing questions...');
                const result = await window.generateAndDistributeQuestions({
                    subjectId, units, questionsPerUnit, teachers, marksType, assignmentDate
                });
                window.hideLoadingMessage();
                if (result) {
                    showToast(`Questions distributed successfully to ${teachers.length} teachers`, 'success');
                    if (typeof loadDistributionHistory === 'function') loadDistributionHistory();
                }
            } catch (err) {
                window.hideLoadingMessage();
                showToast('Distribution failed: ' + err.message, 'danger');
            }
        }
        window.executeQuestionMigrationAndDistribution = executeQuestionMigrationAndDistribution;

        async function loadDistributionHistory() {
            const subjectId = document.getElementById('historySubject')?.value;
            const container = document.getElementById('distributionHistory');

            if (!container) return;

            if (!subjectId) {
                container.innerHTML = '<div class="alert alert-info">Select a subject to view history</div>';
                return;
            }

            try {
                // Avoid composite-index requirements by sorting client-side.
                const snapshot = await getDocs(query(
                    collection(window.db, 'teacher_question_assignments'),
                    where('subjectId', '==', subjectId),
                    limit(200)
                ));

                if (snapshot.empty) {
                    container.innerHTML = '<div class="alert alert-info">No distribution history found</div>';
                    return;
                }

                const rows = snapshot.docs
                    .map(d => d.data())
                    .sort((a, b) => String(b.assignedAt || '').localeCompare(String(a.assignedAt || '')))
                    .slice(0, 50);

                let html = '<table><thead><tr><th>Date</th><th>Teacher</th><th>Questions</th><th>Structure</th><th>Marks</th><th>Assigned At</th></tr></thead><tbody>';

                rows.forEach(d => {
                    const qCount = d.totalQuestions !== undefined ? d.totalQuestions : (d.questions ? d.questions.length : 0);
                    const structureInfo = (d.units && d.questionsPerUnit)
                        ? `${d.units} units x ${d.questionsPerUnit}`
                        : 'N/A';
                    html += `
                 <tr>
                     <td><strong>${d.assignmentDate || 'N/A'}</strong></td>
                     <td>${d.teacherEmail || 'N/A'}</td>
                     <td><span class="badge badge-success">${qCount}</span></td>
                     <td>${structureInfo}</td>
                     <td>${d.marksType ? d.marksType + 'M' : 'N/A'}</td>
                     <td style="font-size:12px;">${d.assignedAt ? new Date(d.assignedAt).toLocaleString() : 'N/A'}</td>
                 </tr>
             `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

            } catch (error) {
                console.error('Error loading history:', error);
                container.innerHTML = '<div class="alert alert-danger">Failed to load history</div>';
            }
        }

        /**
         * TEACHER FUNCTIONS - Load assigned questions
         */
        async function loadTeacherQuestionDates() {
            const subjectId = document.getElementById('teacherQuestionsSubject').value;
            const dateSelect = document.getElementById('teacherQuestionsDate');

            if (!subjectId) {
                dateSelect.innerHTML = '<option value="">Choose Date</option>';
                return;
            }

            try {
                // Load dates from usage tracking doc
                const usageDoc = await getDoc(
                    doc(window.db, 'teacherQuestionUsage', `${window.currentUser.email}_${subjectId}`)
                );

                let dates = [];
                if (usageDoc.exists()) {
                    dates = Object.keys(usageDoc.data().byDate || {}).sort().reverse();
                }

                // Also check new collection directly for any dates
                if (dates.length === 0) {
                    const snap = await getDocs(query(
                        collection(window.db, 'teacher_question_assignments'),
                        where('subjectId', '==', subjectId),
                        where('teacherEmail', '==', window.currentUser.email),
                        limit(200)
                    ));
                    dates = [...new Set(snap.docs.map(d => d.data().assignmentDate).filter(Boolean))].sort().reverse();
                }

                if (dates.length === 0) {
                    dateSelect.innerHTML = '<option value="">No assignments yet</option>';
                    return;
                }

                dateSelect.innerHTML = '<option value="">Choose Date</option>' +
                    dates.map(d => `<option value="${d}">${d}</option>`).join('');

            } catch (error) {
                console.error('Error loading dates:', error);
                dateSelect.innerHTML = '<option value="">Error loading dates</option>';
            }
        }

        async function loadTeacherAssignedQuestions() {
            const subjectId = document.getElementById('teacherQuestionsSubject').value;
            const date = document.getElementById('teacherQuestionsDate').value;
            const container = document.getElementById('teacherAssignedQuestionsList');

            if (!subjectId || !date) {
                container.innerHTML = '<div class="alert alert-info">Select subject and date</div>';
                return;
            }

            try {
                const questions = await getTeacherAssignedQuestions(window.currentUser.email, subjectId, date);

                if (questions.length === 0) {
                    container.innerHTML = '<div class="alert alert-info">No questions assigned for this date</div>';
                    return;
                }

                // Group questions by unit for clearer display
                const byUnit = {};
                questions.forEach(q => {
                    const u = q.unit || '?';
                    if (!byUnit[u]) byUnit[u] = [];
                    byUnit[u].push(q);
                });
                const unitKeys = Object.keys(byUnit).sort((a, b) => parseInt(a) - parseInt(b));

                let html = `<div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
             <strong style="color:#065f46;">Your Question Paper for ${date}</strong><br>
             <span style="color:#047857;">${questions.length} questions across ${unitKeys.length} unit(s)</span>
         </div>`;

                unitKeys.forEach(unit => {
                    const uqs = byUnit[unit];
                    html += `<div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:12px;">
                 <div style="font-weight:700;color:#1d4ed8;margin-bottom:10px;font-size:14px;">
                     Unit ${unit} — ${uqs.length} question(s) (${uqs[0]?.marks || '?'} marks each)
                 </div>
                 <table style="width:100%;"><thead><tr>
                     <th style="width:40px;">#</th>
                     <th>Question</th>
                     <th style="width:80px;">Difficulty</th>
                 </tr></thead><tbody>`;
                    uqs.forEach((q, i) => {
                        const diffColor = q.difficulty === 'easy' ? '#16a34a' : q.difficulty === 'hard' ? '#dc2626' : '#d97706';
                        html += `<tr>
                     <td style="color:#9ca3af;">${i + 1}</td>
                     <td style="font-size:14px;line-height:1.5;">${q.text || 'No description available'}</td>
                     <td><span style="background:${diffColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">${q.difficulty || 'medium'}</span></td>
                 </tr>`;
                    });
                    html += '</tbody></table></div>';
                });
                container.innerHTML = html;

            } catch (error) {
                console.error('Error loading assigned questions:', error);
                container.innerHTML = '<div class="alert alert-danger">Failed to load questions</div>';
            }
        }

        async function exportTeacherQuestionsToExcel() {
            const subjectId = document.getElementById('teacherQuestionsSubject')?.value;
            const date = document.getElementById('teacherQuestionsDate')?.value;

            if (!subjectId || !date) {
                showToast('Please select both subject and date', 'warning');
                return;
            }

            try {
                const questions = await getTeacherAssignedQuestions(window.currentUser.email, subjectId, date);

                if (questions.length === 0) {
                    showToast('No questions to export', 'warning');
                    return;
                }

                const data = questions.map((q, i) => ({
                    'No': i + 1,
                    'Unit': `Unit ${q.unit}`,
                    'Marks': `${q.marks}M`,
                    'Difficulty': q.difficulty || 'medium',
                    'Question': q.text || ''
                }));

                exportToExcel(data, `my_questions_${date}`, 'Questions');
                showToast(`Exported ${questions.length} question(s) successfully`, 'success');
            } catch (error) {
                console.error('Error exporting questions:', error);
                showToast('Failed to export questions', 'danger');
            }
        }

        async function exportTeacherAssignedQuestionsToPDF() {
            const subjectId = document.getElementById('teacherQuestionsSubject')?.value;
            const date = document.getElementById('teacherQuestionsDate')?.value;
            const subjectSelect = document.getElementById('teacherQuestionsSubject');
            const subjectName = subjectSelect?.options[subjectSelect.selectedIndex]?.text || subjectId;

            if (!subjectId || !date) {
                showToast('Please select both subject and date', 'warning');
                return;
            }

            try {
                window.showLoadingMessage('Generating Assignment PDF...');
                const questions = await getTeacherAssignedQuestions(window.currentUser.email, subjectId, date);

                if (questions.length === 0) {
                    showToast('No questions to export', 'warning');
                    window.hideLoadingMessage();
                    return;
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                let y = drawPDFHeader(doc, 
                    `Department of ${window.currentUser.department || 'Academic Affairs'}`, 
                    'QUESTION ASSIGNMENT (FACULTY COPY)', 
                    [
                        `Subject: ${subjectName.toUpperCase()} | Date: ${date}`,
                        `Faculty: ${window.currentUser.name || window.currentUser.email}`
                    ]
                );

                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text(`TOTAL QUESTIONS: ${questions.length}`, 15, y);
                y += 8;

                // QUESTIONS - 3 per page as requested
                questions.forEach((q, i) => {
                    // Page break every 3 questions
                    if (i > 0 && i % 3 === 0) {
                        doc.addPage();
                        // Minimal header on new pages
                        doc.setFontSize(9);
                        doc.setTextColor(100, 116, 139);
                        doc.text('MIT ADT UNIVERSITY - QUESTION ASSIGNMENT', 105, 10, { align: 'center' });
                        doc.text(`Subject: ${subjectName} | Date: ${date}`, 105, 15, { align: 'center' });
                        doc.line(15, 17, 195, 17);
                        y = 25;
                    }

                    // Question Box
                    doc.setDrawColor(229, 231, 235);
                    doc.setFillColor(249, 250, 251);
                    doc.rect(15, y, 180, 55, 'F');
                    doc.rect(15, y, 180, 55, 'S');

                    // Question Number
                    doc.setTextColor(30, 58, 138);
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'bold');
                    doc.text(`QUESTION ${i + 1}`, 20, y + 8);

                    // Metadata (Unit/Marks)
                    doc.setFontSize(9);
                    doc.setTextColor(107, 114, 128);
                    doc.text(`Unit: ${q.unit} | Marks: ${q.marks}M | Difficulty: ${q.difficulty || 'medium'}`, 20, y + 14);

                    // Text
                    doc.setTextColor(31, 41, 55);
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'normal');
                    const splitText = doc.splitTextToSize(q.text || 'No question text provided.', 170);
                    doc.text(splitText, 20, y + 22);

                    y += 65; // Move to next question slot
                });

                // FOOTER
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });
                }

                doc.save(`Assignment_${subjectId}_${date}.pdf`);
                showToast('Assignment PDF downloaded successfully', 'success');
                window.hideLoadingMessage();
            } catch (error) {
                console.error('Error generating assignments PDF:', error);
                showToast('Failed to generate PDF', 'danger');
                window.hideLoadingMessage();
            }
        }
        window.exportTeacherAssignedQuestionsToPDF = exportTeacherAssignedQuestionsToPDF;


        // Make functions globally available

        function exportSubjectsExcel() {
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;
            if (!year || !semester) { showToast('Select academic year and semester', 'warning'); return; }
            window.getDocs(window.query(window.collection(window.db, 'subjects'),
                window.where('academicYear', '==', year), window.where('semester', '==', semester)))
                .then(snap => {
                    if (snap.empty) { showToast('No subjects to export', 'warning'); return; }
                    const data = snap.docs.map(d => {
                        const s = d.data();
                        return { 'Code': s.code || '', 'Name': s.name || '', 'Class': s.class || '', 'Division': s.division || '', 'Year': s.academicYear || '', 'Sem': s.semester || '' };
                    });
                    exportToExcel(data, `subjects_${year}_${semester}_${Date.now()}`, 'Subjects');
                    showToast('Subjects exported', 'success');
                }).catch(e => showToast('Export failed: ' + e.message, 'danger'));
        }

        function exportExamsExcel() {
            const year = document.getElementById('academicYear').value;
            const semester = document.getElementById('semester').value;
            if (!year || !semester) { showToast('Select academic year and semester', 'warning'); return; }
            window.getDocs(window.query(window.collection(window.db, 'exams'),
                window.where('academicYear', '==', year), window.where('semester', '==', semester)))
                .then(snap => {
                    if (snap.empty) { showToast('No exams to export', 'warning'); return; }
                    const data = snap.docs.map(d => {
                        const e = d.data();
                        return { 'Name': e.name || '', 'Type': e.examType || '', 'Max Marks': e.totalMarks || '', 'Status': e.status || '', 'Year': e.academicYear || '', 'Sem': e.semester || '' };
                    });
                    exportToExcel(data, `exams_${year}_${semester}_${Date.now()}`, 'Exams');
                    showToast('Exams exported', 'success');
                }).catch(e => showToast('Export failed: ' + e.message, 'danger'));
        }

        function exportCoordinatorsExcel() {
            window.getDocs(window.collection(window.db, 'coordinator_assignments'))
                .then(snap => {
                    if (snap.empty) { showToast('No coordinators to export', 'warning'); return; }
                    const data = snap.docs.map(d => {
                        const c = d.data();
                        return { 'Department': c.department || '', 'Email': c.email || '', 'Assigned': c.assignedAt ? new Date(c.assignedAt).toLocaleDateString() : '' };
                    });
                    exportToExcel(data, `coordinators_${Date.now()}`, 'Coordinators');
                    showToast('Coordinators exported', 'success');
                }).catch(e => showToast('Export failed: ' + e.message, 'danger'));
        }

        function exportUsersExcel() {
            const roleFilter = document.getElementById('userFilterRole')?.value || '';
            let q = roleFilter
                ? window.query(window.collection(window.db, 'users'), window.where('role', '==', roleFilter))
                : window.collection(window.db, 'users');
            window.getDocs(q).then(snap => {
                if (snap.empty) { showToast('No users to export', 'warning'); return; }
                const data = snap.docs.map(d => {
                    const u = d.data();
                    return { 'Name': u.name || '', 'Email': u.email || '', 'Role': u.role || '', 'Department': u.department || '', 'Status': u.isActive ? 'Active' : 'Inactive', 'Approved': u.approved ? 'Yes' : 'No' };
                });
                exportToExcel(data, `users_${roleFilter || 'all'}_${Date.now()}`, 'Users');
                showToast('Users exported', 'success');
            }).catch(e => showToast('Export failed: ' + e.message, 'danger'));
        }

        function exportAuditLogsExcel() {
            const filter = document.getElementById('auditFilter')?.value || '';
            let q = filter
                ? window.query(window.collection(window.db, 'audit_logs'), window.where('action', '==', filter), window.orderBy('timestamp', 'desc'), window.limit(500))
                : window.query(window.collection(window.db, 'audit_logs'), window.orderBy('timestamp', 'desc'), window.limit(500));
            window.getDocs(q).then(snap => {
                if (snap.empty) { showToast('No audit logs to export', 'warning'); return; }
                const data = snap.docs.map(d => {
                    const a = d.data();
                    return { 'Timestamp': a.timestamp ? new Date(a.timestamp).toLocaleString() : '', 'Action': a.action || '', 'Performed By': a.performedByName || a.performedBy || '', 'Role': a.performedByRole || '', 'Details': JSON.stringify(a.details || {}) };
                });
                exportToExcel(data, `audit_logs_${filter || 'all'}_${Date.now()}`, 'Audit Logs');
                showToast('Audit logs exported', 'success');
            }).catch(e => showToast('Export failed: ' + e.message, 'danger'));
        }

        async function exportResultsExcel() {
            const examId = document.getElementById('resultsExam')?.value || document.getElementById('teacherResultsExam')?.value || '';
            if (!examId) { showToast('Please select an exam first', 'warning'); return; }

            window.getDocs(window.query(window.collection(window.db, 'results'), window.where('examId', '==', examId)))
                .then(snap => {
                    if (snap.empty) { showToast('No results to export', 'warning'); return; }
                    const data = snap.docs.map(d => {
                        const r = d.data();
                        return { 'Student': r.studentName || r.studentId || '', 'Enrollment': r.enrollment || '', 'Total': r.totalMarks || 0, 'Max': r.maxMarks || 0, '%': r.percentage || 0, 'Grade': r.grade || '' };
                    });
                    exportToExcel(data, `results_${examId}_${Date.now()}`, 'Results');
                    showToast('Results exported', 'success');
                }).catch(e => showToast('Export failed: ' + e.message, 'danger'));
        }

        async function exportResultsPDF() {
            const examId = document.getElementById('resultsExam')?.value || document.getElementById('teacherResultsExam')?.value || '';
            if (!examId) { showToast('Please select an exam first', 'warning'); return; }

            try {
                window.showLoadingMessage('Generating Marksheet PDF...');
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { showToast('Exam not found', 'danger'); return; }
                const exam = examDoc.data();

                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', exam.subjectId));
                const subject = subjectDoc.exists() ? subjectDoc.data() : {};

                const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'), window.where('examId', '==', examId)));
                if (resultsSnap.empty) { showToast('No results available to export', 'warning'); window.hideLoadingMessage(); return; }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                let y = drawPDFHeader(doc, 
                    `Department of ${window.currentUser.department || 'Academic Affairs'}`, 
                    'OFFICIAL EXAMINATION MARKSHEET', 
                    [
                        `Subject: ${subject.name || 'N/A'} (${subject.code || '-'})`,
                        `Exam: ${exam.name} | Year: ${exam.academicYear} | Sem: ${exam.semester}`,
                        `Max Marks: ${exam.totalMarks} | Generated: ${new Date().toLocaleDateString()}`
                    ]
                );
                
                y += 5;

                // TABLE HEADER
                y = 75;
                doc.setFillColor(37, 99, 235);
                doc.rect(15, y, 180, 10, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont(undefined, 'bold');
                doc.text('Sr.', 18, y + 7);
                doc.text('Student Name', 30, y + 7);
                doc.text('Enrollment', 100, y + 7);
                doc.text('Marks', 160, y + 7);
                doc.text('Grade', 180, y + 7);

                // TABLE ROWS
                doc.setTextColor(31, 41, 55);
                doc.setFont(undefined, 'normal');
                y += 10;

                const results = resultsSnap.docs.map(d => d.data()).sort((a, b) => (a.enrollment || '').localeCompare(b.enrollment || ''));

                results.forEach((r, i) => {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    if (i % 2 === 0) {
                        doc.setFillColor(243, 244, 246);
                        doc.rect(15, y, 180, 8, 'F');
                    }
                    doc.text((i + 1).toString(), 18, y + 6);
                    doc.text((r.studentName || 'N/A').substring(0, 30), 30, y + 6);
                    doc.text(r.enrollment || '-', 100, y + 6);
                    doc.text(`${r.totalMarks}/${r.maxMarks}`, 160, y + 6);
                    doc.text(r.grade || '-', 180, y + 6);
                    y += 8;
                });

                doc.save(`Marksheet_${subject.code}_${exam.name.replace(/\s+/g, '_')}.pdf`);
                showToast('Marksheet PDF downloaded successfully', 'success');
                window.hideLoadingMessage();
            } catch (err) {
                console.error(err);
                showToast('PDF Export failed: ' + err.message, 'danger');
                window.hideLoadingMessage();
            }
        }
        window.exportResultsPDF = exportResultsPDF;

        async function importResultsFromExcel() {
            const examId = document.getElementById('importExamSelect').value;
            const fileInput = document.getElementById('resultsExcelFile');
            if (!examId) { showToast('Please select an exam first', 'danger'); return; }
            if (!fileInput.files || !fileInput.files[0]) { showToast('Please select an Excel file', 'danger'); return; }
            const file = fileInput.files[0];
            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { showToast('Exam not found', 'danger'); return; }
                const examData = examDoc.data();
                const isCOBased = (examData.examType === 'ca' || examData.examType === 'ese');

                await importFromExcel(file, async (rows) => {
                    let ok = 0, fail = 0;
                    for (const row of rows) {
                        try {
                            const enrollment = String(row['Enrollment'] || row['enrollment'] || row['PRN'] || row[Object.keys(row)[0]] || '').trim();
                            if (!enrollment) { fail++; continue; }

                            const studentSnap = await window.getDocs(window.query(window.collection(window.db, 'students'), window.where('enrollment', '==', enrollment)));
                            if (studentSnap.empty) {
                                console.warn(`Student with enrollment ${enrollment} not found in database.`);
                                fail++; continue;
                            }
                            const studentDoc = studentSnap.docs[0];
                            const studentData = studentDoc.data();

                            let totalValue = 0;
                            const coMarks = {};
                            const marks = [];
                            let allFilled = true;

                            if (isCOBased) {
                                (examData.courseOutcomes || []).forEach((co, coIdx) => {
                                    (co.criteria || []).forEach((c, cIdx) => {
                                        const key = `${co.name}_C${cIdx + 1}`;
                                        const val = row[key] ?? row[key.toLowerCase()] ?? null;
                                        if (val !== null && val !== '') {
                                            const m = parseFloat(val);
                                            coMarks[key] = m;
                                            totalValue += m;
                                        } else {
                                            coMarks[key] = null;
                                            allFilled = false;
                                        }
                                    });
                                });
                            } else {
                                (examData.criteria || []).forEach((criterion, idx) => {
                                    const colName = `Mark${idx + 1}`;
                                    const val = row[colName] ?? row[criterion.name] ?? null;
                                    if (val !== null && val !== '') {
                                        const m = parseFloat(val);
                                        marks.push(m);
                                        totalValue += m;
                                    } else {
                                        marks.push(null);
                                        allFilled = false;
                                    }
                                });
                            }

                            const isAbsentVal = String(row['Absent'] || row['absent'] || row['Status'] || '').toUpperCase();
                            const isAbsent = isAbsentVal === 'AB' || isAbsentVal === 'ABSENT' || isAbsentVal === 'A';

                            const resultData = {
                                examId, studentId: studentDoc.id, enrollment,
                                studentName: sanitizeString(studentData.name || ''),
                                marks, coMarks,
                                coAttainment: (examData.examType === 'ca' || examData.examType === 'ese') ? [] : [], // Will be recalculated on load if needed
                                totalMarks: isAbsent ? -1 : totalValue,
                                maxMarks: (examData.examType === 'ca' || examData.examType === 'ese') ? Math.round(examData.totalMarks / (examData.courseOutcomes?.length || 1)) : examData.totalMarks,
                                percentage: isAbsent ? 'AB' : (examData.totalMarks ? Math.round((totalValue / examData.totalMarks) * 100) : 0),
                                status: isAbsent ? 'ABSENT' : (allFilled ? 'COMPLETE' : 'INCOMPLETE'),
                                grade: isAbsent ? 'AB' : calculateGrade(examData.totalMarks ? (totalValue / examData.totalMarks) * 100 : 0),
                                division: studentData.division || examData.division || '',
                                batch: studentData.batch || studentData.division || '',
                                academicYear: examData.academicYear || '',
                                semester: examData.semester || '',
                                importedAt: new Date().toISOString(),
                                evaluatedBy: window.currentUser.uid,
                                lifecycleState: 'DRAFT',
                                absent: isAbsent
                            };

                            const existing = await window.getDocs(window.query(window.collection(window.db, 'results'), 
                                window.where('examId', '==', examId), window.where('studentId', '==', studentDoc.id)));
                            
                            if (!existing.empty) {
                                await window.updateDoc(window.doc(window.db, 'results', existing.docs[0].id), resultData);
                            } else {
                                await window.addDoc(window.collection(window.db, 'results'), resultData);
                            }
                            ok++;
                        } catch (rowErr) {
                            console.error('Error processing row:', rowErr);
                            fail++;
                        }
                    }
                    showToast(`Import completed: ${ok} succeeded, ${fail} skipped due to mismatch.`, ok > 0 ? 'success' : 'warning');
                });
                fileInput.value = '';
            } catch (e) {
                console.error(e);
                showToast('Import sequence failed: ' + e.message, 'danger');
            }
        }

        async function importCoordinatorResultsFromExcel() {
            const examId = document.getElementById('coordImportExamSelect').value;
            const fileInput = document.getElementById('coordResultsExcelFile');
            if (!examId) { showToast('Please select an exam first', 'danger'); return; }
            if (!fileInput.files || !fileInput.files[0]) { showToast('Please select an Excel file', 'danger'); return; }
            const file = fileInput.files[0];
            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { showToast('Exam not found', 'danger'); return; }
                const examData = examDoc.data();
                const isCOBased = (examData.examType === 'ca' || examData.examType === 'ese');

                await importFromExcel(file, async (rows) => {
                    let ok = 0, fail = 0;
                    for (const row of rows) {
                        try {
                            const enrollment = String(row['Enrollment'] || row['enrollment'] || row['PRN'] || row[Object.keys(row)[0]] || '').trim();
                            if (!enrollment) { fail++; continue; }

                            const studentSnap = await window.getDocs(window.query(window.collection(window.db, 'students'), window.where('enrollment', '==', enrollment)));
                            if (studentSnap.empty) {
                                console.warn(`Student with enrollment ${enrollment} not found in database.`);
                                fail++; continue;
                            }
                            const studentDoc = studentSnap.docs[0];
                            const studentData = studentDoc.data();

                            let totalValue = 0;
                            const coMarks = {};
                            const marks = [];
                            let allFilled = true;

                            if (isCOBased) {
                                (examData.courseOutcomes || []).forEach((co, coIdx) => {
                                    (co.criteria || []).forEach((c, cIdx) => {
                                        const key = `${co.name}_C${cIdx + 1}`;
                                        const val = row[key] ?? row[key.toLowerCase()] ?? null;
                                        if (val !== null && val !== '') {
                                            const m = parseFloat(val);
                                            coMarks[key] = m;
                                            totalValue += m;
                                        } else {
                                            coMarks[key] = null;
                                            allFilled = false;
                                        }
                                    });
                                });
                            } else {
                                (examData.criteria || []).forEach((criterion, idx) => {
                                    const colName = `Mark${idx + 1}`;
                                    const val = row[colName] ?? row[criterion.name] ?? null;
                                    if (val !== null && val !== '') {
                                        const m = parseFloat(val);
                                        marks.push(m);
                                        totalValue += m;
                                    } else {
                                        marks.push(null);
                                        allFilled = false;
                                    }
                                });
                            }

                            const isAbsentVal = String(row['Absent'] || row['absent'] || row['Status'] || '').toUpperCase();
                            const isAbsent = isAbsentVal === 'AB' || isAbsentVal === 'ABSENT' || isAbsentVal === 'A';

                            const resultData = {
                                examId, studentId: studentDoc.id, enrollment,
                                studentName: sanitizeString(studentData.name || ''),
                                marks, coMarks,
                                coAttainment: (examData.examType === 'ca' || examData.examType === 'ese') ? [] : [],
                                totalMarks: isAbsent ? -1 : totalValue,
                                maxMarks: (examData.examType === 'ca' || examData.examType === 'ese') ? Math.round(examData.totalMarks / (examData.courseOutcomes?.length || 1)) : examData.totalMarks,
                                percentage: isAbsent ? 'AB' : (examData.totalMarks ? Math.round((totalValue / examData.totalMarks) * 100) : 0),
                                status: isAbsent ? 'ABSENT' : (allFilled ? 'COMPLETE' : 'INCOMPLETE'),
                                grade: isAbsent ? 'AB' : calculateGrade(examData.totalMarks ? (totalValue / examData.totalMarks) * 100 : 0),
                                division: studentData.division || examData.division || '',
                                batch: studentData.batch || studentData.division || '',
                                academicYear: examData.academicYear || '',
                                semester: examData.semester || '',
                                importedAt: new Date().toISOString(),
                                evaluatedBy: window.currentUser.uid,
                                lifecycleState: 'DRAFT',
                                isCoordinatorImport: true,
                                absent: isAbsent
                            };

                            const existing = await window.getDocs(window.query(window.collection(window.db, 'results'), 
                                window.where('examId', '==', examId), window.where('studentId', '==', studentDoc.id)));
                            
                            if (!existing.empty) {
                                await window.updateDoc(window.doc(window.db, 'results', existing.docs[0].id), resultData);
                            } else {
                                await window.addDoc(window.collection(window.db, 'results'), resultData);
                            }
                            ok++;
                        } catch (rowErr) {
                            console.error('Error processing row:', rowErr);
                            fail++;
                        }
                    }
                    showToast(`Coordinator Import: ${ok} succeeded, ${fail} skipped.`, ok > 0 ? 'success' : 'warning');
                    if (ok > 0) { logAuditEvent('COORD_IMPORT_RESULTS', { examId, successCount: ok, failCount: fail }); }
                });
                fileInput.value = '';
            } catch (e) {
                console.error(e);
                showToast('Coordinator Import failed: ' + e.message, 'danger');
            }
        }

        window.addQuestion = addQuestion;
        window.downloadQuestionBankTemplate = downloadQuestionBankTemplate;
        window.importQuestionsFromExcel = importQuestionsFromExcel;
        window.importQuestionsFromQB_PDF = importQuestionsFromQB_PDF;
        window.importQuestionsFromPDF = importQuestionsFromPDF;
        window.loadQuestions = loadQuestions;
        window.deleteQuestion = deleteQuestion;
        window.exportQuestionsToExcel = exportQuestionsToExcel;
        window.loadTeachersForDistribution = loadTeachersForDistribution;
        window.executeQuestionMigrationAndDistribution = executeQuestionMigrationAndDistribution;
        window.loadDistributionHistory = loadDistributionHistory;
        window.loadTeacherQuestionDates = loadTeacherQuestionDates;
        window.loadTeacherAssignedQuestions = loadTeacherAssignedQuestions;
        window.exportSubjectsExcel = exportSubjectsExcel;
        window.exportExamsExcel = exportExamsExcel;
        window.exportCoordinatorsExcel = exportCoordinatorsExcel;
        window.exportUsersExcel = exportUsersExcel;
        window.exportAuditLogsExcel = exportAuditLogsExcel;
        window.exportResultsExcel = exportResultsExcel;
        window.importResultsFromExcel = importResultsFromExcel;
        window.importCoordinatorResultsFromExcel = importCoordinatorResultsFromExcel;

        window.exportTeacherQuestionsToExcel = exportTeacherQuestionsToExcel;

        // ========================================
        // END QUESTION BANK FUNCTIONS
        // ========================================


        // Expose showToast globally so firebase-init.js (module) can call it
        window.showToast = showToast;

        // Expose critical UI functions globally for module access
        window.showDashboard = showDashboard;
        window.hideAllDashboards = hideAllDashboards;
        window.logout = logout;
        window.calculateGrade = calculateGrade;
        window.login = login;
        window.signup = signup;
        window.toggleAuth = toggleAuth;
        window.toggleSignupFields = toggleSignupFields;
        window.showForgotPassword = showForgotPassword;
        window.showLogin = showLogin;
        window.sendPasswordReset = sendPasswordReset;
        window.adminCreateUser = adminCreateUser;
        window.toggleAdminCreateFields = toggleAdminCreateFields;
        window.loadAllUsers = loadAllUsers;
        window.approveUser = approveUser;
        window.rejectUser = rejectUser;
        window.deleteUserFromManage = deleteUserFromManage;
        window.toggleTeacherAccount = toggleTeacherAccount;

        // Flush any toast messages that were queued before app.js loaded
        if (typeof window._flushToastQueue === 'function') window._flushToastQueue(showToast);
        window.__appReady = true;

        document.addEventListener('DOMContentLoaded', function () {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    login();
                });
            }
            const signupBtn = document.getElementById('signupBtn');
            if (signupBtn) {
                signupBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    signup();
                });
            }
            const resetPasswordBtn = document.getElementById('resetPasswordBtn');
            if (resetPasswordBtn) {
                resetPasswordBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    sendPasswordReset();
                });
            }
            const showSignupLink = document.getElementById('showSignupLink');
            if (showSignupLink) {
                showSignupLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    toggleAuth();
                });
            }

            const showLoginLink = document.getElementById('showLoginLink');
            if (showLoginLink) {
                showLoginLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    toggleAuth();
                });
            }
            const forgotPasswordLink = document.getElementById('forgotPasswordLink');
            if (forgotPasswordLink) {
                forgotPasswordLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    showForgotPassword();
                });
            }
            const backToLoginLink = document.getElementById('backToLoginLink');
            if (backToLoginLink) {
                backToLoginLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    showLogin();
                });
            }
            document.getElementById('loginPassword')?.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    login();
                }
            });

            document.getElementById('signupPassword')?.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    signup();
                }
            });

            document.getElementById('resetEmail')?.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendPasswordReset();
                }
            });
        });

        window.printAllMarksheets = async function() {
            const examId = document.getElementById("teacherResultsExam")?.value || document.getElementById("teacherExamSelect")?.value;
            if (!examId) {
                showToast("Please select an exam first", "warning");
                return;
            }

            try {
                showToast("Generating marksheets...", "info");
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                const examDoc = await window.getDoc(window.doc(window.db, "exams", examId));
                const examData = examDoc.data();
                
                const subjectDoc = await window.getDoc(window.doc(window.db, "subjects", examData.subjectId));
                const subjectData = subjectDoc.data();

                const resultsSnap = await window.getDocs(window.query(
                    window.collection(window.db, "results"),
                    window.where("examId", "==", examId)
                ));

                if (resultsSnap.empty) {
                    showToast("No results found to print", "warning");
                    return;
                }

                let studentIndex = 0;
                for (const resultDoc of resultsSnap.docs) {
                    const result = resultDoc.data();
                    if (studentIndex > 0) doc.addPage();

                    // --- PROFESSIONAL HEADER ---
                    doc.setFontSize(14);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text("MIT ADT UNIVERSITY, RAJBAUG, PUNE", 105, 12, { align: "center" });
                    
                    doc.setFontSize(10);
                    doc.text(`Department of ${window.currentUser.department || 'Academic Affairs'}`, 105, 18, { align: "center" });
                    
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    doc.text("OFFICIAL STUDENT MARKSHEET", 105, 23, { align: "center" });
                    doc.line(20, 25, 190, 25);

                    doc.setTextColor(33, 37, 41);
                    doc.setFontSize(18);
                    doc.setFont(undefined, "bold");
                    doc.text("STUDENT PROGRESS REPORT", 105, 30, { align: "center" });
                    
                    doc.setFontSize(11);
                    doc.setFont(undefined, "normal");
                    doc.text("Departmental Internal Assessment Record", 105, 36, { align: "center" });
                    doc.line(20, 40, 190, 40);

                    // --- STUDENT INFO BOX ---
                    doc.setFillColor(248, 250, 252);
                    doc.rect(20, 45, 170, 35, 'F');
                    doc.setDrawColor(226, 232, 240);
                    doc.rect(20, 45, 170, 35, 'S');

                    doc.setFontSize(9);
                    doc.setTextColor(100, 116, 139);
                    doc.text("STUDENT NAME", 25, 52);
                    doc.text("ENROLLMENT NO", 25, 65);
                    doc.text("SUBJECT NAME", 105, 52);
                    doc.text("EXAM NAME", 105, 65);

                    doc.setFontSize(11);
                    doc.setTextColor(15, 23, 42);
                    doc.setFont(undefined, "bold");
                    doc.text(result.studentName.toUpperCase(), 25, 58);
                    doc.text(result.enrollment, 25, 71);
                    doc.text(subjectData.name, 105, 58);
                    doc.text(examData.name, 105, 71);

                    // --- MARKS TABLE ---
                    let y = 95;
                    doc.setFontSize(12);
                    doc.text("EVALUATION SUMMARY", 20, y);
                    y += 5;
                    doc.setDrawColor(30, 58, 138);
                    doc.setLineWidth(0.5);
                    doc.line(20, y, 190, y);
                    y += 10;

                    // Table Headers
                    doc.setFontSize(10);
                    doc.text("Course Outcome (CO)", 25, y);
                    doc.text("Description", 70, y);
                    doc.text("Max", 155, y);
                    doc.text("Obtained", 175, y);
                    y += 4;
                    doc.setLineWidth(0.1);
                    doc.line(20, y, 190, y);
                    y += 10;
                    doc.setFont(undefined, "normal");

                    if (examData.examType === "ca" || examData.examType === "ese") {
                        const coList = examData.courseOutcomes || [];
                        coList.forEach((co, coIdx) => {
                            // Section Headers for CA
                            if (examData.examType === "ca") {
                                if (co.name === "CO1") {
                                    doc.setFillColor(239, 246, 255);
                                    doc.rect(20, y - 6, 170, 8, 'F');
                                    doc.setFont(undefined, "bold");
                                    doc.text("UNIT I ASSESSMENT (CO1 - CO3)", 105, y, { align: "center" });
                                    doc.setFont(undefined, "normal");
                                    y += 10;
                                } else if (co.name === "CO4") {
                                    doc.setFillColor(240, 253, 244);
                                    doc.rect(20, y - 6, 170, 8, 'F');
                                    doc.setFont(undefined, "bold");
                                    doc.text("UNIT II ASSESSMENT (CO4 - CO5)", 105, y, { align: "center" });
                                    doc.setFont(undefined, "normal");
                                    y += 10;
                                }
                            }

                            doc.setFont(undefined, "bold");
                            doc.text(co.name, 25, y);
                            doc.setFont(undefined, "normal");
                            
                            // Shorten description if too long
                            let desc = co.description || "N/A";
                            if (desc.length > 45) desc = desc.substring(0, 42) + "...";
                            doc.text(desc, 70, y);

                            let coMax = 0;
                            let coObtained = 0;
                            co.criteria.forEach((c, cIdx) => {
                                const key = `CO${coIdx + 1}_C${cIdx + 1}`;
                                const val = result.coMarks?.[key] || (result.absent ? 0 : 0);
                                coMax += c.maxMarks;
                                coObtained += val;
                            });
                            
                            doc.text(coMax.toString(), 158, y, { align: "right" });
                            doc.text(result.absent ? "AB" : coObtained.toString(), 178, y, { align: "right" });
                            
                            y += 8;
                            doc.setDrawColor(241, 245, 249);
                            doc.line(25, y - 2, 185, y - 2);
                        });
                    } else {
                        // Standard handling
                        examData.criteria.forEach((c, idx) => {
                            doc.text(c.name, 25, y);
                            doc.text(c.maxMarks.toString(), 158, y, { align: "right" });
                            doc.text(result.absent ? "AB" : (result.marks?.[idx] || 0).toString(), 178, y, { align: "right" });
                            y += 8;
                        });
                    }

                    // --- RESULT BLOCK ---
                    y += 10;
                    doc.setFillColor(241, 245, 249);
                    doc.rect(130, y, 60, 25, 'F');
                    doc.setFont(undefined, "bold");
                    doc.setFontSize(11);
                    doc.text("TOTAL MARKS", 135, y + 10);
                    doc.text(`${result.absent ? 'AB' : result.totalMarks} / ${examData.totalMarks}`, 185, y + 10, { align: "right" });
                    
                    doc.text("GRADE", 135, y + 20);
                    doc.text(result.grade || (result.absent ? "AB" : "N/A"), 185, y + 20, { align: "right" });

                    // Final Performance Note
                    doc.setFontSize(10);
                    doc.setFont(undefined, "normal");
                    doc.text(`Aggregate Percentage: ${result.absent ? 'AB' : (parseFloat(result.percentage) || 0).toFixed(2) + '%'}`, 20, y + 10);
                    doc.text(`Attendance Status: ${result.absent ? 'ABSENT' : 'PRESENT'}`, 20, y + 18);

                    // --- SIGNATURE SECTION ---
                    y = 250;
                    doc.line(20, y, 60, y);
                    doc.line(85, y, 125, y);
                    doc.line(150, y, 190, y);
                    
                    doc.setFontSize(9);
                    doc.text("Subject Teacher", 40, y + 5, { align: "center" });
                    doc.text("Coordinator", 105, y + 5, { align: "center" });
                    doc.text("HOD", 170, y + 5, { align: "center" });

                    // Footer
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text("This is an electronically generated marksheet validated by the university evaluation system.", 105, 280, { align: "center" });
                    doc.text(`Digital Signature ID: ${resultDoc.id.substring(0, 12).toUpperCase()} | Timestamp: ${new Date().toLocaleString()}`, 105, 285, { align: "center" });

                    studentIndex++;
                }

                doc.save(`Marksheets_${subjectData.name}_${examData.name}.pdf`);
                showToast("PDF Generated Successfully!", "success");

            } catch (error) {
                console.error("Print Error:", error);
                showToast("Failed to generate PDF: " + error.message, "danger");
            }
        };

        window.viewQuestionAssignment = async function(assignmentId) {
            try {
                const docSnap = await window.getDoc(window.doc(window.db, "teacher_question_assignments", assignmentId));
                if (!docSnap.exists()) { showToast("Assignment not found", "danger"); return; }
                const data = docSnap.data();
                
                let html = `<div style="padding:15px;max-height:60vh;overflow-y:auto;">
                    <h4 style="margin-top:0;">${data.subjectId} - ${data.assignmentDate}</h4>
                    <p style="font-size:13px;color:#666;">Assigned: ${new Date(data.assignedAt).toLocaleString()}</p>
                    <hr>`;
                
                data.questions.forEach((q, i) => {
                    html += `<div style="margin-bottom:15px;padding:12px;background:#f8f9fa;border-radius:8px;border-left:4px solid #3b82f6;">
                        <strong>Q${i + 1} (Unit ${q.unit}, ${q.marks}M):</strong><br>
                        <div style="margin-top:5px;font-size:14px;color:#333;">${q.text || q.questionText || ''}</div>
                    </div>`;
                });
                
                html += `</div>`;
                
                const modal = document.createElement("div");
                modal.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999999;padding:20px;";
                modal.innerHTML = `
                    <div class="card" style="width:100%;max-width:600px;background:white;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2);overflow:hidden;">
                        <div style="padding:15px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;">Question Set Preview</h3>
                            <button onclick="this.closest('div.card').parentElement.remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
                        </div>
                        ${html}
                        <div style="padding:15px;border-top:1px solid #eee;text-align:right;">
                            <button class="btn btn-primary" onclick="this.closest('div.card').parentElement.remove()">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch (e) {
                showToast("Error: " + e.message, "danger");
            }
        };
        async function previewEvaluationSubmission(examId, isReadOnly = false) {
            const modal = document.getElementById('previewModal');
            const body = document.getElementById('previewModalBody');
            const confirmBtn = document.getElementById('confirmFinalizationBtn');
            const modalTitle = modal ? modal.querySelector('h3') : null;

            if (!modal || !body) return;

            modal.style.display = 'flex';
            body.innerHTML = '<div class="loading"><div class="spinner"></div>Generating summary...</div>';

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                if (!examDoc.exists()) { 
                    showToast('Exam not found', 'danger'); 
                    body.innerHTML = '<div class="alert alert-danger"><strong>Error:</strong> Exam not found in database.</div>';
                    return; 
                }
                const examData = examDoc.data();

                const subjectDoc = await window.getDoc(window.doc(window.db, 'subjects', examData.subjectId));
                if (!subjectDoc.exists()) {
                    showToast('Subject not found', 'danger');
                    body.innerHTML = '<div class="alert alert-danger"><strong>Error:</strong> Associated subject not found.</div>';
                    return;
                }
                const subjectData = subjectDoc.data();

                const studentsSnap = await window.getDocs(window.query(window.collection(window.db, 'students'),
                    window.where('class', '==', subjectData.class || ''),
                    window.where('division', '==', subjectData.division || '')));
                
                if (studentsSnap.empty) {
                     showToast('No students found for this class/division', 'warning');
                     // We continue to show the summary but it will be empty
                }

                const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'),
                    window.where('examId', '==', examId)));

                const resultsMap = {};
                resultsSnap.forEach(d => { resultsMap[d.data().studentId] = d.data(); });

                if (isReadOnly) {
                    if (confirmBtn) confirmBtn.style.display = 'none';
                    if (modalTitle) modalTitle.textContent = 'Examination Progress Monitor';
                } else {
                    if (confirmBtn) {
                        confirmBtn.style.display = 'block';
                        confirmBtn.onclick = () => finalizeEvaluationByTeacher(examId);
                    }
                    if (modalTitle) modalTitle.textContent = 'Evaluation Preview & Confirmation';
                }

                const evaluatedCount = resultsSnap.docs.filter(d => d.data().status === 'COMPLETE').length;
                const absentCount = resultsSnap.docs.filter(d => d.data().status === 'ABSENT').length;
                const totalStudents = studentsSnap.size;
                const incompleteCount = totalStudents - evaluatedCount - absentCount;

                let html = '<div style=\"margin-bottom:20px; background:var(--bg-surface2); padding:16px; border-radius:var(--radius); border:1px solid var(--border);\">';
                html += '<h4 style=\"margin:0 0 12px 0; color:var(--primary); font-weight:800;\">Exam Summary</h4>';
                html += '<div style=\"display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:13px; color:var(--text-sub);\">';
                html += '<div><strong>Exam:</strong> <span style=\"color:var(--text-main);\">' + (examData.name || 'N/A') + '</span></div>';
                html += '<div><strong>Subject:</strong> <span style=\"color:var(--text-main);\">' + (subjectData.name || 'N/A') + '</span></div>';
                html += '<div><strong>Status:</strong> <span class=\"badge ' + (examData.status === 'FINALIZED' ? 'badge-danger' : 'badge-success') + '\">' + (examData.status || 'ACTIVE') + '</span></div>';
                html += '</div></div>';

                html += '<div class=\"stats-grid\" style=\"grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:20px;\">';
                html += '<div class=\"stat-card success\"><h3>Evaluated</h3><div class=\"value\">' + evaluatedCount + '</div></div>';
                html += '<div class=\"stat-card warning\"><h3>Absent</h3><div class=\"value\">' + absentCount + '</div></div>';
                html += '<div class=\"stat-card danger\"><h3>Pending</h3><div class=\"value\">' + incompleteCount + '</div></div>';
                html += '</div>';

                if (incompleteCount > 0 && !isReadOnly) {
                    html += '<div class=\"alert alert-warning\" style=\"margin-bottom:20px;\">⚠ <strong>Partially Evaluated:</strong> ' + incompleteCount + ' students pending.</div>';
                }

                html += '<div class=\"card\" style=\"padding:0; overflow-x:auto;\"><table style=\"font-size:13px; margin:0;\">';
                html += '<thead><tr><th>#</th><th>Student</th><th>Marks</th><th>Status</th></tr></thead><tbody>';

                studentsSnap.docs.forEach((sDoc, idx) => {
                    const student = sDoc.data();
                    const res = resultsMap[sDoc.id];
                    const status = res ? (res.absent ? 'ABSENT' : 'COMPLETE') : 'NOT EVALUATED';
                    const marks = res ? (res.absent ? 'AB' : Number(res.totalMarks).toFixed(1)) : '-';
                    const badgeClass = status === 'COMPLETE' ? 'success' : (status === 'ABSENT' ? 'danger' : 'warning');
                    html += '<tr><td>' + (idx + 1) + '</td><td>' + (student.name || 'N/A') + '<br><small>' + (student.enrollment || '-') + '</small></td>';
                    html += '<td><strong>' + marks + ' / ' + (examData.totalMarks || 0) + '</strong></td>';
                    html += '<td><span class=\"badge badge-' + badgeClass + '\">' + status + '</span></td></tr>';
                });

                html += '</tbody></table></div>';
                body.innerHTML = html;

            } catch (err) {
                console.error(err);
                body.innerHTML = '<div class=\"alert alert-danger\">Error: ' + err.message + '</div>';
            }
        }

        function closePreviewModal() {
            const modal = document.getElementById('previewModal');
            if (modal) modal.style.display = 'none';
        }
        window.closePreviewModal = closePreviewModal;

        async function finalizeEvaluationByTeacher(examId) {
            const confirmBtn = document.getElementById('confirmFinalizationBtn');
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Confirming...';

            try {
                const examDoc = await window.getDoc(window.doc(window.db, 'exams', examId));
                const examData = examDoc.data();

                await window.updateDoc(window.doc(window.db, 'exams', examId), {
                    teacherFinalized: true,
                    teacherFinalizedAt: new Date().toISOString(),
                    teacherFinalizedBy: window.currentUser.uid,
                    teacherFinalizedName: window.currentUser.name
                });

                await window.addDoc(window.collection(window.db, 'audit_logs'), {
                    action: 'TEACHER_FINALIZED_EVALUATION',
                    examId,
                    examName: examData.name,
                    subjectId: examData.subjectId,
                    teacherEmail: window.currentUser.email,
                    teacherName: window.currentUser.name,
                    timestamp: new Date().toISOString(),
                    performedBy: window.currentUser.uid,
                    performedByRole: window.currentUser.role,
                    details: `Evaluation for ${examData.name} finalized by teacher.`
                });

                showToast('Evaluation finalized and locked!', 'success');
                closePreviewModal();
                loadEvaluationForm();

            } catch (error) {
                showToast('Finalization failed: ' + error.message, 'danger');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm & Finalize Marks';
            }
        }
        window.finalizeEvaluationByTeacher = finalizeEvaluationByTeacher;

        window.exportExamPDF = (eid) => exportResults(eid, 'pdf');
        window.exportExamResultsExcel = (eid) => exportResults(eid, 'excel');



        // Global Exposure & Bridging
        window.showToast = showToast;
        window.calculateGrade = calculateGrade;
        window.showTeacherSection = showTeacherSection;
        window.showStudentSection = showStudentSection;
        
        // Flush any toast messages that were queued before app.js loaded
        if (typeof window._flushToastQueue === 'function') {
            window._flushToastQueue(showToast);
        }
        
        window.__appReady = true;

        let subjectPassChart = null;
        let coAttainmentChart = null;

        async function loadDepartmentAnalytics() {
            const year = document.getElementById('analyticsYear').value;
            const sem = document.getElementById('analyticsSemester').value;
            const dept = window.currentUser.department;

            try {
                const examsQuery = window.query(
                    window.collection(window.db, 'exams'),
                    window.where('department', '==', dept),
                    window.where('academicYear', '==', year),
                    window.where('semester', '==', sem),
                    window.where('status', '==', 'FINALIZED')
                );
                const examsSnap = await window.getDocs(examsQuery);

                const subjectStats = {};
                const coStats = { 'CO1': 0, 'CO2': 0, 'CO3': 0, 'CO4': 0, 'CO5': 0, 'CO6': 0 };
                const coCounts = { 'CO1': 0, 'CO2': 0, 'CO3': 0, 'CO4': 0, 'CO5': 0, 'CO6': 0 };

                for (const examDoc of examsSnap.docs) {
                    const exam = examDoc.data();
                    const resultsSnap = await window.getDocs(window.query(window.collection(window.db, 'results'), window.where('examId', '==', examDoc.id)));

                    let pass = 0, total = 0;
                    resultsSnap.forEach(rDoc => {
                        const r = rDoc.data();
                        if (r.absent) return;
                        total++;
                        if (parseFloat(r.percentage) >= 40) pass++;

                        if (r.coAttainment) {
                            r.coAttainment.forEach(ca => {
                                if (coStats[ca.co] !== undefined) {
                                    coStats[ca.co] += ca.percentage;
                                    coCounts[ca.co]++;
                                }
                            });
                        }
                    });

                    if (total > 0) {
                        subjectStats[exam.name] = (pass / total) * 100;
                    }
                }

                renderCharts(subjectStats, coStats, coCounts);
                showToast('Analytics generated', 'success');
            } catch (e) {
                showToast('Analytics failed: ' + e.message, 'danger');
            }
        }

        function renderCharts(subjectStats, coStats, coCounts) {
            const ctx1 = document.getElementById('subjectPassChart').getContext('2d');
            const ctx2 = document.getElementById('coAttainmentChart').getContext('2d');

            if (subjectPassChart) subjectPassChart.destroy();
            if (coAttainmentChart) coAttainmentChart.destroy();

            subjectPassChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: Object.keys(subjectStats),
                    datasets: [{
                        label: 'Pass %',
                        data: Object.values(subjectStats),
                        backgroundColor: '#4f46e5'
                    }]
                },
                options: { scales: { y: { beginAtZero: true, max: 100 } } }
            });

            const coLabels = Object.keys(coStats);
            const coData = coLabels.map(l => coCounts[l] > 0 ? coStats[l] / coCounts[l] : 0);

            coAttainmentChart = new Chart(ctx2, {
                type: 'radar',
                data: {
                    labels: coLabels,
                    datasets: [{
                        label: 'Avg Attainment %',
                        data: coData,
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderColor: '#10b981'
                    }]
                },
                options: { scales: { r: { beginAtZero: true, max: 100 } } }
            });
        }
        window.loadDepartmentAnalytics = loadDepartmentAnalytics;

        // ============================================================
        // FACULTY BULK REGISTRATION via Excel (Coordinator Dashboard)
        // ============================================================

        /**
         * Downloads a blank Excel template with the 7 required columns
         * for the Faculty Bulk Registration feature.
         */
        function downloadFacultyTemplate() {
            if (typeof XLSX === 'undefined') {
                showToast('Excel library not loaded. Please refresh the page.', 'danger');
                return;
            }

            const templateData = [
                {
                    'Faculty Name': 'Dr. Example Smith',
                    'Div': 'A',
                    'Batch 1': '✓',
                    'Batch 2': '✓',
                    'Batch 3': '',
                    'Email': 'smith@college.edu',
                    'Number': '9876543210'
                },
                {
                    'Faculty Name': 'Prof. Jane Doe',
                    'Div': 'B',
                    'Batch 1': '✓',
                    'Batch 2': '',
                    'Batch 3': '✓',
                    'Email': 'jane.doe@college.edu',
                    'Number': '8765432109'
                }
            ];

            const ws = XLSX.utils.json_to_sheet(templateData, {
                header: ['Faculty Name', 'Div', 'Batch 1', 'Batch 2', 'Batch 3', 'Email', 'Number']
            });

            // Set column widths
            ws['!cols'] = [
                { wch: 25 }, // Faculty Name
                { wch: 8 },  // Div
                { wch: 10 }, // Batch 1
                { wch: 10 }, // Batch 2
                { wch: 10 }, // Batch 3
                { wch: 30 }, // Email
                { wch: 15 }  // Number
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Faculty Registration');
            XLSX.writeFile(wb, 'Faculty_Registration_Template.xlsx');
            showToast('✅ Template downloaded! Fill in the details and upload.', 'success', 4000);
        }

        /**
         * Parses a raw Excel row into a structured faculty object.
         * Returns null if the row is invalid.
         */
        function _parseSingleFacultyRow(row, idx) {
            const keys = Object.keys(row);
            const get = (variants) => {
                const k = keys.find(k => variants.some(v => k.trim().toLowerCase() === v.toLowerCase()));
                return k ? String(row[k]).trim() : '';
            };

            const isTicked = (val) => {
                if (!val) return false;
                const s = String(val).trim().toLowerCase();
                return ['✓', 'true', 'yes', '1', 'x', 'y', '✔', '☑'].includes(s) || s === 'true';
            };

            const name = sanitizeString(get(['faculty name', 'facultyname', 'name', 'teacher name', 'teachername', 'full name', 'fullname']), 100);
            const division = get(['div', 'division', 'section']);
            const batch1 = isTicked(get(['batch 1', 'batch1', 'b1', 'batch-1']));
            const batch2 = isTicked(get(['batch 2', 'batch2', 'b2', 'batch-2']));
            const batch3 = isTicked(get(['batch 3', 'batch3', 'b3', 'batch-3']));
            const email = get(['email', 'email address', 'emailaddress', 'mail']).toLowerCase();
            const phone = get(['number', 'phone', 'mobile', 'contact', 'mobile no', 'phone no', 'phoneno', 'numberno']);

            const errors = [];

            if (!name || name === 'N/A') errors.push('Faculty Name missing');
            if (!division) errors.push('Division (Div) missing');
            if (!email) {
                errors.push('Email missing');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push(`Invalid email format: ${email}`);
            }
            if (!phone) {
                errors.push('Phone Number missing');
            } else if (String(phone).replace(/\D/g, '').length < 6) {
                errors.push(`Number too short (min 6 digits): ${phone}`);
            }

            const tickedCount = [batch1, batch2, batch3].filter(Boolean).length;
            if (tickedCount < 2) {
                errors.push(`Only ${tickedCount} batch(es) ticked — at least 2 required`);
            }

            const batches = [];
            if (batch1) batches.push(1);
            if (batch2) batches.push(2);
            if (batch3) batches.push(3);

            return {
                rowNum: idx + 2, // +2 because row 1 is header, +1 for 0-index
                name,
                division,
                batch1,
                batch2,
                batch3,
                batches,
                email,
                phone: String(phone).replace(/\D/g, ''), // digits only for password
                errors,
                valid: errors.length === 0
            };
        }

        // Internal: stores parsed faculty data between upload and import
        window._facultyImportData = [];

        /**
         * Handles the file input change event. Reads and parses the Excel file,
         * then renders a preview table.
         */
        function handleFacultyExcelUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const preview = document.getElementById('facultyExcelPreview');
            const importActions = document.getElementById('facultyImportActions');
            window._facultyImportData = [];

            if (!file.name.match(/\.(xlsx|xls)$/i)) {
                showToast('Please select a valid Excel file (.xlsx or .xls)', 'danger');
                event.target.value = '';
                return;
            }

            if (typeof XLSX === 'undefined') {
                showToast('Excel library not loaded. Please refresh the page.', 'danger');
                return;
            }

            preview.innerHTML = '<p style="color:var(--gray-500);padding:12px;">⏳ Parsing Excel file...</p>';
            importActions.style.display = 'none';

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        showToast('Excel file has no sheets', 'danger');
                        preview.innerHTML = '';
                        return;
                    }

                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

                    if (!jsonData || jsonData.length === 0) {
                        preview.innerHTML = '<div class="alert alert-danger"><strong>No data found</strong> in the Excel sheet. Ensure there is a header row and at least one data row.</div>';
                        return;
                    }

                    // Parse all rows
                    const parsed = jsonData.map((row, idx) => _parseSingleFacultyRow(row, idx));
                    const valid = parsed.filter(r => r.valid);
                    const invalid = parsed.filter(r => !r.valid);

                    window._facultyImportData = valid;

                    // Build preview HTML
                    let html = '';

                    if (invalid.length > 0) {
                        html += `<div class="alert alert-warning" style="margin-bottom:12px;">
                            <strong>⚠️ ${invalid.length} row(s) have errors</strong> and will be skipped:<br>
                            <ul style="margin:8px 0 0 18px;font-size:12px;">
                                ${invalid.slice(0, 8).map(r => `<li>Row ${r.rowNum}: ${r.errors.join(', ')}</li>`).join('')}
                                ${invalid.length > 8 ? `<li>... and ${invalid.length - 8} more</li>` : ''}
                            </ul>
                        </div>`;
                    }

                    if (valid.length === 0) {
                        html += '<div class="alert alert-danger"><strong>No valid faculty rows found.</strong> Please fix the errors above and re-upload.</div>';
                        preview.innerHTML = html;
                        importActions.style.display = 'none';
                        return;
                    }

                    html += `<div class="alert alert-success" style="margin-bottom:12px;">
                        <strong>✅ ${valid.length} faculty record(s)</strong> ready to import
                        ${invalid.length > 0 ? `&nbsp;(${invalid.length} skipped)` : ''}.
                    </div>`;

                    html += `<div style="overflow-x:auto;"><table style="font-size:12px;width:100%;">
                        <thead>
                            <tr>
                                <th style="padding:6px 10px;background:var(--gray-100);">#</th>
                                <th style="padding:6px 10px;background:var(--gray-100);">Faculty Name</th>
                                <th style="padding:6px 10px;background:var(--gray-100);">Div</th>
                                <th style="padding:6px 10px;background:var(--gray-100);text-align:center;">Batch 1</th>
                                <th style="padding:6px 10px;background:var(--gray-100);text-align:center;">Batch 2</th>
                                <th style="padding:6px 10px;background:var(--gray-100);text-align:center;">Batch 3</th>
                                <th style="padding:6px 10px;background:var(--gray-100);">Email</th>
                                <th style="padding:6px 10px;background:var(--gray-100);">Number</th>
                            </tr>
                        </thead>
                        <tbody>`;

                    const previewRows = valid.slice(0, 12);
                    previewRows.forEach((r, i) => {
                        html += `<tr style="border-bottom:1px solid var(--gray-100);">
                            <td style="padding:5px 10px;color:var(--gray-500);">${i + 1}</td>
                            <td style="padding:5px 10px;font-weight:500;">${sanitizeString(r.name, 40)}</td>
                            <td style="padding:5px 10px;">${sanitizeString(r.division, 10)}</td>
                            <td style="padding:5px 10px;text-align:center;">${r.batch1 ? '<span style="color:#10b981;font-weight:700;">✓</span>' : '<span style="color:var(--gray-300);">—</span>'}</td>
                            <td style="padding:5px 10px;text-align:center;">${r.batch2 ? '<span style="color:#10b981;font-weight:700;">✓</span>' : '<span style="color:var(--gray-300);">—</span>'}</td>
                            <td style="padding:5px 10px;text-align:center;">${r.batch3 ? '<span style="color:#10b981;font-weight:700;">✓</span>' : '<span style="color:var(--gray-300);">—</span>'}</td>
                            <td style="padding:5px 10px;font-size:11px;">${sanitizeString(r.email, 40)}</td>
                            <td style="padding:5px 10px;">${r.phone.substring(0, 4)}****</td>
                        </tr>`;
                    });

                    if (valid.length > 12) {
                        html += `<tr><td colspan="8" style="padding:8px;text-align:center;color:var(--gray-500);font-style:italic;">... and ${valid.length - 12} more</td></tr>`;
                    }

                    html += '</tbody></table></div>';
                    preview.innerHTML = html;
                    importActions.style.display = 'block';

                } catch (err) {
                    console.error('Faculty Excel parse error:', err);
                    showToast('Failed to parse Excel file. Please check the format.', 'danger');
                    preview.innerHTML = '<div class="alert alert-danger">Failed to parse the file. Make sure it is a valid .xlsx file.</div>';
                }
            };
            reader.onerror = function () {
                showToast('Failed to read Excel file', 'danger');
            };
            reader.readAsArrayBuffer(file);
        }

        /**
         * Iterates over parsed faculty data and creates Firebase Auth + Firestore accounts
         * for each valid row. Uses the secondary auth instance to avoid signing out the coordinator.
         */
        async function importFacultyFromExcel() {
            const data = window._facultyImportData || [];
            if (data.length === 0) {
                showToast('No valid faculty data to import. Please upload an Excel file first.', 'warning');
                return;
            }

            if (!window.currentUser || !['coordinator', 'hod'].includes(window.currentUser.role)) {
                showToast('Access Denied: Only Coordinator or HOD can bulk-import faculty.', 'danger');
                return;
            }

            const importBtn = document.getElementById('importFacultyBtn');
            if (importBtn) {
                importBtn.disabled = true;
                importBtn.innerHTML = '<span>⏳</span> Importing...';
            }

            const results = [];
            let successCount = 0;
            let failCount = 0;

            window.showLoadingMessage(`Importing faculty (0 / ${data.length})...`);

            for (let i = 0; i < data.length; i++) {
                const faculty = data[i];
                window.showLoadingMessage(`Importing faculty (${i + 1} / ${data.length}): ${faculty.name}...`);

                try {
                    // Check for duplicate email in Firestore
                    const dupCheck = await window.getDocs(
                        window.query(
                            window.collection(window.db, 'users'),
                            window.where('email', '==', faculty.email)
                        )
                    );

                    if (!dupCheck.empty) {
                        results.push({ ...faculty, status: 'SKIPPED', reason: 'Email already exists in system' });
                        failCount++;
                        continue;
                    }

                    // Create Firebase Auth account using secondary auth (preserves coordinator session)
                    const authToUse = window.secondaryAuth || window.auth;
                    const userCredential = await window.createUserWithEmailAndPassword(authToUse, faculty.email, faculty.phone);
                    const newUser = userCredential.user;

                    // Build Firestore user document
                    const userData = {
                        name: faculty.name,
                        email: faculty.email,
                        role: 'teacher',
                        division: faculty.division,
                        batches: faculty.batches,
                        batch1: faculty.batch1,
                        batch2: faculty.batch2,
                        batch3: faculty.batch3,
                        phone: faculty.phone,
                        department: window.currentUser.department || '',
                        approved: true,
                        approvalStatus: 'approved',
                        adminCreated: true,
                        bulkImported: true,
                        examRestricted: false,
                        isActive: true,
                        isDeleted: false,
                        createdAt: new Date().toISOString(),
                        createdBy: window.currentUser.uid,
                        createdByName: window.currentUser.name,
                        createdByRole: window.currentUser.role,
                        lastModifiedBy: window.currentUser.uid,
                        lastModifiedAt: new Date().toISOString(),
                        modificationHistory: []
                    };

                    await window.setDoc(window.doc(window.db, 'users', newUser.uid), userData);

                    // Sign out secondary auth to clean up the session
                    if (window.secondaryAuth) {
                        await window.signOut(window.secondaryAuth);
                    }

                    // Audit log entry
                    await window.addDoc(window.collection(window.db, 'audit_logs'), {
                        action: 'BULK_IMPORT_FACULTY',
                        createdUserId: newUser.uid,
                        createdUserEmail: faculty.email,
                        createdUserName: faculty.name,
                        createdUserRole: 'teacher',
                        division: faculty.division,
                        batches: faculty.batches,
                        performedBy: window.currentUser.uid,
                        performedByName: window.currentUser.name,
                        performedByRole: window.currentUser.role,
                        timestamp: new Date().toISOString(),
                        metadata: {
                            department: window.currentUser.department || null,
                            bulkImport: true
                        }
                    });

                    results.push({ ...faculty, status: 'SUCCESS', reason: '', uid: newUser.uid });
                    successCount++;

                } catch (err) {
                    let reason = err.message || 'Unknown error';
                    if (err.code === 'auth/email-already-in-use') reason = 'Email already registered in Firebase Auth';
                    else if (err.code === 'auth/weak-password') reason = 'Password (number) is too weak (< 6 chars)';
                    else if (err.code === 'auth/invalid-email') reason = 'Invalid email format';

                    results.push({ ...faculty, status: 'FAILED', reason });
                    failCount++;
                    console.error(`Faculty import failed for ${faculty.email}:`, err);
                }
            }

            window.hideLoadingMessage();

            // Reset UI
            if (importBtn) {
                importBtn.disabled = false;
                importBtn.innerHTML = '<span>🚀</span> Import Faculty Accounts';
            }
            window._facultyImportData = [];

            // Show summary toast
            const msg = `Import complete: ${successCount} created, ${failCount} failed/skipped.`;
            showToast(successCount > 0 ? `✅ ${msg}` : `⚠️ ${msg}`, successCount > 0 ? 'success' : 'warning', 7000);

            // Refresh teacher list
            if (typeof loadTeacherAccountList === 'function') loadTeacherAccountList();

            // Offer to download the report
            if (results.length > 0) {
                setTimeout(() => exportFacultyRegistrationReport(results), 800);
            }
        }

        /**
         * Exports a summary Excel report of the bulk import results.
         * Called automatically after importFacultyFromExcel completes.
         */
        function exportFacultyRegistrationReport(results) {
            if (!results || results.length === 0) return;

            if (typeof XLSX === 'undefined') {
                showToast('Cannot export report: Excel library not loaded.', 'danger');
                return;
            }

            const reportData = results.map(r => ({
                'Faculty Name': r.name || '',
                'Division': r.division || '',
                'Batch 1': r.batch1 ? '✓' : '',
                'Batch 2': r.batch2 ? '✓' : '',
                'Batch 3': r.batch3 ? '✓' : '',
                'Email': r.email || '',
                'Status': r.status || '',
                'Reason / Notes': r.reason || (r.status === 'SUCCESS' ? 'Account created successfully' : '')
            }));

            const ws = XLSX.utils.json_to_sheet(reportData, {
                header: ['Faculty Name', 'Division', 'Batch 1', 'Batch 2', 'Batch 3', 'Email', 'Status', 'Reason / Notes']
            });
            ws['!cols'] = [
                { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 40 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Import Report');
            const fname = `Faculty_Import_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, fname);
            showToast('📊 Import report downloaded!', 'info', 3000);
        }

        // Expose new faculty registration functions globally
        window.downloadFacultyTemplate = downloadFacultyTemplate;
        window.handleFacultyExcelUpload = handleFacultyExcelUpload;
        window.importFacultyFromExcel = importFacultyFromExcel;
        window.exportFacultyRegistrationReport = exportFacultyRegistrationReport;

        console.log("Evaluator v1.0.9: App logic initialized and bridged.");

