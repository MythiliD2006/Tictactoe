import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const getWinnerInfo = (squares) => {
  for (const [a, b, c] of winningLines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], winningLine: [a, b, c] };
    }
  }
  return { winner: null, winningLine: [] };
};

const TicTacToe = () => {
  const [squares, setSquares] = useState(Array(9).fill(''));
  const [xIsNext, setXIsNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [hintIndex, setHintIndex] = useState(-1);
  const hintTimeoutRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const { winner, winningLine } = getWinnerInfo(squares);
  const nextPlayer = xIsNext ? 'X' : 'O';
  const isBoardFull = squares.every((square) => square !== '');
  const gameOver = Boolean(winner) || isBoardFull;
  const status = winner
    ? `Winner: ${winner}`
    : isBoardFull
    ? 'Draw'
    : `Next player: ${nextPlayer}`;

  const handleClick = (index) => {
    if (gameOver || squares[index]) return;

    const nextSquares = squares.slice();
    nextSquares[index] = nextPlayer;
    setSquares(nextSquares);
    setXIsNext(!xIsNext);
    setHintIndex(-1);
    playTone(nextPlayer);
  };

  const resetGame = () => {
    if (winner) {
      setScores((prev) => ({ ...prev, [winner]: prev[winner] + 1 }));
    } else if (!winner && isBoardFull) {
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
    }
    setSquares(Array(9).fill(''));
    setXIsNext(true);
    setHintIndex(-1);
    setShowModal(false);
  };

  const renderSquare = (index) => {
    const isWinningSquare = winningLine.includes(index);
    const isHint = hintIndex === index;
    return (
      <button
        type="button"
        className={`square ${isWinningSquare ? 'square--win' : ''} ${isHint ? 'square--hint' : ''}`}
        onClick={() => handleClick(index)}
        aria-label={`Square ${index + 1}`}
      >
        {squares[index]}
      </button>
    );
  };

  const computeHint = () => {
    if (gameOver) return -1;
    const player = nextPlayer;
    const opponent = player === 'X' ? 'O' : 'X';

    // 1) Winning move for current player
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const copy = squares.slice();
        copy[i] = player;
        const info = getWinnerInfo(copy);
        if (info.winner === player) return i;
      }
    }

    // 2) Block opponent's winning move
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        const copy = squares.slice();
        copy[i] = opponent;
        const info = getWinnerInfo(copy);
        if (info.winner === opponent) return i;
      }
    }

    // 3) Take center
    if (!squares[4]) return 4;

    // 4) Take a corner
    const corners = [0, 2, 6, 8].filter((i) => !squares[i]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

    // 5) Any side
    const sides = [1, 3, 5, 7].filter((i) => !squares[i]);
    if (sides.length) return sides[Math.floor(Math.random() * sides.length)];

    return -1;
  };

  const showHint = () => {
    if (gameOver) return;
    const idx = computeHint();
    if (idx >= 0) {
      setHintIndex(idx);
      // clear any previous hint timeout
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => {
        setHintIndex(-1);
        hintTimeoutRef.current = null;
      }, 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  // Create or reuse AudioContext
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = Ctor ? new Ctor() : null;
    }
    return audioCtxRef.current;
  };

  const playTone = (player, duration = 140) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const freq = player === 'X' ? 880 : 620;
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.8, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    o.stop(now + duration / 1000 + 0.02);
  };

  const playWinSound = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const freqs = [660, 880, 990];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.8, start + 0.01);
      o.start(start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      o.stop(start + 0.16);
    });
  };

  const playDrawSound = () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 440;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.7, now + 0.02);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    o.stop(now + 0.3);
  };

  // show modal on win/draw
  useEffect(() => {
    if (winner) {
      setModalMessage(`Player ${winner} wins!`);
      setShowModal(true);
      playWinSound();
    } else if (!winner && isBoardFull) {
      setModalMessage('Draw');
      setShowModal(true);
      playDrawSound();
    }
  }, [winner, isBoardFull]);

  // Trigger confetti on win
  useEffect(() => {
    if (winner) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [winner]);

  return (
    <div className="tic-tac-toe-container">
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>{modalMessage}</h2>
            <div className="modal-actions">
              <button
                type="button"
                className="reset-button"
                onClick={() => {
                  resetGame();
                }}
              >
                Play again
              </button>
              <button
                type="button"
                className="shortcut-button"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Play smarter. Play faster.</p>
          <h1>Tic Tac Toe</h1>
          <p className="subheading">A clean modern board with instant feedback and score tracking.</p>
        </div>
        <div className="player-chip">
          <span className={`player-pill ${xIsNext ? 'player-pill--x' : 'player-pill--o'}`}>
            {nextPlayer}
          </span>
          <span className="pill-label">Current turn</span>
        </div>
      </div>

      <div className={`status ${winner ? 'status--winner' : isBoardFull ? 'status--draw' : ''}`}>{status}</div>

      <div className="scoreboard">
        <div className="score-card score-card--x">
          <span className="score-label">X Wins</span>
          <strong>{scores.X}</strong>
        </div>
        <div className="score-card score-card--draw">
          <span className="score-label">Draws</span>
          <strong>{scores.draws}</strong>
        </div>
        <div className="score-card score-card--o">
          <span className="score-label">O Wins</span>
          <strong>{scores.O}</strong>
        </div>
      </div>

      <div className="board">
        {Array.from({ length: 9 }).map((_, index) => (
          <React.Fragment key={index}>{renderSquare(index)}</React.Fragment>
        ))}
      </div>

      <div className="actions-row">
        <button className="reset-button" type="button" onClick={resetGame}>
          Reset Game
        </button>
        <button
          className="shortcut-button"
          type="button"
          onClick={showHint}
          title="Show a suggested move"
        >
          Hint
        </button>
      </div>
    </div>
  );
};

export default TicTacToe;
