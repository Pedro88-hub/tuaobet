/** Delta from `from` center to `to` center, for CSS translate origin. */
export function dealOffset(from: Element, to: Element): { x: number; y: number } {
  const origin = from.getBoundingClientRect();
  const target = to.getBoundingClientRect();
  return {
    x: origin.left + origin.width / 2 - (target.left + target.width / 2),
    y: origin.top + origin.height / 2 - (target.top + target.height / 2),
  };
}
