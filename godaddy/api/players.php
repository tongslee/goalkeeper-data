<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Get current user if authenticated
$userId = $_SESSION['user_id'] ?? null;

// Handle request
if ($method === 'GET') {
    // List players
    $search = $_GET['search'] ?? '';
    $competition = $_GET['competition'] ?? '';
    $season = $_GET['season'] ?? '';
    $publicOnly = !isset($_GET['my']) || $_GET['my'] !== '1';
    
    try {
        $db = getDB();
        
        $sql = "
            SELECT id, player_name, team_name, competition, season,
                   matches_played, minutes_played, goals_conceded, saves, 
                   clean_sheets, penalties_saved, goals_scored,
                   is_public, created_at
            FROM player_stats 
            WHERE 1=1
        ";
        $params = [];
        
        if ($publicOnly) {
            $sql .= " AND is_public = 1";
        } elseif ($userId) {
            $sql .= " AND (is_public = 1 OR user_id = ?)";
            $params[] = $userId;
        } else {
            $sql .= " AND is_public = 1";
        }
        
        if ($search) {
            $sql .= " AND (player_name LIKE ? OR team_name LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        if ($competition) {
            $sql .= " AND competition = ?";
            $params[] = $competition;
        }
        
        if ($season) {
            $sql .= " AND season = ?";
            $params[] = $season;
        }
        
        $sql .= " ORDER BY matches_played DESC LIMIT 50";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $players = $stmt->fetchAll();
        
        jsonResponse(['success' => true, 'players' => $players]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    requireAuth();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $playerName = $data['player_name'] ?? '';
    $teamName = $data['team_name'] ?? '';
    $competition = $data['competition'] ?? '';
    $season = $data['season'] ?? date('Y');
    $isPublic = $data['is_public'] ?? false;
    
    if (!$playerName) {
        jsonResponse(['error' => 'Player name required'], 400);
    }
    
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO player_stats (user_id, player_name, team_name, competition, season, is_public)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $playerName, $teamName, $competition, $season, $isPublic ? 1 : 0]);
        
        jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}
