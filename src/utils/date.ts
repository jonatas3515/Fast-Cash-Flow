// ============================================
// Funções com fuso horário de Brasília (UTC-3)
// ============================================

/**
 * Retorna a data atual no fuso horário de Brasília no formato YYYY-MM-DD
 */
export function todayBrasilia(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Retorna a hora atual no fuso horário de Brasília no formato HH:MM
 */
export function nowBrasilia(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Retorna a hora atual (0-23) no fuso horário de Brasília
 */
export function currentHourBrasilia(): number {
  const timeStr = new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false
  });
  return parseInt(timeStr, 10);
}

/**
 * Formata uma data para exibição no formato brasileiro DD/MM/YYYY
 */
export function formatDateBR(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Formata uma data para exibição completa (ex: "16 de Dezembro de 2024")
 */
export function formatDateLongBR(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${d} de ${months[m - 1]} de ${y}`;
}

// ============================================
// Funções originais (sem timezone específico)
// ============================================

export function todayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowHM(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function monthNamePt(month: number): string {
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  // month já vem 0-indexed (0=Janeiro, 11=Dezembro) do getMonth()
  return names[month % 12];
}

export function addMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function dateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(ymd: string, delta: number): string {
  const d = ymdToDate(ymd);
  d.setDate(d.getDate() + delta);
  return dateToYMD(d);
}

export function startOfWeekSunday(ymd: string): string {
  const d = ymdToDate(ymd);
  const day = d.getDay(); // 0 = Sunday
  const diff = -day; // go back to Sunday
  d.setDate(d.getDate() + diff);
  return dateToYMD(d);
}
