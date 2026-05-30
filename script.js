/* ==============================================
   PORTFOLIO GAME — SHARED JAVASCRIPT
   script.js
   ============================================== */

'use strict';

/* ─────────────────────────────────────────────
   1.  STORAGE HELPERS
───────────────────────────────────────────── */

const Store = {
    // ── Auth ──
    getUsers()        { return JSON.parse(localStorage.getItem('pg_users')   || '{}'); },
    saveUsers(u)      { localStorage.setItem('pg_users', JSON.stringify(u)); },
    deleteUser(username) { const users = this.getUsers(); delete users[username.toLowerCase()]; localStorage.setItem('pg_users', JSON.stringify(users)); },

    getSession()      { return JSON.parse(localStorage.getItem('pg_session') || 'null'); },
    saveSession(u)    { localStorage.setItem('pg_session', JSON.stringify(u)); },
    clearSession()    { localStorage.removeItem('pg_session'); },

    // ── Scores ──
    getHighScores()   { return JSON.parse(localStorage.getItem('pg_hiscores') || '{}'); },
    getHighScore(usr) { return this.getHighScores()[usr] || 0; },
    saveHighScore(usr, score) {
        const hs = this.getHighScores();
        if (score > (hs[usr] || 0)) { hs[usr] = score; localStorage.setItem('pg_hiscores', JSON.stringify(hs)); return true; }
        return false;
    },

    // ── Achievements ──
    getAchievements(usr) { return JSON.parse(localStorage.getItem(`pg_ach_${usr}`) || '[]'); },
    addAchievement(usr, id) {
        const list = this.getAchievements(usr);
        if (!list.includes(id)) { list.push(id); localStorage.setItem(`pg_ach_${usr}`, JSON.stringify(list)); return true; }
        return false;
    },

    // ── Game Unlock ──
    isPortfolioUnlocked(usr) { return localStorage.getItem(`pg_unlocked_${usr}`) === '1'; },
    unlockPortfolio(usr)     { localStorage.setItem(`pg_unlocked_${usr}`, '1'); },

    // ── Last Score ──
    setLastScore(usr, score) { localStorage.setItem(`pg_lastscore_${usr}`, score); },
    getLastScore(usr)        { return parseInt(localStorage.getItem(`pg_lastscore_${usr}`) || '0'); },
};

/* ─────────────────────────────────────────────
   2.  AUTH HELPERS
───────────────────────────────────────────── */

const Auth = {
    /** Returns user object or null */
    login(username, password) {
        const users = Store.getUsers();
        const key = username.trim().toLowerCase();
        if (!users[key]) return { error: 'Username not found. Please sign up first.' };
        if (users[key].password !== btoa(password)) return { error: 'Incorrect password.' };
        const user = { username: users[key].display };
        Store.saveSession(user);
        return { user };
    },
    //Validation
    signup(username, password, confirmPassword) {
        if (!username || !password) return { error: 'All fields are required.' };
        if (username.length < 4) return { error: 'Username must be at least 4 characters.' };
        if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
        if (password !== confirmPassword) return { error: 'Passwords do not match.' };

        const users  = Store.getUsers();
        const key    = username.trim().toLowerCase();
        if (users[key]) return { error: 'Username already taken. Try another one.' };

        users[key] = { display: username.trim(), password: btoa(password) };
        Store.saveUsers(users);
        const user = { username: username.trim() };
        Store.saveSession(user);
        return { user };
    },

    logout() {
        Store.clearSession();
        window.location.href = 'index.html';
    },

    /** Redirect to login if no session */
    require() {
        const s = Store.getSession();
        if (!s) { window.location.href = 'index.html'; return null; }
        return s;
    },
};

/* ─────────────────────────────────────────────
   3.  LEVEL SYSTEM
───────────────────────────────────────────── */

const LevelSystem = {
    thresholds: [0, 200, 500, 1000, 2000, 3500, 5500],
    titles:    ['ROOKIE', 'HACKER', 'CODER', 'WIZARD', 'LEGEND', 'MYTHIC', 'GODMODE'],

    getLevel(score) {
        let lvl = 0;
        for (let i = 0; i < this.thresholds.length; i++) {
            if (score >= this.thresholds[i]) lvl = i + 1;
        }
        return Math.min(lvl, this.titles.length);
    },

    getTitle(score)    { return this.titles[this.getLevel(score) - 1] || 'ROOKIE'; },
    getNextThreshold(score) {
        const lvl = this.getLevel(score);
        return this.thresholds[lvl] || null; // null = max level
    },
    getProgress(score) {
        const lvl   = this.getLevel(score);
        const curr  = this.thresholds[lvl - 1] || 0;
        const next  = this.thresholds[lvl];
        if (!next) return 100;
        return Math.round(((score - curr) / (next - curr)) * 100);
    },
};

/* ─────────────────────────────────────────────
   4.  ACHIEVEMENTS
───────────────────────────────────────────── */

const Achievements = {
    list: [
        { id: 'first_login',    icon: '🎮', title: 'WELCOME, PLAYER',   desc: 'Logged in for the first time.'      },
        { id: 'first_win',      icon: '🏆', title: 'GAME CLEARED',      desc: 'Completed the orb collection game.' },
        { id: 'speed_demon',    icon: '⚡', title: 'SPEED DEMON',       desc: 'Scored 800+ in a single game.'      },
        { id: 'high_scorer',    icon: '🌟', title: 'HIGH SCORER',       desc: 'Reached a high score of 1000+.'     },
        { id: 'comeback_kid',   icon: '💪', title: 'COMEBACK KID',      desc: 'Played again after game over.'      },
        { id: 'level5',         icon: '🔥', title: 'LEGEND STATUS',     desc: 'Reached Level 5 or above.'          },
        { id: 'perfectionist',  icon: '💎', title: 'PERFECTIONIST',     desc: 'Collected all orbs before timeout.' },
    ],

    /** Award an achievement and show toast. Returns true if newly unlocked. */
    award(username, id) {
        const def  = this.list.find(a => a.id === id);
        if (!def)  return false;
        const isNew = Store.addAchievement(username, id);
        if (isNew) {
            Toast.show(def.icon + ' ACHIEVEMENT UNLOCKED', def.title, def.desc);
        }
        return isNew;
    },
};

/* ─────────────────────────────────────────────
   5.  ACHIEVEMENT TOAST UI
───────────────────────────────────────────── */

const Toast = {
    timer: null,

    show(label, title, desc) {
        let el = document.getElementById('achievement-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'achievement-toast';
            el.innerHTML = `
                <div class="toast-label" id="toast-label"></div>
                <div class="toast-title" id="toast-title"></div>
                <div class="toast-desc"  id="toast-desc"></div>`;
            document.body.appendChild(el);
        }

        document.getElementById('toast-label').textContent = label;
        document.getElementById('toast-title').textContent = title;
        document.getElementById('toast-desc').textContent  = desc;

        el.classList.add('show');
        clearTimeout(this.timer);
        this.timer = setTimeout(() => el.classList.remove('show'), 4000);
    },
};

/* ─────────────────────────────────────────────
   6.  CUSTOM CURSOR
───────────────────────────────────────────── */

const Cursor = {
    init() {
        const wisp  = document.getElementById('cursor-wisp');
        const trail = document.getElementById('cursor-trail');
        if (!wisp || !trail) return;

        document.addEventListener('mousemove', e => {
            trail.style.left = e.clientX + 'px';
            trail.style.top  = e.clientY + 'px';
            setTimeout(() => {
                wisp.style.left = e.clientX + 'px';
                wisp.style.top  = e.clientY + 'px';
            }, 70);
            
        });

        document.addEventListener('mousedown', () => {
            wisp.style.transform    = 'translate(-50%,-50%) scale(0.7)';
            wisp.style.borderColor  = 'var(--neon-pink)';
        });

        document.addEventListener('mouseup', () => {
            wisp.style.transform    = 'translate(-50%,-50%) scale(1)';
            wisp.style.borderColor  = 'var(--neon-cyan)';
        });

        // Enlarge on interactive elements
        document.querySelectorAll('a, button, .rpg-btn, input, .card, .project-card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                wisp.style.width           = '50px';
                wisp.style.height          = '50px';
                wisp.style.backgroundColor = 'rgba(51, 204, 255, 0.1)';
            });
            el.addEventListener('mouseleave', () => {
                wisp.style.width           = '30px';
                wisp.style.height          = '30px';
                wisp.style.backgroundColor = 'transparent';
            });
        });
    },
};

/* ─────────────────────────────────────────────
   7.  STAR FIELD BACKGROUND
───────────────────────────────────────────── */

const StarField = {
    init(container = document.body, count = 60) {
        const wrap = document.createElement('div');
        wrap.className = 'stars';
        for (let i = 0; i < count; i++) {
            const s = document.createElement('div');
            s.className = 'star';
            s.style.left     = Math.random() * 100 + 'vw';
            s.style.top      = Math.random() * 100 + 'vh';
            s.style.setProperty('--dur',   (2 + Math.random() * 4) + 's');
            s.style.setProperty('--delay', (Math.random() * 4) + 's');
            wrap.appendChild(s);
        }
        container.prepend(wrap);
    },
};

/* ─────────────────────────────────────────────
   8.  PAGE TRANSITION
───────────────────────────────────────────── */

function navigate(url, delay = 300) {
    document.body.style.opacity    = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    setTimeout(() => { window.location.href = url; }, delay);
}

/* ─────────────────────────────────────────────
   9.  ON LOAD FADE-IN
───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity    = '0';
    document.body.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });
});
