import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Megaphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  fetchPublicAnnouncement,
  type PublicAnnouncement,
  type SiteAnnouncementPayload,
} from '../../services/publicSite';
import { getSocket } from '../../services/socket';

function payloadToAnnouncement(p: SiteAnnouncementPayload): PublicAnnouncement {
  return {
    id: p.id,
    title: p.title,
    message: p.message,
    updatedAt: p.updatedAt,
    displayMode: (p.displayMode as PublicAnnouncement['displayMode']) ?? 'BAR',
    imageUrl: p.imageUrl,
    bgColor: p.bgColor,
    titleColor: p.titleColor,
    messageColor: p.messageColor,
    accentColor: p.accentColor,
  };
}

export const GlobalAnnouncementBar: React.FC = () => {
  const [ann, setAnn] = useState<PublicAnnouncement | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem('tuaobet_ann_dismiss');
      return raw || null;
    } catch {
      return null;
    }
  });

  const load = useCallback(async () => {
    try {
      const a = await fetchPublicAnnouncement();
      setAnn(a);
    } catch {
      setAnn(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const s = getSocket();
    const onAnn = (payload: SiteAnnouncementPayload) => {
      setAnn(payloadToAnnouncement(payload));
      try {
        sessionStorage.removeItem('tuaobet_ann_dismiss');
      } catch {
        /* ignore */
      }
      setDismissedId(null);
    };
    s.on('site:announcement', onAnn);
    return () => {
      s.off('site:announcement', onAnn);
    };
  }, []);

  const visible = ann && dismissedId !== ann.id;
  const mode = ann?.displayMode ?? 'BAR';

  const dismiss = () => {
    if (!ann) return;
    try {
      sessionStorage.setItem('tuaobet_ann_dismiss', ann.id);
    } catch {
      /* ignore */
    }
    setDismissedId(ann.id);
  };

  if (!visible || !ann) return null;

  const barStyle: React.CSSProperties = {
    backgroundColor: ann.bgColor ?? undefined,
    borderColor: ann.accentColor ?? undefined,
    color: ann.messageColor ?? undefined,
  };
  const titleStyle: React.CSSProperties = { color: ann.titleColor ?? undefined };
  const bodyStyle: React.CSSProperties = { color: ann.messageColor ?? undefined };

  const barView = (
    <div
      className={cn(
        'flex w-full items-start gap-3 border-b border-tuao-primary/25 bg-tuao-dark-900/95 px-4 py-2.5 text-sm text-white shadow-[0_4px_24px_rgba(0,240,255,0.08)]',
        'md:px-6',
        !ann.bgColor && 'bg-tuao-dark-900/95'
      )}
      style={barStyle}
      role="status"
    >
      <Megaphone
        className="mt-0.5 h-4 w-4 shrink-0 text-tuao-primary"
        style={{ color: ann.accentColor ?? undefined }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {ann.imageUrl ? (
          <img
            src={ann.imageUrl}
            alt=""
            className="mb-2 max-h-32 w-full rounded-lg object-cover object-center"
          />
        ) : null}
        <p className="font-bold text-tuao-primary" style={titleStyle}>
          {ann.title}
        </p>
        <p className="mt-0.5 leading-snug text-tuao-text-secondary" style={bodyStyle}>
          {ann.message}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-tuao-text-secondary transition hover:bg-tuao-dark-800 hover:text-white"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const modalView = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tuao-ann-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={dismiss}
      />
      <div
        className="relative z-[101] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-tuao-dark-600 bg-tuao-dark-900 p-6 shadow-2xl"
        style={{
          backgroundColor: ann.bgColor ?? undefined,
          borderColor: ann.accentColor ?? undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {ann.imageUrl ? (
          <img
            src={ann.imageUrl}
            alt=""
            className="mb-4 max-h-48 w-full rounded-xl object-cover object-center"
          />
        ) : null}
        <h2 id="tuao-ann-modal-title" className="text-lg font-black text-white" style={titleStyle}>
          {ann.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-tuao-text-secondary" style={bodyStyle}>
          {ann.message}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-lg bg-tuao-primary py-2.5 text-xs font-bold uppercase text-tuao-dark-950"
        >
          Entendido
        </button>
      </div>
    </div>
  );

  const toastView = (
    <div
      className="tuao-announcement-toast pointer-events-auto fixed bottom-4 right-4 z-[100] w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-tuao-dark-600 bg-tuao-dark-900/95 shadow-2xl backdrop-blur-sm"
      style={{
        backgroundColor: ann.bgColor ?? undefined,
        borderColor: ann.accentColor ?? undefined,
      }}
      role="status"
    >
      <div className="flex items-start gap-2 p-3">
        <Megaphone
          className="mt-0.5 h-4 w-4 shrink-0 text-tuao-primary"
          style={{ color: ann.accentColor ?? undefined }}
        />
        <div className="min-w-0 flex-1">
          {ann.imageUrl ? (
            <img
              src={ann.imageUrl}
              alt=""
              className="mb-2 max-h-24 w-full rounded-lg object-cover"
            />
          ) : null}
          <p className="text-xs font-bold" style={titleStyle}>
            {ann.title}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-tuao-text-secondary" style={bodyStyle}>
            {ann.message}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mode === 'BAR' && barView}
      {mode === 'MODAL' && createPortal(modalView, document.body)}
      {mode === 'TOAST' && createPortal(toastView, document.body)}
    </>
  );
};
