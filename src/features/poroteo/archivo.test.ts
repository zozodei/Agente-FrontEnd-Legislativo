import { esPdf } from './archivo';

describe('esPdf', () => {
  it('acepta application/pdf', () => {
    expect(esPdf({ type: 'application/pdf', name: 'ley.pdf' })).toBe(true);
  });

  it('acepta PDFs sin tipo o como octet-stream si la extensión es .pdf', () => {
    expect(esPdf({ type: '', name: 'Ley de educación.PDF' })).toBe(true);
    expect(esPdf({ type: 'application/octet-stream', name: 'ley.pdf' })).toBe(true);
  });

  it('rechaza otros archivos', () => {
    expect(esPdf({ type: 'text/plain', name: 'ley.pdf' })).toBe(false);
    expect(esPdf({ type: '', name: 'ley.docx' })).toBe(false);
  });
});
