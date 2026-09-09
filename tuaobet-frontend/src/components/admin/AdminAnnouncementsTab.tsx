import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../services/api';
import {
  type AnnouncementDisplayMode,
  type AnnouncementRow,
  broadcastAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  patchAnnouncement,
  postAnnouncement,
} from '../../services/adminApi';
import { AnnouncementLivePreview } from './AnnouncementLivePreview';

/** Valor válido em #rrggbb ou #rgb para o `<input type="color">`; caso contrário usa o fallback. */
function hexForColorPicker(raw: string, fallback: string): string {
  const t = raw.trim();
  const m6 = /^#([0-9A-Fa-f]{6})$/.exec(t);
  if (m6) return `#${m6[1].toLowerCase()}`;
  const m3 = /^#([0-9A-Fa-f]{3})$/.exec(t);
  if (m3) {
    const [a, b, c] = m3[1];
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return fallback;
}

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  fallbackHex: string;
};

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange, placeholder, fallbackHex }) => {
  const pickerValue = hexForColorPicker(value, fallbackHex);
  return (
    <label className="block text-xs text-tuao-text-secondary">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded border border-tuao-dark-600 bg-tuao-dark-950 p-0.5 [color-scheme:dark]"
          title="Escolher cor"
          aria-label={`${label} — seletor visual`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 font-mono text-sm text-white"
        />
      </div>
    </label>
  );
};

type Props = {
  onFlash: (msg: string) => void;
  onError: (msg: string | null) => void;
};

const emptyForm = () => ({
  title: '',
  message: '',
  displayMode: 'BAR' as AnnouncementDisplayMode,
  imageUrl: '',
  bgColor: '',
  titleColor: '',
  messageColor: '',
  accentColor: '',
});

export const AdminAnnouncementsTab: React.FC<Props> = ({ onFlash, onError }) => {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const r = await fetchAnnouncements();
      setAnnouncements(r.announcements);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const toNull = (s: string) => (s.trim() ? s.trim() : null);

  const submit = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      onError('Título e mensagem obrigatórios');
      return;
    }
    setPublishing(true);
    onError(null);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        displayMode: form.displayMode,
        imageUrl: toNull(form.imageUrl),
        bgColor: toNull(form.bgColor),
        titleColor: toNull(form.titleColor),
        messageColor: toNull(form.messageColor),
        accentColor: toNull(form.accentColor),
      };
      if (editingId) {
        await patchAnnouncement(editingId, payload);
        onFlash('Aviso atualizado');
      } else {
        await postAnnouncement({
          ...payload,
          active: true,
          deactivateOthers: true,
        });
        onFlash('Aviso criado e emitido aos usuários conectados');
      }
      setForm(emptyForm());
      setEditingId(null);
      await loadAnnouncements();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setPublishing(false);
    }
  };

  const startEdit = (a: AnnouncementRow) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      message: a.message,
      displayMode: a.displayMode,
      imageUrl: a.imageUrl ?? '',
      bgColor: a.bgColor ?? '',
      titleColor: a.titleColor ?? '',
      messageColor: a.messageColor ?? '',
      accentColor: a.accentColor ?? '',
    });
    onError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const toggleAnnouncement = async (row: AnnouncementRow, active: boolean) => {
    onError(null);
    try {
      await patchAnnouncement(row.id, { active });
      if (active) onFlash('Aviso ativado');
      await loadAnnouncements();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    }
  };

  const broadcastAnn = async (id: string) => {
    onError(null);
    try {
      await broadcastAnnouncement(id);
      onFlash('Aviso reenviado por WebSocket');
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    }
  };

  const remove = async (a: AnnouncementRow) => {
    if (!window.confirm(`Excluir o aviso "${a.title}"?`)) return;
    onError(null);
    try {
      await deleteAnnouncement(a.id);
      onFlash('Aviso eliminado');
      if (editingId === a.id) cancelEdit();
      await loadAnnouncements();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
        <h2 className="mb-3 text-sm font-bold text-white">
          {editingId ? 'Editar aviso' : 'Novo aviso global'}
        </h2>
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,380px)] lg:items-start">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-tuao-text-secondary md:col-span-2">
              Título
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-tuao-text-secondary md:col-span-2">
              Mensagem
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-tuao-text-secondary">
              Como mostrar
              <select
                value={form.displayMode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayMode: e.target.value as AnnouncementDisplayMode }))
                }
                className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
              >
                <option value="BAR">Barra no topo (clássico)</option>
                <option value="MODAL">Modal ao centro</option>
                <option value="TOAST">Canto inferior direito (animação)</option>
              </select>
            </label>
            <label className="block text-xs text-tuao-text-secondary">
              URL da imagem (opcional)
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="/images/... ou https://..."
                className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <ColorField
              label="Cor de fundo (hex ou CSS)"
              value={form.bgColor}
              onChange={(v) => setForm((f) => ({ ...f, bgColor: v }))}
              placeholder="#0f172a ou vazio = tema"
              fallbackHex="#0f172a"
            />
            <ColorField
              label="Cor do título"
              value={form.titleColor}
              onChange={(v) => setForm((f) => ({ ...f, titleColor: v }))}
              placeholder="#00f0ff ou vazio"
              fallbackHex="#00f0ff"
            />
            <ColorField
              label="Cor do texto da mensagem"
              value={form.messageColor}
              onChange={(v) => setForm((f) => ({ ...f, messageColor: v }))}
              placeholder="#94a3b8 ou vazio"
              fallbackHex="#94a3b8"
            />
            <ColorField
              label="Cor de destaque / borda"
              value={form.accentColor}
              onChange={(v) => setForm((f) => ({ ...f, accentColor: v }))}
              placeholder="#00f0ff ou vazio"
              fallbackHex="#00f0ff"
            />
          </div>

          <aside className="rounded-lg border border-tuao-dark-700 bg-tuao-dark-950/50 p-3 lg:sticky lg:top-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white">
              Pré-visualização
            </h3>
            <p className="mb-3 text-[10px] leading-relaxed text-tuao-text-secondary">
              Atualiza ao editar. Cores em texto livre (ex.: <code className="text-tuao-primary">rgb()</code>) não
              aparecem no seletor, mas aplicam-se na pré-visualização e no site.
            </p>
            <AnnouncementLivePreview
              title={form.title}
              message={form.message}
              displayMode={form.displayMode}
              imageUrl={form.imageUrl}
              bgColor={form.bgColor}
              titleColor={form.titleColor}
              messageColor={form.messageColor}
              accentColor={form.accentColor}
            />
          </aside>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={publishing}
            onClick={() => void submit()}
            className="rounded-lg bg-tuao-primary px-4 py-2.5 text-xs font-bold uppercase text-tuao-dark-950 disabled:opacity-50"
          >
            {publishing ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Publicar e notificar (socket)'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-tuao-dark-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-tuao-dark-800"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
        <h2 className="mb-3 text-sm font-bold text-white">Histórico</h2>
        {loading && <p className="text-xs text-tuao-text-secondary">Carregando…</p>}
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-tuao-dark-800 bg-tuao-dark-950/80 p-3 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white">{a.title}</p>
                  <p className="mt-1 text-tuao-text-secondary">{a.message}</p>
                  <p className="mt-2 text-[10px] uppercase text-tuao-primary">
                    Modo: {a.displayMode ?? 'BAR'}
                    {a.imageUrl ? ' · com imagem' : ''}
                  </p>
                </div>
                <span className={a.active ? 'text-emerald-400' : 'text-tuao-text-secondary'}>
                  {a.active ? 'ativo' : 'inativo'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  className="rounded border border-tuao-dark-600 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-tuao-dark-800"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void broadcastAnn(a.id)}
                  className="rounded border border-tuao-dark-600 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-tuao-dark-800"
                >
                  Reenviar socket
                </button>
                <button
                  type="button"
                  onClick={() => void remove(a)}
                  className="rounded border border-red-500/40 px-2 py-1 text-[10px] font-semibold uppercase text-red-300 hover:bg-red-500/10"
                >
                  Excluir
                </button>
                {a.active ? (
                  <button
                    type="button"
                    onClick={() => void toggleAnnouncement(a, false)}
                    className="rounded border border-tuao-dark-600 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-tuao-dark-800"
                  >
                    Desativar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggleAnnouncement(a, true)}
                    className="rounded border border-emerald-500/30 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-200 hover:bg-emerald-500/10"
                  >
                    Ativar
                  </button>
                )}
              </div>
            </li>
          ))}
          {announcements.length === 0 && !loading && (
            <li className="text-tuao-text-secondary">Sem avisos ainda.</li>
          )}
        </ul>
      </div>
    </div>
  );
};
