import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Coins, Lock, Spade, Star, Trophy, UserRound } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { vipProgressFromXp } from '../../lib/xpDisplay';
import { fetchPublicBanners } from '../../services/publicSite';

const HERO_FALLBACK = '/images/hero-neymar.jpg';
const HERO_KEY = 'hero-home';
const VIP_SEGMENTS = 5;

const formatXp = (n: number) => n.toLocaleString('pt-BR');

const GUEST_STEPS = [
  { label: 'Cadastre-se', Icon: UserRound },
  { label: 'Deposite', Icon: Coins },
  { label: 'Jogue', Icon: Spade },
] as const;

export const HomeHero: React.FC = () => {
  const { isAuthenticated, user, openRegisterModal, refreshUser } = useAuth();
  const [heroSrc, setHeroSrc] = useState(HERO_FALLBACK);

  const vip = isAuthenticated ? vipProgressFromXp(user?.xp ?? 0) : null;

  useEffect(() => {
    void fetchPublicBanners()
      .then((b) => {
        const url = b[HERO_KEY];
        if (url?.trim()) setHeroSrc(url.trim());
        else setHeroSrc(HERO_FALLBACK);
      })
      .catch(() => setHeroSrc(HERO_FALLBACK));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshUser();
  }, [isAuthenticated, refreshUser]);

  const title = isAuthenticated && user?.username
    ? `Bem-vindo à Tuão Bet, ${user.username}!`
    : 'Bem-vindo à Tuão Bet!';

  const ctaClass = cn(
    'inline-flex h-11 items-center justify-center rounded-lg bg-tuao-primary px-8 text-sm font-bold text-tuao-dark-950',
    'shadow-panel transition hover:bg-tuao-primary-hover md:h-12 md:px-10'
  );

  return (
    <section className="relative mb-10 overflow-hidden rounded-xl border border-tuao-dark-700/90 bg-[#12171c] shadow-panel">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_100%,rgba(241,44,76,0.06),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#12171c_0%,#12171c_42%,transparent_72%)] max-md:bg-none"
        aria-hidden
      />

      <div className="relative flex min-h-[280px] flex-col md:min-h-[360px] lg:min-h-[400px]">
        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-6 pt-8 md:max-w-[52%] md:px-10 md:py-10 lg:px-12">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {title}
          </h1>

          {isAuthenticated && vip ? (
            <div className="mt-8 max-w-md">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2.25} aria-hidden />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                    Seu progresso VIP
                  </span>
                </div>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-tuao-text-secondary">
                  {formatXp(vip.currentXp)} / {formatXp(vip.nextXp)} XP
                </span>
              </div>

              <div
                className="flex gap-1.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={vip.nextXp}
                aria-valuenow={vip.currentXp}
              >
                {Array.from({ length: VIP_SEGMENTS }, (_, i) => {
                  let fill = 0;
                  if (i < vip.filledSegments) fill = 1;
                  else if (i === vip.filledSegments) fill = vip.segmentFill;

                  return (
                    <div
                      key={i}
                      className="h-2.5 flex-1 overflow-hidden rounded-full bg-tuao-dark-800"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-[width] duration-300"
                        style={{ width: `${fill * 100}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-tuao-text-secondary">
                <span>{vip.currentTier}</span>
                {vip.nextTier ? (
                  <span className="inline-flex items-center gap-1">
                    {vip.nextTier}
                    <Lock className="h-3 w-3 shrink-0 text-white/70" strokeWidth={2.5} aria-hidden />
                  </span>
                ) : (
                  <span>Máximo</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 max-w-lg space-y-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-medium text-white md:text-[15px]">
                {GUEST_STEPS.map(({ label, Icon }, index) => (
                  <React.Fragment key={label}>
                    {index > 0 && (
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-tuao-primary"
                        strokeWidth={2.75}
                        aria-hidden
                      />
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-4 w-4 shrink-0 text-tuao-text-secondary" strokeWidth={2} aria-hidden />
                      {label}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              <p className="flex items-center gap-2 text-sm font-medium text-white md:text-[15px]">
                <ChevronRight className="h-4 w-4 shrink-0 text-tuao-primary" strokeWidth={2.75} aria-hidden />
                <span
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tuao-dark-700"
                  aria-hidden
                >
                  <Star className="h-3 w-3 text-white" strokeWidth={2.25} fill="currentColor" />
                </span>
                Desbloqueie sua recompensa
              </p>
            </div>
          )}

          <div className="mt-8">
            {isAuthenticated ? (
              <Link to="/crash" className={ctaClass}>
                Jogue agora
              </Link>
            ) : (
              <button type="button" onClick={openRegisterModal} className={ctaClass}>
                Cadastre-se
              </button>
            )}
          </div>
        </div>

        <div className="relative flex flex-1 items-end justify-center overflow-hidden md:absolute md:inset-y-0 md:right-0 md:w-[58%] md:justify-end md:pt-0">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-1/4 z-[2] bg-[radial-gradient(ellipse_70%_80%_at_75%_90%,rgba(0,180,220,0.1),transparent_65%)] md:top-0"
            aria-hidden
          />
          <img
            src={heroSrc}
            alt="Tuão Bet"
            className="relative z-[1] h-auto max-h-[240px] w-auto max-w-[min(100%,560px)] object-contain object-bottom sm:max-h-[280px] md:absolute md:inset-y-0 md:-right-[12%] md:left-auto md:h-full md:max-h-none md:max-w-none md:w-auto md:min-w-[124%] md:translate-x-[8%] md:object-cover md:object-[52%_center] lg:-right-[16%] lg:min-w-[130%] lg:translate-x-[12%] lg:object-[48%_center] [mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.35)_18%,black_38%,black_100%),linear-gradient(180deg,transparent_0%,black_22%,black_82%,transparent_100%)] [-webkit-mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.35)_18%,black_38%,black_100%),linear-gradient(180deg,transparent_0%,black_22%,black_82%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-composite:source-in]"
            width={900}
            height={600}
            decoding="async"
            fetchPriority="high"
          />
          {/* Veladuras do fundo sobre a foto — esfuma bordas e integra ao painel */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-[52%] bg-gradient-to-r from-[#12171c] from-10% via-[#12171c]/80 via-45% to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-[32%] bg-gradient-to-b from-[#12171c] via-[#12171c]/55 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[20%] bg-gradient-to-t from-[#12171c] via-[#12171c]/45 to-transparent md:h-[14%]"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
};
