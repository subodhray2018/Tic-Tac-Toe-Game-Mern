
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';

import {
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';

import confetti from 'canvas-confetti';
import { api } from './api.js';

import Board from './components/Board.jsx';
import Status from './components/Status.jsx';
import ModeSwitch from './components/ModeSwitch.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import MoveHistory from './components/MoveHistory.jsx';

const STORAGE_KEY = 'ttt-game-id';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [game, setGame] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  const apply = useCallback((g) => {
    setGame(g);
    setScoreboard(g.scoreboard);

    try {
      localStorage.setItem(STORAGE_KEY, g.id);
    } catch {
      // Storage may be unavailable.
    }
  }, []);

  const load = useCallback(async () => {
    try {
      let saved = null;

      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors.
      }

      let g = null;

      if (saved) {
        try {
          g = await api.getGame(saved);
        } catch (err) {
          if (err.network) throw err;
        }
      }

      apply(g || (await api.createGame('TwoPlayer')));
      setOffline(false);
    } catch (err) {
      if (err.network) {
        setOffline(true);
      } else {
        messageApi.error(err.message || 'Unable to load the game.');
      }
    }
  }, [apply, messageApi]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action) => {
    if (busy) return;

    setBusy(true);

    try {
      apply(await action());
    } catch (err) {
      if (err.network) {
        setOffline(true);
      } else {
        messageApi.error(err.message || 'Something went wrong.');

        // Synchronize with the server again.
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const prevStatus = useRef(null);

  useEffect(() => {
    if (!game) return;

    const justWon =
      prevStatus.current === 'InProgress' &&
      game.status === 'Won';

    const celebrate =
      justWon &&
      !(game.mode === 'Computer' && game.winner === 'O');

    const calm =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (celebrate && !calm) {
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
        colors: [
          '#2b3fd6',
          '#0e8a5f',
          '#ffe35c',
          '#1b2236',
        ],
      });
    }

    prevStatus.current = game.status;
  }, [game]);

  if (offline) {
    return (
      <Layout className="app-shell">
        {contextHolder}

        <Content className="offline-content">
          <Card className="game-card offline-card">
            <Alert
              type="error"
              showIcon
              message="Can't reach the game server"
              description={
                <>
                  Start the backend with{' '}
                  <Text code>npm --prefix server start</Text>,
                  then try again.
                </>
              }
            />

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={load}
              block
              className="retry-button"
            >
              Try again
            </Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  if (!game || !scoreboard) {
    return (
      <Layout className="app-shell">
        {contextHolder}

        <Content className="loading-content">
          <Spin size="large" tip="Loading game..." />
        </Content>
      </Layout>
    );
  }

  const finished = game.status !== 'InProgress';

  return (
    <Layout className="app-shell">
      {contextHolder}

      <Header className="app-header">
        <div className="header-inner">
          <Title level={2} className="app-title">
            Tic Tac Toe
          </Title>

          <ModeSwitch
            mode={game.mode}
            disabled={busy}
            onChange={(mode) =>
              run(() => api.createGame(mode))
            }
          />
        </div>
      </Header>

      <Content className="app-content">
        <Row gutter={[24, 24]} align="top">
          <Col xs={24} lg={14} xl={15}>
            <Card
              bordered={false}
              className="game-card play-card"
              loading={busy && !game}
            >
              <div className="play-area">
                <Status game={game} />

                <Board
                  game={game}
                  disabled={busy}
                  onPlay={(index) =>
                    run(() =>
                      api.move(
                        game.id,
                        game.currentPlayer,
                        index
                      )
                    )
                  }
                />

                <Space
                  className="game-actions"
                  size="middle"
                  wrap
                >
                  <Button
                    icon={<UndoOutlined />}
                    disabled={busy || !game.canUndo}
                    onClick={() =>
                      run(() => api.undo(game.id))
                    }
                  >
                    Undo last move
                  </Button>

                  <Button
                    type={finished ? 'primary' : 'default'}
                    icon={<ReloadOutlined />}
                    disabled={busy}
                    onClick={() =>
                      run(() => api.reset(game.id))
                    }
                  >
                    Reset game
                  </Button>
                </Space>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={10} xl={9}>
            <Space
              direction="vertical"
              size="large"
              className="sidebar"
            >
              <Scoreboard
                scoreboard={scoreboard}
                mode={game.mode}
                disabled={busy}
                onReset={() =>
                  run(async () => {
                    await api.resetScoreboard();
                    return api.getGame(game.id);
                  })
                }
              />

              <MoveHistory moves={game.moves} />
            </Space>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
