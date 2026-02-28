<div class="auth-form">
    <h2>Register</h2>
    
    <?php if (isset($error)): ?>
        <div class="alert alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    
    <form method="POST" action="/api/auth.php">
        <input type="hidden" name="action" value="register">
        
        <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" required minlength="3">
        </div>
        
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
        </div>
        
        <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength="8">
        </div>
        
        <div class="form-group">
            <label for="display_name">Display Name (optional)</label>
            <input type="text" id="display_name" name="display_name">
        </div>
        
        <button type="submit" class="btn btn-primary">Create Account</button>
    </form>
    
    <p class="auth-link">Already have an account? <a href="/?page=login">Login</a></p>
</div>
