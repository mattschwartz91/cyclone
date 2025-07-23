const express = require('express')
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;
const dbUsers = require('./dbUsers.js'); // import users database
const bcrypt = require('bcrypt');
const session = require(`express-session`);

//TODO: add session handling
//TODO: add password requirements
//TODO: move hosting over to raspberry pi


// helper functionsF
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
    origin: 'https://cyclone-lj58.onrender.com',  // frontend origin
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


// start front end up with this
const path = require('path');
const fs = require('fs');

// Serve frontend static files
app.use(express.static(path.resolve(__dirname, '../client/dist')));

// Handle all remaining routes with React app
app.get('*', (req, res) => {
  const indexPath = path.resolve(__dirname, '../client/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built.');
  }
});


// verifies backend has started
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
