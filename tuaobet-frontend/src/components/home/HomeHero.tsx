import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Gamepad2, Gift, UserPlus, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { fetchPublicBanners } from '../../services/publicSite';

const HERO_FALLBACK = '/images/hero-ambassadors.png';
const HERO_KEY = 'hero-home';

const steps = [
  { icon: UserPlus, label: 'Cadastre-se' },
  { icon: Wallet, label: 'Deposite' },
  { icon: Gamepad2, label: 'Jogue' },
  { icon: Gift, label: 'Desbloqueie a tua recompensa' },
] as const;

export const HomeHero: React.FC = () => {
  const { isAuthenticated, openRegisterModal } = useAuth();
  const [heroSrc, setHeroSrc] = useState(HERO_FALLBACK);

  useEffect(() => {
    void fetchPublicBanners()
      .then((b) => {
        const url = b[HERO_KEY];
        if (url?.trim()) setHeroSrc(url.trim());
        else setHeroSrc(HERO_FALLBACK);
      })
      .catch(() => setHeroSrc(HERO_FALLBACK));
  }, []);

  return (
    <section className="relative mb-10 overflow-hidden rounded-xl border border-tuao-dark-700/90 bg-[#12171c] shadow-card">
      {/* Fundo tipo Blaze: escuro, discreto */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_100%,rgba(0,240,255,0.06),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#12171c_0%,#12171c_42%,transparent_72%)] max-md:bg-none" aria-hidden />

      <div className="relative flex min-h-[280px] flex-col md:min-h-[360px] lg:min-h-[400px]">
        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pb-4 pt-8 md:max-w-[52%] md:px-10 md:py-10 lg:px-12">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            Bem-vindo à Tuão Bet!
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-tuao-text-secondary md:text-base">
            Cadastra-te e desbloqueia a tua experiência exclusiva — jogos originais, esportes e levantamentos rápidos.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/crash"
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-tuao-primary px-8 text-xs font-bold uppercase tracking-wide text-tuao-dark-950',
                  'shadow-neon transition hover:bg-tuao-primary-hover hover:brightness-110 md:h-12 md:px-9 md:text-sm'
                )}
              >
                Jogar agora
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={openRegisterModal}
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-tuao-primary px-8 text-xs font-bold uppercase tracking-wide text-tuao-dark-950',
                  'shadow-neon transition hover:bg-tuao-primary-hover hover:brightness-110 md:h-12 md:px-9 md:text-sm'
                )}
              >
                Cadastre-se
                <ArrowRight size={18} />
              </button>
            )}
            <Link
              to="/sports"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-tuao-dark-600 bg-tuao-dark-800/60 px-5 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-tuao-primary/35 hover:bg-tuao-dark-800 md:h-12 md:px-6 md:text-sm"
            >
              Esportes
            </Link>
          </div>
        </div>

        {/* Modelos — PNG com alpha; evitar JPEG renomeado (.png sem canal alfa = fundo opaco preto) */}
        <div className="relative flex flex-1 items-end justify-center md:absolute md:inset-y-0 md:right-0 md:w-[55%] md:justify-end md:pt-0">
          <div className="pointer-events-none absolute inset-0 bg-[#12171c]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/4 bg-[radial-gradient(ellipse_70%_80%_at_70%_90%,rgba(45,55,68,0.55),transparent_65%)] md:top-0" />
          <img
            src={heroSrc}
            alt="Embaixadores Tuão Bet"
            className="relative z-[1] h-auto max-h-[220px] w-auto max-w-[min(100%,520px)] object-contain object-bottom drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:max-h-[260px] md:absolute md:bottom-0 md:right-0 md:left-auto md:max-h-[min(105%,440px)] md:max-w-none md:translate-x-[6%] lg:max-h-[min(108%,500px)] lg:translate-x-[4%]"
            width={900}
            height={600}
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* Barra de passos (rodapé do banner), inspirada na Blaze */}
      <div className="relative z-10 border-t border-tuao-dark-700/80 bg-tuao-dark-950/70 px-4 py-3.5 md:px-10">
        <ul className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[11px] font-semibold uppercase tracking-wide text-tuao-text-secondary md:justify-between md:gap-x-1 md:text-xs">
          {steps.map(({ icon: Icon, label }, i) => (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && (
                <ChevronRight
                  className="hidden h-4 w-4 shrink-0 text-tuao-dark-600 md:inline"
                  aria-hidden
                />
              )}
              <span className="inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-white/90">
                <Icon className="h-4 w-4 shrink-0 text-tuao-primary" strokeWidth={2} />
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
