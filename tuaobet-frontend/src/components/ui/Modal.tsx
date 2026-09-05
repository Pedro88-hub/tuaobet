import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Ícone opcional ao lado do título (ex.: LogIn / UserPlus) */
  headerIcon?: React.ReactNode;
  /** Painel mais largo (ex.: histórico de rondas). */
  size?: 'default' | 'wide';
}

export function Modal({ isOpen, onClose, title, subtitle, headerIcon, children, size = 'default' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 bg-black/75 backdrop-blur-[10px] transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-2xl border border-tuao-dark-700/90',
          size === 'wide' ? 'max-w-xl sm:max-w-2xl' : 'max-w-[420px]',
          'bg-tuao-dark-900 shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_1px_rgba(0,240,255,0.15)]',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        <div
          className="h-1 w-full bg-gradient-to-r from-transparent via-tuao-primary to-transparent opacity-90"
          aria-hidden
        />

        <div className="border-b border-tuao-dark-800/90 bg-tuao-dark-950/40 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {headerIcon ? (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-800/80 text-tuao-primary shadow-inner [&_svg]:shrink-0"
                  aria-hidden
                >
                  {headerIcon}
                </div>
              ) : null}
              <div className="min-w-0 flex flex-1 flex-col">
                <h2
                  id="auth-modal-title"
                  className="text-lg font-black leading-tight tracking-tight text-white sm:text-xl"
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-1.5 text-[13px] leading-snug text-tuao-text-secondary">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-tuao-text-secondary transition-colors hover:border-tuao-dark-700 hover:bg-tuao-dark-800 hover:text-white"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
