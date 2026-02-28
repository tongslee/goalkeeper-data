<div class="hero">
    <h1>Track Goalkeeper Stats 🧤</h1>
    <p>Track, analyze, and share goalkeeper performance across competitions and seasons.</p>
    
    <?php if (!isset($_SESSION['user_id'])): ?>
        <div class="cta-buttons">
            <a href="/?page=register" class="btn btn-primary">Get Started Free</a>
            <a href="/?page=login" class="btn btn-secondary">Login</a>
        </div>
    <?php endif; ?>
</div>

<div class="features">
    <div class="feature">
        <h3>📊 Track Performance</h3>
        <p>Record matches, saves, clean sheets, and more for any goalkeeper.</p>
    </div>
    <div class="feature">
        <h3>🔍 Search & Compare</h3>
        <p>Find goalkeepers by team, competition, or season. Compare stats side by side.</p>
    </div>
    <div class="feature">
        <h3>🌍 Share with Friends</h3>
        <p>Make your stats public and share with the goalkeeper community.</p>
    </div>
</div>

<?php
// Show public players if any
try {
    $db = getDB();
    $stmt = $db->query("
        SELECT player_name, team_name, competition, season,
               matches_played, clean_sheets, saves, goals_conceded
        FROM player_stats 
        WHERE is_public = 1 
        ORDER BY matches_played DESC 
        LIMIT 10
    ");
    $publicPlayers = $stmt->fetchAll();
    
    if ($publicPlayers): ?>
        <div class="public-players">
            <h2>🌟 Popular Goalkeepers</h2>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Competition</th>
                        <th>Matches</th>
                        <th>Clean Sheets</th>
                        <th>Save %</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($publicPlayers as $p): 
                        $savePct = $p['goals_conceded'] + $p['saves'] > 0 
                            ? round($p['saves'] / ($p['goals_conceded'] + $p['saves']) * 100, 1) 
                            : 0;
                    ?>
                    <tr>
                        <td><?= htmlspecialchars($p['player_name']) ?></td>
                        <td><?= htmlspecialchars($p['team_name'] ?? '-') ?></td>
                        <td><?= htmlspecialchars($p['competition'] ?? '-') ?></td>
                        <td><?= $p['matches_played'] ?></td>
                        <td><?= $p['clean_sheets'] ?></td>
                        <td><?= $savePct ?>%</td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif;
} catch (Exception $e) {
    // DB not ready yet
}
?>
