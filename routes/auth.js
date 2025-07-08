const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendOTPEmail } = require('../utils/mailer');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MAX_FREE_GENERATIONS = parseInt(process.env.MAX_FREE_GENERATIONS || '5');

const isNewMonth = (lastUsed) => {
  if (!lastUsed) return true;
  const now = new Date();
  const last = new Date(lastUsed);
  return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// ✅ Signup
router.post('/signup', async (req, res) => {
  const { email, name, password, phone_number, country, frontendFreeUses } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const free_uses = Math.min(frontendFreeUses ?? MAX_FREE_GENERATIONS, MAX_FREE_GENERATIONS);

    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, phone_number, country, free_uses, last_used_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, email, name, phone_number, country, is_premium, free_uses, last_used_at,monthly`,
      [email, name, password_hash, phone_number, country, free_uses]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(200).json({ token, user,monthly:user.monthly,is_premium:user.is_premium, ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Email may already be registered or invalid input.' });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { email, password, frontendFreeUses } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    let updatedFreeUses = user.free_uses;

    if (!user.is_premium && typeof frontendFreeUses === 'number') {
      if (isNewMonth(user.last_used_at)) {
        updatedFreeUses = Math.min(frontendFreeUses, MAX_FREE_GENERATIONS);
      } else {
        updatedFreeUses = Math.min(user.free_uses, frontendFreeUses);
      }

      await pool.query(
        'UPDATE users SET free_uses = $1, last_used_at = NOW() WHERE id = $2',
        [updatedFreeUses, user.id]
      );
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone_number: user.phone_number,
        country: user.country,
        is_premium: user.is_premium,
        monthly:user.monthly,
        free_uses: updatedFreeUses,
        last_used_at: user.last_used_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get Authenticated User Info
router.get('/me', requireAuth, async (req, res) => {
  // console.log("req:",req)
  try {
    const result = await pool.query(
      `SELECT id, email, name, phone_number, country, is_premium,monthly, free_uses, last_used_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch user' });
  }
});

// 📩 Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with this email' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM password_resets WHERE email = $1 AND created_at >= $2',
      [email, today]
    );

    if (parseInt(countRes.rows[0].count) >= 3) {
      return res.status(429).json({ error: 'You have reached the daily OTP limit (3)' });
    }

    const otp = generateOTP();
    await pool.query('INSERT INTO password_resets (email, otp) VALUES ($1, $2)', [email, otp]);

    await sendOTPEmail(email, otp);
    return res.json({ message: 'OTP sent to your email address.' });
  } catch (err) {
    console.error('[FORGOT PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// 🔒 Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM password_resets
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    const otpEntry = result.rows[0];
    if (!otpEntry) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    const otpCreatedAt = new Date(otpEntry.created_at).getTime();
    const localNowAdjusted = Date.now() - (5 * 60 * 60 * 1000); // UTC+5 adjustment
    const otpAge = localNowAdjusted - otpCreatedAt;

    if (otpAge > 5 * 60 * 1000) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (otpEntry.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [password_hash, email]);

    return res.json({ message: 'Password has been successfully reset. You can now log in.' });
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// 🗑️ Delete Account
router.delete('/users/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this account' });
    }

    await pool.query('BEGIN');
    await pool.query('DELETE FROM password_resets WHERE email = (SELECT email FROM users WHERE id = $1)', [userId]);
    await pool.query('DELETE FROM contract_generations WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.query('COMMIT');

    res.status(204).json({ ok: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error during account deletion' });
  }
});

// 🔢 Get Remaining Free Uses
router.get('/free-uses', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT free_uses, is_premium, last_used_at FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let { free_uses, is_premium, last_used_at } = result.rows[0];
    const now = new Date();
    const lastUsed = last_used_at ? new Date(last_used_at) : new Date(0);
    const isNew = lastUsed.getMonth() !== now.getMonth() || lastUsed.getFullYear() !== now.getFullYear();

    if (!is_premium && isNew) {
      free_uses = MAX_FREE_GENERATIONS;
      await pool.query(
        'UPDATE users SET free_uses = $1, last_used_at = NOW() WHERE id = $2',
        [MAX_FREE_GENERATIONS, userId]
      );
    }

    return res.json({
      remaining_uses: free_uses,
      is_premium,
      message: is_premium
        ? 'You have unlimited uses with premium plan'
        : `You have ${free_uses} free uses remaining this month`
    });
  } catch (err) {
    console.error('Error fetching free uses:', err);
    res.status(500).json({ error: 'Server error retrieving usage data' });
  }
});

module.exports = router;
