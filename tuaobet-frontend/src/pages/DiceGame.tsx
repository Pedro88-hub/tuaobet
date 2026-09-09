import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useDiceGame } from '../hooks/useDiceGame';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Users, Zap, RefreshCw, Dices } from 'lucide-react';

export function DiceGame() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const {
    betAmount,
    setBetAmount,
    rollUnder,
    setRollUnder,
    isRolling,
    lastResult,
    win,
    liveBets,
    multiplier,
    winChance,
    potentialWin,
    rollDice,
    instantBet,
    setInstantBet,
    betMode,
    setBetMode,
    error: diceError,
  } = useDiceGame();

  const onRoll = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    void rollDice();
  };

  // Atalhos de valor
  const handleHalve = () =>
    setBetAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v) || v <= 0) return '';
      return Math.max(0.01, v / 2).toFixed(2);
    });
  const handleDouble = () =>
    setBetAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v)) return '';
      return (v * 2).toFixed(2);
    });

  return (
    <Layout>
      <div className="flex flex-col gap-4 p-4 text-white max-w-6xl mx-auto">
        
        {/* ÁREA SUPERIOR: CONTROLES E JOGO */}
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[550px]">
           
           {/* 1. PAINEL DE CONTROLE (ESQUERDA) */}
           <div className="w-full lg:w-[320px] bg-tuao-dark-900 rounded-xl flex flex-col border border-tuao-dark-800 shrink-0 shadow-lg">
              
              {/* Abas Manual / Auto */}
              <div className="flex p-1.5 m-3 bg-tuao-dark-950 rounded-lg border border-tuao-dark-800">
                <button 
                  onClick={() => setBetMode('manual')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-md transition-all",
                    betMode === 'manual' ? "bg-tuao-dark-800 text-white shadow-sm" : "text-tuao-text-secondary hover:text-white"
                  )}
                >
                  Manual
                </button>
                <button 
                  onClick={() => setBetMode('auto')}
                  className={cn(
                    "flex-1 py-2 text-sm font-bold rounded-md transition-all",
                    betMode === 'auto' ? "bg-tuao-dark-800 text-white shadow-sm" : "text-tuao-text-secondary hover:text-white"
                  )}
                >
                  Auto
                </button>
              </div>

              <div className="px-4 pb-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                 
                 {/* Input Valor */}
                 <div className="space-y-1">
                    <div className="flex justify-between text-xs text-tuao-text-secondary font-bold uppercase mb-1">
                       <span>Valor (R$)</span>
                    </div>
                    <div className="relative group">
                       <Input 
                         type="number" 
                         value={betAmount} 
                         onChange={(e) => setBetAmount(e.target.value)}
                         className="pr-20 font-bold bg-tuao-dark-950 border-tuao-dark-700 h-12 text-base focus:border-tuao-primary"
                         disabled={isRolling}
                       />
                       <div className="absolute right-1 top-1.5 flex gap-1">
                         <button onClick={handleHalve} disabled={isRolling} className="px-2 py-2 text-xs bg-tuao-dark-800 text-tuao-text-secondary hover:text-white rounded font-bold transition-colors">½</button>
                         <button onClick={handleDouble} disabled={isRolling} className="px-2 py-2 text-xs bg-tuao-dark-800 text-tuao-text-secondary hover:text-white rounded font-bold transition-colors">2x</button>
                       </div>
                    </div>
                 </div>

                 {/* Informações de Ganho */}
                 <div className="space-y-1">
                    <div className="flex justify-between text-xs text-tuao-text-secondary font-bold uppercase mb-1">
                       <span>Ganho (R$)</span>
                    </div>
                    <div className="bg-tuao-dark-950 border border-tuao-dark-700 rounded-md h-12 flex items-center px-3 font-bold text-green-500 shadow-inner">
                       {potentialWin.toFixed(2)}
                    </div>
                 </div>

                 {/* Toggle Aposta Instantânea */}
                 <div className="flex items-center justify-between bg-tuao-dark-950 p-3 rounded-lg border border-tuao-dark-700">
                    <div className="flex items-center gap-2 text-sm font-bold text-tuao-text-secondary">
                       <Zap size={16} className={cn(instantBet ? "text-yellow-400" : "text-tuao-text-secondary")} />
                       <span>Aposta Instantânea</span>
                    </div>
                    <button 
                      onClick={() => setInstantBet(!instantBet)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out",
                        instantBet ? "bg-tuao-primary" : "bg-tuao-dark-700"
                      )}
                    >
                       <div className={cn(
                         "w-3 h-3 bg-white rounded-full absolute top-1 transition-transform duration-200 ease-in-out",
                         instantBet ? "left-6" : "left-1"
                       )} />
                    </button>
                 </div>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-tuao-dark-950 p-2 rounded border border-tuao-dark-700">
                       <div className="text-[10px] text-tuao-text-secondary uppercase font-bold">Mult</div>
                       <div className="text-sm font-bold text-white">{multiplier.toFixed(4)}x</div>
                    </div>
                    <div className="bg-tuao-dark-950 p-2 rounded border border-tuao-dark-700">
                       <div className="text-[10px] text-tuao-text-secondary uppercase font-bold">Roll Under</div>
                       <div className="text-sm font-bold text-white">{rollUnder}</div>
                    </div>
                    <div className="bg-tuao-dark-950 p-2 rounded border border-tuao-dark-700">
                       <div className="text-[10px] text-tuao-text-secondary uppercase font-bold">Chance</div>
                       <div className="text-sm font-bold text-white">{winChance}%</div>
                    </div>
                 </div>
              </div>

              {/* Botão de Ação */}
              <div className="p-4 mt-auto border-t border-tuao-dark-800">
                 <Button 
                   size="lg" 
                   className="w-full h-14 text-lg font-black uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.3)] bg-tuao-primary hover:bg-tuao-primary-hover text-tuao-dark-950 transition-all active:scale-95"
                   onClick={onRoll}
                   disabled={isRolling}
                 >
                   {isRolling ? <RefreshCw className="animate-spin" /> : 'Apostar'}
                 </Button>
                 {diceError && (
                   <p className="text-center text-xs text-red-400 mt-2">{diceError}</p>
                 )}
                 <div className="flex items-center gap-2 text-[10px] text-tuao-text-secondary justify-center mt-3">
                    <ShieldCheck size={12} className="text-tuao-primary" />
                    <span>Provably Fair</span>
                 </div>
              </div>
           </div>

           {/* 2. ÁREA DO JOGO (CENTRO) */}
           <div className="flex-1 bg-tuao-dark-900 rounded-xl border border-tuao-dark-800 relative overflow-hidden flex flex-col shadow-inner">
              
              {/* Header do Jogo */}
              <div className="h-14 border-b border-tuao-dark-800 bg-tuao-dark-950/50 flex items-center justify-between px-6 relative z-20">
                 <div className="flex items-center gap-2 text-white font-bold">
                    <Dices className="text-tuao-primary" />
                    <span>Dice</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-tuao-dark-800 px-3 py-1 rounded-full border border-tuao-dark-700">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                       <span className="text-xs font-bold text-white">Online</span>
                    </div>
                 </div>
              </div>

              {/* Área Principal */}
              <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-tuao-dark-950/30">
                 
                 {/* Display do Resultado */}
                 <div className="mb-12 relative h-32 flex items-center justify-center w-full">
                    {lastResult !== null && (
                       <div className={cn(
                          "text-6xl md:text-8xl font-black font-mono tracking-tighter animate-in zoom-in duration-300 drop-shadow-2xl",
                          win ? "text-green-500" : "text-tuao-text-secondary"
                       )}>
                          {lastResult.toFixed(2)}
                       </div>
                    )}
                    
                    {/* Feedback de Vitória */}
                    {win && (
                       <div className="absolute top-full mt-2 bg-green-500/20 text-green-500 border border-green-500/50 px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm animate-in slide-in-from-bottom-4 fade-in">
                          Você ganhou R$ {potentialWin.toFixed(2)}
                       </div>
                    )}
                 </div>

                 {/* Container do Slider */}
                 <div className="w-full max-w-3xl relative h-24 select-none">
                    
                    {/* Régua de Números */}
                    <div className="absolute -top-8 left-0 w-full flex justify-between text-xs font-bold text-tuao-text-secondary px-1">
                       <span>0</span>
                       <span>25</span>
                       <span>50</span>
                       <span>75</span>
                       <span>100</span>
                    </div>

                    {/* Barra de Fundo (Track) */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-4 rounded-full bg-tuao-dark-800 overflow-hidden border border-tuao-dark-700">
                       {/* Parte Verde (Vitória) */}
                       <div 
                          className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-100 ease-out"
                          style={{ width: `${rollUnder}%` }}
                       />
                       {/* Parte Vermelha (Derrota) */}
                       <div 
                          className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-100 ease-out"
                          style={{ width: `${100 - rollUnder}%` }}
                       />
                    </div>

                    {/* Input Range (Slider Invisível por cima) */}
                    <input 
                       type="range" 
                       min="2" 
                       max="98" 
                       step="1"
                       value={rollUnder}
                       onChange={(e) => setRollUnder(Number(e.target.value))}
                       disabled={isRolling}
                       className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-12 opacity-0 cursor-pointer z-20"
                    />

                    {/* Handle Customizado (Botão de Arrastar) */}
                    <div 
                       className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center z-10 pointer-events-none transition-all duration-100 ease-out border-4 border-tuao-dark-900"
                       style={{ left: `calc(${rollUnder}% - 20px)` }}
                    >
                       <div className="w-1 h-4 bg-tuao-dark-300 rounded-full mx-0.5" />
                       <div className="w-1 h-4 bg-tuao-dark-300 rounded-full mx-0.5" />
                    </div>

                    {/* Marcador de Resultado (Seta) */}
                    {lastResult !== null && (
                       <div 
                          className={cn(
                             "absolute top-1/2 -translate-y-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] z-30 transition-all duration-500 ease-out",
                             win ? "border-t-green-500 drop-shadow-[0_-4px_10px_rgba(34,197,94,0.8)]" : "border-t-white drop-shadow-[0_-4px_10px_rgba(255,255,255,0.8)]"
                          )}
                          style={{ 
                             left: `calc(${lastResult}% - 10px)`,
                             top: 'calc(50% - 18px)'
                          }}
                       />
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* 3. LISTA DE APOSTAS AO VIVO (EM BAIXO) */}
        <div className="w-full bg-tuao-dark-900 rounded-xl border border-tuao-dark-800 flex flex-col shrink-0 h-[300px] shadow-lg">
          
          {/* Cabeçalho da Lista */}
          <div className="p-3 border-b border-tuao-dark-800 bg-tuao-dark-950/50 rounded-t-xl flex justify-between items-center">
             <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Apostas ao Vivo</span>
             </div>
             <div className="flex items-center gap-1 text-xs text-tuao-text-secondary">
                <Users size={14} />
                <span>{120 + liveBets.length} Jogadores</span>
             </div>
          </div>
          
          {/* Colunas */}
          <div className="grid grid-cols-5 px-4 py-2 text-[10px] font-bold text-tuao-text-secondary uppercase tracking-wider border-b border-tuao-dark-800/50">
             <span className="col-span-1">Usuário</span>
             <span className="col-span-1 text-center">Hora</span>
             <span className="col-span-1 text-center">Aposta</span>
             <span className="col-span-1 text-center">Mult.</span>
             <span className="col-span-1 text-right">Lucro</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
             {liveBets.map((bet) => (
                <div key={bet.id} className={cn(
                  "grid grid-cols-5 text-xs items-center p-2 rounded hover:bg-tuao-dark-800/50 transition-colors animate-in slide-in-from-top-2 fade-in duration-300",
                  bet.user === 'Você' ? "bg-tuao-dark-800 border border-tuao-dark-700" : ""
                )}>
                   <div className={cn("font-medium truncate col-span-1", bet.user === 'Você' ? "text-white" : "text-tuao-text-secondary")}>
                      {bet.user}
                   </div>
                   <div className="text-center text-tuao-text-secondary opacity-70 col-span-1">{bet.time}</div>
                   <div className="text-center text-white font-mono col-span-1">{bet.betAmount.toFixed(2)}</div>
                   <div className="text-center text-tuao-text-secondary font-mono col-span-1">{bet.multiplier.toFixed(2)}x</div>
                   <div className={cn("text-right font-mono font-bold col-span-1", bet.win ? "text-green-500" : "text-tuao-dark-600")}>
                      {bet.win ? `+${bet.payout.toFixed(2)}` : `-${bet.betAmount.toFixed(2)}`}
                   </div>
                </div>
             ))}
             {liveBets.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-tuao-dark-700 gap-2 opacity-50">
                   <RefreshCw size={24} className="animate-spin" />
                   <span className="text-xs font-medium">Carregando apostas...</span>
                </div>
             )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
