import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { fetchPublicRecentWins, type PublicRecentWin } from '../../services/publicSite';
import { getSocket } from '../../services/socket';

const MAX_ROWS = 20;

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

export const BigWinsFeed: React.FC = () => {
  const [wins, setWins] = useState<PublicRecentWin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicRecentWins(MAX_ROWS)
      .then((rows) => {
        if (!cancelled) setWins(rows);
      })
      .catch(() => {
        if (!cancelled) setWins([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onBigWin = (payload: PublicRecentWin) => {
      if (!payload?.id) return;
      setWins((prev) => {
        if (prev.some((w) => w.id === payload.id)) return prev;
        return [payload, ...prev].slice(0, MAX_ROWS);
      });
    };
    socket.on('site:big-win', onBigWin);
    return () => {
      socket.off('site:big-win', onBigWin);
    };
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center gap-2 px-0.5">
        <Trophy className="text-tuao-cta" size={22} strokeWidth={2.5} />
        <div>
          <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">Grandes Vitórias</h2>
          <p className="text-xs text-tuao-text-secondary">Apostas de cassino em tempo real</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-tuao-dark-700/90 bg-tuao-dark-900 shadow-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-tuao-dark-700/80 text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                <th className="px-4 py-3 font-bold">Jogo</th>
                <th className="px-4 py-3 font-bold">Usuário</th>
                <th className="px-4 py-3 font-bold">Tempo</th>
                <th className="px-4 py-3 font-bold">Aposta</th>
                <th className="px-4 py-3 font-bold">Mult</th>
                <th className="px-4 py-3 font-bold text-right">Valor ganho</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-tuao-text-secondary">
                    Carregando vitórias…
                  </td>
                </tr>
              )}
              {!loading && wins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-tuao-text-secondary">
                    Ainda não há grandes vitórias. Seja o primeiro!
                  </td>
                </tr>
              )}
              {!loading &&
                wins.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-tuao-dark-800/80 last:border-0 hover:bg-tuao-dark-800/40"
                  >
                    <td className="px-4 py-3 font-semibold text-white">{gameLabel(w.game)}</td>
                    <td className="px-4 py-3 text-tuao-text-secondary">{w.username}</td>
                    <td className="px-4 py-3 tabular-nums text-tuao-text-secondary">
                      {formatTime(w.createdAt)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-white">R$ {formatMoney(w.amount)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-tuao-cta">
                      {formatMult(w.multiplier)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-400">
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
