require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database pool
const schoolPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'goalkeeper',
  user: 'postgres'
});

// Middleware FIRST
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors());
app.use(express.json());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}));

// API Routes - before static files
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));

// School Dashboard API
app.get('/test', (req, res) => {
  res.json({ test: 'hello' });
});

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

// Static files
app.use(express.static('public'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
