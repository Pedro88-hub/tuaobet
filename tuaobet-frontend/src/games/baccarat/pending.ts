import { canDeal, totalCents } from './betting.js';
import type { Bets, Card, Pending, Round } from './types.js';
type Storage = Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
type Transport = { post: (body: Pending) => Promise<unknown>; get: (id: string) => Promise<unknown> };
/** Captures a request generation so late reconciliation cannot overwrite a newer round. */
export function beginOperation(generation: { current: number }): () => boolean {
  const operation=++generation.current;
  return ()=>generation.current===operation;
}
const isRecord = (value: unknown): value is Record<string,unknown> => typeof value==='object' && value!==null && !Array.isArray(value);
const isMoney = (value: unknown): value is number => typeof value==='number' && Number.isFinite(value) && value>=0 && Number.isSafeInteger(Math.round(value*100)) && Math.abs(value*100-Math.round(value*100))<=1e-7;
const isCard = (value: unknown): value is Card => isRecord(value) && typeof value.rank==='string' && ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].includes(value.rank) && typeof value.suit==='string' && ['clubs','diamonds','hearts','spades'].includes(value.suit);
const isHand = (value: unknown): value is Card[] => Array.isArray(value) && value.length>=2 && value.length<=3 && value.every(isCard);
const isTotal = (value: unknown) => typeof value==='number' && Number.isInteger(value) && value>=0 && value<=9;
const isSide = (value: unknown) => typeof value==='string' && ['player','banker','tie'].includes(value);

/** A successful HTTP status alone cannot resolve a durable monetary request. */
function validateRound(value: unknown,requestId: string): asserts value is Round {
  const valid=isRecord(value)
    && typeof value.roundId==='string' && value.roundId.length>0 && value.requestId===requestId
    && typeof value.createdAt==='string' && Number.isFinite(Date.parse(value.createdAt))
    && isHand(value.playerCards) && isHand(value.bankerCards)
    && isTotal(value.playerTotal) && isTotal(value.bankerTotal) && isSide(value.winner)
    && isMoney(value.balance) && isMoney(value.totalStake) && value.totalStake>=.5 && isMoney(value.totalPayout)
    && Array.isArray(value.settlements) && value.settlements.length>=1 && value.settlements.length<=3
    && value.settlements.every(item=>isRecord(item) && isSide(item.side)
      && isMoney(item.amount) && item.amount>=.5 && isMoney(item.payout)
      && typeof item.multiplier==='number' && [0,1,1.95,2,9].includes(item.multiplier)
      && typeof item.result==='string' && ['win','loss','push'].includes(item.result))
    && new Set(value.settlements.map(item=>item.side)).size===value.settlements.length;
  if(!valid) throw new Error('Resposta da rodada inválida. Sua aposta continua pendente; tente recuperar.');
}
const statusOf = (error: unknown) => typeof error==='object' && error!==null && 'status' in error ? Number(error.status) : 0;
export const definitiveRejection = (error: unknown) => {
  const status=statusOf(error);
  return status>=400 && status<500 && ![401,408,429].includes(status);
};
function readPending(raw: string | null): Pending | null {
  if(raw===null) return null;
  try {
    const value=JSON.parse(raw);
    if(typeof value?.requestId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) throw Error();
    if(!value.bets || Object.keys(value.bets).sort().join(',')!=='banker,player,tie') throw Error();
    const cents={} as Bets;
    for(const side of ['player','banker','tie'] as const) {
      const v=value.bets[side];
      if(typeof v!=='number' || !Number.isFinite(v) || Math.abs(v*100-Math.round(v*100))>1e-7) throw Error();
      cents[side]=Math.round(v*100);
    }
    if(!canDeal(cents,totalCents(cents))) throw Error();
    return Object.freeze({ requestId:value.requestId,bets:Object.freeze({...value.bets}) });
  } catch { throw new Error('Não foi possível ler a pendência desta conta. Preserve os dados desta sessão e contate o suporte.'); }
}
/** One owner per mounted identity. Network uncertainty never creates a new request. */
export class PendingRoundClient {
  pending: Pending | null;
  private busy=false;
  private active=true;
  private key: string;
  constructor(userId: string,private storage: Storage,private transport: Transport,private uuid:()=>string) {
    this.key=`tuaobet:baccarat:pending:${userId}`;
    this.pending=readPending(storage.getItem(this.key));
  }
  dispose() { this.active=false; }
  async submit(bets: Bets): Promise<Round|null> {
    if(this.busy || !this.active || this.pending) return null;
    if(!canDeal(bets,totalCents(bets))) throw Error('Aposta inválida');
    const pending=Object.freeze({requestId:this.uuid(),bets:Object.freeze({player:bets.player/100,banker:bets.banker/100,tie:bets.tie/100})});
    // A storage failure prevents the monetary request altogether.
    this.storage.setItem(this.key,JSON.stringify(pending));
    this.pending=pending;
    return this.run(false);
  }
  recover(): Promise<Round|null> { return this.run(true); }
  private async run(recover: boolean): Promise<Round|null> {
    if(this.busy || !this.active || !this.pending) return null;
    this.busy=true;
    const pending=this.pending;
    try {
      let round: unknown;
      if(recover) {
        try { round=await this.transport.get(pending.requestId); }
        catch(error) {
          if(statusOf(error)!==404) throw error;
          if(!this.active) return null;
          round=await this.transport.post(pending);
        }
      } else round=await this.transport.post(pending);
      if(!this.active) return null;
      validateRound(round,pending.requestId);
      this.storage.removeItem(this.key);
      this.pending=null;
      return round;
    } catch(error) {
      if(!this.active) return null;
      if(definitiveRejection(error)) {
        this.storage.removeItem(this.key);
        this.pending=null;
      }
      throw error;
    } finally { this.busy=false; }
  }
}
