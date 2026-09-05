import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { cn } from '../lib/utils';
import {
  useBaccaratGame,
  BACCARAT_CHIP_VALUES,
  type CardDto,
} from '../hooks/useBaccaratGame';
import { useAuth } from '../context/AuthContext';
import { Spade, Home } from 'lucide-react';

const SUITS = ['♠', '♥', '♦', '♣'] as const;

const CARD_H = 'h-[100px]';
const CARD_W = 'w-[72px]';
/** Tamanho do verso no maço (estilo “paciência” — bem visível na mesa) */
const DECK_CARD_H = 'h-[72px]';
const DECK_CARD_W = 'w-[50px]';

function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 10) return '10';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

function CardFace({
  card,
  className,
  faceUp,
}: {
  card: CardDto;
  className?: string;
  faceUp?: boolean;
}) {
  const isRed = card.suit === 1 || card.suit === 2;
  const suit = SUITS[card.suit] ?? '?';
  const rank = rankLabel(card.rank);
  return (
    <div
      className={cn(
        `${CARD_H} ${CARD_W} relative overflow-hidden rounded-lg`,
        'border border-zinc-300 ring-1 ring-black/10',
        className
      )}
      style={{
        background:
          'linear-gradient(160deg, #ffffff 0%, #f8f6f1 55%, #ece8df 100%)',
        boxShadow:
          '0 1px 0 rgba(0,0,0,0.08), 0 2px 0 rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      {/* Vinheta superior + leve textura */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(80% 60% at 50% 110%, rgba(0,0,0,0.08), transparent 60%)',
        }}
      />
      {/* Canto sup-esq */}
      <div
        className={cn(
          'absolute left-1.5 top-1 flex flex-col items-center leading-none',
          isRed ? 'text-red-600' : 'text-zinc-900'
        )}
      >
        <span className="text-[15px] font-black tracking-tight">{rank}</span>
        <span className="-mt-0.5 text-[13px]">{suit}</span>
      </div>
      {/* Naipe central */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center text-[34px] leading-none',
          isRed ? 'text-red-600' : 'text-zinc-900'
        )}
        style={{ textShadow: '0 1px 0 rgba(0,0,0,0.08)' }}
      >
        {suit}
      </div>
      {/* Canto inf-dir */}
      <div
        className={cn(
          'absolute bottom-1 right-1.5 flex rotate-180 flex-col items-center leading-none',
          isRed ? 'text-red-600' : 'text-zinc-900'
        )}
      >
        <span className="text-[15px] font-black tracking-tight">{rank}</span>
        <span className="-mt-0.5 text-[13px]">{suit}</span>
      </div>
      {/* Gloss sweep ao virar */}
      {faceUp && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute -inset-y-2 w-1/2 animate-baccarat-card-gloss"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            }}
          />
        </div>
      )}
    </div>
  );
}

function CardBack({ className, compact }: { className?: string; compact?: boolean }) {
  const h = compact ? DECK_CARD_H : CARD_H;
  const w = compact ? DECK_CARD_W : CARD_W;
  return (
    <div
      className={cn(
        `${h} ${w} relative overflow-hidden rounded-lg border border-amber-900/70 shadow-card`,
        className
      )}
      style={{
        background: `
          radial-gradient(circle at 30% 25%, rgba(255,210,120,0.25), transparent 55%),
          repeating-linear-gradient(45deg, rgba(255,200,90,0.10) 0px, rgba(255,200,90,0.10) 2px, transparent 2px, transparent 6px),
          repeating-linear-gradient(-45deg, rgba(255,200,90,0.10) 0px, rgba(255,200,90,0.10) 2px, transparent 2px, transparent 6px),
          linear-gradient(150deg, #7c1d1d 0%, #4a0c0c 100%)
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-1 rounded-md"
        style={{
          border: '1px solid rgba(234,179,8,0.55)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
        }}
      />
      <div
        className={cn(
          'absolute inset-0 m-auto flex items-center justify-center rounded',
          'border border-amber-500/40 bg-gradient-to-br from-red-900/70 to-red-950/80',
          compact ? 'h-12 w-9' : 'h-[78px] w-[50px]'
        )}
        style={{
          margin: compact ? '8px' : '10px',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.45)',
        }}
      >
        <Spade
          className={cn(
            compact ? 'h-6 w-6' : 'h-8 w-8'
          )}
          style={{
            color: '#fde68a',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </div>
  );
}

/** Riffle shuffle realista: duas meias-pilhas em leque que se interleavam ao centro. */
function ShufflingDeck({ statusText }: { statusText: string }) {
  const CARD_H_PX = 72;
  const CARD_W_PX = 50;
  const HALF = 6; // cartas visíveis por metade
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2" aria-hidden>
      <div
        className="relative rounded-2xl p-3 backdrop-blur-[3px]"
        style={{
          minHeight: CARD_H_PX + 38,
          minWidth: CARD_W_PX + 120,
          background:
            'radial-gradient(120% 70% at 50% 30%, rgba(0,0,0,0.45), rgba(0,0,0,0.15) 70%)',
          border: '1px solid rgba(251,191,36,0.30)',
          boxShadow:
            '0 14px 40px rgba(0,0,0,0.55), inset 0 0 18px rgba(0,0,0,0.4)',
        }}
      >
        {/* Selo/cinta dourada da banca */}
        <div
          className="pointer-events-none absolute inset-x-3 top-1 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(251,191,36,0.65), transparent)',
          }}
        />
        <div
          className="relative mx-auto animate-baccarat-shuffle-bob"
          style={{ height: CARD_H_PX, width: CARD_W_PX + 96 }}
        >
          {/* Meia-pilha esquerda */}
          <div
            className="absolute bottom-0 left-0 animate-baccarat-shuffle-fan-l"
            style={{ width: CARD_W_PX, height: CARD_H_PX, transformOrigin: '50% 100%' }}
          >
            {Array.from({ length: HALF }).map((_, i) => (
              <div
                key={`l-${i}`}
                className="absolute bottom-0 left-0 animate-baccarat-shuffle-riffle-l"
                style={{
                  transform: `translate(${i * 0.6}px, ${-i * 1.6}px) rotate(${-2 + i * 0.4}deg)`,
                  zIndex: i + 1,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <CardBack compact />
              </div>
            ))}
          </div>
          {/* Meia-pilha direita */}
          <div
            className="absolute bottom-0 right-0 animate-baccarat-shuffle-fan-r"
            style={{ width: CARD_W_PX, height: CARD_H_PX, transformOrigin: '50% 100%' }}
          >
            {Array.from({ length: HALF }).map((_, i) => (
              <div
                key={`r-${i}`}
                className="absolute bottom-0 right-0 animate-baccarat-shuffle-riffle-r"
                style={{
                  transform: `translate(${-i * 0.6}px, ${-i * 1.6}px) rotate(${2 - i * 0.4}deg)`,
                  zIndex: i + 1,
                  animationDelay: `${i * 60 + 30}ms`,
                }}
              >
                <CardBack compact />
              </div>
            ))}
          </div>
          {/* Pilha central reformada (sombra base) */}
          <div
            className="absolute bottom-0 left-1/2 -z-10 -translate-x-1/2"
            style={{
              width: CARD_W_PX + 8,
              height: 6,
              borderRadius: '50%',
              background:
                'radial-gradient(50% 100% at 50% 50%, rgba(0,0,0,0.5), transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
        </div>
      </div>
      <p
        className="max-w-[14rem] text-center text-[10px] font-bold uppercase tracking-[0.22em] md:text-[11px]"
        style={{
          color: '#fde68a',
          textShadow: '0 1px 0 rgba(0,0,0,0.55), 0 0 12px rgba(251,191,36,0.35)',
        }}
      >
        {statusText}
      </p>
    </div>
  );
}

function FlippableCard({
  card,
  faceUp,
}: {
  card: CardDto;
  faceUp: boolean;
}) {
  return (
    <div
      className={cn(
        `relative ${CARD_H} ${CARD_W} animate-baccarat-deal [perspective:1100px]`
      )}
      style={{
        filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))',
      }}
    >
      <div
        className={cn(
          'relative h-full w-full transition-transform duration-[680ms] [transform-style:preserve-3d]',
          faceUp && '[transform:rotateY(180deg)]'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.2, 0.64, 1)' }}
      >
        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden]">
          <CardBack />
        </div>
        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardFace card={card} faceUp={faceUp} />
        </div>
      </div>
    </div>
  );
}

type DealStep = { zone: 'player' | 'banker'; card: CardDto; slotIndex: number };

function buildDealSequence(playerCards: CardDto[], bankerCards: CardDto[]): DealStep[] {
  const seq: DealStep[] = [];
  for (let i = 0; i < 2; i++) {
    seq.push({ zone: 'player', card: playerCards[i], slotIndex: i });
    seq.push({ zone: 'banker', card: bankerCards[i], slotIndex: i });
  }
  if (playerCards[2]) seq.push({ zone: 'player', card: playerCards[2], slotIndex: 2 });
  if (bankerCards[2]) seq.push({ zone: 'banker', card: bankerCards[2], slotIndex: 2 });
  return seq;
}

function globalIndex(seq: DealStep[], zone: 'player' | 'banker', slotIndex: number): number {
  return seq.findIndex((s) => s.zone === zone && s.slotIndex === slotIndex);
}

function ChipIcon({ value, small }: { value: number; small?: boolean }) {
  type ChipPalette = {
    edge: string;
    edgeDark: string;
    face: string;
    faceDark: string;
    stripe: string;
    text: string;
    accent: string;
  };
  const palette: ChipPalette =
    value >= 100
      ? {
          edge: '#27272a',
          edgeDark: '#09090b',
          face: '#3f3f46',
          faceDark: '#18181b',
          stripe: '#fafafa',
          text: '#fef3c7',
          accent: '#facc15',
        }
      : value >= 25
        ? {
            edge: '#065f46',
            edgeDark: '#022c22',
            face: '#10b981',
            faceDark: '#065f46',
            stripe: '#ecfeff',
            text: '#ffffff',
            accent: '#fef3c7',
          }
        : value >= 5
          ? {
              edge: '#7f1d1d',
              edgeDark: '#450a0a',
              face: '#dc2626',
              faceDark: '#991b1b',
              stripe: '#fff1f2',
              text: '#ffffff',
              accent: '#fef3c7',
            }
          : {
              edge: '#94a3b8',
              edgeDark: '#475569',
              face: '#f8fafc',
              faceDark: '#cbd5e1',
              stripe: '#1e293b',
              text: '#1e293b',
              accent: '#b45309',
            };
  const size = small ? 32 : 44;
  // Edge: 8 alternating stripes around the rim via conic-gradient
  const conic = `conic-gradient(
    ${palette.edge} 0deg 30deg, ${palette.stripe} 30deg 45deg,
    ${palette.edge} 45deg 75deg, ${palette.stripe} 75deg 90deg,
    ${palette.edge} 90deg 120deg, ${palette.stripe} 120deg 135deg,
    ${palette.edge} 135deg 165deg, ${palette.stripe} 165deg 180deg,
    ${palette.edge} 180deg 210deg, ${palette.stripe} 210deg 225deg,
    ${palette.edge} 225deg 255deg, ${palette.stripe} 255deg 270deg,
    ${palette.edge} 270deg 300deg, ${palette.stripe} 300deg 315deg,
    ${palette.edge} 315deg 345deg, ${palette.stripe} 345deg 360deg
  )`;
  return (
    <div
      className="relative shrink-0"
      style={{
        height: size,
        width: size,
        borderRadius: '9999px',
        background: conic,
        boxShadow:
          '0 4px 8px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.15) inset, 0 -2px 6px rgba(0,0,0,0.55) inset',
      }}
    >
      <div
        className="absolute flex items-center justify-center font-black"
        style={{
          inset: small ? 4 : 6,
          borderRadius: '9999px',
          background: `radial-gradient(circle at 30% 25%, ${palette.face} 0%, ${palette.faceDark} 100%)`,
          boxShadow:
            '0 0 0 1px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.06) inset, 0 2px 4px rgba(0,0,0,0.35) inset',
          color: palette.text,
          fontSize: small ? 10 : 13,
          letterSpacing: '0.02em',
        }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px dashed ${palette.accent}55`,
            margin: small ? 2 : 3,
            opacity: 0.7,
          }}
        />
        <span style={{ textShadow: '0 1px 1px rgba(0,0,0,0.4)' }}>{value}</span>
      </div>
    </div>
  );
}

/** Pilha de fichas físicas em uma zona de aposta. Mostra até 6 fichas reais,
 * fichas adicionais aparecem com badge "+N". A última recebe animação de toss. */
type PlacedChip = { id: number; value: number };

function ChipStack({
  chips,
  emphasize,
}: {
  chips: PlacedChip[];
  emphasize?: boolean;
}) {
  if (chips.length === 0) return null;
  const visible = chips.slice(-6);
  const overflow = chips.length - visible.length;
  return (
    <div
      className={cn(
        'relative h-10 w-10',
        emphasize && 'animate-baccarat-win-pulse rounded-full'
      )}
    >
      {visible.map((c, idx) => {
        const isTop = idx === visible.length - 1;
        return (
          <div
            key={c.id}
            className={cn('absolute left-0 right-0 flex justify-center', isTop && 'animate-baccarat-chip-place')}
            style={{ bottom: idx * 4 }}
          >
            <ChipIcon value={c.value} small />
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="absolute -right-1 -top-1 rounded-full px-1.5 py-px text-[9px] font-black"
          style={{
            background: 'linear-gradient(180deg,#fde68a,#b45309)',
            color: '#3f1d10',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}


export function BaccaratGame() {
  const { isAuthenticated, openLoginModal, user } = useAuth();
  const {
    gamePhase,
    countdown,
    roundData,
    liveBets,
    selectedChip,
    setSelectedChip,
    stacks,
    addChip,
    clearStacks,
    totalWagered,
    betPlaced,
    personalPayout,
    error,
  } = useBaccaratGame();

  const poolPlayer = useMemo(
    () => liveBets.reduce((s, x) => s + x.bets.player, 0),
    [liveBets]
  );
  const poolBanker = useMemo(
    () => liveBets.reduce((s, x) => s + x.bets.banker, 0),
    [liveBets]
  );
  const poolTie = useMemo(() => liveBets.reduce((s, x) => s + x.bets.tie, 0), [liveBets]);

  const [animPhase, setAnimPhase] = useState<'settled' | 'dealing' | 'flipping'>('settled');
  const [dealProgress, setDealProgress] = useState(0);
  const [flipProgress, setFlipProgress] = useState(0);

  const balance = typeof user?.balance === 'number' ? user.balance : 0;

  const seq = useMemo(
    () =>
      roundData
        ? buildDealSequence(roundData.playerCards, roundData.bankerCards)
        : [],
    [roundData]
  );

  useEffect(() => {
    if (roundData) {
      setDealProgress(0);
      setFlipProgress(0);
      setAnimPhase('dealing');
    }
  }, [roundData]);

  useEffect(() => {
    if (animPhase !== 'dealing' || !roundData || seq.length === 0) return;
    if (dealProgress >= seq.length) {
      setAnimPhase('flipping');
      setFlipProgress(0);
      return;
    }
    const t = window.setTimeout(() => setDealProgress((d) => d + 1), 320);
    return () => window.clearTimeout(t);
  }, [animPhase, dealProgress, roundData, seq.length]);

  useEffect(() => {
    if (animPhase !== 'flipping' || !roundData || seq.length === 0) return;
    if (flipProgress >= seq.length) {
      setAnimPhase('settled');
      return;
    }
    const t = window.setTimeout(() => setFlipProgress((f) => f + 1), 290);
    return () => window.clearTimeout(t);
  }, [animPhase, flipProgress, roundData, seq.length]);

  const bettingLocked = gamePhase !== 'BETTING' || betPlaced;

  const [placedChips, setPlacedChips] = useState<{
    player: PlacedChip[];
    banker: PlacedChip[];
    tie: PlacedChip[];
  }>({ player: [], banker: [], tie: [] });
  const chipIdRef = useRef(0);

  // Limpa pilhas visuais quando a rodada zera para BETTING e o usuário ainda não apostou
  useEffect(() => {
    if (gamePhase === 'BETTING' && !betPlaced) {
      setPlacedChips({ player: [], banker: [], tie: [] });
    }
  }, [gamePhase, betPlaced]);

  const tryAddChip = useCallback(
    (zone: 'player' | 'banker' | 'tie') => {
      if (!isAuthenticated) {
        openLoginModal();
        return;
      }
      addChip(zone);
      const id = ++chipIdRef.current;
      setPlacedChips((p) => ({ ...p, [zone]: [...p[zone], { id, value: selectedChip }] }));
    },
    [isAuthenticated, openLoginModal, addChip, selectedChip]
  );

  const clearAll = useCallback(() => {
    clearStacks();
    setPlacedChips({ player: [], banker: [], tie: [] });
  }, [clearStacks]);

  const showTotals =
    roundData &&
    animPhase === 'settled' &&
    seq.length > 0 &&
    flipProgress >= seq.length;

  const outcomeDone = showTotals ? roundData?.outcome : undefined;

  const showShufflingDeck =
    gamePhase === 'BETTING' ||
    (gamePhase === 'DEALING' &&
      roundData &&
      animPhase === 'dealing' &&
      dealProgress === 0);

  const deckStatusText =
    gamePhase === 'BETTING' ? 'Embaralhando…' : 'A distribuir…';

  const renderHand = (zone: 'player' | 'banker') => {
    if (!roundData) return null;
    const cards = zone === 'player' ? roundData.playerCards : roundData.bankerCards;
    return (
      <div className="flex min-h-[104px] flex-wrap justify-center gap-2">
        {cards.map((card, slotIndex) => {
          const g = globalIndex(seq, zone, slotIndex);
          if (g < 0) return null;
          const onTable = dealProgress > g;
          const faceUp = flipProgress > g;

          if (!onTable) {
            return <div key={`${zone}-${slotIndex}`} className={`${CARD_H} ${CARD_W}`} />;
          }

          return (
            <FlippableCard
              key={`${zone}-${slotIndex}-${card.rank}-${card.suit}`}
              card={card}
              faceUp={faceUp}
            />
          );
        })}
      </div>
    );
  };

  const displayPlayerStake = !betPlaced ? stacks.player : poolPlayer;
  const displayBankerStake = !betPlaced ? stacks.banker : poolBanker;
  const displayTieStake = !betPlaced ? stacks.tie : poolTie;

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-0 pb-4 text-white md:pb-6">

        {/* —— Mesa principal (imagem + HUD + apostas compactas na base) —— */}
        <div className="relative w-full select-none px-1 pt-2 md:px-3">
          <div
            className="relative flex min-h-[calc(100dvh-10.5rem)] w-full flex-col overflow-hidden rounded-xl shadow-2xl md:min-h-[calc(100dvh-7.75rem)]"
            style={{ backgroundColor: '#0c1a3d' }}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-top bg-no-repeat"
              style={{ backgroundImage: "url('/images/baccarat-table.png')" }}
            />
            {/* Holofote superior — luz quente de cassino */}
            <div
              className="pointer-events-none absolute inset-0 animate-baccarat-spotlight"
              style={{
                background:
                  'radial-gradient(55% 45% at 50% 18%, rgba(255,228,170,0.22) 0%, rgba(255,228,170,0.10) 35%, transparent 70%)',
                mixBlendMode: 'screen',
              }}
            />
            {/* Vinheta nas bordas + escurecimento inferior para legibilidade */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c1a3d]/45" />

            {/* Maço (z acima do feltro z-10, abaixo do painel z-30) — não pode ficar dentro do contentor das mãos (colapsa sem cartas) */}
            {showShufflingDeck && (
              <div
                className="pointer-events-none absolute inset-x-0 top-[clamp(11rem,28vh,13.5rem)] z-[21] flex justify-center px-3"
                aria-hidden
              >
                <ShufflingDeck statusText={deckStatusText} />
              </div>
            )}

            {/* Cartas sobre a imagem — espaço inferior reservado ao painel flutuante */}
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center px-2 pb-[11.5rem] pt-[16%] sm:px-4 sm:pb-[12rem] md:px-8 md:pb-[12.5rem] lg:px-14"
              aria-hidden={!roundData}
            >
              <div className="relative flex w-full max-w-5xl min-h-[min(120px,18vh)] items-end justify-between gap-1 sm:gap-4 md:gap-10">
                <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  {showTotals && roundData && (
                    <div className="rounded border border-white/35 bg-zinc-900/90 px-2 py-0.5 font-mono text-base font-black text-white shadow-lg backdrop-blur-sm md:text-lg">
                      {roundData.playerTotal}
                    </div>
                  )}
                  <div className="flex origin-bottom scale-[0.72] flex-wrap justify-center gap-1.5 sm:scale-90 sm:gap-2 md:scale-100 md:gap-2.5">
                    {renderHand('player')}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  {showTotals && roundData && (
                    <div className="rounded border border-red-300/45 bg-red-950/90 px-2 py-0.5 font-mono text-base font-black text-white shadow-lg backdrop-blur-sm md:text-lg">
                      {roundData.bankerTotal}
                    </div>
                  )}
                  <div className="flex origin-bottom scale-[0.72] flex-wrap justify-center gap-1.5 sm:scale-90 sm:gap-2 md:scale-100 md:gap-2.5">
                    {renderHand('banker')}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-20 flex shrink-0 flex-col items-center px-3 pb-2 pt-10 md:px-10 md:pb-3 md:pt-14">
              <div className="mb-2 flex items-center gap-3 md:mb-3">
                <span
                  aria-hidden
                  className="h-px w-10 md:w-16"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.7) 50%, transparent 100%)',
                  }}
                />
                <h2
                  className="font-serif text-2xl font-bold tracking-[0.4em] md:text-3xl"
                  style={{
                    background:
                      'linear-gradient(180deg, #fef3c7 0%, #fbbf24 45%, #b45309 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter:
                      'drop-shadow(0 1px 0 rgba(0,0,0,0.45)) drop-shadow(0 2px 8px rgba(251,191,36,0.25))',
                  }}
                >
                  BACCARAT
                </h2>
                <span
                  aria-hidden
                  className="h-px w-10 md:w-16"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.7) 50%, transparent 100%)',
                  }}
                />
              </div>

              {gamePhase === 'BETTING' && (
                <div className="mb-3 flex flex-col items-center gap-1 md:mb-4">
                  <div
                    className={cn(
                      'relative h-14 w-14',
                      countdown <= 3 && !betPlaced && 'animate-baccarat-urgent-pulse'
                    )}
                  >
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18" cy="18" r="15"
                        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3"
                      />
                      <circle
                        cx="18" cy="18" r="15"
                        fill="none"
                        stroke={countdown <= 3 ? '#f87171' : '#fbbf24'}
                        strokeWidth="3"
                        strokeDasharray={`${(countdown / 10) * 94.25} 94.25`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear"
                        style={{
                          filter: `drop-shadow(0 0 6px ${
                            countdown <= 3 ? 'rgba(248,113,113,0.7)' : 'rgba(251,191,36,0.6)'
                          })`,
                        }}
                      />
                    </svg>
                    <span
                      className={cn(
                        'absolute inset-0 flex items-center justify-center font-mono text-xl font-bold drop-shadow',
                        countdown <= 3 ? 'text-red-300' : 'text-amber-200'
                      )}
                    >
                      {countdown}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] uppercase tracking-widest',
                      countdown <= 3 && !betPlaced ? 'text-red-300/90' : 'text-amber-200/80'
                    )}
                  >
                    {betPlaced
                      ? 'Aposta confirmada'
                      : countdown <= 3
                        ? 'Apostas encerrando…'
                        : 'Apostas abertas'}
                  </span>
                </div>
              )}

              {gamePhase === 'DEALING' && !showTotals && (
                <div className="mb-3 md:mb-4">
                  <span className="animate-pulse text-sm uppercase tracking-widest text-amber-200/90">
                    Distribuindo...
                  </span>
                </div>
              )}
            </div>

            {/* Painel flutuante (acima do rodapé da mesa) — estilo Blaze */}
            <div
              className="absolute inset-x-0 bottom-[5.75rem] z-30 px-2 pb-3 sm:bottom-[6rem] md:bottom-[6.25rem] md:px-4 md:pb-4"
              aria-label="Painel de apostas"
            >
              <div className="mx-auto flex max-w-[1100px] items-end justify-center gap-2">
                {/* Centro (Jogador / Empate / Banca) */}
                <div
                  className="flex w-full max-w-[600px] items-stretch justify-between overflow-hidden rounded-full bg-black/40 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-md"
                  style={{
                    border: '1px solid rgba(251,191,36,0.35)',
                    boxShadow:
                      '0 10px 30px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 18px rgba(0,0,0,0.45)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => tryAddChip('player')}
                    disabled={bettingLocked}
                    className={cn(
                      'group relative flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-center transition active:scale-[0.97] sm:px-4',
                      !bettingLocked && 'hover:bg-blue-500/10',
                      bettingLocked && 'opacity-60',
                      outcomeDone === 'player' && 'animate-baccarat-win-pulse bg-amber-400/15'
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200">
                      Jogador
                    </span>
                    <span className="font-mono text-[12px] font-bold text-white">
                      R$ {displayPlayerStake.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-amber-200/70">
                      1 : 1
                    </span>
                    {placedChips.player.length > 0 && !betPlaced && (
                      <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2">
                        <ChipStack chips={placedChips.player} />
                      </div>
                    )}
                  </button>

                  <div
                    aria-hidden
                    className="my-1 w-px"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.4) 50%, transparent 100%)',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => tryAddChip('tie')}
                    disabled={bettingLocked}
                    className={cn(
                      'group relative flex w-[34%] min-w-[150px] flex-col items-center justify-center gap-0.5 bg-black/25 px-3 py-2.5 text-center transition active:scale-[0.97]',
                      !bettingLocked && 'hover:bg-emerald-500/10',
                      bettingLocked && 'opacity-60',
                      outcomeDone === 'tie' && 'animate-baccarat-win-pulse bg-amber-400/15'
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      Empate
                    </span>
                    <span className="font-mono text-[12px] font-bold text-white">
                      R$ {displayTieStake.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-amber-200/70">
                      8 : 1
                    </span>
                    {placedChips.tie.length > 0 && !betPlaced && (
                      <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2">
                        <ChipStack chips={placedChips.tie} />
                      </div>
                    )}
                  </button>

                  <div
                    aria-hidden
                    className="my-1 w-px"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.4) 50%, transparent 100%)',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => tryAddChip('banker')}
                    disabled={bettingLocked}
                    className={cn(
                      'group relative flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-center transition active:scale-[0.97] sm:px-4',
                      !bettingLocked && 'hover:bg-red-500/10',
                      bettingLocked && 'opacity-60',
                      outcomeDone === 'banker' && 'animate-baccarat-win-pulse bg-amber-400/15'
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200">
                      Banca
                    </span>
                    <span className="font-mono text-[12px] font-bold text-white">
                      R$ {displayBankerStake.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold tracking-wider text-amber-200/70">
                      0.95 : 1
                    </span>
                    {placedChips.banker.length > 0 && !betPlaced && (
                      <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2">
                        <ChipStack chips={placedChips.banker} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="mx-auto mt-1 max-w-2xl px-1 text-center md:mt-1.5">
                {roundData && showTotals ? (
                  <p className="text-[10px] font-bold leading-tight text-amber-100/90 md:text-xs">
                    {roundData.outcome === 'player'
                      ? 'Jogador'
                      : roundData.outcome === 'banker'
                        ? 'Banca'
                        : 'Empate'}
                    {personalPayout !== null && (
                      <>
                        {' · '}
                        <span className={personalPayout > 0 ? 'text-amber-200' : 'text-red-300'}>
                          {personalPayout > 0
                            ? `+R$ ${personalPayout.toFixed(2)}`
                            : 'Sem ganho'}
                        </span>
                      </>
                    )}
                  </p>
                ) : gamePhase === 'BETTING' && !betPlaced && totalWagered === 0 ? (
                  <p className="text-[8px] leading-tight text-white/45 md:text-[9px]">
                    Selecione fichas e toque em Jogador, Empate ou Banca
                  </p>
                ) : gamePhase === 'BETTING' && !betPlaced && totalWagered > 0 ? (
                  <p className="text-[8px] leading-tight text-amber-200/75 md:text-[9px]">
                    Confirmando aposta…
                  </p>
                ) : gamePhase === 'BETTING' && betPlaced ? (
                  <p className="text-[8px] leading-tight text-white/50 md:text-[9px]">Aguardando a rodada…</p>
                ) : null}
                {error && (
                  <p className="mt-0.5 text-[9px] font-semibold leading-tight text-red-400 md:text-[10px]">
                    {error}
                  </p>
                )}
              </div>
            </div>

            {/* Rodapé da mesa (SALDO / APOSTA / Fichas / Lobby) — dentro da imagem */}
            <div
              className="absolute inset-x-0 bottom-0 z-40 rounded-b-xl border-t border-black/25 px-2 py-2.5 backdrop-blur-md md:px-3 md:py-3"
              style={{
                background:
                  'linear-gradient(180deg, rgba(75,65,40,0.18) 0%, rgba(35,18,22,0.38) 45%, rgba(18,8,10,0.48) 100%)',
              }}
            >
              <div className="mx-auto flex max-w-[1600px] flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 shadow-inner backdrop-blur-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                      Saldo
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      R$ {balance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-black/35 px-4 py-2 shadow-inner backdrop-blur-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/60">
                      Aposta total
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-200">
                      R$ {totalWagered.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={bettingLocked || totalWagered <= 0}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase text-white/70 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
                  >
                    Limpar
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
                  {BACCARAT_CHIP_VALUES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedChip(v)}
                      disabled={bettingLocked}
                      className={cn(
                        'transition hover:scale-110 active:scale-95 disabled:opacity-50',
                        selectedChip === v &&
                          'rounded-full ring-2 ring-amber-400 ring-offset-2 ring-offset-[#1a0c10]'
                      )}
                    >
                      <ChipIcon value={v} />
                    </button>
                  ))}
                  <Link
                    to="/"
                    className="ml-1 flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-200/90 transition hover:bg-blue-900/50"
                  >
                    <Home className="h-4 w-4" />
                    Lobby
                  </Link>
                </div>
              </div>
              {totalWagered > balance && gamePhase === 'BETTING' && !betPlaced && (
                <p className="mt-2 text-center text-xs font-semibold text-red-400">
                  Saldo insuficiente para esta aposta.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
