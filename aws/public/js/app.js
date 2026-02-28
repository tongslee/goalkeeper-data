const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');

// Check auth on load
document.addEventListener('DOMContentLoaded', async () => {
    if (token) {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
                updateNav();
            } else {
                localStorage.removeItem('token');
                token = null;
            }
        } catch (e) {
            console.error('Auth check failed:', e);
        }
    }
    
    // Load initial page
    loadPage(window.location.pathname);
});

function updateNav() {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    
    if (currentUser) {
        loginLink.textContent = `Hi, ${currentUser.display_name || currentUser.username}`;
        loginLink.href = '/dashboard';
        registerLink.style.display = 'inline';
    } else {
        loginLink.textContent = 'Login';
        loginLink.href = '/login';
        registerLink.style.display = 'inline';
    }
}

async function loadPage(path) {
    const app = document.getElementById('app');
    
    if (path === '/' || path === '') {
        app.innerHTML = await fetch('/pages/home.html').then(r => r.text()).catch(() => homePage());
        loadPublicPlayers();
    } else if (path === '/players') {
        app.innerHTML = playersPage();
        loadPublicPlayers();
    } else if (path === '/login') {
        app.innerHTML = loginPage();
    } else if (path === '/register') {
        app.innerHTML = registerPage();
    } else if (path === '/dashboard') {
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }
        app.innerHTML = dashboardPage();
        loadMyPlayers();
    }
}

function homePage() {
    return `
        <div class="hero">
            <h1>Track Goalkeeper Stats 🧤</h1>
            <p>Track, analyze, and share goalkeeper performance across competitions and seasons.</p>
            ${currentUser ? '' : '<div class="cta-buttons"><a href="/register" class="btn btn-primary">Get Started Free</a><a href="/login" class="btn btn-secondary">Login</a></div>'}
        </div>
        <div class="features">
            <div class="feature"><h3>📊 Track Performance</h3><p>Record matches, saves, clean sheets, and more.</p></div>
            <div class="feature"><h3>🔍 Search & Compare</h3><p>Find goalkeepers by team, competition, or season.</p></div>
            <div class="feature"><h3>🌍 Share with Friends</h3><p>Make your stats public and share.</p></div>
        </div>
        <div id="publicPlayers"></div>
    `;
}

function playersPage() {
    return `
        <h2>Find Goalkeepers</h2>
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search players..." onkeyup="searchPlayers(this.value)">
        </div>
        <div id="playersList"></div>
    `;
}

function loginPage() {
    return `
        <div class="auth-form">
            <h2>Login</h2>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <p class="auth-link">Don't have an account? <a href="/register">Register</a></p>
        </div>
    `;
}

function registerPage() {
    return `
        <div class="auth-form">
            <h2>Register</h2>
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" required minlength="3">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required minlength="8">
                </div>
                <div class="form-group">
                    <label>Display Name</label>
                    <input type="text" name="display_name">
                </div>
                <button type="submit" class="btn btn-primary">Create Account</button>
            </form>
            <p class="auth-link">Already have an account? <a href="/login">Login</a></p>
        </div>
    `;
}

function dashboardPage() {
    return `
        <h2>My Dashboard</h2>
        <button class="btn btn-primary" onclick="showAddPlayer()">+ Add Player</button>
        <div id="myPlayers"></div>
    `;
}

async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        const result = await res.json();
        token = result.token;
        currentUser = result.user;
        localStorage.setItem('token', token);
        updateNav();
        window.location.href = '/dashboard';
    } else {
        alert('Login failed');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        const result = await res.json();
        token = result.token;
        currentUser = result.user;
        localStorage.setItem('token', token);
        updateNav();
        window.location.href = '/dashboard';
    } else {
        const err = await res.json();
        alert(err.error || 'Registration failed');
    }
}

async function loadPublicPlayers() {
    try {
        const res = await fetch(`${API_URL}/players`);
        const data = await res.json();
        
        if (data.players && data.players.length > 0) {
            const container = document.getElementById('publicPlayers');
            if (container) {
                container.innerHTML = `
                    <h2>🌟 Popular Goalkeepers</h2>
                    <table class="stats-table">
                        <thead><tr><th>Player</th><th>Team</th><th>Competition</th><th>Matches</th><th>CS</th><th>Save %</th></tr></thead>
                        <tbody>
                            ${data.players.map(p => {
                                const savePct = p.goals_conceded + p.saves > 0 
                                    ? Math.round(p.saves / (p.goals_conceded + p.saves) * 100) : 0;
                                return `<tr><td>${p.player_name}</td><td>${p.team_name || '-'}</td><td>${p.competition || '-'}</td><td>${p.matches_played}</td><td>${p.clean_sheets}</td><td>${savePct}%</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
        }
    } catch (e) {
        console.error('Failed to load players:', e);
    }
}

async function searchPlayers(query) {
    const res = await fetch(`${API_URL}/players?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    // Update UI...
}

// Handle navigation
window.addEventListener('popstate', () => loadPage(window.location.pathname));
