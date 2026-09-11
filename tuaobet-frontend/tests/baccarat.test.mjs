import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalCents, addChip, canAddChip, parseChipCents, undoPlacement, clearPlacements, canDeal, betsFromPlacements, dealSequence, visibleTotal, revealedHistory } from '../.cache/baccarat/betting.js';
import { PendingRoundClient } from '../.cache/baccarat/pending.js';

const zero = { player: 0, banker: 0, tie: 0 };
const bets = { player: 50, banker: 0, tie: 0 };
const id = '12345678-1234-4234-8234-123456789012';
const round = { requestId: id, balance: 42 };
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
