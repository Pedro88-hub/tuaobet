import { useEffect, useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { verifyCrashRound, verifyDoubleRound, verifyMinesRound } from '../../lib/fairnessVerify';
import { cn } from '../../lib/utils';
import type { CrashFairnessCommit, CrashFairnessReveal } from '../../hooks/useCrashGame';
import type { DoubleFairnessCommit, DoubleFairnessReveal } from '../../hooks/useDoubleGame';
import type { MinesFairnessCommit, MinesFairnessReveal } from '../../hooks/useMinesGame';

function truncateHash(h: string, left = 10, right = 8) {
  if (h.length <= left + right + 3) return h;
  return `${h.slice(0, left)}…${h.slice(-right)}`;
}

export function ProvablyFairCrashStrip({
  commit,
  reveal,
}: {
  commit: CrashFairnessCommit | null;
  reveal: CrashFairnessReveal | null;
}) {
  const [autoVerify, setAutoVerify] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reveal?.serverSeed || !reveal.serverSeedHash) {
      setAutoVerify(null);
      return;
    }
    void verifyCrashRound(
      reveal.serverSeed,
      reveal.serverSeedHash,
      reveal.roundId,
      reveal.crashPoint
    ).then((r) => {
      setAutoVerify(r.ok ? 'Rodada verificada ✓' : 'Verificação falhou — contate o admin');
    });
  }, [reveal]);

  const copySeed = () => {
    if (!reveal?.serverSeed) return;
    void navigator.clipboard.writeText(reveal.serverSeed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-tuao-dark-700 bg-tuao-dark-950/80 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 text-tuao-text-secondary font-bold uppercase tracking-wide">
        <ShieldCheck size={14} className="text-tuao-primary" />
        Provably fair (commit–reveal)
      </div>
      {commit && (
        <p className="text-tuao-text-secondary font-mono break-all">
          <span className="text-white/60">Rodada #{commit.roundId} · hash do seed: </span>
          {truncateHash(commit.serverSeedHash)}
        </p>
      )}
      {reveal?.serverSeed && (
        <div className="space-y-1">
          <p className="text-green-400/90">{autoVerify}</p>
          <button
            type="button"
            onClick={copySeed}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded border border-tuao-dark-600',
              'text-tuao-text-secondary hover:text-white hover:border-tuao-primary/50 transition-colors'
            )}
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            Copiar server seed
          </button>
        </div>
      )}
    </div>
  );
}

export function ProvablyFairDoubleStrip({
  commit,
  reveal,
}: {
  commit: DoubleFairnessCommit | null;
  reveal: DoubleFairnessReveal | null;
}) {
  const [autoVerify, setAutoVerify] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reveal?.serverSeed || !reveal.serverSeedHash) {
      setAutoVerify(null);
      return;
    }
    void verifyDoubleRound(
      reveal.serverSeed,
      reveal.serverSeedHash,
      reveal.roundId,
      reveal.resultNumber,
      reveal.color
    ).then((r) => {
      setAutoVerify(r.ok ? 'Rodada verificada ✓' : 'Verificação falhou — contate o admin');
    });
  }, [reveal]);

  const copySeed = () => {
    if (!reveal?.serverSeed) return;
    void navigator.clipboard.writeText(reveal.serverSeed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-tuao-dark-700 bg-tuao-dark-950/80 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 text-tuao-text-secondary font-bold uppercase tracking-wide">
        <ShieldCheck size={14} className="text-tuao-primary" />
        Provably fair (commit–reveal)
      </div>
      {commit && (
        <p className="text-tuao-text-secondary font-mono break-all">
          <span className="text-white/60">Rodada #{commit.roundId} · hash do seed: </span>
          {truncateHash(commit.serverSeedHash)}
        </p>
      )}
      {reveal?.serverSeed && (
        <div className="space-y-1">
          <p className="text-green-400/90">{autoVerify}</p>
          <button
            type="button"
            onClick={copySeed}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded border border-tuao-dark-600',
              'text-tuao-text-secondary hover:text-white hover:border-tuao-primary/50 transition-colors'
            )}
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            Copiar server seed
          </button>
        </div>
      )}
    </div>
  );
}

export function ProvablyFairMinesStrip({
  commit,
  reveal,
}: {
  commit: MinesFairnessCommit | null;
  reveal: MinesFairnessReveal | null;
}) {
  const [autoVerify, setAutoVerify] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reveal?.serverSeed || !reveal.serverSeedHash) {
      setAutoVerify(null);
      return;
    }
    void verifyMinesRound(
      reveal.serverSeed,
      reveal.serverSeedHash,
      reveal.gameId,
      reveal.minesCount,
      reveal.minePositions
    ).then((r) => {
      setAutoVerify(r.ok ? 'Rodada verificada ✓' : 'Verificação falhou — contate o admin');
    });
  }, [reveal]);

  const copySeed = () => {
    if (!reveal?.serverSeed) return;
    void navigator.clipboard.writeText(reveal.serverSeed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-tuao-dark-700 bg-tuao-dark-950/80 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2 text-tuao-text-secondary font-bold uppercase tracking-wide">
        <ShieldCheck size={14} className="text-tuao-primary" />
        Provably fair (commit–reveal)
      </div>
      {commit && (
        <p className="text-tuao-text-secondary font-mono break-all">
          <span className="text-white/60">
            Jogo · {commit.minesCount} minas · hash do seed:{' '}
          </span>
          {truncateHash(commit.serverSeedHash)}
        </p>
      )}
      {reveal?.serverSeed && (
        <div className="space-y-1">
          <p className="text-green-400/90">{autoVerify}</p>
          <button
            type="button"
            onClick={copySeed}
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded border border-tuao-dark-600',
              'text-tuao-text-secondary hover:text-white hover:border-tuao-primary/50 transition-colors'
            )}
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            Copiar server seed
          </button>
        </div>
      )}
    </div>
  );
}
