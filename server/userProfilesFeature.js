const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const { DATA_DIR } = require('./config/config.js');
const profilesPath = path.join(DATA_DIR, 'profiles.json');
const dbUsers = require('./dbUsers.js');
const avatarsDir = path.join(DATA_DIR, 'avatars');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.username) {
    console.log('Authentication failed: Invalid session', { 
      hasSession: !!req.session,
      hasUser: !!(req.session && req.session.user),
      username: req.session?.user?.username 
    });
    return res.status(401).json({ error: 'Please log in first' });
  }
  console.log('Authenticated user:', req.session.user);
  next();
}

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
      console.log('PROFILES DEBUG: File exists');
    } catch (accessErr) {
      console.log('PROFILES DEBUG: File does not exist, creating...');
      await fs.writeFile(profilesPath, JSON.stringify([]));
    }
    const raw = await fs.readFile(profilesPath, 'utf8');
    const parsed = JSON.parse(raw);
    console.log('PROFILES DEBUG: Read', parsed.length, 'profiles');
    console.log('PROFILES DEBUG: Profile IDs:', parsed.map(p => p.id));
    return parsed;
  } catch (err) {
    console.error('Error reading profiles file:', err);
    throw err;
  }
};

const writeProfiles = async (profiles) => {
  await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
};

// Get user profile by username
router.get('/profile/:username', async (req, res) => {
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

// Get current logged-in user's profile (session-backed)
router.get('/profile', async (req, res) => {
  try {
    console.log('=== GET PROFILE DEBUG ===');
    const sessionUser = req.session && req.session.user;
    console.log('Session user:', sessionUser);
    if (!sessionUser || !sessionUser.username) {
      console.log('No session user found');
      return res.status(401).json({ error: 'Please log in' });
    }

    const username = sessionUser.username;
    console.log('Looking for username:', username);
    console.log('Profiles path:', profilesPath);
    
    const profiles = await readProfiles();
    console.log('Loaded profiles count:', profiles.length);
    console.log('Available usernames:', profiles.map(p => p.username));
    
    const user = profiles.find((u) => u.username === username);
    console.log('Found user in profiles:', !!user);
    if (user) {
      console.log('Returning profile data:', user);
      return res.json(user);
    }

    // fallback to users DB
    const getUser = (u) => new Promise((resolve, reject) => {
      dbUsers.get('SELECT * FROM users WHERE username = ?', [u], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    try {
      const row = await getUser(username);
      if (!row) return res.status(404).json({ error: 'User not found' });
      const profileObj = {
        id: row.id?.toString?.() || '',
        username: row.username,
        name: ((row.firstname || '') + (row.lastname ? ' ' + row.lastname : '')).trim(),
        address: '',
        avatar: ''
      };
      return res.json(profileObj);
    } catch (e) {
      console.error('Error reading user from DB:', e);
      return res.status(500).json({ error: 'Failed to read profile' });
    }
  } catch (err) {
    console.error('Failed to read profile:', err);
    res.status(500).json({ error: 'Failed to read profile' });
  }
});

// Debug endpoint to check profile data
router.get('/debug-profiles', async (req, res) => {
  try {
    console.log('Debug profiles path:', profilesPath);
    const profiles = await readProfiles();
    res.json({
      profilesPath: profilesPath,
      profileCount: profiles.length,
      profiles: profiles,
      currentSession: req.session?.user
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Test PUT endpoint without auth for debugging
router.put('/test-profile/:id', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  console.log('=== TEST PUT PROFILE DEBUG START ===');
  console.log('PUT request for ID:', id);
  console.log('Request body:', req.body);
  console.log('Profiles path being used:', profilesPath);
  
  try {
    const profiles = await readProfiles();
    console.log('Loaded profiles:', profiles.length);
    console.log('Available profile IDs:', profiles.map(p => ({ id: p.id, type: typeof p.id })));
    
    const index = profiles.findIndex((u) => u.id === id);
    console.log('Looking for ID:', id, 'Type:', typeof id, 'Found index:', index);
    
    if (index === -1) {
      console.log('=== TEST PUT PROFILE DEBUG END - NOT FOUND ===');
      return res.status(404).json({ 
        error: 'User not found', 
        debug: {
          receivedId: id,
          receivedIdType: typeof id,
          availableIds: profiles.map(p => p.id),
          availableIdTypes: profiles.map(p => typeof p.id),
          profiles: profiles
        }
      });
    }

    const name = req.body?.name || profiles[index].name;
    const address = req.body?.address || profiles[index].address;
    
    profiles[index] = { ...profiles[index], name, address };
    await writeProfiles(profiles);

    console.log('=== TEST PUT PROFILE DEBUG END - SUCCESS ===');
    res.json({ success: true, updatedProfile: profiles[index] });
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

// Simple test endpoint
router.get('/test', (req, res) => {
  console.log('TEST ENDPOINT HIT');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Update user profile (with optional avatar upload)
router.put('/profile/:id', (req, res, next) => {
  next();
}, requireAuth, upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  const name = req.body?.name || '';
  const address = req.body?.address || '';
  if (!id) return res.status(400).json({ error: 'Missing user id' });

  try {
    const profiles = await readProfiles();
    console.log('Loaded profiles:', profiles.length);
    console.log('Profile data:', profiles.map(p => ({ id: p.id, idType: typeof p.id, username: p.username })));
    
    // Try both string and number comparisons
    let index = profiles.findIndex((u) => u.id === id);
    if (index === -1) {
      console.log('String comparison failed, trying number comparison');
      index = profiles.findIndex((u) => u.id == id);
    }
    if (index === -1) {
      console.log('Number comparison failed, trying parseInt');
      index = profiles.findIndex((u) => parseInt(u.id) === parseInt(id));
    }
    
    console.log('Looking for ID:', id, 'Found index:', index);
    
    if (index === -1) {
      console.log('=== PUT PROFILE DEBUG END - NOT FOUND ===');
      return res.status(404).json({ 
        error: 'User not found', 
        debug: {
          searchId: id,
          searchIdType: typeof id,
          availableIds: profiles.map(p => ({ id: p.id, type: typeof p.id })),
          profilesCount: profiles.length
        }
      });
    }

    let avatarPath = profiles[index].avatar || '';
    if (req.file) {
      avatarPath = `/avatars/${req.file.filename}`;
    }

    profiles[index] = { ...profiles[index], name, address, avatar: avatarPath };
    await writeProfiles(profiles);

    console.log('=== PUT PROFILE DEBUG END - SUCCESS ===');
    res.json(profiles[index]);
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

// Get user stats (placeholder)
router.get('/profile/:username/stats', async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  res.json({
    // Placeholder for user statistics
  });
});

console.log('=== USERPROFILES ROUTER SETUP COMPLETE ===');
module.exports = router;
