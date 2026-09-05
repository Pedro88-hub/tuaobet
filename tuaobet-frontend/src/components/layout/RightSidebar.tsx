import React from 'react';
import { BetSlip } from '../betting/BetSlip';
import { TopBettors } from '../social/TopBettors';

const RightSidebar: React.FC = () => {
  return (
    <aside className="w-80 bg-tuao-dark-900 border-l border-tuao-dark-700 overflow-y-auto hidden lg:block fixed right-0 top-16 bottom-0 z-30 p-4 space-y-4">
      <BetSlip />
      <TopBettors />
    </aside>
  );
};

export { RightSidebar };