import { useEffect } from 'react';

const BASE = 'Poroteo Legislativo';

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
  }, [title]);
}
