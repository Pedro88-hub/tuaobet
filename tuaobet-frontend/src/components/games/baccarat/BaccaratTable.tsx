import { dealSequence, money, visibleTotal } from '../../../games/baccarat/betting';
import { SIDE_LABELS, type Round, type Status } from '../../../games/baccarat/types';
import { BaccaratCard } from './BaccaratCard';
export function BaccaratTable({round,status,shown,arrived}:{round:Round|null;status:Status;shown:number;arrived:number}) {
  const sequence=round?dealSequence(round):[];
  const complete=status==='result';
  return <section className="bc-table" aria-label="Mesa de baccarat">
    <div className="bc-table-inner">
      <div className="bc-table-top"><span>✦ PUNTO BANCO</span><span>8 BARALHOS</span></div>
      <div className={`bc-shoe ${status==='dealing'?'is-dealing':''}`} aria-label="Shoe de oito baralhos"><div className="bc-shoe-stack"/><div className="bc-shoe-lid">♠</div></div>
      <div className="bc-table-brand" aria-hidden="true"><span>TUÃOBET ORIGINAL</span><strong>BACCARAT</strong><i>◆</i></div>
      <div className="bc-hands">
        {(['player','banker'] as const).map(side=>{
          const visible=sequence.filter((item,index)=>item.side===side && index<shown).map(item=>item.card);
          const cards=sequence.map((item,index)=>({...item,order:index})).filter(item=>item.side===side && item.order<arrived);
          const winning=complete && round?.winner===side;
          return <div className={`bc-hand ${winning?'is-winner':''}`} key={side}>
            <div className="bc-hand-heading"><span>{SIDE_LABELS[side]}</span><b aria-label={`Pontos da ${SIDE_LABELS[side]}: ${visible.length?visibleTotal(visible):'sem cartas'}`}>{visible.length?visibleTotal(visible):'—'}</b></div>
            <div className="bc-card-slots">
              {[0,1,2].map(index=><div className="bc-card-slot" key={index}>{cards.find(item=>item.index===index) ? (()=>{const item=cards.find(item=>item.index===index)!;return <BaccaratCard key={`${round?.roundId}-${index}`} card={item.card} revealed={item.order<shown} position={index}/>;})() : <span aria-hidden="true">{index===2?'Ⅲ':'♠'}</span>}</div>)}
            </div>
          </div>;
        })}
      </div>
      <div className={`bc-result ${complete?'is-complete':''}`} aria-live="polite" aria-atomic="true">
        {complete && round ? <><strong>{round.winner==='tie'?'Empate':`${SIDE_LABELS[round.winner]} vence`}</strong><span>Retorno total {money(Math.round(round.totalPayout*100))} <i>·</i> Aposta {money(Math.round(round.totalStake*100))}</span></>
          : <><strong>{status==='submitting'?'Confirmando sua aposta…':status==='recovering'?'Recuperando sua rodada…':status==='dealing'?'Distribuindo as cartas…':'A mesa é sua.'}</strong><span>{status==='betting'?'Escolha uma ficha e coloque sua aposta abaixo.':'Aguarde a conclusão desta rodada.'}</span></>}
      </div>
      <div className="bc-table-note">JOGADOR 2× <span>◆</span> EMPATE 9× <span>◆</span> BANCA 1,95×</div>
    </div>
  </section>;
}
