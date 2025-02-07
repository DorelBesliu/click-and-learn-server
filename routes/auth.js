const express = require('express');
const router = express.Router();
const crypto = require("crypto"); // To generate a secure refresh token
const jwt = require('jsonwebtoken');
const passport = require("passport");

const refreshTokens = {};

// Environment variables (should be stored in a .env file)
const ACCESS_TOKEN_SECRET = "your_jwt_secret"; // Use process.env.ACCESS_TOKEN_SECRET
const REFRESH_TOKEN_SECRET = "your_refresh_secret"; // Use process.env.REFRESH_TOKEN_SECRET

// Generate JWT Access Token
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" } // Token expires in 1 hour
    );
};

// Generate Refresh Token
const generateRefreshToken = (user) => {
    const refreshToken = crypto.randomBytes(40).toString("hex"); // Secure random token
    refreshTokens[refreshToken] = user.id; // Store refresh token in a simple object (use DB in production)
    return refreshToken;
};

// Login Route
router.post('/login', async (req, res, next) => {
    passport.authenticate("local", (err, user) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: "Invalid username or password" });

        // Generate tokens
        const token = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({
            token,
            refresh_token: refreshToken,
            expires_in: 3600 // 1 hour in seconds
        });
    })(req, res, next);
});

router.post("/refresh", (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token || !refreshTokens[refresh_token]) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }

    const userId = refreshTokens[refresh_token]; // Retrieve user ID from stored refresh tokens
    const newAccessToken = generateAccessToken({ id: userId });

    res.json({
        token: newAccessToken,
        expires_in: 3600 // 1 hour in seconds
    });
});

// Logout Route
router.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return res.status(500).json({ message: "Error logging out" });
        res.json({ message: "Logged out successfully" });
    });
});

// Failed Login Route
router.get('/login-fail', (req, res) => {
    res.status(401).json({ message: "Login failed. Invalid username or password." });
});

module.exports = router;
