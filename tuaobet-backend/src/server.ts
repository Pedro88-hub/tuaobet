import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import sportsRoutes from './routes/sportsRoutes';
import adminRoutes from './routes/adminRoutes';
import publicSiteRoutes from './routes/publicSiteRoutes';
import { initCrashGame } from './games/crash/crashEngine';
import { initDoubleGame } from './games/double/doubleEngine';
import { initMinesLiveFeed } from './games/mines/minesLiveFeed';
import { initBaccaratGame } from './games/baccarat/baccaratLiveEngine';
import { verifySocketToken, attachUserToSocket } from './socket/socketAuth';
import { registerGameIo } from './socket/pushWalletBalance';
import { registerSiteIo } from './socket/siteBroadcast';
import { applyAdminEmailsFromEnv } from './bootstrap/applyAdminEmailsFromEnv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const frontendOrigins = (
  process.env.FRONTEND_URL ||
  'https://bet.tuao.dev.br,https://tuao.dev.br,https://pedro88-hub.github.io,http://localhost:5173,http://localhost:8080'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOrigin = frontendOrigins;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'tuaobet-api',
    cors: frontendOrigins,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicSiteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/sports', sportsRoutes);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerGameIo(io);
registerSiteIo(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const userId = verifySocketToken(token);
  if (userId) {
    attachUserToSocket(socket, userId);
  } else {
    socket.data.userId = undefined;
  }
  next();
});

console.log('Iniciando motores de jogo...');
initCrashGame(io);
initDoubleGame(io);
initMinesLiveFeed(io);
initBaccaratGame(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor TuaoBet na porta ${PORT} (CORS: ${frontendOrigins.join(', ')})`);
  void applyAdminEmailsFromEnv().catch((e) => console.error('[admin] ADMIN_EMAILS:', e));
});
