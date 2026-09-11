import type { Response } from 'express';

import {
  BaccaratServiceError,
  baccaratHistory,
  baccaratRound,
  playBaccarat,
} from '../games/baccarat/baccaratService';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { pushWalletBalance } from '../socket/pushWalletBalance';

function fail(res: Response, error: unknown) {
  if (error instanceof BaccaratServiceError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  console.error('[baccarat] request failed', error);
  return res.status(500).json({ message: 'Não foi possível concluir a solicitação.' });
}

export async function baccaratDeal(req: AuthRequest, res: Response) {
  try {
    const round = await playBaccarat(req.userId!, req.body);
    pushWalletBalance(req.userId!);
    return res.json(round);
  } catch (error) {
    return fail(res, error);
  }
}

export async function baccaratGetHistory(req: AuthRequest, res: Response) {
  try {
    return res.json({ rounds: await baccaratHistory(req.userId!) });
  } catch (error) {
    return fail(res, error);
  }
}

export async function baccaratGetRound(req: AuthRequest, res: Response) {
  try {
    const round = await baccaratRound(req.userId!, req.params.requestId);
    if (!round) return res.status(404).json({ code: 'ROUND_NOT_FOUND', message: 'Rodada não encontrada' });
    return res.json(round);
  } catch (error) {
    return fail(res, error);
  }
}
