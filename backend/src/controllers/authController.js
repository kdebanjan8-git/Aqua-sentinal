import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbStore } from '../models/dbStore.js';
import { pool, isPostgresConnected } from '../config/db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../middleware/authMiddleware.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ['citizen', 'health_worker', 'district_admin'];

export async function register(req, res) {
  try {
    const {
      full_name,
      email,
      password,
      role = 'citizen',
      state = 'Assam',
      district = 'Kamrup Metro'
    } = req.body;

    // 1. Validation
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role '${role}'. Allowed roles: ${ALLOWED_ROLES.join(', ')}`
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check for duplicate email in PostgreSQL or in-memory store
    if (isPostgresConnected) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }
    } else {
      const existing = dbStore.findUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }
    }

    // 3. Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const createdAt = new Date().toISOString();

    let createdUser = null;

    if (isPostgresConnected) {
      const result = await pool.query(
        `INSERT INTO users (id, full_name, email, password_hash, role, state, district, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, full_name, email, role, state, district, created_at`,
        [userId, full_name.trim(), normalizedEmail, password_hash, role, state, district, createdAt]
      );
      createdUser = result.rows[0];
    } else {
      createdUser = dbStore.createUser({
        id: userId,
        full_name: full_name.trim(),
        email: normalizedEmail,
        password_hash,
        role,
        state,
        district,
        created_at: createdAt
      });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
        full_name: createdUser.full_name,
        district: createdUser.district,
        state: createdUser.state
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: createdUser.id,
        full_name: createdUser.full_name,
        email: createdUser.email,
        role: createdUser.role,
        state: createdUser.state,
        district: createdUser.district,
        created_at: createdUser.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Registration error: ${err.message}` });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = null;

    if (isPostgresConnected) {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = dbStore.findUserByEmail(normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Compare bcrypt password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        district: user.district,
        state: user.state
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Sign in successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        state: user.state,
        district: user.district,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Authentication error: ${err.message}` });
  }
}

export async function getMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    let user = null;

    if (isPostgresConnected) {
      const result = await pool.query(
        'SELECT id, full_name, email, role, state, district, created_at FROM users WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = dbStore.findUserById(req.user.id);
    }

    if (!user) {
      // Fallback to decoded token details if in-memory store was reset
      user = {
        id: req.user.id,
        full_name: req.user.full_name,
        email: req.user.email,
        role: req.user.role,
        state: req.user.state || 'Assam',
        district: req.user.district || 'Kamrup Metro',
        created_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        state: user.state,
        district: user.district,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Profile lookup error: ${err.message}` });
  }
}
