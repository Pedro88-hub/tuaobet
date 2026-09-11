import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { fetchPublicRecentWins, type PublicRecentWin } from '../../services/publicSite';
import { getSocket } from '../../services/socket';

const MAX_ROWS = 20;
const SEED_COUNT = 12;
const FAKE_INTERVAL_MS = 2500;

const FAKE_USERS = [
  'CryptoKing',
  'LuckyDice',
  'Roller99',
  'BetMaster',
  'Alice_W',
  'JohnDoe',
  'Winner2026',
  'HighRoller',
  'Pedro88',
  'NightOwl',
  'SpinPro',
  'CassinoBR',
];

const FAKE_GAMES = ['crash', 'double', 'mines', 'dice', 'plinko', 'baccarat'] as const;

const formatMoney = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const gameLabel = (game: string) => {
  const map: Record<string, string> = {
    crash: 'Crash',
    double: 'Double',
    mines: 'Mines',
    dice: 'Dice',
    plinko: 'Plinko',
    baccarat: 'Baccarat',
    sport: 'Esportes',
  };
  return map[game] ?? game;
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const formatMult = (m: number | null) => {
  if (m == null || !Number.isFinite(m)) return '—';
  return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}X`;
};

/** Máscara no estilo do backend (ex.: Pedro88 → Pe***88). */
const maskUsername = (username: string) => {
  const name = (username || '').trim();
  if (!name) return '***';
  if (name.length <= 2) return `${name[0] ?? '*'}*`;
  if (name.length <= 4) return `${name.slice(0, 1)}***${name.slice(-1)}`;
  return `${name.slice(0, 2)}***${name.slice(-2)}`;
};

const randomId = () => `fake-${Math.random().toString(36).slice(2, 11)}`;

const makeFakeWin = (createdAtMs?: number): PublicRecentWin => {
  const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)]!;
  const game = FAKE_GAMES[Math.floor(Math.random() * FAKE_GAMES.length)]!;
  const amount = Math.round((Math.random() * 495 + 5) * 100) / 100;
  const multiplier = Math.round((Math.random() * 48.5 + 1.5) * 100) / 100;
  const payout = Math.round(amount * multiplier * 100) / 100;
  return {
    id: randomId(),
    game,
    amount,
    multiplier,
    payout,
    createdAt: new Date(createdAtMs ?? Date.now()).toISOString(),
    username: maskUsername(user),
  };
};

const seedFakeWins = (count: number): PublicRecentWin[] => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const ageMs = (i + 1) * (30_000 + Math.random() * 90_000);
    return makeFakeWin(now - ageMs);
  });
};

const mergeWins = (incoming: PublicRecentWin[], prev: PublicRecentWin[]): PublicRecentWin[] => {
  const seen = new Set(prev.map((w) => w.id));
  const fresh = incoming.filter((w) => w?.id && !seen.has(w.id));
  if (fresh.length === 0) return prev;
  return [...fresh, ...prev].slice(0, MAX_ROWS);
};

export const BigWinsFeed: React.FC = () => {
  const [wins, setWins] = useState<PublicRecentWin[]>(() => seedFakeWins(SEED_COUNT));

  useEffect(() => {
    let cancelled = false;
    void fetchPublicRecentWins(MAX_ROWS)
      .then((rows) => {
        if (!cancelled && rows.length > 0) {
          setWins((prev) => mergeWins(rows, prev));
        }
      })
      .catch(() => {
        /* mantém seed fake */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onBigWin = (payload: PublicRecentWin) => {
      if (!payload?.id) return;
      setWins((prev) => mergeWins([payload], prev));
    };
    socket.on('site:big-win', onBigWin);
    return () => {
      socket.off('site:big-win', onBigWin);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) return;
      const next = makeFakeWin();
      setWins((prev) => [next, ...prev].slice(0, MAX_ROWS));
    }, FAKE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <Trophy className="text-tuao-cta" size={16} strokeWidth={1.75} />
        <div>
          <h2 className="text-sm font-normal tracking-tight text-white">Grandes Vitórias</h2>
          <p className="text-[11px] font-normal text-tuao-text-secondary">
            Apostas de cassino em tempo real
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-tuao-dark-700/80 bg-tuao-dark-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[11px] font-normal">
            <thead>
              <tr className="border-b border-tuao-dark-700/80 uppercase tracking-wider text-tuao-text-secondary">
                <th className="px-3 py-2 font-normal">Jogo</th>
                <th className="px-3 py-2 font-normal">Usuário</th>
                <th className="px-3 py-2 font-normal">Tempo</th>
                <th className="px-3 py-2 font-normal">Aposta</th>
                <th className="px-3 py-2 font-normal">Mult</th>
                <th className="px-3 py-2 text-right font-normal">Valor ganho</th>
              </tr>
            </thead>
            <tbody>
              {wins.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-tuao-dark-800/80 last:border-0 hover:bg-tuao-dark-800/40"
                >
                  <td className="px-3 py-2 font-normal text-tuao-text-secondary">
                    {gameLabel(w.game)}
                  </td>
                  <td className="px-3 py-2 font-normal text-tuao-text-secondary">{w.username}</td>
                  <td className="px-3 py-2 font-normal tabular-nums text-tuao-text-secondary">
                    {formatTime(w.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-normal tabular-nums text-tuao-text-secondary">
                    R$ {formatMoney(w.amount)}
                  </td>
                  <td className="px-3 py-2 font-normal tabular-nums text-tuao-text-secondary">
                    {formatMult(w.multiplier)}
                  </td>
                  <td className="px-3 py-2 text-right font-normal tabular-nums text-tuao-text-secondary">
                    R$ {formatMoney(w.payout)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
