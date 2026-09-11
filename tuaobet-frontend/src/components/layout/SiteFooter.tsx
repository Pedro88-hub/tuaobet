import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, MessageCircle } from 'lucide-react';
import tuaoLogo from '../../assets/tuao-logo.png';
import pixLogo from '../../assets/pix-logo.png';
import begambleaware from '../../assets/footer/begambleaware.png';
import govbr from '../../assets/footer/govbr.png';
import consumidorGov from '../../assets/footer/consumidor-gov.png';
import conar from '../../assets/footer/conar.png';
import susSaude from '../../assets/footer/sus-saude.png';
import ebac from '../../assets/footer/ebac.png';
import plus18 from '../../assets/footer/plus18.png';

const USEFUL_LINKS = [
  { label: 'Crash', to: '/crash' },
  { label: 'Mines', to: '/mines' },
  { label: 'Double', to: '/double' },
  { label: 'Justiça', to: '/fairness' },
  { label: 'Plinko', to: '/plinko' },
  { label: 'Baccarat', to: '/baccarat' },
] as const;

const ABOUT_LINKS = [
  { label: 'Termos de Serviço', to: '/termos' },
  { label: 'Política de Privacidade', to: '/privacidade' },
  { label: 'Termos e Condições de Afiliados', to: '/afiliados' },
  { label: 'Regras de Apostas Esportivas', to: '/regras-esportivas' },
  { label: 'Política KYC', to: '/kyc' },
  { label: 'Política AML', to: '/aml' },
  { label: 'Jogo Responsável', to: '/jogo-responsavel' },
  { label: 'Central de Apoio ao Jogador', to: '/apoio' },
  { label: 'Preferências de Cookies', to: '/cookies' },
] as const;

const COMPLIANCE_LOGOS = [
  {
    src: begambleaware,
    alt: 'BeGambleAware.org',
    href: 'https://www.begambleaware.org/',
    className: 'h-5 w-auto',
  },
  {
    src: govbr,
    alt: 'gov.br',
    href: 'https://www.gov.br/',
    className: 'h-5 w-auto',
  },
  {
    src: consumidorGov,
    alt: 'consumidor.gov.br',
    href: 'https://www.consumidor.gov.br/',
    className: 'h-8 w-auto max-w-[160px] object-contain',
  },
  {
    src: conar,
    alt: 'CONAR',
    href: 'https://www.conar.org.br/',
    className: 'h-7 w-auto',
  },
] as const;

const SECONDARY_LOGOS = [
  {
    src: ebac,
    alt: 'EBAC — Excelência em Jogo Responsável',
    href: 'https://www.ebac.org.br/',
    className: 'h-8 w-auto max-w-[140px] object-contain',
  },
  {
    src: pixLogo,
    alt: 'PIX',
    href: 'https://www.bcb.gov.br/estabilidadefinanceira/pix',
    className: 'h-6 w-auto',
  },
  {
    src: plus18,
    alt: 'Proibido para menores de 18 anos',
    href: '/jogo-responsavel',
    className: 'h-8 w-auto',
    internal: true,
  },
  {
    src: susSaude,
    alt: 'SUS — Ministério da Saúde',
    href: 'https://www.gov.br/saude/',
    className: 'h-8 w-auto max-w-[180px] object-contain',
  },
] as const;

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.227-8.662L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-tuao-dark-800/50 bg-tuao-dark-950 px-4 pb-28 pt-10 text-sm text-tuao-text-secondary lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-[1400px] space-y-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_2.2fr] lg:gap-8">
          <div className="space-y-4">
            <Link to="/" className="inline-flex min-w-0 items-center gap-2" aria-label="TuãoBET">
              <img src={tuaoLogo} alt="" className="h-9 w-9 object-contain" />
              <span className="font-black text-lg italic tracking-tight text-white md:text-xl">
                TUÃO<span className="text-tuao-primary">BET</span>
              </span>
            </Link>
            <div className="flex items-center gap-3 text-tuao-text-secondary">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                aria-label="X (Twitter)"
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Links úteis</h3>
            <ul className="space-y-2">
              {USEFUL_LINKS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-white hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Sobre nós</h3>
            <ul className="space-y-2">
              {ABOUT_LINKS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-white hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {COMPLIANCE_LOGOS.map((logo) => (
                <a
                  key={logo.alt}
                  href={logo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className={`${logo.className} grayscale opacity-55 transition-[filter,opacity] duration-200 group-hover:grayscale-0 group-hover:opacity-100`}
                  />
                </a>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              {SECONDARY_LOGOS.map((logo) =>
                'internal' in logo && logo.internal ? (
                  <Link key={logo.alt} to={logo.href} className="group">
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      className={`${logo.className} grayscale opacity-55 transition-[filter,opacity] duration-200 group-hover:grayscale-0 group-hover:opacity-100`}
                    />
                  </Link>
                ) : (
                  <a
                    key={logo.alt}
                    href={logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      className={`${logo.className} grayscale opacity-55 transition-[filter,opacity] duration-200 group-hover:grayscale-0 group-hover:opacity-100`}
                    />
                  </a>
                ),
              )}
            </div>

            <div className="space-y-3 text-[11px] leading-relaxed text-tuao-text-secondary/90">
              <p>
                [Razão social] — CNPJ [00.000.000/0000-00]. Endereço: [endereço completo].
                Autorização de apostas: [número SPA/MF a definir].
              </p>
              <p>
                A TuãoBET promove o jogo responsável. Apostas envolvem risco e podem causar
                dependência. Jogue com moderação. Proibido para menores de 18 anos.
              </p>
              <p>
                Consulte o{' '}
                <a
                  href="https://www.planalto.gov.br/ccivil_03/leis/l8078.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                >
                  Código de Defesa do Consumidor
                </a>
                .
              </p>
              <p>
                É proibida a participação de beneficiários de programas sociais federais de
                transferência de renda, nos termos da legislação aplicável.
              </p>
              <p className="pt-1 text-tuao-text-secondary">
                &copy; {new Date().getFullYear()} TuãoBET. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-tuao-dark-800/60 pt-8">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <ContactCol title="Suporte">
              <p>0800 000 0000</p>
              <p>24 horas</p>
              <a href="mailto:suporte@tuaobet.com" className="hover:text-white hover:underline">
                suporte@tuaobet.com
              </a>
            </ContactCol>
            <ContactCol title="Ouvidoria">
              <p>0800 000 0001</p>
              <p>Seg–Sex, 9h–18h</p>
              <a href="mailto:ouvidoria@tuaobet.com" className="hover:text-white hover:underline">
                ouvidoria@tuaobet.com
              </a>
            </ContactCol>
            <ContactCol title="Parceiros">
              <a href="mailto:parceiros@tuaobet.com" className="hover:text-white hover:underline">
                parceiros@tuaobet.com
              </a>
            </ContactCol>
            <ContactCol title="Jurídico">
              <a href="mailto:juridico@tuaobet.com" className="hover:text-white hover:underline">
                juridico@tuaobet.com
              </a>
            </ContactCol>
            <ContactCol title="Imprensa">
              <a href="mailto:imprensa@tuaobet.com" className="hover:text-white hover:underline">
                imprensa@tuaobet.com
              </a>
            </ContactCol>
            <ContactCol title="Proteção De Dados">
              <a href="mailto:dpo@tuaobet.com" className="hover:text-white hover:underline">
                dpo@tuaobet.com
              </a>
            </ContactCol>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ContactCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1 text-[12px]">
      <h4 className="font-semibold text-white">{title}</h4>
      <div className="space-y-0.5 text-tuao-text-secondary">{children}</div>
    </div>
  );
}
