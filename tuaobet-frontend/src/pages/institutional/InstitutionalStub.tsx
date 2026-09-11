import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';

type InstitutionalStubProps = {
  title: string;
  description?: string;
};

export function InstitutionalStub({
  title,
  description = 'Conteúdo em breve. Esta página será atualizada com o texto oficial.',
}: InstitutionalStubProps) {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6 p-6 text-white">
        <div>
          <h1 className="mb-2 text-3xl font-black">{title}</h1>
          <p className="leading-relaxed text-tuao-text-secondary">{description}</p>
        </div>
        <Link to="/" className="inline-block font-semibold text-tuao-primary hover:text-tuao-primary-hover">
          Voltar ao início
        </Link>
      </div>
    </Layout>
  );
}
