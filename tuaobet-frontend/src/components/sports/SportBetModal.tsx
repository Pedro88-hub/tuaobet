import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ApiError } from '../../services/api';
import { placeSportBet1x2, type CachedMatchRow, type Odds1x2 } from '../../services/sportsApi';
import { cn } from '../../lib/utils';
import { isStakeValid, MIN_BET, stakeHint } from '../../lib/betLimits';
import { useAuth } from '../../context/AuthContext';
import { teamInitials } from './sportsFormatters';

function CompetitionEmblemBadge({
  emblemUrl,
  label,
}: {
  emblemUrl?: string | null;
  label: string;
}) {
  const initials = teamInitials(label);
  const [showImg, setShowImg] = useState(Boolean(emblemUrl?.trim()));

  useEffect(() => {
    setShowImg(Boolean(emblemUrl?.trim()));
  }, [emblemUrl]);

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-tuao-dark-700 bg-tuao-dark-950">
      {showImg && emblemUrl ? (
        <img
          src={emblemUrl}
          alt=""
          className="h-full w-full object-contain p-0.5"
          loading="lazy"
          onError={() => setShowImg(false)}
        />
      ) : (
        <span className="text-[8px] font-black text-tuao-text-secondary">{initials}</span>
      )}
    </div>
  );
}

function CrestBadge({ crestUrl, name }: { crestUrl?: string | null; name: string }) {
  const initials = teamInitials(name);
  const [showImg, setShowImg] = useState(Boolean(crestUrl?.trim()));

  useEffect(() => {
    setShowImg(Boolean(crestUrl?.trim()));
  }, [crestUrl]);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-tuao-dark-700 bg-tuao-dark-950">
      {showImg && crestUrl ? (
        <img
          src={crestUrl}
          alt=""
          className="h-full w-full object-contain p-0.5"
          loading="lazy"
          onError={() => setShowImg(false)}
        />
      ) : (
        <span className="px-0.5 text-center text-[9px] font-black leading-tight text-tuao-text-secondary">
          {initials}
        </span>
      )}
    </div>
  );
}

export type Selection = 'HOME' | 'DRAW' | 'AWAY';

interface SportBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixture: CachedMatchRow | null;
  odds: Odds1x2 | null;
  onSuccess: (balance: number) => void;
  /** Destaque visual ao abrir a partir de uma odd no card */
  preferredSelection?: Selection | null;
}

export function SportBetModal({
  isOpen,
  onClose,
  fixture,
  odds,
  onSuccess,
  preferredSelection = null,
}: SportBetModalProps) {
  const { user } = useAuth();
  const balance = typeof user?.balance === 'number' ? user.balance : 0;
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = Number(amount.replace(',', '.'));
  const amountValid = isStakeValid(amountValue, balance);
  const amountHintMsg = stakeHint(amountValue, balance);

  const handlePlace = async (selection: Selection) => {
    if (!fixture || !odds) return;
    const n = Number(amount.replace(',', '.'));
    if (!isStakeValid(n, balance)) {
      setError(
        amountHintMsg ??
          (!Number.isFinite(n) || n <= 0
            ? `Valor mínimo R$ ${MIN_BET.toFixed(2)}`
            : n < MIN_BET
              ? `Valor mínimo R$ ${MIN_BET.toFixed(2)}`
              : 'Saldo insuficiente')
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await placeSportBet1x2(fixture.id, selection, n);
      onSuccess(res.balance);
      onClose();
      setAmount('');
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Erro ao apostar'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!fixture) return null;

  const o = odds ?? { home: 1.95, draw: 3.4, away: 1.95 };
  const compLabel =
    fixture.competition.name ?? fixture.competition.code ?? 'Competição';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Aposta 1X2"
      subtitle={`${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`}
      headerIcon={<Trophy size={22} strokeWidth={2} />}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2.5">
          <CompetitionEmblemBadge
            emblemUrl={fixture.competition.emblemUrl}
            label={compLabel}
          />
          <span className="max-w-[240px] truncate text-center text-[11px] font-semibold text-tuao-text-secondary">
            {compLabel}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <CrestBadge crestUrl={fixture.homeTeam.crestUrl} name={fixture.homeTeam.name} />
          <span className="text-xs font-semibold text-tuao-text-secondary">vs</span>
          <CrestBadge crestUrl={fixture.awayTeam.crestUrl} name={fixture.awayTeam.name} />
        </div>

        <label className="block text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
          Valor (R$)
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '' || raw.endsWith('.') || raw.endsWith(',')) {
                setAmount(raw);
                return;
              }
              const n = Number.parseFloat(raw.replace(',', '.'));
              if (!Number.isFinite(n)) {
                setAmount(raw);
                return;
              }
              if (n > balance) {
                setAmount(balance > 0 ? balance.toFixed(2) : '');
                return;
              }
              setAmount(raw);
            }}
            disabled={loading}
            className="mt-1.5 w-full rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-tuao-primary/50"
          />
        </label>

        {amountHintMsg && !error && (
          <p className="text-[11px] text-amber-400/90">{amountHintMsg}</p>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: 'HOME' as const, label: '1', sub: fixture.homeTeam.name, price: o.home },
              { key: 'DRAW' as const, label: 'X', sub: 'Empate', price: o.draw },
              { key: 'AWAY' as const, label: '2', sub: fixture.awayTeam.name, price: o.away },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              disabled={loading || !amountValid}
              onClick={() => void handlePlace(btn.key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 py-3 transition-colors',
                'hover:border-tuao-primary/40 hover:bg-tuao-dark-800 disabled:opacity-50',
                preferredSelection === btn.key &&
                  'border-tuao-primary/50 bg-tuao-primary/10 ring-2 ring-tuao-primary/35'
              )}
            >
              <span className="text-lg font-black text-white">{btn.label}</span>
              <span className="line-clamp-2 min-h-[2rem] px-1 text-center text-[10px] text-tuao-text-secondary">
                {btn.sub}
              </span>
              <span className="text-sm font-black text-tuao-primary">{btn.price.toFixed(2)}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-tuao-text-secondary">
          Só pré-jogo. Pagamento após o jogo ficar terminado na API e sincronizar.
        </p>
      </div>
    </Modal>
  );
}
