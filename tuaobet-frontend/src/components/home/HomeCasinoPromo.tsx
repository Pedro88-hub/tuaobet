import React from 'react';
import { Link } from 'react-router-dom';
import casinoArt from '../../assets/promo-casino.png';
import sportsArt from '../../assets/promo-sports.png';

const cardBase =
  'flex flex-1 items-center justify-between rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 px-5 py-3 transition-all duration-200 md:px-6 md:py-4 hover:z-10 hover:scale-[1.03]';

const artSlot =
  'flex h-24 w-24 shrink-0 items-center justify-center overflow-visible md:h-28 md:w-28';

export const HomeCasinoPromo: React.FC = () => {
  return (
    <section className="mb-8">
      <div className="flex flex-col gap-3 sm:flex-row md:gap-4">
        <a
          href="#jogos-originais"
          className={`${cardBase} hover:border-tuao-primary hover:shadow-[0_0_20px_rgba(0,240,255,0.35)]`}
        >
          <span className="text-lg font-bold text-white md:text-xl">Cassino</span>
          <span className={artSlot}>
            <img
              src={casinoArt}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          </span>
        </a>

        <Link
          to="/sports"
          className={`${cardBase} hover:border-blaze-green hover:shadow-[0_0_20px_rgba(0,230,118,0.35)]`}
        >
          <span className="text-lg font-bold text-white md:text-xl">Esportes</span>
          <span className={artSlot}>
            <img
              src={sportsArt}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          </span>
        </Link>
      </div>
    </section>
  );
};
