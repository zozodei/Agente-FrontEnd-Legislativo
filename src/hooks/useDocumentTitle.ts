import { useEffect } from 'react';

const BASE = 'demoIA · Poroteo legislativo';

export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
  }, [title]);
}
