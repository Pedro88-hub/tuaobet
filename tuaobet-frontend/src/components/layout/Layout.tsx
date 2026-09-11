import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { GlobalAnnouncementBar } from './GlobalAnnouncementBar';
import { SiteFooter } from './SiteFooter';
import { SessionStatsBar } from './SessionStatsBar';
import { LoginModal } from '../auth/LoginModal';
import { RegisterModal } from '../auth/RegisterModal';
import { CoinBurstOverlay } from '../games/CoinBurstOverlay';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Estado para controlar a Sidebar (Desktop: retraída/expandida, Mobile: aberta/fechada)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    // No mobile, alterna a visibilidade. No desktop, alterna a largura.
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarExpanded(!isSidebarExpanded);
    }
  };

  return (
    <div className="h-screen bg-tuao-dark-950 flex flex-col overflow-hidden text-sm font-sans text-tuao-text-primary">
      {/* Navbar Fixa no Topo */}
      <Navbar toggleSidebar={toggleSidebar} />
      <CoinBurstOverlay />

      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Sidebar Esquerda */}
        <Sidebar 
          isExpanded={isSidebarExpanded} 
          isMobileOpen={isMobileSidebarOpen}
          closeMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Overlay para Mobile */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Conteúdo Principal com Scroll */}
        <main className={cn(
          "min-w-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300"
          // Removida a margem direita (lg:mr-80) pois não há mais sidebar direita
        )}>
          <GlobalAnnouncementBar />
          <div className="mx-auto min-h-full min-w-0 max-w-[1400px] p-4 pb-24 md:p-6 lg:pb-6">
            {children}
          </div>

          <SessionStatsBar />
          <SiteFooter />
        </main>
      </div>

      <MobileBottomNav onOpenMenu={() => setIsMobileSidebarOpen(true)} />

      <LoginModal />
      <RegisterModal />
    </div>
  );
};

export { Layout };