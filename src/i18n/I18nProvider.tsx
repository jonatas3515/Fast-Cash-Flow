import React from 'react';

export type Lang = 'pt' | 'en';
export type Currency = 'BRL' | 'USD';

type Ctx = {
  lang: Lang;
  currency: Currency;
  setLang: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
  t: (key: string) => string;
  formatMoney: (cents: number) => string;
};

const STRINGS: Record<Lang, Record<string, string>> = {
  pt: {
    reports: 'Relatórios',
    export_csv: 'Exportar CSV',
    export_pdf: 'Exportar PDF',
    income: 'Entradas',
    expense: 'Saídas',
    balance: 'Saldo',
    daily_average: 'Média diária',
    month: 'Mês',
    items: 'Itens',
    day: 'Dia',
    week: 'Semana',
    settings: 'Config',
    prev: '‹',
    next: '›',
    month_balance: 'Saldo do mês',
    loading_chart: 'Carregando gráfico...',
    today_transactions: 'Transações de hoje',
    description: 'Descrição',
    category: 'Categoria',
    value_example: 'Valor (ex: 123,45)',
    add_income: '+ Adicionar Entrada',
    add_expense: '+ Adicionar Saída',
    edit: 'Editar',
    delete: 'Excluir',
    cancel: 'Cancelar',
    save: 'Salvar',
    dark_theme: 'Tema escuro',
    company_logo_url: 'Logo da empresa (URL)',
    save_logo: 'Salvar Logo',
    pick_gallery: 'Escolher da galeria',
    language: 'Idioma',
    currency_label: 'Moeda',
    current: 'Atual',
    invalid_date: 'Data inválida (YYYY-MM-DD)',
    invalid_value: 'Informe um valor válido',
    date_time: 'Data/Hora',
    table_description: 'Descrição',
    table_category: 'Categoria',
    logo_updated: 'Logo atualizada',
    allow_gallery: 'Permita acesso à galeria',
    week_start_label: 'Início da semana (YYYY-MM-DD)',
    synced: 'Sincronizado',
    sync_failed: 'Falha ao sincronizar',
    syncing: 'Sincronizando...',
    tx_created: 'Transação criada',
    tx_updated: 'Transação atualizada',
    tx_removed: 'Transação removida',
  },
  en: {
    reports: 'Reports',
    export_csv: 'Export CSV',
    export_pdf: 'Export PDF',
    income: 'Income',
    expense: 'Expense',
    balance: 'Balance',
    daily_average: 'Daily average',
    month: 'Month',
    items: 'Items',
    day: 'Day',
    week: 'Week',
    settings: 'Settings',
    prev: '‹',
    next: '›',
    month_balance: 'Month balance',
    loading_chart: 'Loading chart...',
    today_transactions: 'Today\'s transactions',
    description: 'Description',
    category: 'Category',
    value_example: 'Amount (e.g. 123.45)',
    add_income: '+ Add Income',
    add_expense: '+ Add Expense',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    dark_theme: 'Dark theme',
    company_logo_url: 'Company logo (URL)',
    save_logo: 'Save Logo',
    pick_gallery: 'Pick from gallery',
    language: 'Language',
    currency_label: 'Currency',
    current: 'Current',
    invalid_date: 'Invalid date (YYYY-MM-DD)',
    invalid_value: 'Enter a valid amount',
    date_time: 'Date/Time',
    table_description: 'Description',
    table_category: 'Category',
    logo_updated: 'Logo updated',
    allow_gallery: 'Allow gallery access',
    week_start_label: 'Week start (YYYY-MM-DD)',
    synced: 'Synced',
    sync_failed: 'Sync failed',
    syncing: 'Syncing...',
    tx_created: 'Transaction created',
    tx_updated: 'Transaction updated',
    tx_removed: 'Transaction removed',
  },
};

const Ctx = React.createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Lang>('pt');
  const [currency, setCurrency] = React.useState<Currency>('BRL');
  const t = React.useCallback((key: string) => STRINGS[lang][key] ?? key, [lang]);
  const formatMoney = React.useCallback((cents: number) => {
    const value = (cents || 0) / 100;
    const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
    return value.toLocaleString(locale, { style: 'currency', currency });
  }, [lang, currency]);
  return <Ctx.Provider value={{ lang, currency, setLang, setCurrency, t, formatMoney }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('I18nContext not found');
  return ctx;
}
