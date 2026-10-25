
import { Tag, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';

const { Text } = Typography;

export default function Status({ game }) {
  const { status, winner, currentPlayer, mode } = game;
  const vsComputer = mode === 'Computer';

  let text;
  let mark = null;

  if (status === 'Won') {
    mark = winner;
    text = vsComputer
      ? winner === 'X'
        ? 'You win!'
        : 'Computer wins'
      : `Player ${winner} wins!`;
  } else if (status === 'Draw') {
    text = 'It’s a draw';
  } else {
    mark = currentPlayer;
    text = vsComputer
      ? 'Your turn'
      : `Player ${currentPlayer}’s turn`;
  }

  return (
    <div
      className="status-wrap"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${status}-${mark}`}
          className="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          {mark && (
            <Tag color={mark === 'X' ? 'blue' : 'green'}>
              {mark}
            </Tag>
          )}
          <Text strong>{text}</Text>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
