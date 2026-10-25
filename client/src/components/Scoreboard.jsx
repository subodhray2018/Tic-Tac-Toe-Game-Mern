
import { Button, Card, Col, Row, Statistic } from 'antd';
import { motion } from 'framer-motion';

const AnimatedStatistic = motion.create(Statistic);

export default function Scoreboard({
  scoreboard,
  mode,
  disabled,
  onReset,
}) {
  const oName = mode === 'Computer' ? 'Computer' : 'O';
  const xName = mode === 'Computer' ? 'You' : 'X';

  const stats = [
    {
      key: 'X',
      title: `${xName} (X)`,
      value: scoreboard.X,
      color: '#2b3fd6',
    },
    {
      key: 'draws',
      title: 'Draws',
      value: scoreboard.draws,
      color: '#1b2236',
    },
    {
      key: 'O',
      title: `${oName} (O)`,
      value: scoreboard.O,
      color: '#0e8a5f',
    },
  ];

  return (
    <Card
      className="game-card scoreboard-card"
      bordered={false}
    >
      <h2 className="card-heading">Scoreboard</h2>

      <Row
        className="scoreboard-row"
        gutter={8}
        align="middle"
        wrap={false}
      >
        {stats.map((item) => (
          <Col
            key={item.key}
            flex="1 1 0"
            className="scoreboard-col"
          >
            <div className="scoreboard-stat">
              <AnimatedStatistic
                title={item.title}
                value={item.value}
                initial={{ scale: 1.15, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 18,
                }}
                valueStyle={{
                  color: item.color,
                  fontWeight: 700,
                  fontSize: 28,
                  lineHeight: 1.3,
                }}
              />
            </div>
          </Col>
        ))}
      </Row>

      <Button
        block
        danger
        className="score-reset"
        onClick={onReset}
        disabled={disabled}
      >
        Reset scoreboard
      </Button>
    </Card>
  );
}
