const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5500;

// MongoDB setup
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/embakasi2023', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err.message);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files allowed'));
    }
});

// MongoDB Schemas
const contestantSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: String,
    phone: String,
    email: String,
    category: String,
    bio: String,
    photo: String,
    registeredOn: String,
    status: { type: String, default: 'pending' },
    votes: { type: Number, default: 0 }
});

const voteTransactionSchema = new mongoose.Schema({
    contestantId: Number,
    contestantName: String,
    votes: Number,
    amount: Number,
    phone: String,
    timestamp: String,
    status: { type: String, default: 'pending' }
});

const Contestant = mongoose.model('Contestant', contestantSchema);
const VoteTransaction = mongoose.model('VoteTransaction', voteTransactionSchema);

// Helper to generate unique ID
const generateUniqueId = async () => {
    const last = await Contestant.findOne().sort({ id: -1 });
    return last ? last.id + 1 : 1;
};

// ========== API ROUTES ==========

// 📌 Get all approved contestants
app.get('/api/contestants', async (req, res) => {
    try {
        const contestants = await Contestant.find({ status: 'approved' }).sort({ votes: -1 });
        res.json(contestants);
    } catch {
        res.status(500).json({ error: 'Error fetching contestants' });
    }
});

// 📌 Get top 10 contestants
app.get('/api/contestants/top', async (req, res) => {
    try {
        const top = await Contestant.find({ status: 'approved' }).sort({ votes: -1 }).limit(10);
        res.json(top);
    } catch {
        res.status(500).json({ error: 'Error fetching top contestants' });
    }
});

// 📌 Register new contestant
app.post('/api/contestants/register', upload.single('photo'), async (req, res) => {
    try {
        const { fullName, phone, email, category, bio } = req.body;
        if (!fullName || !phone || !category || !req.file) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        const newContestant = new Contestant({
            id: await generateUniqueId(),
            name: fullName,
            phone,
            email,
            category,
            bio,
            photo: `/uploads/${req.file.filename}`,
            registeredOn: new Date().toISOString().split('T')[0],
            status: 'pending'
        });

        await newContestant.save();
        res.json({ message: 'Registration successful. Awaiting approval.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error registering contestant' });
    }
});

// 📌 Cast a vote (simulation)
app.post('/api/vote', async (req, res) => {
    try {
        const { contestantId, votes, phone } = req.body;

        if (!contestantId || !votes || !phone || !/^254[17]\d{8}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid input data' });
        }

        const contestant = await Contestant.findOne({ id: contestantId, status: 'approved' });
        if (!contestant) {
            return res.status(404).json({ error: 'Contestant not found or not approved' });
        }

        const amount = votes * 20;
        const voteTxn = new VoteTransaction({
            contestantId,
            contestantName: contestant.name,
            votes,
            amount,
            phone,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        await voteTxn.save();

        contestant.votes += votes;
        await contestant.save();

        res.json({ message: 'Vote cast successfully', transaction: voteTxn });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing vote' });
    }
});

// ========== ADMIN ROUTES ==========

// 📌 Get pending contestants
app.get('/api/admin/pending', async (req, res) => {
    try {
        const pending = await Contestant.find({ status: 'pending' });
        res.json(pending);
    } catch {
        res.status(500).json({ error: 'Error fetching pending contestants' });
    }
});

// 📌 Approve contestant
app.post('/api/admin/approve/:id', async (req, res) => {
    try {
        const contestant = await Contestant.findOne({ id: req.params.id });
        if (!contestant) return res.status(404).json({ error: 'Contestant not found' });

        contestant.status = 'approved';
        await contestant.save();

        res.json({ message: 'Contestant approved successfully' });
    } catch {
        res.status(500).json({ error: 'Error approving contestant' });
    }
});

// 📌 Toggle voting status (dummy endpoint)
app.post('/api/admin/voting', async (req, res) => {
    try {
        const { enabled } = req.body;
        res.json({ message: `Voting ${enabled ? 'enabled' : 'disabled'}` });
    } catch {
        res.status(500).json({ error: 'Error updating voting status' });
    }
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
