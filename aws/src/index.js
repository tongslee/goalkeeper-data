require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Database pool
const schoolPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'goalkeeper',
  user: 'postgres'
});

// Middleware
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors());
app.use(express.json());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));

// School Dashboard API
app.get('/api/assignments', async (req, res) => {
  try {
    const client = await schoolPool.connect();
    try {
      const result = await client.query(`
        SELECT a.*, s.display_name, s.color, w.week_start, w.week_end
        FROM school_assignments a
        LEFT JOIN school_subjects s ON a.subject_id = s.id
        LEFT JOIN school_weeks w ON a.week_id = w.id
        ORDER BY a.due_date ASC
      `);
      res.json({ success: true, data: result.rows });
    } finally {
      client.release();
    }
  } catch (e) {
    res.json({ success: false, error: e.message, data: [] });
  }
});

app.post('/api/assignments/update', async (req, res) => {
  const { id, status } = req.body;
  try {
    await schoolPool.query('UPDATE school_assignments SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.post('/api/assignments/add', async (req, res) => {
  const { title, subject_id, due_date, assignment_type, status } = req.body;
  try {
    const result = await schoolPool.query(
      'INSERT INTO school_assignments (title, subject_id, due_date, assignment_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, subject_id, due_date, assignment_type, status || 'pending']
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// Get weeks
app.get('/api/weeks', async (req, res) => {
  try {
    const result = await schoolPool.query('SELECT * FROM school_weeks ORDER BY week_start DESC');
    res.json({ success: true, data: result.rows });
  } catch (e) {
    res.json({ success: false, error: e.message, data: [] });
  }
});

// Test route
app.get('/test', (req, res) => res.json({ test: 'hello' }));

// Static files
app.use(express.static('public'));

// HTTPS server
const httpsOptions = {
  key: fs.readFileSync('/etc/ssl/private/server.key'),
  cert: fs.readFileSync('/etc/ssl/certs/server.crt')
};

https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTPS Server running on port ${PORT}`);
});
