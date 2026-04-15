/* ── DARK MODE ─────────────────────────────────────────────── */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cx-theme', theme);
    const icon = document.getElementById('toggleIcon');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Apply saved theme immediately (before DOM loads) to avoid flash
(function () {
    const saved = localStorage.getItem('cx-theme');
    if (saved) applyTheme(saved);
})();


/* ── NAVIGATION ────────────────────────────────────────────── */
async function loadNavigation() {
    try {
        const response = await fetch('/api/get/web_config/state/1');
        const pages = await response.json();
        renderNav(pages);
    } catch (error) {
        console.error('Error loading navigation:', error);
        renderNav([
            { page_name: '', page_display: 'Home' },
            { page_name: 'schedule', page_display: 'Schedule' }
        ]);
    }
}

function renderNav(pages) {
    const navMenu = document.getElementById('navMenu');
    const mobileDropdownMenu = document.getElementById('mobileDropdownMenu');
    if (!navMenu || !mobileDropdownMenu) return;

    navMenu.innerHTML = '';
    mobileDropdownMenu.innerHTML = '';

    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';

    pages.forEach(page => {
        const href = page.page_name === '' ? '/' : `/${page.page_name}`;
        const normalizedHref = href.replace(/\/$/, '') || '/';
        const isActive = currentPath === normalizedHref;

        // ── Desktop item ──
        const li = document.createElement('li');
        li.className = 'nav-item';
        const a = document.createElement('a');
        a.href = href;
        a.textContent = page.page_display;
        if (isActive) a.classList.add('active');
        li.appendChild(a);
        navMenu.appendChild(li);

        // ── Mobile item ──
        const mLi = document.createElement('li');
        mLi.className = 'mobile-dropdown-item';
        const mA = document.createElement('a');
        mA.href = href;
        mA.textContent = page.page_display;
        if (isActive) {
            mA.style.color = 'var(--mobile-item-hover-color)';
            mA.style.borderLeftColor = 'var(--normgreen)';
        }
        mLi.appendChild(mA);
        mobileDropdownMenu.appendChild(mLi);
    });

    // Add "Join us Today" at the bottom of mobile dropdown
    const joinLi = document.createElement('li');
    joinLi.className = 'mobile-dropdown-item mobile-join-item';
    const joinA = document.createElement('a');
    joinA.href = '/register';
    joinA.innerHTML = '<i class="fas fa-paper-plane" style="margin-right:6px;"></i> Join us Today';
    joinLi.appendChild(joinA);
    mobileDropdownMenu.appendChild(joinLi);
}


/* ── AUTH BUTTONS ──────────────────────────────────────────── */
async function loadAuthButtons() {
    const isMobile = window.innerWidth < 480;
    try {
        const response = await fetch('/api/auth/me');

        if (response.ok) {
            const user = await response.json();
            const displayName = isMobile
                ? user.nickname.substring(0, 10) + (user.nickname.length > 10 ? '…' : '')
                : user.nickname;

            document.getElementById('authButtons').innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${user.nickname.charAt(0).toUpperCase()}</div>
                    <span>${displayName}</span>
                </div>
                <button class="logout-btn" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>${isMobile ? '' : ' Logout'}
                </button>
            `;

        } else {
            document.getElementById('authButtons').innerHTML = `
                <a href="/login" class="login-btn">
                    <i class="fas fa-user"></i>${isMobile ? '' : ' Sign in / up'}
                </a>
            `;
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        document.getElementById('authButtons').innerHTML = `
            <a href="/login" class="login-btn">
                <i class="fas fa-user"></i> Sign in / up
            </a>
        `;
    }
}


/* ── MOBILE MENU ───────────────────────────────────────────── */
function toggleMobileMenu() {
    const mobileDropdown = document.getElementById('mobileDropdown');
    const btn = document.querySelector('.mobile-menu-toggle');
    if (!mobileDropdown) return;

    mobileDropdown.classList.toggle('active');
    const icon = btn.querySelector('i');
    icon.className = mobileDropdown.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
}

function closeMobileMenu() {
    const mobileDropdown = document.getElementById('mobileDropdown');
    const btn = document.querySelector('.mobile-menu-toggle');
    if (!mobileDropdown) return;
    mobileDropdown.classList.remove('active');
    if (btn) btn.querySelector('i').className = 'fas fa-bars';
}

// Close when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('mobileDropdown');
    const toggle = document.querySelector('.mobile-menu-toggle');
    if (!dropdown || !toggle) return;
    if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
        closeMobileMenu();
    }
});

// Resize handler
window.addEventListener('resize', function () {
    if (window.innerWidth > 960) closeMobileMenu();
    loadAuthButtons();
});


/* ── LOGOUT ────────────────────────────────────────────────── */
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}


/* ── INIT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    loadNavigation();
    loadAuthButtons();

    // Sync toggle icon with current theme
    const saved = localStorage.getItem('cx-theme') || 'light';
    const icon = document.getElementById('toggleIcon');
    if (icon) icon.textContent = saved === 'dark' ? '🌙' : '☀️';
});