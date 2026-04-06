const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// Simple file-based database
const DB_FILE = 'database.json';
const UPLOADS_DIR = 'uploads';

// Initialize database
async function initDB() {
    try {
        await fs.access(DB_FILE);
    } catch {
        const initialData = {
            artists: [{
                id: '1',
                name: 'Estifanos Solomon',
                email: 'ruthmesfin29@gmail.com',
                password: await bcrypt.hash('admin123', 10),
                bio: 'Estifanos Solomon is a contemporary Ethiopian visual artist specializing in printmaking and painting. He graduated from the Russian Cultural Center in painting and basic visual arts, then continued his studies at Teferi Mekonen School (TMS) in painting. He completed his Bachelor\'s degree in Printmaking at Addis Ababa University\'s Ale School of Fine Art and Design (ASFAD). His art is influenced by passion and conflict, with artworks that evoke emotions drawn from personal experiences. He focuses on bringing truth to the canvas and finding new ways to make people see things from different perspectives.',
                phone: '+251 911 345 678',
                location: 'Addis Ababa, Ethiopia',
                website: 'www.estifanossolomon.com',
                socialMedia: {
                    instagram: 'https://instagram.com/estif_solomon17',
                    facebook: 'https://facebook.com/estifanos.solomon.artist',
                    twitter: 'https://twitter.com/estifsolomon',
                    behance: 'https://behance.net/estifanossolomon'
                },
                education: [
                    {
                        degree: 'Bachelor of Fine Arts (BFA) in Printmaking',
                        institution: 'Addis Ababa University - Ale School of Fine Art and Design (ASFAD)',
                        year: '2020'
                    },
                    {
                        degree: 'Diploma in Painting',
                        institution: 'Teferi Mekonen School (TMS)',
                        year: '2018'
                    },
                    {
                        degree: 'Certificate in Painting and Basic Visual Arts',
                        institution: 'Russian Cultural Center',
                        year: '2016'
                    }
                ],
                exhibitions: [
                    {
                        title: 'Impressions of Africa',
                        venue: 'Alliance Ethio-Française, Addis Ababa',
                        year: '2024',
                        type: 'solo'
                    },
                    {
                        title: 'Contemporary Ethiopian Printmakers',
                        venue: 'Gebre Kristos Desta Center',
                        year: '2023',
                        type: 'group'
                    },
                    {
                        title: 'Emerging Voices',
                        venue: 'Addis Fine Art Gallery',
                        year: '2023',
                        type: 'group'
                    },
                    {
                        title: 'ASFAD Graduate Exhibition',
                        venue: 'Ale School of Fine Art and Design',
                        year: '2020',
                        type: 'group'
                    }
                ],
                awards: [
                    {
                        title: 'Best Printmaking Graduate',
                        organization: 'ASFAD - Ale School of Fine Art and Design',
                        year: '2020'
                    },
                    {
                        title: 'Emerging Artist Recognition',
                        organization: 'Ethiopian Artists Association',
                        year: '2021'
                    }
                ]
            }],
            artworks: [
                {
                    id: '1',
                    title: 'Urban Reflections',
                    description: 'A powerful linocut print exploring the complexity of modern urban life in Addis Ababa. The layered composition reflects the artist\'s personal journey and the contradictions of contemporary Ethiopian society. This work captures the complications around us through bold lines and contrasting textures.',
                    medium: 'Linocut print on paper',
                    dimensions: '70cm x 50cm',
                    year: '2024',
                    category: 'printmaking',
                    tags: ['urban', 'printmaking', 'contemporary', 'social commentary'],
                    artist: '1',
                    image: {
                        filename: 'urban-reflections.jpg',
                        originalName: 'urban-reflections.jpg',
                        path: 'images/artwork1.jpg',
                        size: 1856000,
                        mimetype: 'image/jpeg'
                    },
                    price: {
                        amount: 800,
                        currency: 'USD',
                        isForSale: true
                    },
                    isPublished: true,
                    isFeatured: true,
                    viewCount: 234,
                    createdAt: new Date('2024-02-15').toISOString()
                },
                {
                    id: '2',
                    title: 'Daily Complications',
                    description: 'Part of an ongoing series that captures the complications around us in everyday life. This mixed media piece combines screenprint with collage elements from Ethiopian newspapers and magazines, reflecting on the daily experiences of ordinary people.',
                    medium: 'Screenprint and collage on canvas',
                    dimensions: '100cm x 80cm',
                    year: '2023',
                    category: 'mixed-media',
                    tags: ['daily life', 'collage', 'mixed media', 'social'],
                    artist: '1',
                    image: {
                        filename: 'daily-complications.jpg',
                        originalName: 'daily-complications.jpg',
                        path: 'images/artwork2.jpg',
                        size: 2145000,
                        mimetype: 'image/jpeg'
                    },
                    price: {
                        amount: 1200,
                        currency: 'USD',
                        isForSale: true
                    },
                    isPublished: true,
                    isFeatured: false,
                    viewCount: 156,
                    createdAt: new Date('2023-11-10').toISOString()
                },
                {
                    id: '3',
                    title: 'Truth on Canvas',
                    description: 'An abstract painting that challenges viewers to see everyday images from new perspectives. The composition uses bold colors and dynamic forms to reveal hidden truths in familiar scenes.',
                    medium: 'Acrylic on canvas',
                    dimensions: '120cm x 90cm',
                    year: '2024',
                    category: 'painting',
                    tags: ['abstract', 'truth', 'perspective', 'bold colors'],
                    artist: '1',
                    image: {
                        filename: 'truth-on-canvas.jpg',
                        originalName: 'truth-on-canvas.jpg',
                        path: 'images/artwork3.jpg',
                        size: 2456000,
                        mimetype: 'image/jpeg'
                    },
                    price: {
                        amount: 1500,
                        currency: 'USD',
                        isForSale: true
                    },
                    isPublished: true,
                    isFeatured: true,
                    viewCount: 189,
                    createdAt: new Date('2024-01-20').toISOString()
                },
                {
                    id: '4',
                    title: 'Woodcut Dreams',
                    description: 'A traditional woodcut print inspired by Ethiopian folk tales and dreams. The intricate carving technique creates depth and texture that speaks to ancestral storytelling traditions.',
                    medium: 'Woodcut print on handmade paper',
                    dimensions: '60cm x 45cm',
                    year: '2023',
                    category: 'printmaking',
                    tags: ['woodcut', 'traditional', 'folk tales', 'dreams'],
                    artist: '1',
                    image: {
                        filename: 'woodcut-dreams.jpg',
                        originalName: 'woodcut-dreams.jpg',
                        path: 'images/artwork4.jpg',
                        size: 1734000,
                        mimetype: 'image/jpeg'
                    },
                    price: {
                        amount: 650,
                        currency: 'USD',
                        isForSale: true
                    },
                    isPublished: true,
                    isFeatured: false,
                    viewCount: 123,
                    createdAt: new Date('2023-09-05').toISOString()
                },
                {
                    id: '5',
                    title: 'Personal Landscapes',
                    description: 'An emotional landscape painting that maps internal geography rather than physical terrain. The work explores how personal experiences shape our perception of space and place.',
                    medium: 'Oil on canvas',
                    dimensions: '110cm x 85cm',
                    year: '2024',
                    category: 'painting',
                    tags: ['landscape', 'emotional', 'personal', 'oil painting'],
                    artist: '1',
                    image: {
                        filename: 'personal-landscapes.jpg',
                        originalName: 'personal-landscapes.jpg',
                        path: 'images/artwork5.jpg',
                        size: 2234000,
                        mimetype: 'image/jpeg'
                    },
                    price: {
                        amount: 1800,
                        currency: 'USD',
                        isForSale: true
                    },
                    isPublished: true,
                    isFeatured: false,
                    viewCount: 167,
                    createdAt: new Date('2024-03-12').toISOString()
                },
                {
                    id: '6',
                    title: 'Etching Memories',
                    description: 'A delicate etching that captures fleeting moments and memories. The fine lines and subtle tones create an intimate viewing experience that invites contemplation.',
                    medium: 'Etching on paper',
                    dimensions: '40cm x 30cm',
                    year: '2023',
                    category: 'printmaking',
                    tags: ['etching', 'memories', 'intimate', 'contemplative'],
                    artist: '1',
                    image: {
                        filename: 'etching-memories.jpg',
                        originalName: 'etching-memories.jpg',
                        path: 'images/artwork6.jpg',
                        size: 1456000,
                        mimetype: 'image/jpeg'
                    },
                    price: {
                        amount: 450,
                        currency: 'USD',
                        isForSale: true
                    },
                    isPublished: true,
                    isFeatured: false,
                    viewCount: 98,
                    createdAt: new Date('2023-07-18').toISOString()
                }
            ]
        };
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
    }
    
    // Create uploads directory
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        await fs.mkdir(path.join(UPLOADS_DIR, 'artworks'), { recursive: true });
    } catch (error) {
        // Directory already exists
    }
}

// Database helpers
async function readDB() {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
}

async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/admin', express.static('admin'));
app.use(express.static('public'));

// Auth middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, 'secret-key');
        req.artistId = decoded.artistId;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Configure multer
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        cb(null, path.join(UPLOADS_DIR, 'artworks'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'artwork-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'));
        }
    }
});

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = await readDB();
        
        const artist = db.artists.find(a => a.email === email);
        if (!artist) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await bcrypt.compare(password, artist.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ artistId: artist.id }, 'secret-key', { expiresIn: '7d' });
        
        res.json({
            message: 'Login successful',
            token,
            artist: {
                id: artist.id,
                name: artist.name,
                email: artist.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get profile
app.get('/api/auth/profile', auth, async (req, res) => {
    try {
        const db = await readDB();
        const artist = db.artists.find(a => a.id === req.artistId);
        if (!artist) {
            return res.status(404).json({ message: 'Artist not found' });
        }
        
        const { password, ...artistData } = artist;
        res.json(artistData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update profile
app.put('/api/auth/profile', auth, async (req, res) => {
    try {
        const db = await readDB();
        const artistIndex = db.artists.findIndex(a => a.id === req.artistId);
        
        if (artistIndex === -1) {
            return res.status(404).json({ message: 'Artist not found' });
        }
        
        db.artists[artistIndex] = { ...db.artists[artistIndex], ...req.body };
        await writeDB(db);
        
        const { password, ...artistData } = db.artists[artistIndex];
        res.json({ message: 'Profile updated', artist: artistData });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get artworks (public)
app.get('/api/artworks/public', async (req, res) => {
    try {
        const db = await readDB();
        const artworks = db.artworks.filter(a => a.isPublished);
        res.json({ artworks });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get artworks (private)
app.get('/api/artworks', auth, async (req, res) => {
    try {
        const db = await readDB();
        const artworks = db.artworks.filter(a => a.artist === req.artistId);
        res.json({ artworks });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create artwork
app.post('/api/artworks', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Image required' });
        }
        
        const db = await readDB();
        const artwork = {
            id: Date.now().toString(),
            ...req.body,
            artist: req.artistId,
            image: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: path.join('uploads', 'artworks', req.file.filename),
                size: req.file.size,
                mimetype: req.file.mimetype
            },
            isPublished: req.body.isPublished === 'true',
            isFeatured: req.body.isFeatured === 'true',
            tags: typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : [],
            viewCount: 0,
            createdAt: new Date().toISOString()
        };
        
        db.artworks.push(artwork);
        await writeDB(db);
        
        res.status(201).json({ message: 'Artwork created', artwork });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update artwork
app.put('/api/artworks/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const db = await readDB();
        const artworkIndex = db.artworks.findIndex(a => a.id === req.params.id && a.artist === req.artistId);
        
        if (artworkIndex === -1) {
            return res.status(404).json({ message: 'Artwork not found' });
        }
        
        const updates = { ...req.body };
        
        if (req.file) {
            // Delete old image
            const oldImagePath = path.join(__dirname, db.artworks[artworkIndex].image.path);
            try {
                await fs.unlink(oldImagePath);
            } catch (error) {
                console.log('Old image not found');
            }
            
            updates.image = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: path.join('uploads', 'artworks', req.file.filename),
                size: req.file.size,
                mimetype: req.file.mimetype
            };
        }
        
        updates.isPublished = req.body.isPublished === 'true';
        updates.isFeatured = req.body.isFeatured === 'true';
        updates.tags = typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()) : [];
        
        db.artworks[artworkIndex] = { ...db.artworks[artworkIndex], ...updates };
        await writeDB(db);
        
        res.json({ message: 'Artwork updated', artwork: db.artworks[artworkIndex] });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete artwork
app.delete('/api/artworks/:id', auth, async (req, res) => {
    try {
        const db = await readDB();
        const artworkIndex = db.artworks.findIndex(a => a.id === req.params.id && a.artist === req.artistId);
        
        if (artworkIndex === -1) {
            return res.status(404).json({ message: 'Artwork not found' });
        }
        
        // Delete image file
        const imagePath = path.join(__dirname, db.artworks[artworkIndex].image.path);
        try {
            await fs.unlink(imagePath);
        } catch (error) {
            console.log('Image file not found');
        }
        
        db.artworks.splice(artworkIndex, 1);
        await writeDB(db);
        
        res.json({ message: 'Artwork deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Serve main portfolio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
    await initDB();
    
    app.listen(PORT, () => {
        console.log(`🎨 Artist Portfolio CMS running on http://localhost:${PORT}`);
        console.log(`📱 Portfolio: http://localhost:${PORT}`);
        console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`📧 Login: admin@artist.com`);
        console.log(`🔑 Password: admin123`);
    });
}

startServer().catch(console.error);