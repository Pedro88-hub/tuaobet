import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { betsFromPlacements, canAddChip, canDeal, dealSequence, revealedHistory, totalCents, undoPlacement } from '../games/baccarat/betting';
import { PendingRoundClient } from '../games/baccarat/pending';
import type { Placement, Round, Side, Status } from '../games/baccarat/types';

export function useBaccaratGame() {
  const { user, authReady, setUserBalance }=useAuth();
  const identity=user?.id ?? null;
  const identityRef=useRef(identity); identityRef.current=identity;
  const client=useRef<PendingRoundClient|null>(null);
  const lock=useRef(false);
  const [placements,setPlacements]=useState<Placement[]>([]);
  const placementsRef=useRef(placements); placementsRef.current=placements;
  const [chip,setChip]=useState(50);
  const [status,setStatus]=useState<Status>('betting');
  const [round,setRound]=useState<Round|null>(null);
  const [history,setHistory]=useState<Round[]>([]);
  const [historyError,setHistoryError]=useState('');
  const [error,setError]=useState('');
  const [retryable,setRetryable]=useState(false);
  const [arrived,setArrived]=useState(0);
  const [shown,setShown]=useState(0);
  const historyVersion=useRef(0);
  const hiddenRequestId=useRef<string|null>(null);
  const balance=Math.max(0,Math.round((user?.balance ?? 0)*100));
  const bets=betsFromPlacements(placements);
  const total=totalCents(bets);
  const editable=(status==='betting'||status==='result') && authReady;

  useLayoutEffect(()=>{
    let alive=true;
    const token=localStorage.getItem('tuaobet_token');
    const current=()=>alive && identityRef.current===identity && localStorage.getItem('tuaobet_token')===token;
    lock.current=false; client.current=null; hiddenRequestId.current=null;
    setPlacements([]); placementsRef.current=[]; setChip(50); setRound(null); setHistory([]);
    setStatus('betting'); setError(''); setHistoryError(''); setRetryable(false); setShown(0); setArrived(0);
    if(!identity || !authReady) return ()=>{alive=false;};
    let owner: PendingRoundClient;
    try {
      owner=new PendingRoundClient(identity,sessionStorage,{
        post: body=>{
          if(!current()) return Promise.reject(Error('Sessão alterada'));
          return apiFetch<Round>('/api/games/baccarat/deal',{method:'POST',body:JSON.stringify(body)});
        },
        get: id=>apiFetch<Round>(`/api/games/baccarat/round/${id}`),
      },()=>crypto.randomUUID());
      client.current=owner;
      hiddenRequestId.current=owner.pending?.requestId ?? null;
    } catch(e) {
      lock.current=true; setStatus('recovering'); setError(e instanceof Error?e.message:'Não foi possível acessar a pendência desta sessão.');
      return ()=>{alive=false;};
    }
    const version=++historyVersion.current;
    void apiFetch<{rounds:Round[]}>('/api/games/baccarat/history').then(data=>{
      if(current() && historyVersion.current===version) setHistory(revealedHistory(data.rounds,hiddenRequestId.current));
    }).catch(()=>{if(current()) setHistoryError('Não foi possível carregar seu histórico.');});
    if(owner.pending) {
      lock.current=true; setStatus('recovering');
      void owner.recover().then(result=>{
        if(current() && result) {
          setUserBalance(result.balance); setShown(0); setArrived(0); setRound(result); setStatus('dealing');
        }
      }).catch(async e=>{
        if(current()) {
          setError(e instanceof Error?e.message:'Não foi possível recuperar a rodada.');
          setRetryable(Boolean(owner.pending)); setStatus(owner.pending?'recovering':'betting');
          if(!owner.pending) lock.current=false;
          try {
            const me=await apiFetch<{balance:number}>('/api/auth/me');
            if(current()) setUserBalance(me.balance);
          } catch { /* Recovery remains available without a balance rollback. */ }
        }
      });
    }
    return ()=>{alive=false; owner.dispose(); if(client.current===owner) client.current=null;};
  },[identity,authReady,setUserBalance]);

  useEffect(()=>{
    if(status!=='dealing'||!round) return;
    setArrived(0); setShown(0);
    const count=dealSequence(round).length;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const token=localStorage.getItem('tuaobet_token');
    const current=()=>identityRef.current===identity && localStorage.getItem('tuaobet_token')===token;
    const timers: ReturnType<typeof setTimeout>[]=[];
    for(let index=0;index<count;index++) {
      timers.push(setTimeout(()=>{if(current()) setArrived(index+1);},reduced?0:index*700+100));
      timers.push(setTimeout(()=>{if(current()) setShown(index+1);},reduced?0:index*700+500));
    }
    timers.push(setTimeout(()=>{
      if(!current()) return;
      setStatus('result'); lock.current=false;
      hiddenRequestId.current=null;
      setHistory(old=>[round,...old.filter(item=>item.roundId!==round.roundId)].slice(0,20));
      const version=++historyVersion.current;
      void apiFetch<{rounds:Round[]}>('/api/games/baccarat/history').then(data=>{
        if(current() && historyVersion.current===version) { setHistory(revealedHistory(data.rounds,hiddenRequestId.current)); setHistoryError(''); }
      }).catch(()=>{if(current()) setHistoryError('Não foi possível atualizar seu histórico.');});
    },reduced?20:count*700+200));
    return ()=>timers.forEach(clearTimeout);
  },[round,status,identity]);

  function place(side: Side) {
    if(!editable || lock.current || !identity) return;
    const previous=placementsRef.current;
    if(!canAddChip(chip,balance-totalCents(betsFromPlacements(previous)))) return;
    const next=[...previous,{side,cents:chip}]; placementsRef.current=next; setPlacements(next);
    setError('');
  }
  function replacePlacements(next: Placement[]) {
    if(!editable || lock.current) return;
    placementsRef.current=next; setPlacements(next); setError('');
  }
  async function send(recover=false) {
    const owner=client.current;
    if(!owner || lock.current && !recover || !identity) return;
    if(recover && !retryable) return;
    const staged=betsFromPlacements(placementsRef.current);
    if(!recover && !canDeal(staged,balance)) return;
    const userId=identity;
    const token=localStorage.getItem('tuaobet_token');
    const current=()=>client.current===owner && identityRef.current===userId && localStorage.getItem('tuaobet_token')===token;
    lock.current=true; setRetryable(false); setError(''); setStatus(recover?'recovering':'submitting');
    try {
      const request=recover?owner.recover():owner.submit(staged);
      hiddenRequestId.current=owner.pending?.requestId ?? null;
      const result=await request;
      if(!current() || !result) return;
      setUserBalance(result.balance); setPlacements([]); placementsRef.current=[];
      setShown(0); setArrived(0); setRound(result); setStatus('dealing');
    } catch(e) {
      if(!current()) return;
      setError(e instanceof Error?e.message:'Não foi possível concluir a rodada.');
      const pending=Boolean(owner.pending);
      setRetryable(pending); setStatus(pending?'recovering':'betting'); lock.current=pending;
      // Fetch current server balance; never refund optimistically after a failed response.
      try {
        const me=await apiFetch<{balance:number}>('/api/auth/me');
        if(current()) setUserBalance(me.balance);
      } catch { /* The uncertain request stays blocked and retryable. */ }
    }
  }
  return { bets,chip,setChip,status,round,history,historyError,error,retryable,arrived,shown,balance,total,
    remaining:Math.max(0,balance-total),editable,place,
    undo:()=>replacePlacements(undoPlacement(placementsRef.current)),clear:()=>replacePlacements([]),
    submit:()=>send(),retry:()=>send(true),canSubmit:editable && canDeal(bets,balance),
  };
}
