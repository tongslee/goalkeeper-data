const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

// Middleware to check auth
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        req.userId = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
    } catch (err) {
        req.userId = null;
    }
    
    next();
};

router.use(authenticate);

// List players (public)
router.get('/', async (req, res) => {
    try {
        const { search, competition, season, sort = 'matches' } = req.query;
        
        let sql = `
            SELECT id, player_name, team_name, competition, season,
                   matches_played, minutes_played, goals_conceded, saves, 
                   clean_sheets, penalties_saved, goals_scored, assists,
                   is_public, is_verified, source_name, created_at, updated_at
            FROM player_stats 
            WHERE is_public = true
        `;
        const params = [];
        let paramCount = 0;
        
        if (search) {
            paramCount++;
            sql += ` AND (player_name ILIKE $${paramCount} OR team_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        
        if (competition) {
            paramCount++;
            sql += ` AND competition = $${paramCount}`;
            params.push(competition);
        }
        
        if (season) {
            paramCount++;
            sql += ` AND season = $${paramCount}`;
            params.push(season);
        }
        
        // Sorting
        switch (sort) {
            case 'saves':
                sql += ' ORDER BY saves DESC';
                break;
            case 'cleansheets':
                sql += ' ORDER BY clean_sheets DESC';
                break;
            case 'rating':
                sql += ' ORDER BY (saves / NULLIF(goals_conceded + saves, 0)) DESC';
                break;
            default:
                sql += ' ORDER BY matches_played DESC';
        }
        
        sql += ' LIMIT 50';
        
        const result = await db.query(sql, params);
        
        // Get unique competitions for filters
        const competitions = await db.query(`
            SELECT DISTINCT competition FROM player_stats 
            WHERE is_public = true AND competition IS NOT NULL
            ORDER BY competition
        `);
        
        res.json({ 
            players: result.rows,
            filters: {
                competitions: competitions.rows.map(r => r.competition)
            }
        });
        
    } catch (err) {
        console.error('Error fetching players:', err);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// Get my players (authenticated)
router.get('/my', async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const result = await db.query(`
            SELECT id, player_name, team_name, competition, season,
                   matches_played, minutes_played, goals_conceded, saves, 
                   clean_sheets, penalties_saved, goals_scored, assists,
                   is_public, is_verified, source_name, stats_json, created_at, updated_at
            FROM player_stats 
            WHERE user_id = $1
            ORDER BY updated_at DESC
        `, [req.userId]);
        
        res.json({ players: result.rows });
        
    } catch (err) {
        console.error('Error fetching my players:', err);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// Get single player
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT ps.*, u.username, u.display_name
            FROM player_stats ps
            LEFT JOIN users u ON ps.user_id = u.id
            WHERE ps.id = $1 AND (ps.is_public = true OR ps.user_id = $2)
        `, [id, req.userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Get match events
        const events = await db.query(`
            SELECT * FROM match_events 
            WHERE player_stat_id = $1
            ORDER BY match_date DESC
        `, [id]);
        
        res.json({ 
            player: result.rows[0],
            matches: events.rows
        });
        
    } catch (err) {
        console.error('Error fetching player:', err);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

// Create player (authenticated)
router.post('/', async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const { player_name, team_name, competition, season, is_public } = req.body;
        
        if (!player_name) {
            return res.status(400).json({ error: 'Player name required' });
        }
        
        const result = await db.query(`
            INSERT INTO player_stats (user_id, player_name, team_name, competition, season, is_public)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [req.userId, player_name, team_name, competition, season || '2025/26', is_public || false]);
        
        res.status(201).json({ player: result.rows[0] });
        
    } catch (err) {
        console.error('Error creating player:', err);
        res.status(500).json({ error: 'Failed to create player' });
    }
});

// Update player (authenticated)
router.put('/:id', async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const { id } = req.params;
        const { player_name, team_name, competition, season, is_public } = req.body;
        
        // Check ownership
        const check = await db.query('SELECT user_id FROM player_stats WHERE id = $1', [id]);
        
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (check.rows[0].user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const result = await db.query(`
            UPDATE player_stats 
            SET player_name = COALESCE($1, player_name),
                team_name = COALESCE($2, team_name),
                competition = COALESCE($3, competition),
                season = COALESCE($4, season),
                is_public = COALESCE($5, is_public),
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [player_name, team_name, competition, season, is_public, id]);
        
        res.json({ player: result.rows[0] });
        
    } catch (err) {
        console.error('Error updating player:', err);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

// Add match event
router.post('/:id/matches', async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const { id } = req.params;
        const { match_date, match_team, opponent_team, minutes_played, goals_conceded, 
                saves, clean_sheet, penalty_save, penalty_goal, rating, notes } = req.body;
        
        // Check ownership
        const check = await db.query('SELECT user_id FROM player_stats WHERE id = $1', [id]);
        
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (check.rows[0].user_id !== req.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        // Insert match event
        const event = await db.query(`
            INSERT INTO match_events (player_stat_id, match_date, match_team, opponent_team, 
                                    minutes_played, goals_conceded, saves, clean_sheet, 
                                    penalty_save, penalty_goal, rating, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [id, match_date, match_team, opponent_team, minutes_played || 0, 
            goals_conceded || 0, saves || 0, clean_sheet || false, 
            penalty_save || false, penalty_goal || false, rating, notes]);
        
        // Update player stats
        await db.query(`
            UPDATE player_stats SET
                matches_played = matches_played + 1,
                minutes_played = minutes_played + COALESCE($1, 0),
                goals_conceded = goals_conceded + COALESCE($2, 0),
                saves = saves + COALESCE($3, 0),
                clean_sheets = clean_sheets + CASE WHEN $4 THEN 1 ELSE 0 END,
                penalties_saved = penalties_saved + CASE WHEN $5 THEN 1 ELSE 0 END,
                penalties_missed = penalties_missed + CASE WHEN $6 THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE id = $7
        `, [minutes_played, goals_conceded, saves, clean_sheet, penalty_save, penalty_goal, id]);
        
        res.status(201).json({ match: event.rows[0] });
        
    } catch (err) {
        console.error('Error adding match:', err);
        res.status(500).json({ error: 'Failed to add match' });
    }
});

// Delete player (authenticated)
router.delete('/:id', async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            DELETE FROM player_stats 
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, req.userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found or not authorized' });
        }
        
        res.json({ success: true });
        
    } catch (err) {
        console.error('Error deleting player:', err);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

module.exports = router;
