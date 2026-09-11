import React from 'react';
import { useAuth } from '../../context/AuthContext';
import pixLogo from '../../assets/pix-logo.png';

export const OPEN_WALLET_EVENT = 'tuao:open-wallet';

export const HomePaymentStrip: React.FC = () => {
  const { isAuthenticated, openRegisterModal } = useAuth();

  const onDeposit = () => {
    if (!isAuthenticated) {
      openRegisterModal();
      return;
    }
    window.dispatchEvent(new CustomEvent(OPEN_WALLET_EVENT));
  };

  return (
    <section className="mb-10 overflow-hidden rounded-xl border border-tuao-dark-700/90 bg-tuao-dark-950 shadow-panel">
      <div className="flex flex-col items-start justify-between gap-5 px-6 py-5 sm:flex-row sm:items-center md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <img
            src={pixLogo}
            alt="Pix"
            className="h-10 w-auto shrink-0 object-contain object-left sm:h-11"
            draggable={false}
          />
          <p className="text-base font-bold text-white sm:text-lg md:text-xl">
            Depósitos instantâneos com Pix
          </p>
        </div>
        <button
          type="button"
          onClick={onDeposit}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-tuao-cta px-6 text-sm font-bold text-white shadow-panel transition hover:bg-tuao-cta-hover"
        >
          Depositar agora
        </button>
      </div>
    </section>
  );
};
