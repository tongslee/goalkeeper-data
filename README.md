# Goalkeeper Stats 🥅

Track, analyze, and share goalkeeper performance across competitions and seasons.

## Two Versions

| Folder | Stack | For |
|--------|-------|-----|
| `godaddy/` | PHP + MySQL | GoDaddy shared hosting |
| `aws/` | Node.js + PostgreSQL | AWS EC2 |

---

## Database Setup

### GoDaddy MySQL (Shared Hosting)

**Database:** `school` (existing)  
**Host:** `p3nlmysql137plsk.secureserver.net:3306`  
**User:** `pete.nova.1.1.2000`

**Tables created:**
- `gk_users` - User accounts
- `gk_player_stats` - Goalkeeper statistics
- `gk_match_events` - Individual match records

**Config update required in `godaddy/config.php`:**
```php
define('DB_NAME', 'school');
```

---

### AWS PostgreSQL (EC2)

1. **Create database:**
   ```bash
   createdb goalkeeper
   ```

2. **Run SQL schema:**
   ```bash
   psql -h your-ec2-host -U postgres -d goalkeeper -f sql/aws-postgres.sql
   ```

3. **Set environment variables:**
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=goalkeeper
   export DB_USER=postgres
   export DB_PASSWORD=your-password
   export JWT_SECRET=your-secret-key
   export PORT=3000
   ```

4. **Start the app:**
   ```bash
   cd aws
   npm install
   npm start
   ```

---

## Features

### Both Versions
- User registration/login
- Add goalkeeper players
- Track match stats (saves, clean sheets, goals conceded, etc.)
- Make stats public or private
- Search and filter by competition/season

### AWS Version (Additional)
- JWT authentication
- Rate limiting
- Full-text search
- Materialized views for leaderboards
- Activity logging
- API keys for integrations
- Advanced analytics

---

## Deployment

### GoDaddy
1. Upload `godaddy/` folder to public_html
2. Update `config.php` with database credentials
3. Done!

### AWS EC2
1. Clone repo
2. `npm install`
3. Set environment variables
4. `npm start`
5. Use PM2 for production: `pm2 start src/index.js`

---

## API Endpoints (AWS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/players` | List public players |
| GET | `/api/players/my` | List user's players |
| GET | `/api/players/:id` | Get player details |
| POST | `/api/players` | Create player |
| PUT | `/api/players/:id` | Update player |
| POST | `/api/players/:id/matches` | Add match event |
| DELETE | `/api/players/:id` | Delete player |

---

## Tech Stack

### GoDaddy
- PHP 8+
- MySQL 8
- Vanilla JS
- CSS

### AWS
- Node.js 18+
- Express
- PostgreSQL 15+
- JWT
- BCrypt
