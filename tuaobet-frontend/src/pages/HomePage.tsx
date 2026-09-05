import React from 'react';
import { Layout } from '../components/layout/Layout';
import { HomeHero } from '../components/home/HomeHero';
import { OriginalGamesGrid } from '../components/home/OriginalGamesGrid';
import { HomeTrustStrip } from '../components/home/HomeTrustStrip';
import { LiveBetting } from '../components/home/LiveBetting';
import { FeaturedMatches } from '../components/home/FeaturedMatches';

const HomePage: React.FC = () => {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-[1200px]">
        <HomeHero />
        <OriginalGamesGrid />
        <HomeTrustStrip />
        <LiveBetting />
        <FeaturedMatches />
      </div>
    </Layout>
  );
};

export { HomePage };