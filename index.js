const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => res.redirect('/games'));
app.get('/admin', (req, res) => res.sendFile(__dirname + '/views/admin.html'));
app.get('/games', (req, res) => res.sendFile(__dirname + '/views/games.html'));

app.post('/submit', (req, res) => {
  const newGame = req.body;
  const filePath = './data/games.json';

  const games = JSON.parse(fs.readFileSync(filePath));
  games.push(newGame);
  fs.writeFileSync(filePath, JSON.stringify(games, null, 2));

  res.redirect('/admin');
});

app.get('/api/games', (req, res) => {
  const games = JSON.parse(fs.readFileSync('./data/games.json'));
  res.json(games);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
