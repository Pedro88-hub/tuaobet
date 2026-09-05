export type GameType = 'crash' | 'double' | 'mines' | 'plinko' | 'sports';
export type BetStatus = 'pending' | 'won' | 'lost' | 'cashed_out';

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  created_at: string;
}

// Estrutura da Rodada (vinda do backend)
export interface GameRound {
  id: string;
  game_type: GameType;
  server_seed_hash: string; // O seed real só é revelado ao fim
  public_seed: string;
  nonce: number;
  status: 'active' | 'completed';
  result?: any; // Tipado especificamente dependendo do jogo
  created_at: string;
}

// Estrutura da Aposta
export interface Bet {
  id: string;
  user_id: string;
  game_round_id: string;
  amount: number;
  payout: number;
  multiplier?: number;
  status: BetStatus;
  // Dados específicos (ex: cor no double, risco no plinko)
  game_data: any; 
  created_at: string;
}

// Histórico de Transações (Extrato)
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'bet' | 'win' | 'deposit' | 'withdraw' | 'bonus';
  balance_after: number;
  created_at: string;
}