<?php
require_once __DIR__ . '/config.php';

$page = $_GET['page'] ?? 'home';
$user = $_SESSION['user'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= SITE_NAME ?></title>
    <link rel="stylesheet" href="/public/css/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <a href="/" class="logo">🥅 <?= SITE_NAME ?></a>
            <div class="nav-links">
                <?php if ($user): ?>
                    <a href="/?page=dashboard">Dashboard</a>
                    <a href="/?page=players">Players</a>
                    <a href="/?page=profile"><?= htmlspecialchars($user['display_name'] ?? $user['username']) ?></a>
                    <a href="/api/auth.php?action=logout">Logout</a>
                <?php else: ?>
                    <a href="/?page=login">Login</a>
                    <a href="/?page=register">Register</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>

    <main class="container">
        <?php
        $pageFile = __DIR__ . '/pages/' . $page . '.php';
        if (file_exists($pageFile)) {
            require $pageFile;
        } else {
            require __DIR__ . '/pages/home.php';
        }
        ?>
    </main>

    <footer>
        <div class="container">
            <p>&copy; <?= date('Y') ?> <?= SITE_NAME ?></p>
        </div>
    </footer>

    <script src="/public/js/app.js"></script>
</body>
</html>
