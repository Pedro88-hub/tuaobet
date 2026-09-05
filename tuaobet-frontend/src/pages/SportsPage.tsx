import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { BetSlip } from '../components/betting/BetSlip';
import { SportBetModal, type Selection } from '../components/sports/SportBetModal';
import {
  SportsCupomFab,
} from '../components/sports/SportsCupomFab';
import {
  SportsHeroCarousel,
  SportsIconBar,
  SportsPopularChips,
  SportsSubNavTabs,
} from '../components/sports/SportsHubHeader';
import { SportsMatchesByPhase } from '../components/sports/SportsMatchesByPhase';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import {
  fetch1x2Odds,
  fetchCachedFixturesForRange,
  localDateInputValue,
  sportsWindowEnd,
  syncSportsFixturesForRange,
  type CachedMatchRow,
  type Odds1x2,
} from '../services/sportsApi';
import { cn } from '../lib/utils';
import { RefreshCw, Calendar } from 'lucide-react';

function formatSyncHint(synced: number, settledBets: number): string {
  if (synced === 0) {
    return 'Nenhum jogo neste período (API / plano gratuito).';
  }
  const parts = [`Sincronizados ${synced} jogos`];
  if (settledBets > 0) parts.push(`${settledBets} apostas liquidadas`);
  return parts.join(' · ') + '.';
}

function useFilteredMatches(matches: CachedMatchRow[], search: string) {
  return useMemo(() => {
    const params = new URLSearchParams(search);
    let list = matches;

    const competitionId = params.get('competition')?.trim();
    if (competitionId) {
      list = list.filter((m) => (m.competition?.code ?? '') === competitionId);
    }

    const league = params.get('league')?.trim();
    if (league) {
      const q = league.toLowerCase();
      list = list.filter(
        (m) =>
          (m.competition?.name ?? '').toLowerCase().includes(q) ||
          (m.competition?.code ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [matches, search]);
}

export function SportsPage() {
  const { isAuthenticated, openLoginModal, setUserBalance } = useAuth();
  const [searchParams] = useSearchParams();
  const viewLiveQuery = searchParams.get('view') === 'live';
  const location = useLocation();

  const [date, setDate] = useState(() => localDateInputValue());
  const [matches, setMatches] = useState<CachedMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [odds1x2, setOdds1x2] = useState<Odds1x2 | null>(null);
  const [betFixture, setBetFixture] = useState<CachedMatchRow | null>(null);
  const [betSelection, setBetSelection] = useState<Selection | null>(null);
  const [sportTab, setSportTab] = useState<'highlights' | 'creator'>('highlights');
  const [quickBet, setQuickBet] = useState(false);
  const cupomRef = useRef<HTMLDivElement>(null);

  const filteredMatches = useFilteredMatches(matches, searchParams.toString());

  useEffect(() => {
    void fetch1x2Odds()
      .then(setOdds1x2)
      .catch(() => setOdds1x2(null));
  }, []);

  const loadDay = useCallback(
    async (opts: { forceSync: boolean }) => {
      setError(null);
      if (opts.forceSync) setRefreshing(true);
      else setLoading(true);

      const from = date;
      const to = sportsWindowEnd(date);

      try {
        if (opts.forceSync) {
          const s = await syncSportsFixturesForRange(from, to);
          setSyncHint(formatSyncHint(s.synced, s.settledBets));
          const refreshed = await fetchCachedFixturesForRange(from, to);
          setMatches(refreshed.matches);
          return;
        }

        let data = await fetchCachedFixturesForRange(from, to);
        if (data.count === 0) {
          const s = await syncSportsFixturesForRange(from, to);
          setSyncHint(formatSyncHint(s.synced, s.settledBets));
          data = await fetchCachedFixturesForRange(from, to);
        } else {
          setSyncHint(null);
        }
        setMatches(data.matches);
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Falha ao carregar jogos.';
        setError(msg);
        setMatches([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date]
  );

  const periodEndLabel = sportsWindowEnd(date);

  useEffect(() => {
    void loadDay({ forceSync: false });
  }, [loadDay]);

  useEffect(() => {
    if (loading || sportTab !== 'highlights') return;
    const hash = location.hash;
    const wantsLive = hash === '#sports-ao-vivo' || viewLiveQuery;
    if (!wantsLive) return;
    const el = document.getElementById('sports-ao-vivo');
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [loading, location.hash, viewLiveQuery, sportTab, filteredMatches.length]);

  const odds = odds1x2 ?? { home: 1.95, draw: 3.4, away: 1.95 };

  const openBet = (m: CachedMatchRow, selection: Selection | null) => {
    setBetFixture(m);
    setBetSelection(selection);
  };

  const closeBet = () => {
    setBetFixture(null);
    setBetSelection(null);
  };

  const scrollToCupom = () => {
    cupomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout>
      <div className="relative mx-auto w-full max-w-[1280px] pb-24 pt-2 md:pt-4">
        <SportsCupomFab
          quickBet={quickBet}
          onQuickBetChange={setQuickBet}
          onOpenCupom={scrollToCupom}
        />

        <div className="flex flex-col gap-5">
          <SportsIconBar />

          <SportsSubNavTabs
            active={sportTab}
            onChange={(t) => {
              setSportTab(t);
            }}
          />

          <SportsHeroCarousel />

          <div className="flex flex-col gap-4 border-b border-tuao-dark-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <SportsPopularChips />
              <p className="mt-4 max-w-xl text-sm text-tuao-text-secondary">
                Foco em <strong className="font-semibold text-white">Série A, Série B e Copa do Brasil</strong>.
                Calendário e horários em <strong className="font-semibold text-white">horário de Brasília</strong>.
                Janela de <strong className="font-semibold text-white">7 dias</strong> a partir da data (ao vivo,
                próximos e até 4 terminados por competição). Dados: API-Football. 1X2 só em pré-jogo.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-col gap-1 rounded-xl border border-tuao-dark-700 bg-tuao-dark-900 px-3 py-2 sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-tuao-text-secondary">
                    Início
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar size={16} className="text-tuao-text-secondary" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-sm font-semibold text-white outline-none"
                    />
                  </span>
                </label>
              <button
                type="button"
                disabled={refreshing || loading}
                onClick={() => void loadDay({ forceSync: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-tuao-dark-600 bg-tuao-dark-800 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition-colors hover:border-tuao-primary/40 hover:bg-tuao-dark-700 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Atualizar
              </button>
              </div>
              <p className="text-[11px] text-tuao-text-secondary sm:text-right">
                Até <span className="font-semibold text-white">{periodEndLabel}</span> · calendário{' '}
                <span className="font-semibold text-white">Brasília</span> · 1 pedido à API ao sincronizar
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {error}
            {(error.includes('APISPORTS_FOOTBALL_KEY') ||
              error.includes('api-football.com')) && (
              <p className="mt-2 text-xs text-red-200/80">
                Cria uma chave gratuita em{' '}
                <a
                  href="https://dashboard.api-football.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold underline"
                >
                  dashboard.api-football.com
                </a>{' '}
                e define <code className="rounded bg-black/30 px-1">APISPORTS_FOOTBALL_KEY</code> no
                backend (ou no <code className="rounded bg-black/30 px-1">docker-compose.yml</code>).
              </p>
            )}
          </div>
        )}

        {syncHint && !error && (
          <p className="mt-4 text-xs text-tuao-text-secondary">{syncHint}</p>
        )}

        <div className="mt-8">
          {sportTab === 'creator' ? (
            <div
              className={cn(
                'rounded-xl border border-tuao-dark-800 bg-tuao-dark-900/40 px-6 py-16 text-center',
                'text-tuao-text-secondary'
              )}
            >
              <p className="text-sm font-semibold text-white">Criador de eventos</p>
              <p className="mt-2 text-sm">
                Em breve poderás montar combinações personalizadas. Por agora, usa os destaques com mercado
                1X2.
              </p>
            </div>
          ) : loading ? (
            <p className="py-16 text-center text-sm text-tuao-text-secondary">A carregar…</p>
          ) : filteredMatches.length === 0 ? (
            <p className="rounded-xl border border-tuao-dark-800 bg-tuao-dark-900/30 px-4 py-12 text-center text-sm text-tuao-text-secondary">
              {matches.length === 0
                ? 'Sem jogos nesta janela na base. Escolhe outra data inicial ou toca em Atualizar (chave API-Football configurada).'
                : 'Nenhum jogo corresponde a este filtro. Experimenta outra liga.'}
            </p>
          ) : (
            <SportsMatchesByPhase
              matches={filteredMatches}
              odds={odds}
              isAuthenticated={isAuthenticated}
              onOpenBet={openBet}
              onOpenLogin={openLoginModal}
            />
          )}
        </div>

        <div ref={cupomRef} id="sports-cupom" className="mt-12 scroll-mt-24">
          <BetSlip />
        </div>

        <p className="mt-8 text-center text-[11px] text-tuao-text-secondary">
          Dados de jogos:{' '}
          <a
            href="https://www.api-football.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-tuao-primary underline-offset-2 hover:underline"
          >
            API-Football
          </a>{' '}
          (api-sports.io).
        </p>

        <SportBetModal
          isOpen={!!betFixture}
          onClose={closeBet}
          fixture={betFixture}
          odds={odds1x2}
          preferredSelection={betSelection}
          onSuccess={(balance) => setUserBalance(balance)}
        />
      </div>
    </Layout>
  );
}
