require('dotenv').config({ path: '../.env' });
const express = require('express')
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { generateRoute } = require('./api_router.js');
const { getLocationFromIP, getClientIP } = require('./utils/geolocation.js');
const app = express();
const port = 8000;
const dbUsers = require('./dbUsers.js'); // import users database
const bcrypt = require('bcrypt');
const session = require(`express-session`);

//TODO: add session handling
//TODO: add password requirements
//TODO: move hosting over to raspberry pi


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

// allow json parsing
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],  // frontend origins
    credentials: true                // allow cookies to be sent
}));

// Set up sessions
app.use(session({
  secret: 'cycloneisagreatapplicationandeveryonelovesitsomuch',  // change this to something secure!
  resave: false,
  saveUninitialized: false
}));

// post and gets

// this method does logging in and registering
app.post('/api/login', async (req, res) => {

    // encryption stuff
    const saltRounds = 10;

    // destructure request
    const {username, password} = req.body;
    console.log(username);

    // handle registration / login
    dbUsers.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        (err, row) => {
            if (err) {
                console.error('DB error:', err.message);
                return res.status(500).json({message: 'Error with logging in to account', ok: false});;
            } else if (row) {
                // user exists try and login with given password
                console.log('Username exists');
                console.log('DB hashed password:', row.password);
                bcrypt.compare(password, row.password, (err, match) => {
                    // handle error
                    if (err) {
                        console.error('Error comparing passwords: ', err);
                        return res.status(500).json({error: 'Login error'});
                    }

                    // if match
                    if(match) {
                        console.log(`${username} succesfully logged in.`);
                        req.session.user = { username }; // save user info in session
                        return res.json({message:"Succesful login", ok: true});
                        
                    } else {
                        console.log(`${username} unsuccesfully logged in.`);
                        return res.status(401).json({ message: 'Incorrect password', ok: false });
                    }
                });


            } else if (!row){
                // tell user to register
                console.log("Go register punk");
                return res.status(404).json({ message: "User not found, please register", ok: false });
            }
        }
    );
});

// registration function
app.post('/api/register', async (req, res) => {

    // encryption stuff
    const saltRounds = 10;

    // destructure request
    const {username, password} = req.body;
    console.log(username);

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
                    dbUsers.run(`INSERT INTO users (username,password) VALUES (?,?)`,
                    [username,hash], (err) => {
                        if(err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Database issue preventing registration', ok: false });
                        }
                        return res.json({ message: 'User registered and logged in!', ok: true });
                    }

                    )
                });
            }
        }
    );
});

// check if user is logged in with this method
app.get('/api/status', (req, res) => {
  if (req.session.user) {
    res.json({ loggedin: true, username: req.session.user.username });
  } else {
    res.json({ loggedin: false });
  }
});

// logging out
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  console.log("Logged out!");
  return res.json({ message: "Logged out successfully" });
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
    avoid_hills = false,
    use_bike_lanes = true,
    target_distance = 5.0,
    max_elevation_gain = 100.0,
    unit_system = "imperial",
    route_type = "scenic",
    avoid_traffic = false
  } = req.body;

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
        unit_system,
        max_elevation_gain
      },
      userLocation: locationData  // Pass location data to route generation
    });

    res.json(routeData);
  } catch (error) {
    console.error('Route generation error:', error);
    res.status(500).json({ 
      detail: "Route generation failed: " + error.message 
    });
  }
});

// verifies backend has started
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
