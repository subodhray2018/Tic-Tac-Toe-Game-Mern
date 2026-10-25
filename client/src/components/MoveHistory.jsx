
import { Card, Table, Tag, Typography } from 'antd';

const { Title, Text } = Typography;

export default function MoveHistory({ moves }) {
  const columns = [
    {
      title: 'Move',
      dataIndex: 'moveNumber',
      key: 'moveNumber',
      width: 75,
    },
    {
      title: 'Player',
      dataIndex: 'player',
      key: 'player',
      render: (player) => (
        <Tag color={player === 'X' ? 'blue' : 'green'}>
          {player}
        </Tag>
      ),
    },
    {
      title: 'Position',
      key: 'position',
      render: (_, move) =>
        `Row ${move.row}, Column ${move.column}`,
    },
  ];

  return (
    <Card className="game-card" bordered={false}>
      <Title level={4} id="history-title">
        Move history
      </Title>

      {moves.length === 0 ? (
        <Text type="secondary">
          No moves yet. Click a cell to place the first X.
        </Text>
      ) : (
        <Table
          columns={columns}
          dataSource={moves}
          rowKey="moveNumber"
          pagination={false}
          size="small"
          scroll={{ x: 280, y: 280 }}
        />
      )}
    </Card>
  );
}
