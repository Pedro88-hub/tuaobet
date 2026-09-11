import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { totalCents, addChip, canAddChip, parseChipCents, undoPlacement, clearPlacements, canDeal, betsFromPlacements, dealSequence, visibleTotal, revealedHistory } from '../.cache/baccarat/betting.js';
import { PendingRoundClient } from '../.cache/baccarat/pending.js';
import * as pendingApi from '../.cache/baccarat/pending.js';
import { buildBeadPlate, buildBigRoad, countWinners, chronologicalWinners } from '../.cache/baccarat/roads.js';

const zero = { player: 0, banker: 0, tie: 0 };
const bets = { player: 50, banker: 0, tie: 0 };
const id = '12345678-1234-4234-8234-123456789012';
const round = {
  roundId: 'round-1', requestId: id, balance: 42, createdAt: '2026-09-11T12:00:00.000Z',
  playerCards: [{rank:'9',suit:'hearts'},{rank:'K',suit:'clubs'}],
  bankerCards: [{rank:'3',suit:'spades'},{rank:'5',suit:'diamonds'}],
  playerTotal: 9, bankerTotal: 8, winner: 'player', totalStake: .5, totalPayout: 1,
  settlements: [{side:'player',amount:.5,payout:1,multiplier:2,result:'win'}],
};
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; };
test('cent arithmetic and exact custom denominations', () => {
  assert.equal(totalCents({ player: 50, banker: 100, tie: 0 }),150);
  assert.deepEqual(addChip(zero,'player',50,50), bets);
  assert.equal(canAddChip(50,49),false);
  assert.equal(parseChipCents('0,50'),50);
  assert.equal(parseChipCents('1.001'),null);
  assert.equal(parseChipCents('1e3'),null);
  assert.equal(parseChipCents('-2'),null);
  assert.equal(parseChipCents('12.34'),1234);
  assert.deepEqual(addChip(zero,'tie',56,56),{...zero,tie:56});
  assert.deepEqual(addChip(bets,'tie',50,99),bets);
});
test('undo last placement and clear preserve correct aggregate stakes', () => {
  const stack = [{side:'player',cents:50},{side:'banker',cents:100},{side:'player',cents:56}];
  assert.deepEqual(betsFromPlacements(undoPlacement(stack)),{player:50,banker:100,tie:0});
  assert.equal(stack.length,3);
  assert.deepEqual(betsFromPlacements(clearPlacements()),zero);
  assert.deepEqual(undoPlacement([]),[]);
});
test('current balance, zero and area minimums govern deal eligibility', () => {
  assert.equal(canDeal(bets,49),false);
  assert.equal(canDeal(zero,0),false);
  assert.equal(canDeal(bets,50),true);
  assert.equal(canDeal({...bets,tie:1},100),false);
});
test('persist before POST, guard double submit and retain immutable retry payload', async () => {
  const storage = memory(); let reject; const calls=[];
  const post = async body => { calls.push(body); assert.ok(storage.getItem('tuaobet:baccarat:pending:u')); if(calls.length===1) return new Promise((_,r)=>reject=r); return round; };
  const client = new PendingRoundClient('u',storage,{post,get:async()=>{throw {status:404};}},()=>id);
  const editable={...bets}; const first=client.submit(editable); editable.player=500;
  assert.equal(await client.submit(bets),null);
  reject(new Error('network')); await assert.rejects(first);
  assert.ok(client.pending);
  assert.deepEqual(await client.recover(),round);
  assert.deepEqual(calls,[{requestId:id,bets:{player:0.5,banker:0,tie:0}},{requestId:id,bets:{player:0.5,banker:0,tie:0}}]);
  assert.equal(storage.getItem('tuaobet:baccarat:pending:u'),null);
});
test('reload resolves by GET without another POST and isolates user storage', async () => {
  const storage=memory(); const first=new PendingRoundClient('u',storage,{post:async()=>{throw Error('lost');},get:async()=>round},()=>id);
  await assert.rejects(first.submit(bets));
  let posts=0; const reloaded=new PendingRoundClient('u',storage,{post:async()=>{posts++;return round;},get:async()=>round},()=>id);
  assert.equal(new PendingRoundClient('other',storage,{},()=>id).pending,null);
  assert.deepEqual(await reloaded.recover(),round); assert.equal(posts,0);
});
test('stale response after logout/unmount is ignored and pending stays recoverable', async () => {
  const storage=memory(); let resolve;
  const client=new PendingRoundClient('u',storage,{post:()=>new Promise(r=>resolve=r),get:async()=>round},()=>id);
  const response=client.submit(bets); client.dispose(); resolve(round);
  assert.equal(await response,null); assert.ok(storage.getItem('tuaobet:baccarat:pending:u'));
});
test('definitive rejection clears, server uncertainty retains, bad storage cannot send', async () => {
  for(const status of [400,409,429,500]) {
    const storage=memory(); const client=new PendingRoundClient('u',storage,{post:async()=>{throw {status};},get:async()=>round},()=>id);
    await assert.rejects(client.submit(bets)); assert.equal(Boolean(client.pending),status===429||status===500);
  }
  const storage=memory(); storage.setItem('tuaobet:baccarat:pending:u',JSON.stringify({requestId:id,bets:{player:-1,banker:0,tie:0}}));
  assert.throws(()=>new PendingRoundClient('u',storage,{},()=>id),/pendência/i);
});
test('animation uses actual third card order and counts only revealed cards', () => {
  const card=rank=>({rank,suit:'spades'});
  const data={playerCards:[card('9'),card('7'),card('A')],bankerCards:[card('K'),card('2'),card('3')]};
  assert.deepEqual(dealSequence(data).map(v=>v.side+v.card.rank),['player9','bankerK','player7','banker2','playerA','banker3']);
  assert.equal(visibleTotal(data.playerCards.slice(0,1)),9);
  assert.equal(visibleTotal(data.playerCards.slice(0,2)),6);
  assert.equal(visibleTotal(data.playerCards),7);
  assert.deepEqual(dealSequence({...data,playerCards:data.playerCards.slice(0,2)}).map(v=>v.card.rank),['9','K','7','2','3']);
});
test('pending result in personal history remains hidden until reveal', () => {
  const previous={...round,requestId:'other'};
  assert.deepEqual(revealedHistory([round,previous],id),[previous]);
  assert.deepEqual(revealedHistory([round,previous],null),[round,previous]);
});
test('storage failure prevents POST and session disposal during recovery prevents POST', async () => {
  let posts=0; const transport={post:async()=>{posts++;return round;},get:async()=>round};
  const storage={...memory(),setItem:()=>{throw Error('quota');}};
  await assert.rejects(new PendingRoundClient('u',storage,transport,()=>id).submit(bets));
  assert.equal(posts,0);
  const saved=memory(); saved.setItem('tuaobet:baccarat:pending:u',JSON.stringify({requestId:id,bets:{player:.5,banker:0,tie:0}}));
  let reject; const client=new PendingRoundClient('u',saved,{...transport,get:()=>new Promise((_,r)=>reject=r)},()=>id);
  const recovery=client.recover(); client.dispose(); reject({status:404});
  assert.equal(await recovery,null); assert.equal(posts,0);
});
test('malformed successful POST/GET never clears pending and valid recovery resolves it', async () => {
  const malformed = [null, {}, {...round,requestId:'another-request'}, {...round,balance:undefined},
    {...round,balance:NaN}, {...round,playerCards:[]}, {...round,playerCards:[{rank:'11',suit:'hearts'},round.playerCards[1]]},
    {...round,bankerCards:[{rank:'2',suit:'invalid'},round.bankerCards[1]]}, {...round,playerTotal:10},
    {...round,winner:'invalid'}, {...round,settlements:[]}, {...round,settlements:[{...round.settlements[0],result:'pending'}]},
    {...round,totalPayout:-1}, {...round,totalStake:.501}, {...round,createdAt:'not-a-date'}, {...round,roundId:''}];
  for(const response of malformed) {
    const storage=memory(); let valid=false;
    const client=new PendingRoundClient('u',storage,{post:async()=>response,get:async()=>valid?round:response},()=>id);
    await assert.rejects(client.submit(bets),/resposta/i);
    const saved=storage.getItem('tuaobet:baccarat:pending:u'); assert.ok(saved);
    await assert.rejects(client.recover(),/resposta/i);
    assert.equal(storage.getItem('tuaobet:baccarat:pending:u'),saved);
    assert.ok(client.pending); valid=true;
    assert.deepEqual(await client.recover(),round);
    assert.equal(storage.getItem('tuaobet:baccarat:pending:u'),null);
  }
});
test('older delayed balance GET cannot overwrite a newer successful submit or recovery', async () => {
  for(const recover of [false,true]) {
    const generation={current:0}; let balance=10; let resolveMe;
    const isRejectedOperationCurrent=pendingApi.beginOperation(generation);
    const delayedMe=new Promise(resolve=>{resolveMe=resolve;}).then(me=>{
      if(isRejectedOperationCurrent()) balance=me.balance;
    });
    const storage=memory();
    if(recover) storage.setItem('tuaobet:baccarat:pending:u',JSON.stringify({requestId:id,bets:{player:.5,banker:0,tie:0}}));
    const client=new PendingRoundClient('u',storage,{post:async()=>round,get:async()=>round},()=>id);
    const isNewOperationCurrent=pendingApi.beginOperation(generation);
    const result=await (recover?client.recover():client.submit(bets));
    if(isNewOperationCurrent()) balance=result.balance;
    resolveMe({balance:10}); await delayedMe;
    assert.equal(balance,42);
    assert.equal(isRejectedOperationCurrent(),false);
    assert.equal(isNewOperationCurrent(),true);
  }
});
test('live totals, chip stacks and phase lock', async () => {
  const { applyTotals, canInteract, chipVisualIndex, emptyTotals, isStaleRound, placementsFromServer, stackFromPlacements } = await import('../.cache/baccarat/live.js');
  const totals = applyTotals({
    roundId: 2,
    player: { amount: 12.5, count: 4 },
    banker: { amount: 8, count: 2 },
    tie: { amount: 1, count: 1 },
  });
  assert.deepEqual(totals.player, { amount: 12.5, count: 4 });
  assert.deepEqual(emptyTotals().tie, { amount: 0, count: 0 });
  assert.equal(canInteract('BETTING', true), true);
  assert.equal(canInteract('DEALING', true), false);
  assert.equal(canInteract('BETTING', false), false);
  assert.equal(isStaleRound(5, 4), true);
  assert.equal(isStaleRound(5, 5), false);
  assert.equal(isStaleRound(0, 1), false);
  assert.equal(chipVisualIndex(500), 2);
  assert.equal(chipVisualIndex(50), 0);
  assert.equal(chipVisualIndex(700), 2);
  const placements = placementsFromServer([
    { placementId: 'a', side: 'player', amount: 5 },
    { placementId: 'b', side: 'player', amount: 10 },
    { placementId: 'c', side: 'player', amount: 1 },
  ]);
  assert.equal(placements[0].cents, 500);
  const stacked = stackFromPlacements(placements, 2);
  assert.equal(stacked.overflow, 1);
  assert.deepEqual(stacked.visible.map((chip) => chip.cents), [1000, 100]);
});

test('casino table layout keeps shoe, casino odds labels and roadmap shells', async () => {
  const card = await readFile(new URL('../src/components/games/baccarat/BaccaratCard.tsx', import.meta.url), 'utf8');
  const table = await readFile(new URL('../src/components/games/baccarat/BaccaratTable.tsx', import.meta.url), 'utf8');
  const hud = await readFile(new URL('../src/components/games/baccarat/BaccaratPhaseHud.tsx', import.meta.url), 'utf8');
  const panel = await readFile(new URL('../src/components/games/baccarat/BaccaratBetPanel.tsx', import.meta.url), 'utf8');
  const roads = await readFile(new URL('../src/components/games/baccarat/BaccaratRoads.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/components/games/baccarat/baccarat.css', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/BaccaratGame.tsx', import.meta.url), 'utf8');

  assert.match(table, /role="img"\s+aria-label="Shoe de oito baralhos"/);
  assert.match(table, /player: '1:1', tie: '8:1', banker: '0,95:1'/);
  assert.match(table, /BaccaratPhaseHud/);
  assert.match(table, /chipTray/);
  assert.match(table, /walletBar/);
  assert.match(hud, /Apostas abertas/);
  assert.match(hud, /Apostas encerradas/);
  assert.match(hud, /bc-phase-ring/);
  assert.match(hud, /bc-phase-status/);
  assert.match(panel, /Desfazer/);
  assert.match(panel, /Reapostar/);
  assert.match(panel, /Aposta total/);
  assert.match(roads, /bc-bead/);
  assert.match(roads, /bc-big-road/);
  assert.match(page, /BaccaratChipTray/);
  assert.match(page, /history=\{game\.history\}/);
  assert.match(table, /BaccaratRoads/);
  assert.match(table, /history=\{history\}/);
  assert.match(styles, /\.bc-phase-hud/);
  assert.match(styles, /\.bc-tray-row/);
  assert.match(styles, /\.bc-roads/);
  assert.match(styles, /\.bc-area-chip/);
  assert.match(styles, /\.bc-area-pct/);
  assert.match(styles, /@media\(max-width:380px\)\s*\{[\s\S]*?\.bc-card-slot\s*\{[^}]*width:36px/s);
  assert.match(card, /revealed \? 'is-revealed' : ''/);
  assert.match(styles, /\.bc-card\.is-revealed .bc-card-turn\s*\{[^}]*transform:rotateY\(180deg\)/s);
  assert.match(
    styles,
    /@media\(prefers-reduced-motion:reduce\)\s*\{[\s\S]*?animation:none!important;[\s\S]*?transition:none!important/s,
  );
});

test('bead plate and big road derive from newest-first history', () => {
  const history = [
    { roundId: 3, winner: 'player', playerTotal: 7, bankerTotal: 5, createdAt: '2026-09-11T12:03:00.000Z' },
    { roundId: 2, winner: 'player', playerTotal: 8, bankerTotal: 2, createdAt: '2026-09-11T12:02:00.000Z' },
    { roundId: 1, winner: 'banker', playerTotal: 1, bankerTotal: 9, createdAt: '2026-09-11T12:01:00.000Z' },
  ];
  assert.deepEqual(chronologicalWinners(history), ['banker', 'player', 'player']);
  assert.deepEqual(countWinners(history), { player: 2, banker: 1, tie: 0 });
  const bead = buildBeadPlate(history);
  assert.equal(bead[0][0].winner, 'banker');
  assert.equal(bead[0][1].winner, 'player');
  assert.equal(bead[0][2].winner, 'player');
  const big = buildBigRoad(history);
  assert.equal(big[0][0].winner, 'banker');
  assert.equal(big[1][0].winner, 'player');
  assert.equal(big[1][1].winner, 'player');
});
