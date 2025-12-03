export function formatCentsBRL(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseBRLToCents(input: string): number {
  // Accepts numbers or strings like 1.234,56
  if (!input) return 0;
  const cleaned = input
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(/,(\d{2})$/, '.$1');
  const n = Number(cleaned);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function maskBRLInput(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  const intFmt = Number(intPart).toLocaleString('pt-BR');
  return `${intFmt},${decPart}`;
}
