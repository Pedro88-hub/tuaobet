import { useEffect, useState } from 'react';

/** Valor que só atualiza após `delayMs` sem mudanças — útil para pesquisa sem spammar a API. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
