require('dotenv').config({ path: '../.env' });
const express = require('express')
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { generateRoute, routeWaypointsOnly } = require('./services/generateRoute.js');
const { getLocationFromIP, getClientIP } = require('./utils/geolocation.js');
const app = express();
const port = process.env.PORT || 3000;
const dbUsers = require('./dbUsers.js'); // import users database
const bcrypt = require('bcrypt');
const session = require(`express-session`);
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR } = require('./config/config.js');
// Ensure data directory exists synchronously
const fsSync = require('fs');
try {
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  // ignore if already exists or permission error (handled in config)
  if (e.code !== 'EEXIST') {
    console.warn(`Warning: Could not create DATA_DIR ${DATA_DIR}: ${e.message}`);
  }
}
const profilesPath = path.join(DATA_DIR, 'profiles.json');
const routesPath = path.join(DATA_DIR, 'routes.json');
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '100mb' }));

// Profile helper functions
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


// fix to work with Mandy's changesv cf cv
console.log('OPENAI key present:', !!process.env.OPENAI_API_KEY, 'model:', process.env.OPENAI_MODEL);

// helper functions
function validPassword(password) {
    if (password === "") {
        return false;
    }

    return true;
}

function validUsername(username) {
    if (username === "") {
        return false;
    }

    return true;
}

const ensureRoutesFile = async () => {
  const dir = path.dirname(routesPath);
  try {
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(routesPath);
    } catch {
      await fs.writeFile(routesPath, JSON.stringify([]));
    }
  } catch (err) {
    console.error('Error ensuring routes file:', err);
    throw new Error('Failed to initialize routes file');
  }
};

const readRoutes = async () => {
  try {
    await ensureRoutesFile();
    const raw = await fs.readFile(routesPath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading routes file:', err);
    throw err;
  }
};

const writeRoutes = async (routes) => {
  await fs.writeFile(routesPath, JSON.stringify(routes, null, 2));
};

// Enable CORS for all routes
// Configure allowed frontend origin for CORS (use REACT_APP_API_BASE_URL or FRONTEND_ORIGIN env)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.REACT_APP_API_BASE_URL || 'http://localhost:5173';

console.log('CORS Configuration:', {
  FRONTEND_ORIGIN,
  NODE_ENV: process.env.NODE_ENV
});

// If running behind a proxy (e.g. in Docker with a reverse proxy), enable trust proxy when requested
if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: function(origin, callback) {
    console.log('CORS Origin check:', { origin, FRONTEND_ORIGIN });
    
    // Allow requests with no origin like curl/postman
    if (!origin) {
      console.log('Allowing request with no origin');
      return callback(null, true);
    }
    
    // Allow the configured frontend origin and localhost variants
    const allowed = [
      FRONTEND_ORIGIN, 
      'http://localhost', 
      'http://127.0.0.1', 
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:80',
      'https://cyclone-front-end.onrender.com'  // Explicitly add your frontend URL
    ];
    
    console.log('Allowed origins:', allowed);
    
    if (allowed.indexOf(origin) !== -1) {
      console.log('Origin allowed:', origin);
      return callback(null, true);
    }
    
    console.log('Origin rejected:', origin);
    return callback(new Error('CORS policy does not allow access from the specified Origin.'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// allow json parsing
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    dataDir: DATA_DIR,
    frontendOrigin: FRONTEND_ORIGIN
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(DATA_DIR, 'avatars'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Makes sure avatars directory exists
const avatarsDir = path.join(DATA_DIR, 'avatars');
fs.mkdir(avatarsDir, { recursive: true }).catch((err) => {
  if (err.code !== 'EEXIST') {
    console.error(`Error creating avatars directory ${avatarsDir}: ${err.message}`);
  }
});

// Serve static files (including avatars)
app.use('/avatars', express.static(avatarsDir));

// Set up sessions
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db', 
    dir: DATA_DIR     
  }),
  secret: 'cycloneisagreatapplicationandeveryonelovesitsomuch',
  resave: false,
  saveUninitialized: false,
  cookie: {
  maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  // For local development (including Docker), use insecure cookies
  secure: false, // Set to true only in actual production with HTTPS
  httpOnly: true,
  sameSite: 'lax' // Use lax for local development
  }
}));

// Import route modules
const savedRoutesRouter = require('./saveRoutesFeature.js');
const userProfilesRouter = require('./userProfilesFeature.js');

console.log('Router types:', { 
  savedRoutesRouter: typeof savedRoutesRouter, 
  userProfilesRouter: typeof userProfilesRouter 
});

// Mount routes
console.log('About to mount routes...');
console.log('savedRoutesRouter:', typeof savedRoutesRouter);
console.log('userProfilesRouter:', typeof userProfilesRouter);

app.use('/api/routes', savedRoutesRouter);

app.post('/api/import-route', async (req, res) => {
  if (!req.session?.user || !req.session.user.id) {
    console.log('Authentication failed: Invalid user');
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    await ensureRoutesFile();
    const username = req.session.user.username;
    const { routeName, waypoints, rawStats, cueSheet } = req.body;

    if (!routeName || !Array.isArray(waypoints) || waypoints.length === 0) {
      console.log('Import route failed: Missing or invalid routeName/waypoints', { body: req.body });
      return res.status(400).json({ error: 'Missing or invalid route name or waypoints' });
    }

    const newRoute = {
      id: Date.now(),
      username,
      routeName,
      waypoints,
      rawStats: rawStats || null,
      cueSheet: cueSheet || [],
      preferences: null,
      createdAt: new Date().toISOString(),
    };
    let routes = await readRoutes();
    if (!Array.isArray(routes)) {
      console.warn('routes.json corrupted, resetting to empty array');
      routes = [];
    }
    routes.push(newRoute);
    await writeRoutes(routes);

    console.log('GPX Route imported successfully to routes.json:', newRoute);
    res.json({ message: 'GPX Route imported successfully' });
  } catch (err) {
    console.error('Error importing GPX route:', err);
    res.status(500).json({ error: `Failed to import GPX route: ${err.message}` });
  }
});

// Test route for debugging profile issues
app.get('/api/debug-profile-test', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const profilesPath = path.join(DATA_DIR, 'profiles.json');
    
    console.log('Reading profiles from:', profilesPath);
    const profilesData = await fs.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(profilesData);
    
    res.json({
      profilesPath,
      profileCount: profiles.length,
      profiles: profiles,
      user5: profiles.find(p => p.id === "5" || p.id === 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

console.log('Routers mounted successfully');

// POST login endpoint
// this method does logging in and registering
app.post('/api/login', async (req, res) => {
  console.log('LOGIN REQUEST RECEIVED:', req.body);
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  // promisified db.get
  const getUser = (u) => new Promise((resolve, reject) => {
    dbUsers.get('SELECT * FROM users WHERE username = ?', [u], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  try {
    const row = await getUser(username);
    if (!row) return res.status(404).json({ message: 'User not found, please register', ok: false });

    const match = await new Promise((resolve, reject) => {
      bcrypt.compare(password, row.password, (err, same) => {
        if (err) return reject(err);
        resolve(same);
      });
    });

    if (!match) return res.status(401).json({ message: 'Incorrect password', ok: false });

    // fetch profile if exists
    let profile = null;
    try {
      const raw = await fs.readFile(profilesPath, 'utf8');
      const profiles = JSON.parse(raw || '[]');
      profile = profiles.find(p => p.username === username) || null;
    } catch (e) {
      profile = null;
    }

    // derive display name
    let displayName = username; // fallback to username
    if (profile && (profile.firstName || profile.lastName)) {
      displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      console.log('Using profile firstName/lastName:', displayName);
    } else if (profile && profile.name) {
      displayName = profile.name;
      console.log('Using profile name:', displayName);
    } else if (row.firstname) {
      displayName = row.firstname + (row.lastname ? ' ' + row.lastname : '');
      console.log('Using DB firstname/lastname:', displayName);
    } else {
      console.log('Using username as fallback:', displayName);
    }
    // Use profilePicture as primary avatar field, if none set, then default
    const avatar = (profile && profile.profilePicture) || '/avatars/default-avatar.png';
    console.log('Final displayName:', displayName, 'avatar:', avatar);

    // Create session with full profile data for frontend components
    req.session.user = { 
      username, 
      name: displayName, 
      avatar,
      // Includes firstName/lastName for Header component
      firstName: profile?.firstName || row.firstname || '',
      lastName: profile?.lastName || row.lastname || '',
      id: profile?.id || row.id
    };

    console.log('Session user data:', req.session.user);

    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Could not save session' });
      }
      // Return first name only for login response (frontend will fetch full profile)
      const firstName = displayName.split(' ')[0];
      console.log('Returning login response with firstName:', firstName);
      return res.json({ message: 'Succesful login', ok: true, username, name: firstName, avatar });
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// registration function
app.post('/api/register', async (req, res) => {
    console.log('=== REGISTRATION REQUEST RECEIVED ===');

    // encryption stuff
    const saltRounds = 10;

    // destructure request
    const {username, password, passwordConf, firstName, lastName} = req.body;
    console.log(`{username}`);

    // handle registration / login
    dbUsers.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        (err, row) => {
            if (err) {
                console.error('DB error:', err.message);
                return res.status(500).json({ message: 'Error in creating account', ok: false });;
            } else if (row) {
                // user exists try and login with given password
                return res.status(401).json({ message: 'Username already exists!', ok: false});;

            } else {
                // check valid password and username for registration
                
                if (!validPassword(password)) {
                    return res.status(401).json({ message: 'Invalid password, must be non-empty', ok: false});
                }
                
                if (!validUsername(username)) {
                    return res.status(401).json({ message: 'Invalid username, must be non-empty', ok: false});
                }

                if (password != passwordConf) {
                    return res.status(401).json({ message: 'Password and confirmation must match.', ok: false});
                }



                // store user into table
                console.log('Username does not exist');
                // encrypt password
                bcrypt.hash(password, saltRounds, function(err, hash) {
                    if (err) {
                        console.error('Error hashing password:', err);
                        return res.status(500).json({ message: 'Error in creating account', ok: false });
                    }

                    console.log(hash);

                    // Store things in database now
                    dbUsers.run(`INSERT INTO users (username, password, firstname, lastname) VALUES (?, ?, ?, ?)`,
                    [username, hash, firstName, lastName], async function(err) {
                        if(err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Database issue preventing registration', ok: false });
                        }

                        // Gets the ID of the newly created user
                        const userId = this.lastID;
                        console.log('Created user with ID:', userId);

                        try {
                            // Create corresponding profile entry in profiles.json
                            const profiles = await readProfiles();
                            const newProfile = {
                                id: userId.toString(),
                                username: username,
                                password: hash,
                                firstName: firstName,
                                lastName: lastName,
                                address: "",
                                profilePicture: "/avatars/default-avatar.png",
                                avatar: ""
                            };
                            
                            profiles.push(newProfile);
                            await writeProfiles(profiles);
                            console.log('Created profile entry for user:', userId);

                            // let user know they have succesfully registered
                            return res.json({
                                message: 'User registered successfully! Please log in.',
                                ok: true
                            });
                        } catch (profileErr) {
                            console.error('Error creating profile entry:', profileErr);
                            // Error message for when user is successfully created in database but profile creation failed
                            // Will still return success since the user can log in
                            return res.json({
                                message: 'User registered successfully! Please log in.',
                                ok: true
                            });
                        }
                    });
                });
            }
        }
    );
});


// check if user is logged in with this method (gives info about current session)
app.get('/api/debug-session', (req, res) => {
  res.json({
    sessionExists: !!req.session,
    sessionUser: req.session?.user,
    sessionID: req.sessionID
  });
});

app.get('/api/status', async (req, res) => {
  if (req.session.user) {
    // try to include name and avatar; prefer session-stored values
    const resp = { loggedIn: true };
    let userName = null;
    
    if (req.session.user.name) {
      userName = req.session.user.name; 
    }
    if (req.session.user.avatar) resp.avatar = req.session.user.avatar;

    // as a fallback, read profiles file and users DB to enrich info
    try {
      if (!userName || !resp.avatar) {
        const raw = await fs.readFile(profilesPath, 'utf8');
        const profiles = JSON.parse(raw || '[]');
        const profile = profiles.find(p => p.username === req.session.user.username);
        if (profile) {
          if (!userName && profile.name) userName = profile.name; 
          if (!resp.avatar && (profile.avatar || profile.profilePicture)) resp.avatar = profile.avatar || profile.profilePicture;
        }
        
        // If still no name, try to get from users DB
        if (!userName) {
          const getUser = (u) => new Promise((resolve, reject) => {
            dbUsers.get('SELECT * FROM users WHERE username = ?', [u], (err, row) => {
              if (err) return reject(err);
              resolve(row);
            });
          });
          
          try {
            const userRow = await getUser(req.session.user.username);
            if (userRow && userRow.firstname) {
              userName = userRow.firstname;
            }
          } catch (e) {
            console.error('Error fetching user from DB:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error reading profiles:', e);
    }
    
    if (userName) resp.name = userName;
    return res.json(resp);
  } else {
    res.json({ loggedIn: false });
  }
});

// Test route to verify PUT functionality
app.put('/api/test-put/:id', (req, res) => {
  console.log('TEST PUT ROUTE HIT for ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('Session:', req.session?.user);
  
  res.json({ 
    message: 'Test PUT route working', 
    id: req.params.id,
    body: req.body,
    session: req.session?.user
  });
});

// Test endpoint to debug form data
app.post('/api/test-form', upload.single('avatar'), (req, res) => {
  console.log('=== TEST FORM ENDPOINT ===');
  console.log('Body:', req.body);
  console.log('firstName:', req.body.firstName);
  console.log('lastName:', req.body.lastName);
  console.log('address:', req.body.address);
  res.json({
    received: req.body,
    fields: {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      address: req.body.address
    }
  });
});

// Debug endpoint to test form data parsing
app.put('/api/debug/form-test', upload.single('avatar'), (req, res) => {
  console.log('=== FORM DEBUG TEST ===');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  console.log('req.body.firstName:', req.body.firstName);
  console.log('req.body.lastName:', req.body.lastName);
  console.log('req.body.address:', req.body.address);
  res.json({
    received: req.body,
    file: req.file ? 'FILE_RECEIVED' : 'NO_FILE'
  });
});

app.put('/api/user/profile/:id', upload.single('avatar'), async (req, res) => {
  console.log('IN SERVER.JS ENDPOINT');
  console.log('=== DIRECT PROFILE UPDATE START ===');
  console.log('User ID:', req.params.id);
  console.log('Raw request body:', req.body);
  console.log('Raw request file:', req.file);
  console.log('Session user:', req.session?.user);
  
  // Check authentication
  if (!req.session || !req.session.user || !req.session.user.username) {
    console.log('Authentication failed');
    return res.status(401).json({ error: 'Please log in first' });
  }

  const { id } = req.params;
  const { firstName, lastName, address } = req.body;
  
  console.log('Received form data:', { firstName, lastName, address });

  try {
    // Read profiles.json
    const profilesPath = path.join(DATA_DIR, 'profiles.json');
    console.log('Reading profiles from:', profilesPath);
    
    const profilesData = await fs.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(profilesData);
    
    console.log('Loaded profiles count:', profiles.length);
    console.log('Available profile IDs:', profiles.map(p => ({ id: p.id, type: typeof p.id })));
    
    // Find profile with flexible ID matching
    let profileIndex = profiles.findIndex(p => p.id === id);
    if (profileIndex === -1) {
      profileIndex = profiles.findIndex(p => p.id == id);
    }
    if (profileIndex === -1) {
      profileIndex = profiles.findIndex(p => parseInt(p.id) === parseInt(id));
    }

    console.log('Profile search result - Index:', profileIndex);

    if (profileIndex === -1) {
      console.log('Profile not found for ID:', id);
      return res.status(404).json({ 
        error: 'Profile not found',
        debug: {
          searchId: id,
          searchIdType: typeof id,
          availableIds: profiles.map(p => p.id)
        }
      });
    }

    // Prepare updated profile data  
    const updatedProfile = {
      ...profiles[profileIndex]
    };
    
    console.log('=== FIELD UPDATE ===');
    console.log('Original profile:', profiles[profileIndex]);
    console.log('Form values received:', { firstName, lastName, address });
    console.log('Updating fields...');
    
    console.log('=== UPDATING ALL FIELDS ===');
    
    if (address !== undefined) {
      console.log(`✓ Address update: "${profiles[profileIndex].address}" -> "${address}"`);
      updatedProfile.address = address;
    }
    
    if (firstName !== undefined) {
      console.log(`✓ FirstName update: "${profiles[profileIndex].firstName}" -> "${firstName}"`);
      updatedProfile.firstName = firstName;
    }
    
    if (lastName !== undefined) {
      console.log(`✓ LastName update: "${profiles[profileIndex].lastName}" -> "${lastName}"`);
      updatedProfile.lastName = lastName;
    }

    console.log('Final profile after updates:', updatedProfile);

    // If file was uploaded, update profilePicture 
    if (req.file) {
      updatedProfile.profilePicture = `/avatars/${req.file.filename}`;
      // Also set avatar for backward compatibility
      updatedProfile.avatar = `/avatars/${req.file.filename}`;
      console.log('Avatar uploaded, updated profilePicture:', updatedProfile.profilePicture);
    }

    profiles[profileIndex] = updatedProfile;

    console.log('=== BEFORE FILE WRITE ===');
    console.log('Original profile before update:', JSON.stringify(profiles[profileIndex], null, 2));
    console.log('Updated profile being written:', JSON.stringify(updatedProfile, null, 2));
    console.log('firstName in updatedProfile:', updatedProfile.firstName);
    console.log('lastName in updatedProfile:', updatedProfile.lastName);
    console.log('address in updatedProfile:', updatedProfile.address);

    // Write back to file
    await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
    
    // Update session with new profile data including individual firstName/lastName
    const fullName = `${updatedProfile.firstName || ''} ${updatedProfile.lastName || ''}`.trim();
    req.session.user = {
      ...req.session.user,
      name: fullName,
      firstName: updatedProfile.firstName,
      lastName: updatedProfile.lastName,
      avatar: updatedProfile.profilePicture,
      profilePicture: updatedProfile.profilePicture
    };
    console.log('Session updated with new profile data:', req.session.user);
    
    console.log('Profile updated successfully');
    console.log('=== DIRECT PROFILE UPDATE END ===');
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: profiles[profileIndex]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

// TEST ENDPOINT TO VERIFY SERVER.JS IS ACTIVE
app.get('/api/test/endpoint', (req, res) => {
  console.log('TEST ENDPOINT CALLED IN SERVER.JS');
  res.json({ message: 'Server.js is definitely active!' });
});

// WORKING PROFILE GET ENDPOINT 
app.get('/api/user/profile', async (req, res) => {
  console.log('=== GET PROFILE REQUEST ===');
  console.log('Session user:', req.session?.user);

  // Check authentication
  if (!req.session || !req.session.user || !req.session.user.username) {
    console.log('Authentication failed');
    return res.status(401).json({ error: 'Please log in first' });
  }

  try {
    const profilesPath = path.join(DATA_DIR, 'profiles.json');
    const profilesData = await fs.readFile(profilesPath, 'utf8');
    const profiles = JSON.parse(profilesData);
    
    const username = req.session.user.username;
    const profile = profiles.find(p => p.username === username);
    
    if (profile) {
      console.log('Profile found:', profile.username);
      
      if (profile.name && !profile.firstName && !profile.lastName) {
        console.log('Converting old profile format with name field');
        const nameParts = profile.name.split(' ');
        profile.firstName = nameParts[0] || '';
        profile.lastName = nameParts.slice(1).join(' ') || '';
        console.log('Converted name to:', { firstName: profile.firstName, lastName: profile.lastName });
      }
      
      res.json(profile);
    } else {
      console.log('Profile not found for username:', username);
      // Fallback to creating a basic profile from session data
      const basicProfile = {
        id: req.session.user.id?.toString() || '',
        username: username,
        firstName: req.session.user.firstName || '',
        lastName: req.session.user.lastName || '',
        address: '',
        profilePicture: req.session.user.avatar || '/avatars/default-avatar.png',
        avatar: req.session.user.avatar || '/avatars/default-avatar.png'
      };
      res.json(basicProfile);
    }
  } catch (error) {
    console.error('Profile get error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      details: error.message
    });
  }
});

// PROFILE STATS ENDPOINT 
app.get('/api/user/profile/:username/stats', async (req, res) => {
  console.log('=== PROFILE STATS REQUEST ===');
  console.log('Username:', req.params.username);
  console.log('Session user:', req.session?.user);

  // Check authentication
  if (!req.session || !req.session.user || !req.session.user.username) {
    console.log('Authentication failed for stats');
    return res.status(401).json({ error: 'Please log in first' });
  }

  const { username } = req.params;
});

// logging out
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ok: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Clear the session cookie on client
    console.log("Logged out!");
    return res.json({ ok: true, message: "Logged out successfully" });
  });
});

// Get user location based on IP
app.get('/api/location', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const locationData = await getLocationFromIP(clientIP);
    
    console.log(`Location request from IP ${clientIP}: ${locationData.city}, ${locationData.region}`);
    
    res.json({
      success: true,
      location: locationData,
      ip: clientIP
    });
  } catch (error) {
    console.error('Error getting user location:', error);
    res.status(500).json({ 
      success: false,
      error: "Failed to get location",
      location: {
        lat: 39.9526,
        lon: -75.1652,
        city: 'Philadelphia',
        region: 'Pennsylvania',
        country: 'US',
        place: 'Philadelphia, Pennsylvania, USA'
      }
    });
  }
});

// Route generation endpoint
app.post('/api/generate-custom-route', async (req, res) => {
  const {
    start_lat,
    start_lon,
    end_lat,
    end_lon,
    destination_name,
    starting_point_name,
    avoid_hills, 
    use_bike_lanes, 
    target_distance, 
    unit_system, 
    route_type, 
    avoid_traffic, 
    elevation_focus 
  } = req.body;

  console.log('Route generation request received:', {
    destination_name,
    starting_point_name,
    start_lat,
    start_lon,
    end_lat,
    end_lon,
    route_type,
    target_distance,
    use_bike_lanes,
    avoid_hills,
    avoid_traffic,
    elevation_focus,
    unit_system
  });

  // Validate required parameters
  if (!start_lat || !start_lon) {
    return res.status(422).json({ 
      detail: [
        { type: "missing", loc: ["body", "start_lat"], msg: "Field required" },
        { type: "missing", loc: ["body", "start_lon"], msg: "Field required" }
      ]
    });
  }

  try {
    // Get user's location based on IP for OSM graph selection
    const clientIP = getClientIP(req);
    const locationData = await getLocationFromIP(clientIP);
    
    console.log(`Generating route for user from ${locationData.city}, ${locationData.region} (IP: ${clientIP})`);

    const routeData = await generateRoute({
      start: {
        lat: parseFloat(start_lat),
        lon: parseFloat(start_lon)
      },
      end: end_lat && end_lon ? {
        lat: parseFloat(end_lat),
        lon: parseFloat(end_lon)
      } : null,
      options: {
        target_distance: parseFloat(target_distance),
        route_type,
        use_bike_lanes,
        avoid_hills,
        avoid_traffic,
        elevation_focus,
        unit_system,
        destination_name,
        starting_point_name
      },
      userLocation: locationData  // Pass location data to route generation
    });

    console.log('Route data being sent to frontend:', {
      difficulty: routeData.difficulty,
      total_elevation_gain: routeData.total_elevation_gain,
      total_ride_time: routeData.total_ride_time,
      total_length_formatted: routeData.total_length_formatted,
      data_source: routeData.data_source,
      route_coordinates_count: routeData.route ? routeData.route.length : 0
    });

    res.json(routeData);
  } catch (error) {
    console.error('Route generation error:', error);
    res.status(500).json({ 
      detail: "Route generation failed: " + error.message 
    });
  }
});

// Reroute with user-modified waypoints (no GPT involved)
app.post('/api/reroute-with-waypoints', async (req, res) => {
  console.log('\n=== REROUTE ENDPOINT CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { waypoints, preferences } = req.body;

  console.log('Extracted waypoints:', JSON.stringify(waypoints));
  console.log('Waypoint count:', waypoints?.length);
  console.log('Extracted preferences:', JSON.stringify(preferences));

  // Validate required parameters
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    console.error('VALIDATION FAILED: Not enough waypoints');
    return res.status(422).json({
      detail: 'At least 2 waypoints are required. Each waypoint must have lat and lon.'
    });
  }

  // Validate each waypoint
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (!wp || typeof wp.lat !== 'number' || typeof wp.lon !== 'number') {
      console.error(`VALIDATION FAILED: Invalid waypoint at index ${i}:`, wp);
      return res.status(422).json({
        detail: `Invalid waypoint at index ${i}: each waypoint must have numeric lat and lon.`
      });
    }
  }

  console.log('Validation passed. Calling routeWaypointsOnly...');

  try {
    const routeData = await routeWaypointsOnly(waypoints, preferences || {});

    console.log('=== routeWaypointsOnly SUCCESS ===');
    console.log('Route data keys:', Object.keys(routeData));
    console.log('Reroute data being sent to frontend:', {
      total_elevation_gain: routeData.total_elevation_gain,
      total_ride_time: routeData.total_ride_time,
      data_source: routeData.data_source,
      route_coordinates_count: routeData.route ? routeData.route.length : 0
    });

    res.json(routeData);
  } catch (error) {
    console.error('=== REROUTE ENDPOINT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error type:', error.constructor.name);
    console.error('Failed waypoints:', JSON.stringify(waypoints));
    console.error('Full error:', error);
    
    // Provide more specific error type for frontend handling
    let errorType = 'UNKNOWN';
    if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT';
    } else if (error.message.includes('No valid route')) {
      errorType = 'NO_ROUTE';
    } else if (error.message.includes('Invalid waypoint')) {
      errorType = 'INVALID_WAYPOINTS';
    }
    
    res.status(500).json({
      detail: 'Rerouting failed: ' + error.message,
      error_type: errorType
    });
  }
});

// verifies backend has started
// Bind to 0.0.0.0 so the server is reachable from Docker host
app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})