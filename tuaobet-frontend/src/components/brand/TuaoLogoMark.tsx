import tuaoLogo from '../../assets/tuao-logo.png';
import { cn } from '../../lib/utils';

type TuaoLogoMarkProps = {
  className?: string;
  alt?: string;
};

/**
 * Marca TuãoBet (ícone flame/chip) — substitui o monograma “T”.
 */
export function TuaoLogoMark({ className, alt = 'TuãoBet' }: TuaoLogoMarkProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-tuao-dark-950 shadow-[0_0_16px_rgba(0,240,255,0.35)]',
        className,
      )}
    >
      <img
        src={tuaoLogo}
        alt={alt}
        draggable={false}
        className="h-full w-full select-none object-contain p-0.5"
      />
    </div>
  );
}
