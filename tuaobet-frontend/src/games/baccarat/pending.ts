import { canDeal, totalCents } from './betting.js';
import type { Bets, Pending, Round } from './types.js';
type Storage = Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
type Transport = { post: (body: Pending) => Promise<Round>; get: (id: string) => Promise<Round> };
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
      let round: Round;
      if(recover) {
        try { round=await this.transport.get(pending.requestId); }
        catch(error) {
          if(statusOf(error)!==404) throw error;
          if(!this.active) return null;
          round=await this.transport.post(pending);
        }
      } else round=await this.transport.post(pending);
      if(!this.active) return null;
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
