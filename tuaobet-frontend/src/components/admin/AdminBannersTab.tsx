import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../services/api';
import {
  type SiteBannerRow,
  deleteAdminBanner,
  fetchAdminBanners,
  patchAdminBannerActive,
  putAdminBanner,
} from '../../services/adminApi';

type Props = {
  onFlash: (msg: string) => void;
  onError: (msg: string | null) => void;
};

export const AdminBannersTab: React.FC<Props> = ({ onFlash, onError }) => {
  const [banners, setBanners] = useState<SiteBannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerKey, setBannerKey] = useState('hero-home');
  const [bannerUrl, setBannerUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const r = await fetchAdminBanners();
      setBanners(r.banners);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  const saveBanner = async () => {
    if (!bannerKey.trim() || !bannerUrl.trim()) {
      onError('Chave e URL obrigatórios');
      return;
    }
    setSaving(true);
    onError(null);
    try {
      await putAdminBanner(bannerKey.trim(), bannerUrl.trim(), true);
      onFlash('Banner guardado (chave: ' + bannerKey.trim() + ')');
      setBannerUrl('');
      await loadBanners();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const removeBanner = async (key: string) => {
    if (!window.confirm(`Remover banner "${key}"?`)) return;
    onError(null);
    try {
      await deleteAdminBanner(key);
      onFlash('Banner removido');
      await loadBanners();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    }
  };

  const toggleActive = async (b: SiteBannerRow) => {
    setTogglingKey(b.key);
    onError(null);
    try {
      await patchAdminBannerActive(b.key, !b.active);
      onFlash(b.active ? 'Banner desativado' : 'Banner ativado');
      await loadBanners();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
      <p className="mb-4 text-sm text-tuao-text-secondary">
        A página inicial usa a chave <code className="text-tuao-primary">hero-home</code> para a imagem
        direita do hero. URL pode ser relativa (<code className="text-tuao-primary">/images/...</code>) ou
        absoluta (CDN).
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={bannerKey}
          onChange={(e) => setBannerKey(e.target.value)}
          placeholder="Chave (ex: hero-home)"
          className="min-w-[140px] flex-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
        />
        <input
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="URL da imagem"
          className="min-w-[200px] flex-[2] rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveBanner()}
          className="rounded-lg bg-tuao-primary px-4 py-2 text-xs font-bold uppercase text-tuao-dark-950 disabled:opacity-50"
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadBanners()}
          className="rounded-lg border border-tuao-dark-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Atualizar lista
        </button>
      </div>
      {loading && <p className="mb-2 text-xs text-tuao-text-secondary">A carregar…</p>}
      <ul className="space-y-3">
        {banners.map((b) => (
          <li
            key={b.id}
            className="flex flex-col gap-2 rounded-lg border border-tuao-dark-800 bg-tuao-dark-950/80 px-3 py-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="shrink-0 font-mono text-tuao-primary">{b.key}</span>
              <span className="truncate text-tuao-text-secondary">{b.imageUrl}</span>
              <span className={b.active ? 'text-emerald-400' : 'text-tuao-text-secondary'}>
                {b.active ? 'ativo' : 'inativo'}
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <div className="h-16 w-28 overflow-hidden rounded border border-tuao-dark-700 bg-tuao-dark-900">
                <img
                  src={b.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <button
                type="button"
                disabled={togglingKey === b.key}
                onClick={() => void toggleActive(b)}
                className="self-center rounded border border-tuao-dark-600 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-tuao-dark-800 disabled:opacity-50"
              >
                {togglingKey === b.key ? '…' : b.active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                type="button"
                onClick={() => void removeBanner(b.key)}
                className="self-center text-red-400 hover:underline"
              >
                remover
              </button>
            </div>
          </li>
        ))}
        {banners.length === 0 && !loading && (
          <li className="text-tuao-text-secondary">Nenhum banner na base de dados.</li>
        )}
      </ul>
    </div>
  );
};
