require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');

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

app.use(express.json());
app.use(express.static('public'));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

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
  if (!req.file) return res.status(400).json({ message: 'Image required' });
  const item = await GalleryItem.create({ ...req.body, file: '/uploads/' + req.file.filename });
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
  await seedIfEmpty();
});
