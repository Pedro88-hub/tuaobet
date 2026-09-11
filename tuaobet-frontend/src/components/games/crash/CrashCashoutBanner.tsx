type CrashCashoutBannerProps = {
  multiplier: number;
  payout: number;
};

const formatBrlAmount = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Balão verde de saque (estilo Blaze) acima do multiplicador ao vivo. */
export function CrashCashoutBanner({ multiplier, payout }: CrashCashoutBannerProps) {
  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="relative w-full rounded-md bg-emerald-500 px-2 py-1.5 text-center shadow-[0_4px_14px_rgba(16,185,129,0.45)] sm:px-3 sm:py-2">
        <div className="text-[10px] font-bold tabular-nums leading-tight text-white sm:text-[11px]">
          X{multiplier.toFixed(2)}
        </div>
        <div className="mt-0.5 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-white sm:text-[11px]">
          VOCÊ GANHOU! R$ {formatBrlAmount(payout)}
        </div>
        {/* Caret apontando para o multiplicador */}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-emerald-500"
        />
      </div>
    </div>
  );
}
