export function flyChip(from: Element, to: Element) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const origin = from.getBoundingClientRect();
  const target = to.getBoundingClientRect();
  const clone = from.cloneNode(true) as HTMLElement;
  clone.classList.add('bc-chip-fly');
  clone.classList.remove('is-selected');
  clone.removeAttribute('aria-pressed');
  clone.tabIndex = -1;
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    left: `${origin.left}px`,
    top: `${origin.top}px`,
    width: `${origin.width}px`,
    height: `${origin.height}px`,
    margin: '0',
    transform: 'translate(0, 0) scale(1)',
    opacity: '1',
  });
  document.body.appendChild(clone);

  const dx = target.left + target.width / 2 - (origin.left + origin.width / 2);
  const dy = target.top + target.height / 2 - (origin.top + origin.height / 2);

  requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(.42)`;
    clone.style.opacity = '0';
  });

  const cleanup = () => {
    clone.removeEventListener('transitionend', cleanup);
    clone.remove();
  };
  clone.addEventListener('transitionend', cleanup);
  window.setTimeout(cleanup, 500);
}
