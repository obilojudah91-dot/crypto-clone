const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Database = require('better-sqlite3');

const root = __dirname;
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const JWT_SECRET = process.env.JWT_SECRET || '';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// Admin email (recommended: set SMTP env vars; otherwise we log to console only)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'no-reply@example.com';

if (!JWT_SECRET) {
  // Allow local dev to run, but do not silently enable insecure auth.
  console.warn('[WARN] JWT_SECRET is not set. Auth will fail until JWT_SECRET is configured.');
}

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowOrigin = process.env.CORS_ORIGIN || '';
app.use(
  cors({
    origin: allowOrigin || true,
    credentials: true,
  })
);

// -----------------------------
// Database
// -----------------------------
const dataDir = path.join(root, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    fullname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, chain),
    UNIQUE(user_id, address),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('buy','sell')),
    chain TEXT NOT NULL,
    token TEXT NOT NULL,
    amount TEXT NOT NULL,
    wallet_address TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','failed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// -----------------------------
// Helpers
// -----------------------------
function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizeLogin(login) {
  if (typeof login !== 'string') return '';
  return login.trim();
}

function isValidChain(chain) {
  return chain === 'evm' || chain === 'solana';
}

function isValidEvmAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isValidSolanaAddress(addr) {
  // Base58 address, usually 32-44 chars.
  // This is a light check; Phantom will still reject invalid addresses.
  return typeof addr === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authFromReq(req) {
  return req.cookies && req.cookies.auth_token ? String(req.cookies.auth_token) : '';
}

function requireAuth(req, res, next) {
  const token = authFromReq(req);
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!JWT_SECRET) return res.status(500).json({ ok: false, error: 'Auth not configured' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
}

function requireAuthOrRedirect(req, res, next) {
  const token = authFromReq(req);
  if (!token) return res.redirect('/login.html');
  if (!JWT_SECRET) return res.redirect('/login.html');

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (e) {
    return res.redirect('/login.html');
  }
}

const failedLoginAttempts = new Map();
function checkBruteForce(key) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const rec = failedLoginAttempts.get(key) || { count: 0, firstAt: now };

  if (now - rec.firstAt > windowMs) {
    failedLoginAttempts.set(key, { count: 0, firstAt: now });
    return;
  }

  if (rec.count >= maxAttempts) {
    const retryAfterMs = windowMs - (now - rec.firstAt);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    const err = new Error(`Too many attempts. Try again in ${retryAfterSec}s.`);
    err.statusCode = 429;
    throw err;
  }
}

function recordFailedLogin(key) {
  const now = Date.now();
  const rec = failedLoginAttempts.get(key);
  if (!rec) {
    failedLoginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }
  rec.count += 1;
  failedLoginAttempts.set(key, rec);
}

function clearFailedLogin(key) {
  failedLoginAttempts.delete(key);
}

async function sendAdminEmail(subject, text) {
  if (!ADMIN_EMAIL) return;
  try {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log('[ADMIN_EMAIL_LOG]', subject);
      console.log(text);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject,
      text,
    });
  } catch (e) {
    // Notifications should never break user flows.
    console.warn('[ADMIN_EMAIL_ERROR]', subject, e && e.message ? e.message : e);
  }
}

// -----------------------------
// API routes
// -----------------------------
app.post('/api/register', (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const fullname = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const passwordConfirmation = typeof req.body.password_confirmation === 'string' ? req.body.password_confirmation : '';

  if (!fullname || fullname.length < 2) return res.status(400).json({ ok: false, error: 'Fullname is required' });
  if (!username || username.length < 3) return res.status(400).json({ ok: false, error: 'Username is required' });
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'Valid email is required' });
  if (!password || password.length < 8) return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
  if (password !== passwordConfirmation) return res.status(400).json({ ok: false, error: 'Passwords do not match' });

  const passwordHash = bcrypt.hashSync(password, 12);
  try {
    const stmt = db.prepare('INSERT INTO users (email, username, fullname, password_hash) VALUES (?, ?, ?, ?)');
    const info = stmt.run(email, username, fullname, passwordHash);
    return res.json({ ok: true, userId: info.lastInsertRowid });
  } catch (e) {
    // Likely unique constraint violation
    return res.status(409).json({ ok: false, error: 'Email or username already exists' });
  }
});

app.post('/api/login', (req, res) => {
  const login = normalizeLogin(req.body.login);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const remember = req.body.remember === true || req.body.remember === 'on' || req.body.remember === 'true';

  if (!login) return res.status(400).json({ ok: false, error: 'Login is required' });
  if (!password) return res.status(400).json({ ok: false, error: 'Password is required' });
  if (!JWT_SECRET) return res.status(500).json({ ok: false, error: 'Auth not configured' });

  const bruteKey = `login:${login.toLowerCase()}:${req.ip}`;
  try {
    checkBruteForce(bruteKey);

    const email = isEmail(login) ? login.toLowerCase() : '';
    const stmt =
      email
        ? db.prepare('SELECT * FROM users WHERE email = ?')
        : db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(email ? email : login.toLowerCase());
    if (!user) {
      recordFailedLogin(bruteKey);
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      recordFailedLogin(bruteKey);
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    clearFailedLogin(bruteKey);
    const token = jwt.sign(
      { sub: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: remember ? '30d' : '7d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ ok: true, redirect: '/dashboard' });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({ ok: false, error: e.message || 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('auth_token');
  return res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const userId = req.auth.sub;
  const user = db.prepare('SELECT id, email, username, fullname, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

  const wallets = db
    .prepare('SELECT chain, address FROM wallets WHERE user_id = ?')
    .all(userId);

  const orders = db
    .prepare('SELECT id, type, chain, token, amount, wallet_address, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 20')
    .all(userId);

  return res.json({ ok: true, user, wallets, orders });
});

app.post('/api/wallets/connect', requireAuth, async (req, res) => {
  const chain = req.body.chain;
  const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
  const userId = req.auth.sub;

  if (!isValidChain(chain)) return res.status(400).json({ ok: false, error: 'Invalid chain' });
  if (!address) return res.status(400).json({ ok: false, error: 'Wallet address is required' });

  if (chain === 'evm' && !isValidEvmAddress(address)) return res.status(400).json({ ok: false, error: 'Invalid EVM address' });
  if (chain === 'solana' && !isValidSolanaAddress(address)) return res.status(400).json({ ok: false, error: 'Invalid Solana address' });

  db.prepare(`
    INSERT INTO wallets (user_id, chain, address)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, chain) DO UPDATE SET address = excluded.address
  `).run(userId, chain, address);

  // Non-sensitive notification (address only). Do not collect seed phrases.
  await sendAdminEmail('Wallet connected', `User ${userId} connected wallet.\nChain: ${chain}\nAddress: ${address}`);

  return res.json({ ok: true });
});

app.post('/api/orders', requireAuth, async (req, res) => {
  const type = req.body.type;
  const chain = req.body.chain;
  const token = typeof req.body.token === 'string' ? req.body.token.trim().toUpperCase() : '';
  const amount = typeof req.body.amount === 'string' ? req.body.amount.trim() : '';
  const walletAddress = typeof req.body.wallet_address === 'string' ? req.body.wallet_address.trim() : '';
  const userId = req.auth.sub;

  if (type !== 'buy' && type !== 'sell') return res.status(400).json({ ok: false, error: 'Invalid type' });
  if (!isValidChain(chain)) return res.status(400).json({ ok: false, error: 'Invalid chain' });
  if (!token || token.length < 2 || token.length > 20) return res.status(400).json({ ok: false, error: 'Invalid token' });
  if (!amount || !/^[0-9]+(\\.[0-9]+)?$/.test(amount)) return res.status(400).json({ ok: false, error: 'Invalid amount' });

  let finalWalletAddress = walletAddress;
  if (!finalWalletAddress) {
    const w = db.prepare('SELECT address FROM wallets WHERE user_id = ? AND chain = ?').get(userId, chain);
    finalWalletAddress = w ? w.address : '';
  }

  const stmt = db.prepare(`
    INSERT INTO orders (user_id, type, chain, token, amount, wallet_address, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);
  const info = stmt.run(userId, type, chain, token, amount, finalWalletAddress || null);

  await sendAdminEmail(
    'New buy/sell order created',
    `User ${userId} created an order.\nType: ${type}\nChain: ${chain}\nToken: ${token}\nAmount: ${amount}\nWallet: ${finalWalletAddress || '(none)'}`
  );

  return res.json({ ok: true, orderId: info.lastInsertRowid });
});

// -----------------------------
// Protected pages
// -----------------------------
app.get('/dashboard', requireAuthOrRedirect, (req, res) => {
  const dashboardPath = path.join(root, 'dashboard.html');
  if (!fs.existsSync(dashboardPath)) return res.status(404).send('Dashboard not found');
  return res.sendFile(dashboardPath);
});
app.get('/dashboard/', requireAuthOrRedirect, (req, res) => res.redirect('/dashboard'));

// -----------------------------
// Static files
// -----------------------------
app.get('/', (req, res) => {
  const indexHtm = path.join(root, 'index.htm');
  const indexHtml = path.join(root, 'index.html');
  const target = fs.existsSync(indexHtml) ? indexHtml : indexHtm;
  return res.sendFile(target);
});

app.use(express.static(root));

app.listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
