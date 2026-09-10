import React from 'react';
import { Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
    <section className="mb-10 overflow-hidden rounded-xl border border-tuao-dark-700/90 bg-gradient-to-r from-tuao-dark-900 to-[#12171c] shadow-panel">
      <div className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center md:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 text-emerald-400">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
              Método de pagamento preferido
            </p>
            <p className="mt-0.5 text-lg font-black text-white">Pix</p>
            <p className="mt-1 text-sm text-tuao-text-secondary">
              Depósitos rápidos para começar a jogar em segundos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDeposit}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-tuao-cta px-7 text-xs font-bold uppercase tracking-wide text-white shadow-panel transition hover:bg-tuao-cta-hover"
        >
          Faça o depósito
        </button>
      </div>
    </section>
  );
};
