import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';

export function Fairness() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 text-white space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2">Justiça e provably fair</h1>
          <p className="text-tuao-text-secondary leading-relaxed">
            Em <strong className="text-white">Crash</strong> e <strong className="text-white">Double</strong>{' '}
            usamos <strong className="text-tuao-primary">commit–reveal</strong>: antes de apostar você vê apenas o{' '}
            <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">SHA-256</code> do server seed; depois do
            resultado o servidor revela o seed em claro. Você pode confirmar que{' '}
            <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">hash(seed) = hash publicado</code> e que
            o resultado foi derivado desse seed (a app verifica automaticamente em cada rodada).
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-tuao-primary">Crash</h2>
          <ol className="list-decimal list-inside text-tuao-text-secondary space-y-2 leading-relaxed">
            <li>
              É gerado um <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">serverSeed</code> aleatório
              (32 bytes em hex).
            </li>
            <li>
              É publicado <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">serverSeedHash = SHA-256(serverSeed)</code>{' '}
              no início da contagem regressiva.
            </li>
            <li>
              O crash em <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">X</code> vem dos primeiros 32
              bits (big-endian) de{' '}
              <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">SHA-256(serverSeed:roundId:&quot;crash&quot;)</code>
              , com a mesma fórmula de margem da casa (~1/33 para crash em 1,00x).
            </li>
            <li>
              O gráfico segue <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">e^(0,06·t)</code> até
              atingir <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">X</code>.
            </li>
            <li>No fim, o servidor envia o <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">serverSeed</code> revelado.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-tuao-primary">Double</h2>
          <ol className="list-decimal list-inside text-tuao-text-secondary space-y-2 leading-relaxed">
            <li>Commit do <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">SHA-256(serverSeed)</code> no início da janela de apostas.</li>
            <li>
              O número <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">0–14</code> é{' '}
              <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">SHA-256(serverSeed:roundId:&quot;double&quot;)</code>{' '}
              módulo 15 (uniforme).
            </li>
            <li>Após o giro, o seed é revelado para verificação.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-tuao-primary">Mines, Dice e Plinko</h2>
          <p className="text-tuao-text-secondary leading-relaxed">
            Resolvidos na API autenticada com RNG no servidor. Essas rotas têm{' '}
            <strong className="text-white">rate limiting</strong> por usuário para reduzir abuso; o limite por
            minuto pode ser ajustado no backend com <code className="text-white/90 bg-tuao-dark-800 px-1 rounded">GAMES_RATE_LIMIT_MAX</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-tuao-primary">Produção</h2>
          <ul className="list-disc list-inside text-tuao-text-secondary space-y-2">
            <li>Arquivo público de histórico (hash + seed revelado + resultado) para auditoria externa.</li>
            <li>Seed do cliente opcional (nonce) misturado no hash para maior transparência.</li>
            <li>Conformidade legal e jogo responsável no seu país.</li>
          </ul>
        </section>

        <Link to="/" className="inline-block text-tuao-primary font-bold hover:underline">
          Voltar ao início
        </Link>
      </div>
    </Layout>
  );
}
