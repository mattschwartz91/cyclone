const express = require('express')
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express()
const port = 3000


// Enable CORS for all routes
app.use(cors());

// testing
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// create a db
const db = new sqlite3.Database('./database.sqlite')
app.post('/api/add', (req,res) => {
    const info = req.body.info || 'Default Value'
    db.run('INSERT INTO lorem (info) VALUES (?)', [info], function (err) {
        if (err) {
            console.error(err.message)
            return res.status(500).send('Failed to insert row')
        }
        res.send({message:'Row added', id: this.lastID})
    })
})

// verifies backend has started
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
