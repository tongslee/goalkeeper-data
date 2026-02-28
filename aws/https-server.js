const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// SSL certs
const https = require('https');
const httpsOptions = {
  key: fs.readFileSync('/etc/ssl/private/server.key'),
  cert: fs.readFileSync('/etc/ssl/certs/server.crt')
};

// Middleware
app.use(helmet({contentSecurityPolicy: false}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/players', require('./src/routes/players'));

// Frontend routes
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// HTTPS server
https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log('HTTPS Server running on port ' + PORT);
});
