import React from 'react';
import { X, Megaphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AnnouncementDisplayMode } from '../../services/adminApi';

export type AnnouncementPreviewProps = {
  title: string;
  message: string;
  displayMode: AnnouncementDisplayMode;
  imageUrl: string;
  bgColor: string;
  titleColor: string;
  messageColor: string;
  accentColor: string;
};

/** Estilos alinhados com GlobalAnnouncementBar para pré-visualização no admin. */
export const AnnouncementLivePreview: React.FC<AnnouncementPreviewProps> = ({
  title,
  message,
  displayMode,
  imageUrl,
  bgColor,
  titleColor,
  messageColor,
  accentColor,
}) => {
  const bg = bgColor.trim() || undefined;
  const tc = titleColor.trim() || undefined;
  const mc = messageColor.trim() || undefined;
  const ac = accentColor.trim() || undefined;

  const barStyle: React.CSSProperties = {
    backgroundColor: bg,
    borderColor: ac,
    color: mc,
  };
  const titleStyle: React.CSSProperties = { color: tc };
  const bodyStyle: React.CSSProperties = { color: mc };

  const titleText = title.trim() || 'Título do aviso';
  const messageText = message.trim() || 'Texto da mensagem aparece aqui.';

  const barView = (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b px-3 py-2.5 text-sm text-white shadow-[0_4px_24px_rgba(0,240,255,0.08)]',
        !bg && 'border-b border-tuao-primary/25 bg-tuao-dark-900/95',
        bg && 'border-b'
      )}
      style={barStyle}
    >
      <Megaphone
        className="mt-0.5 h-4 w-4 shrink-0 text-tuao-primary"
        style={{ color: ac ?? undefined }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {imageUrl.trim() ? (
          <img
            src={imageUrl}
            alt=""
            className="mb-2 max-h-24 w-full rounded-lg object-cover object-center"
          />
        ) : null}
        <p className="font-bold text-tuao-primary" style={titleStyle}>
          {titleText}
        </p>
        <p className="mt-0.5 leading-snug text-tuao-text-secondary" style={bodyStyle}>
          {messageText}
        </p>
      </div>
      <span className="shrink-0 rounded-md p-1 text-tuao-text-secondary opacity-60" aria-hidden>
        <X className="h-4 w-4" />
      </span>
    </div>
  );

  const modalView = (
    <div
      className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg border border-tuao-dark-700 bg-black/60 p-3"
      aria-hidden
    >
      <div
        className="relative z-[1] max-h-[min(50vh,280px)] w-full max-w-sm overflow-y-auto rounded-2xl border border-tuao-dark-600 bg-tuao-dark-900 p-4 shadow-2xl"
        style={{
          backgroundColor: bg,
          borderColor: ac,
        }}
      >
        {imageUrl.trim() ? (
          <img
            src={imageUrl}
            alt=""
            className="mb-3 max-h-32 w-full rounded-xl object-cover object-center"
          />
        ) : null}
        <h3 className="text-base font-black text-white" style={titleStyle}>
          {titleText}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-tuao-text-secondary" style={bodyStyle}>
          {messageText}
        </p>
        <div className="mt-4 w-full rounded-lg bg-tuao-primary py-2.5 text-center text-xs font-bold uppercase text-tuao-dark-950">
          Entendido
        </div>
      </div>
    </div>
  );

  const toastView = (
    <div
      className="flex min-h-[140px] items-end justify-end rounded-lg border border-tuao-dark-700 bg-gradient-to-br from-tuao-dark-950 via-tuao-dark-900 to-black p-2"
      aria-hidden
    >
      <div
        className="w-full max-w-[18rem] overflow-hidden rounded-xl border border-tuao-dark-600 bg-tuao-dark-900/95 shadow-2xl backdrop-blur-sm"
        style={{
          backgroundColor: bg,
          borderColor: ac,
        }}
      >
        <div className="flex items-start gap-2 p-3">
          <Megaphone
            className="mt-0.5 h-4 w-4 shrink-0 text-tuao-primary"
            style={{ color: ac ?? undefined }}
          />
          <div className="min-w-0 flex-1">
            {imageUrl.trim() ? (
              <img
                src={imageUrl}
                alt=""
                className="mb-2 max-h-20 w-full rounded-lg object-cover"
              />
            ) : null}
            <p className="text-xs font-bold" style={titleStyle}>
              {titleText}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-tuao-text-secondary" style={bodyStyle}>
              {messageText}
            </p>
          </div>
          <span className="shrink-0 rounded p-1 text-tuao-text-secondary opacity-60">
            <X className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-tuao-text-secondary">
        Modo:{' '}
        {displayMode === 'BAR'
          ? 'Barra no topo'
          : displayMode === 'MODAL'
            ? 'Modal'
            : 'Toast'}
      </p>
      {displayMode === 'BAR' && barView}
      {displayMode === 'MODAL' && modalView}
      {displayMode === 'TOAST' && toastView}
    </div>
  );
};
