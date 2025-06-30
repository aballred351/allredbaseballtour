// index.js
const express     = require('express');
const bodyParser  = require('body-parser');
const { Pool }    = require('pg');
const path        = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* -----------------------------------------------------------
   1.  PostgreSQL connection (Railway injects DATABASE_URL)
   --------------------------------------------------------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }   // needed for Railway’s managed SSL
});

/* Ensure the table exists every time the server boots */
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id          SERIAL PRIMARY KEY,
        home_team   TEXT NOT NULL,
        away_team   TEXT NOT NULL,
        home_score  INT  NOT NULL,
        away_score  INT  NOT NULL,
        game_date   DATE NOT NULL,
        notes       TEXT
      );
    `);
    console.log('✅ Connected to Postgres & ensured "games" table exists');
  } catch (err) {
    console.error('❌ Error setting up database:', err);
  }
})();

/* -----------------------------------------------------------
   2.  Middleware + static files
   --------------------------------------------------------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

/* -----------------------------------------------------------
   3.  Routes
   --------------------------------------------------------- */
// Landing → redirect to public list
app.get('/', (req, res) => res.redirect('/games'));

// HTML pages
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'admin.html'))
);
app.get('/games', (req, res) =>
  res.sendFile(path.join(__dirname, 'views', 'games.html'))
);

// Submit game (writes to DB, then returns to empty form)
app.post('/submit', async (req, res) => {
  const { homeTeam, awayTeam, homeScore, awayScore, date, notes } = req.body;
  try {
    await pool.query(
      `INSERT INTO games
       (home_team, away_team, home_score, away_score, game_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [homeTeam, awayTeam, homeScore, awayScore, date, notes]
    );
    res.redirect('/admin');           // 👈 stays on the form
  } catch (err) {
    console.error('❌ Error inserting game:', err);
    res.status(500).send('Database error');
  }
});

// JSON API (public page fetches this)
app.get('/api/games', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM games ORDER BY game_date DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching games:', err);
    res.status(500).send('Database error');
  }
});

/* -----------------------------------------------------------
   4.  Start server
   --------------------------------------------------------- */
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
