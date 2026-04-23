require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── MongoDB ──────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const anySchema = new mongoose.Schema({}, { strict: false });

const Site       = mongoose.model('Site',       new mongoose.Schema({}, { strict: false }));
const GalleryItem= mongoose.model('GalleryItem',new mongoose.Schema({}, { strict: false }));
const Exhibition = mongoose.model('Exhibition', new mongoose.Schema({ tab: String }, { strict: false }));
const PressStatic= mongoose.model('PressStatic',new mongoose.Schema({}, { strict: false }));
const Event      = mongoose.model('Event',      new mongoose.Schema({}, { strict: false }));
const Project    = mongoose.model('Project',    new mongoose.Schema({}, { strict: false }));
const PressItem  = mongoose.model('PressItem',  new mongoose.Schema({}, { strict: false }));

// ── Seed initial data if empty ───────────────────────────────
async function seedIfEmpty() {
  const DATA_FILE = path.join(__dirname, 'data.json');
  if (!fs.existsSync(DATA_FILE)) return;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const strip = obj => { const { id, _id, ...rest } = obj; return rest; };

  if (await Site.countDocuments() === 0 && data.site) {
    await Site.create(strip(data.site));
    console.log('Seeded site settings');
  }
  if (await GalleryItem.countDocuments() === 0 && data.gallery?.length) {
    await GalleryItem.insertMany(data.gallery.map(strip));
    console.log('Seeded gallery');
  }
  if (await Exhibition.countDocuments() === 0 && data.exhibitions) {
    const docs = [];
    for (const tab of ['group','solo','workshops']) {
      (data.exhibitions[tab]||[]).forEach(e => docs.push({ ...strip(e), tab }));
    }
    if (docs.length) await Exhibition.insertMany(docs);
    console.log('Seeded exhibitions');
  }
  if (await PressStatic.countDocuments() === 0 && data.pressStatic?.length) {
    await PressStatic.insertMany(data.pressStatic.map(strip));
    console.log('Seeded press');
  }
}

// ── Multer ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Security headers ──────────────────────────────────────────
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: false // allow CDN resources
}));

// ── Force HTTPS in production ─────────────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

app.use(express.static('public'));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Auth ─────────────────────────────────────────────────────
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const JWT_SECRET      = process.env.JWT_SECRET || 'estif-portfolio-secret-change-me';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'Estif@2025';

// Rate limiter — 5 attempts per 15 min per IP
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + 15 * 60 * 1000; }
  rec.count++;
  loginAttempts.set(ip, rec);
  return { allowed: rec.count <= 5, remaining: Math.max(0, 5 - rec.count) };
}

async function getAdminPasswordHash() {
  const site = await Site.findOne().lean();
  // stored as bcrypt hash or plain (legacy)
  return site?.adminPasswordHash || null;
}

app.post('/api/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const { allowed } = checkRateLimit(ip);
  if (!allowed) return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });

  const { password } = req.body;
  if (!password || typeof password !== 'string') return res.status(400).json({ message: 'Password required' });

  const hash = await getAdminPasswordHash();
  let valid = false;

  if (hash) {
    valid = await bcrypt.compare(password, hash);
  } else {
    // fallback to plain text default
    valid = password === DEFAULT_PASSWORD;
    if (valid) {
      // upgrade to hash on first login
      const newHash = await bcrypt.hash(password, 12);
      await Site.findOneAndUpdate({}, { $set: { adminPasswordHash: newHash } }, { upsert: true });
    }
  }

  if (!valid) return res.status(401).json({ message: 'Wrong password' });

  loginAttempts.delete(ip);
  const token = jwt.sign({ admin: true, iat: Date.now() }, JWT_SECRET, { expiresIn: '24h' });

  // Set httpOnly cookie + also return token for header-based auth
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });
  res.json({ success: true, token });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true });
});

function requireAuth(req, res, next) {
  const cookieToken = req.cookies?.adminToken;
  const headerToken = req.headers['authorization']?.replace('Bearer ', '');
  const token = cookieToken || headerToken;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('adminToken');
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}

app.post('/api/change-password', requireAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await Site.findOneAndUpdate({}, { $set: { adminPasswordHash: hash, adminPassword: null } }, { upsert: true });
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Password updated. Please login again.' });
});

// Protect all write API routes
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (['/login', '/logout'].includes(req.path)) return next();
  requireAuth(req, res, next);
});

// Rate limiter - max 5 login attempts per 15 minutes
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip;
  const record = loginAttempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + 15 * 60 * 1000; }
  record.count++;
  loginAttempts.set(key, record);
  return record.count <= 5;
}

async function getAdminPassword() {
  const site = await Site.findOne().lean();
  return site?.adminPassword || DEFAULT_PASSWORD;
}

app.post('/api/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
  }
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password required' });
  const adminPassword = await getAdminPassword();
  if (password !== adminPassword) {
    return res.status(401).json({ message: 'Wrong password' });
  }
  // Reset rate limit on success
  loginAttempts.delete(ip);
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token });
});

function requireAuth(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}

app.post('/api/change-password', requireAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  await Site.findOneAndUpdate({}, { $set: { adminPassword: newPassword } }, { upsert: true });
  res.json({ success: true });
});

// Protect all write API routes
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (req.path === '/login') return next();
  requireAuth(req, res, next);
});

// ── SITE ─────────────────────────────────────────────────────
app.get('/api/site', async (req, res) => {
  const site = await Site.findOne().lean();
  res.json(site || {});
});

app.put('/api/site', upload.single('aboutImage'), async (req, res) => {
  const body = { ...req.body };
  ['statementParagraphs','bioParagraphs','bioAmharic','education','awards'].forEach(k => {
    if (body[k] && typeof body[k] === 'string') {
      try { body[k] = JSON.parse(body[k]); } catch {}
    }
  });
  if (req.file) body.aboutImage = '/uploads/' + req.file.filename;
  const site = await Site.findOneAndUpdate({}, { $set: body }, { upsert: true, new: true }).lean();
  res.json(site);
});

// ── GALLERY ──────────────────────────────────────────────────
app.get('/api/gallery', async (req, res) => {
  res.json(await GalleryItem.find().lean());
});
app.post('/api/gallery', upload.single('image'), async (req, res) => {
  if (!req.file && !req.body.file) return res.status(400).json({ message: 'Image required' });
  const item = await GalleryItem.create({ ...req.body, file: req.file ? '/uploads/' + req.file.filename : req.body.file });
  res.json(item);
});
app.put('/api/gallery/:id', upload.single('image'), async (req, res) => {
  const body = { ...req.body };
  if (req.file) body.file = '/uploads/' + req.file.filename;
  const item = await GalleryItem.findByIdAndUpdate(req.params.id, { $set: body }, { new: true }).lean();
  res.json(item);
});
app.delete('/api/gallery/:id', async (req, res) => {
  await GalleryItem.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── EXHIBITIONS ──────────────────────────────────────────────
app.get('/api/exhibitions', async (req, res) => {
  const all = await Exhibition.find().lean();
  const result = { group: [], solo: [], workshops: [] };
  all.forEach(e => { if (result[e.tab]) result[e.tab].push(e); });
  res.json(result);
});
app.post('/api/exhibitions/:tab', async (req, res) => {
  const item = await Exhibition.create({ ...req.body, tab: req.params.tab });
  res.json(item);
});
app.put('/api/exhibitions/:tab/:id', async (req, res) => {
  const item = await Exhibition.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
  res.json(item);
});
app.delete('/api/exhibitions/:tab/:id', async (req, res) => {
  await Exhibition.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── PRESS STATIC ─────────────────────────────────────────────
app.get('/api/press-static', async (req, res) => {
  res.json(await PressStatic.find().lean());
});
app.post('/api/press-static', async (req, res) => {
  res.json(await PressStatic.create(req.body));
});
app.put('/api/press-static/:id', async (req, res) => {
  res.json(await PressStatic.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean());
});
app.delete('/api/press-static/:id', async (req, res) => {
  await PressStatic.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── EVENTS / PROJECTS / PRESS (dynamic) ──────────────────────
function crudRoutes(Model, key) {
  app.get(`/api/${key}`, async (req, res) => res.json(await Model.find().lean()));
  app.post(`/api/${key}`, upload.single('image'), async (req, res) => {
    const body = { ...req.body };
    if (req.file) body.image = '/uploads/' + req.file.filename;
    res.json(await Model.create(body));
  });
  app.put(`/api/${key}/:id`, upload.single('image'), async (req, res) => {
    const body = { ...req.body };
    if (req.file) body.image = '/uploads/' + req.file.filename;
    res.json(await Model.findByIdAndUpdate(req.params.id, { $set: body }, { new: true }).lean());
  });
  app.delete(`/api/${key}/:id`, async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });
}

crudRoutes(Event,     'events');
crudRoutes(Project,   'projects');
crudRoutes(PressItem, 'press');

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MONGODB_URI set: ${!!process.env.MONGODB_URI}`);
  await seedIfEmpty();
});
