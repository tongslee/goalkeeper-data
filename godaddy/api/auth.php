<?php
require_once __DIR__ . '/../config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        $username = trim($_POST['username'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $displayName = trim($_POST['display_name'] ?? '');
        
        if (!$username || !$email || !$password) {
            header('Location: /?page=register&error=Missing+required+fields');
            exit;
        }
        
        if (strlen($password) < 8) {
            header('Location: /?page=register&error=Password+must+be+at+least+8+characters');
            exit;
        }
        
        try {
            $db = getDB();
            
            // Check if user exists
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
            $stmt->execute([$email, $username]);
            if ($stmt->fetch()) {
                header('Location: /?page=register&error=User+already+exists');
                exit;
            }
            
            // Create user
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $db->prepare("
                INSERT INTO users (username, email, password_hash, display_name) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$username, $email, $passwordHash, $displayName ?: null]);
            
            $_SESSION['user_id'] = $db->lastInsertId();
            $_SESSION['username'] = $username;
            
            header('Location: /?page=dashboard');
            exit;
            
        } catch (Exception $e) {
            header('Location: /?page=register&error=' . urlencode($e->getMessage()));
            exit;
        }
        break;
        
    case 'login':
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        
        if (!$email || !$password) {
            header('Location: /?page=login&error=Missing+credentials');
            exit;
        }
        
        try {
            $db = getDB();
            $stmt = $db->prepare("SELECT id, username, password_hash, display_name FROM users WHERE email = ? AND is_active = 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if (!$user || !password_verify($password, $user['password_hash'])) {
                header('Location: /?page=login&error=Invalid+credentials');
                exit;
            }
            
            // Update last login
            $stmt = $db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?");
            $stmt->execute([$user['id']]);
            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['user'] = $user;
            
            header('Location: /?page=dashboard');
            exit;
            
        } catch (Exception $e) {
            header('Location: /?page=login&error=' . urlencode($e->getMessage()));
            exit;
        }
        break;
        
    case 'logout':
        session_destroy();
        header('Location: /');
        exit;
        break;
        
    default:
        header('Location: /');
        exit;
}
