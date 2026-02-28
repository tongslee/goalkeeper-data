<?php
requireAuth();

$userId = $_SESSION['user_id'];

try {
    $db = getDB();
    
    // Get user's players
    $stmt = $db->prepare("
        SELECT id, player_name, team_name, competition, season,
               matches_played, clean_sheets, saves, goals_conceded,
               is_public
        FROM player_stats 
        WHERE user_id = ?
        ORDER BY updated_at DESC
    ");
    $stmt->execute([$userId]);
    $myPlayers = $stmt->fetchAll();
    
} catch (Exception $e) {
    $myPlayers = [];
}
?>

<div class="dashboard">
    <h2>My Dashboard</h2>
    
    <div class="dashboard-actions">
        <button class="btn btn-primary" onclick="showAddPlayerModal()">+ Add Player</button>
    </div>
    
    <?php if (empty($myPlayers)): ?>
        <div class="empty-state">
            <p>No players yet. Add your first goalkeeper!</p>
        </div>
    <?php else: ?>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Competition</th>
                    <th>Matches</th>
                    <th>CS</th>
                    <th>Saves</th>
                    <th>GA</th>
                    <th>Public</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($myPlayers as $p): ?>
                <tr>
                    <td><?= htmlspecialchars($p['player_name']) ?></td>
                    <td><?= htmlspecialchars($p['team_name'] ?? '-') ?></td>
                    <td><?= htmlspecialchars($p['competition'] ?? '-') ?></td>
                    <td><?= $p['matches_played'] ?></td>
                    <td><?= $p['clean_sheets'] ?></td>
                    <td><?= $p['saves'] ?></td>
                    <td><?= $p['goals_conceded'] ?></td>
                    <td><?= $p['is_public'] ? '✅' : '❌' ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<div id="addPlayerModal" class="modal" style="display:none;">
    <div class="modal-content">
        <h3>Add Goalkeeper</h3>
        <form id="addPlayerForm">
            <div class="form-group">
                <label>Player Name *</label>
                <input type="text" name="player_name" required>
            </div>
            <div class="form-group">
                <label>Team</label>
                <input type="text" name="team_name">
            </div>
            <div class="form-group">
                <label>Competition</label>
                <input type="text" name="competition">
            </div>
            <div class="form-group">
                <label>Season</label>
                <input type="text" name="season" value="2025/26">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_public"> Make public
                </label>
            </div>
            <button type="submit" class="btn btn-primary">Add Player</button>
            <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        </form>
    </div>
</div>

<script>
function showAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
}

document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form);
    data.is_public = form.has('is_public');
    
    const res = await fetch('/api/players.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        location.reload();
    } else {
        alert('Error adding player');
    }
});
</script>
