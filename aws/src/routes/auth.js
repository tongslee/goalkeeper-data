const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, display_name } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        // Check if user exists
        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.query(`
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, display_name, timezone, is_admin, created_at
        `, [username, email, password_hash, display_name || username]);
        
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ user, token });
        
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }
        
        const result = await db.query(`
            SELECT id, username, email, password_hash, display_name, timezone, is_admin, is_active, last_login_at
            FROM users WHERE email = $1 AND is_active = true
        `, [email]);
        
        const user = result.rows[0];
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        
        // Remove password hash from response
        delete user.password_hash;
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ user, token });
        
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const result = await db.query(`
            SELECT id, username, email, display_name, avatar_url, timezone, is_admin, is_active, created_at, last_login_at
            FROM users WHERE id = $1
        `, [decoded.userId]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({ user: result.rows[0] });
        
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', async (req, res) => {
    res.json({ success: true });
});

module.exports = router;
