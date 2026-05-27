require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Prevent crashes from unhandled errors
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));

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
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Image optimization helper ────────────────────────────────
let sharp = null;
try { sharp = require('sharp'); console.log('sharp loaded OK'); } catch (e) { console.log('sharp not available, skipping image optimization:', e.message); }

async function optimizeImage(filePath) {
  if (!sharp) return;
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg','.jpeg','.png','.webp'].includes(ext)) return;
  try {
    const tmpPath = filePath + '.tmp';
    await sharp(filePath)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toFile(tmpPath);
    fs.renameSync(tmpPath, filePath);
    console.log('Image optimized:', path.basename(filePath));
  } catch (e) {
    console.error('Image optimization failed (non-fatal):', e.message);
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

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
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });

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
  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'Password required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
  }
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ message: 'Password must contain at least one number' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await Site.findOneAndUpdate({}, { $set: { adminPasswordHash: hash, adminPassword: null } }, { upsert: true });
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Password updated. Please login again.' });
});

// ── Password reset (development only — disabled in production) ──
app.get('/api/reset-admin-password', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  const key = req.query.key;
  if (key !== 'reset-estif-2025') return res.status(403).json({ message: 'Forbidden' });
  await Site.findOneAndUpdate({}, { $unset: { adminPasswordHash: 1, adminPassword: 1 } }, { upsert: true });
  res.json({ success: true, message: 'Password reset to default: Estif@2025' });
});

// Protect all write API routes
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  if (['/login', '/logout'].includes(req.path)) return next();
  requireAuth(req, res, next);
});

// ── SITE ─────────────────────────────────────────────────────
app.get('/api/site', async (req, res) => {
  const site = await Site.findOne().lean();
  res.json(site || {});
});

app.put('/api/site', upload.fields([
  { name: 'aboutImage', maxCount: 1 },
  { name: 'cvFile', maxCount: 1 }
]), async (req, res) => {
  const body = { ...req.body };
  ['statementParagraphs','bioParagraphs','bioAmharic','education','awards'].forEach(k => {
    if (body[k] && typeof body[k] === 'string') {
      try { body[k] = JSON.parse(body[k]); } catch {}
    }
  });
  if (req.files?.aboutImage?.[0]) {
    const f = req.files.aboutImage[0];
    body.aboutImage = '/uploads/' + f.filename;
    await optimizeImage(f.path);
  }
  if (req.files?.cvFile?.[0]) {
    const f = req.files.cvFile[0];
    body.cvFile = '/uploads/' + f.filename;
  }
  const site = await Site.findOneAndUpdate({}, { $set: body }, { upsert: true, new: true }).lean();
  res.json(site);
});

// ── GALLERY ──────────────────────────────────────────────────
app.get('/api/gallery', async (req, res) => {
  res.json(await GalleryItem.find().sort({ sortOrder: 1 }).lean());
});
// Reorder must come BEFORE /:id routes so Express doesn't treat "reorder" as an id
app.post('/api/gallery/reorder', async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ message: 'order array required' });
  await Promise.all(order.map(({ id, sortOrder }) =>
    GalleryItem.findByIdAndUpdate(id, { $set: { sortOrder } })
  ));
  res.json({ success: true });
});
app.post('/api/gallery', upload.single('image'), async (req, res) => {
  if (!req.file && !req.body.file) return res.status(400).json({ message: 'Image required' });
  const filePath = req.file ? path.join(UPLOADS_DIR, req.file.filename) : null;
  if (filePath) await optimizeImage(filePath);
  const count = await GalleryItem.countDocuments();
  const item = await GalleryItem.create({
    ...req.body,
    file: req.file ? '/uploads/' + req.file.filename : req.body.file,
    sortOrder: count
  });
  res.json(item);
});
app.put('/api/gallery/:id', upload.single('image'), async (req, res) => {
  const body = { ...req.body };
  if (req.file) {
    body.file = '/uploads/' + req.file.filename;
    await optimizeImage(path.join(UPLOADS_DIR, req.file.filename));
  }
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

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found — Estifanos Solomon</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23080808'/><text y='72' x='50' text-anchor='middle' font-size='60' font-family='serif' fill='%23c9a84c'>E</text></svg>">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#080808;color:#f0ede8;font-family:'Georgia',serif;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;text-align:center;padding:2rem}
    h1{font-size:clamp(4rem,15vw,10rem);color:rgba(201,168,76,0.15);
      font-weight:900;line-height:1;margin-bottom:1rem}
    h2{font-size:1.5rem;font-weight:400;margin-bottom:1rem;color:#c9a84c}
    p{color:rgba(240,237,232,0.5);margin-bottom:2rem;font-size:.95rem}
    a{color:#c9a84c;text-decoration:none;font-size:.8rem;letter-spacing:2px;
      text-transform:uppercase;border-bottom:1px solid rgba(201,168,76,0.3);
      padding-bottom:2px;transition:border-color .3s}
    a:hover{border-color:#c9a84c}
  </style>
</head>
<body>
  <div>
    <h1>404</h1>
    <h2>Page not found</h2>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">← Back to portfolio</a>
  </div>
</body>
</html>`);
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MONGODB_URI set: ${!!process.env.MONGODB_URI}`);
  await seedIfEmpty();
});
