import React from 'react';
import { Layout } from '../components/layout/Layout';
import { HomeHero } from '../components/home/HomeHero';
import { HomeCasinoPromo } from '../components/home/HomeCasinoPromo';
import { OriginalGamesGrid } from '../components/home/OriginalGamesGrid';
import { HomeSportsPromo } from '../components/home/HomeSportsPromo';
import { HomePaymentStrip } from '../components/home/HomePaymentStrip';
import { BigWinsFeed } from '../components/home/BigWinsFeed';

const HomePage: React.FC = () => {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-[1200px]">
        <HomeHero />
        <HomeCasinoPromo />
        <OriginalGamesGrid />
        <HomeSportsPromo />
        <HomePaymentStrip />
        <BigWinsFeed />
      </div>
    </Layout>
  );
};

export { HomePage };
