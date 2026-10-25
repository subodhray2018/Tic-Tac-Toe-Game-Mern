
import { Button } from 'antd';

function Mark({ player }) {
  return (
    <svg
      className={`mark ${player.toLowerCase()}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {player === 'X' ? (
        <>
          <path d="M22 22 L78 78" />
          <path d="M78 22 L22 78" />
        </>
      ) : (
        <circle cx="50" cy="50" r="30" />
      )}
    </svg>
  );
}

export default function Board({ game, disabled, onPlay }) {
  const { board, status } = game;
  const winningCells = game.winningCells ?? [];
  const finished = status !== 'InProgress';

  return (
    <div className="board" role="grid" aria-label="Tic Tac Toe board">
      {board.map((cell, index) => {
        const won = winningCells.includes(index);
        const playable =
          !disabled && !finished && cell == null;

        return (
          <div
            key={index}
            className={`cell-wrap ${won ? 'winning-cell' : ''}`}
          >
            <Button
              type="text"
              className="cell"
              role="gridcell"
              aria-label={`Row ${Math.floor(index / 3) + 1}, Column ${(index % 3) + 1}, ${cell ?? 'empty'}`}
              disabled={!playable}
              onClick={() => onPlay(index)}
            >
              {cell != null && <Mark player={cell} />}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
