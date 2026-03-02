const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const { DATA_DIR } = require('../config/config.js');

const profilesPath = path.join(DATA_DIR, 'profiles.json');
const avatarsDir = path.join(DATA_DIR, 'avatars');

// Ensure avatars directory exists
if (!fssync.existsSync(avatarsDir)) {
  try {
    fssync.mkdirSync(avatarsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating avatars directory ${avatarsDir}: ${err.message}`);
    }
  }
}

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.body.id || Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only JPG and PNG files are allowed'));
    }
    cb(null, true);
  }
});

// Helper functions for profiles
const readProfiles = async () => {
  const dir = path.dirname(profilesPath);
  try {
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(profilesPath);
    } catch {
      await fs.writeFile(profilesPath, JSON.stringify([]));
    }
    const raw = await fs.readFile(profilesPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading profiles file:', err);
    throw err;
  }
};

const writeProfiles = async (profiles) => {
  await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
};

// Get user profile by username
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const profiles = await readProfiles();
    const user = profiles.find((u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Failed to read profile:', err);
    res.status(500).json({ error: 'Failed to read profile' });
  }
});

// Update user profile (with optional avatar upload)
router.put('/:id', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing user id' });

  try {
    const profiles = await readProfiles();
    const index = profiles.findIndex((u) => u.id === id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });

    let avatarPath = profiles[index].avatar || '';
    if (req.file) {
      avatarPath = `/avatars/${req.file.filename}`;
    }

    profiles[index] = { ...profiles[index], name, address, avatar: avatarPath };
    await writeProfiles(profiles);

    console.log('Updated profile for', id);
    res.json(profiles[index]);
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user stats (placeholder)
router.get('/:username/stats', async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  res.json({
    // Placeholder for user statistics
  });
});

module.exports = router;
