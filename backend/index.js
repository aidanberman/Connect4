const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

const ROWS = 6;
const COLS = 7;

// helper to check if move wins
function checkWin(board, color) {
  // horizontal, vertical, diag
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c] || board[r][c].color !== color) continue;
      // horizontal
      if (
        c <= COLS - 4 &&
        Array.from({ length: 4 }).every(
          (_, i) => board[r][c + i] && board[r][c + i].color === color
        )
      )
        return true;
      // vertical
      if (
        r <= ROWS - 4 &&
        Array.from({ length: 4 }).every(
          (_, i) => board[r + i][c] && board[r + i][c].color === color
        )
      )
        return true;
      // diag down-right
      if (
        r <= ROWS - 4 &&
        c <= COLS - 4 &&
        Array.from({ length: 4 }).every(
          (_, i) => board[r + i][c + i] && board[r + i][c + i].color === color
        )
      )
        return true;
      // diag up-right
      if (
        r >= 3 &&
        c <= COLS - 4 &&
        Array.from({ length: 4 }).every(
          (_, i) => board[r - i][c + i] && board[r - i][c + i].color === color
        )
      )
        return true;
    }
  return false;
}

function copyBoard(board) {
  return board.map(row => row.map(cell => (cell ? Object.assign({}, cell) : null)));
}

app.post('/ai/move', (req, res) => {
  const { board, player } = req.body;
  // naive imperfect AI: try winning move, try block, else prefer center, else random
  if (!board || !player) return res.json({ column: Math.floor(Math.random() * COLS) });
  // try winning
  for (let c = 0; c < COLS; c++) {
    // find row where piece would land
    const newB = copyBoard(board);
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newB[r][c]) {
        newB[r][c] = { color: player };
        break;
      }
      if (r === 0) break;
    }
    if (checkWin(newB, player)) return res.json({ column: c });
  }
  // try block opponent
  const opp = player === 'red' ? 'yellow' : 'red';
  for (let c = 0; c < COLS; c++) {
    const newB = copyBoard(board);
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!newB[r][c]) {
        newB[r][c] = { color: opp };
        break;
      }
      if (r === 0) break;
    }
    if (checkWin(newB, opp)) return res.json({ column: c });
  }
  // prefer center-ish
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    if (board[0][c] == null) return res.json({ column: c });
  }
  // fallback random
  res.json({ column: Math.floor(Math.random() * COLS) });
});

// Serve frontend if built into ../frontend/dist
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  // If the request starts with /ai, don't serve index.html (API requests handled above)
  if (req.path.startsWith('/ai')) return res.status(404).end();
  res.sendFile(path.join(distPath, 'index.html'), err => {
    if (err) res.status(500).send(err.message);
  });
});

app.listen(3000, () => console.log('AI server running on http://localhost:3000'));
