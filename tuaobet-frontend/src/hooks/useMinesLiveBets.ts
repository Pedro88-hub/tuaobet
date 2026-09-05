import { useState, useEffect } from 'react';
import { getSocket } from '../services/socket';

export type MinesLivePlayer = {
  id: string;
  username: string;
  name?: string;
  amount: number;
  minesCount: number;
};

const CLIENT_CAP = 80;

export function useMinesLiveBets() {
  const [liveBets, setLiveBets] = useState<MinesLivePlayer[]>([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('mines:live-bets', (list: MinesLivePlayer[]) => {
      setLiveBets(Array.isArray(list) ? list.slice(-CLIENT_CAP) : []);
    });

    socket.on('mines:new-bet', (bet: MinesLivePlayer) => {
      if (!bet?.id) return;
      setLiveBets((prev) => [...prev, bet].slice(-CLIENT_CAP));
    });

    return () => {
      socket.off('mines:live-bets');
      socket.off('mines:new-bet');
    };
  }, []);

  return { liveBets };
}
