// index.js  – Postgres-only version
const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');
const { Pool }   = require('pg');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---------- PostgreSQL connection ---------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }   // required on Railway
});

/* Create table if it doesn't exist */
(async () => {
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
  console.log('✅ Connected to Postgres and ensured table exists');
})().catch(err => {
  console.error('❌ DB init failed:', err);
  process.exit(1);                    // stop container so Railway logs the error
});

/* ---------- Middleware ---------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

/* ---------- Routes ---------- */
app.get('/',        (req, res) => res.redirect('/games'));
app.get('/admin',   (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));
app.get('/games',   (req, res) => res.sendFile(path.join(__dirname, 'views', 'games.html')));

/* Add a game, then go back to empty form */
app.post('/submit', async (req, res) => {
  try {
    const { homeTeam, awayTeam, homeScore, awayScore, date, notes } = req.body;
    await pool.query(
      `INSERT INTO games
       (home_team, away_team, home_score, away_score, game_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [homeTeam, awayTeam, homeScore, awayScore, date, notes]
    );
    res.redirect('/admin');           // <— stays on admin form
  } catch (err) {
    console.error('❌ Insert failed:', err);
    res.status(500).send('Database error');
  }
});

/* JSON for the public list */
app.get('/api/games', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM games ORDER BY game_date DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Select failed:', err);
    res.status(500).send('Database error');
  }
});

/* ---------- Start server ---------- */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
