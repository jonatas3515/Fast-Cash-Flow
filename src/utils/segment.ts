import { type BusinessType } from '../config/businessProfiles';
import { normalizeBusinessType } from '../repositories/company_profile';

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function resolveBusinessTypeFromCompanySegment(
  companySegment: string | null | undefined,
  legacyBusinessType: string | null | undefined
): BusinessType {
  const seg = companySegment ? normalizeLabel(companySegment) : '';

  if (seg) {
    if (seg === 'outros' || seg === 'outro' || seg.includes('outros')) return 'outros';

    if (seg.includes('autocenter') || seg.includes('auto center') || seg.includes('oficina') || seg.includes('mecanica')) {
      return 'autocenter';
    }

    if (seg.includes('doceria') || seg.includes('confeitaria')) return 'doceria';
    if (seg.includes('lanchonete') || seg.includes('delivery')) return 'lanchonete_delivery';
    if (seg.includes('restaurante')) return 'restaurante';

    if (seg.includes('materiais de construcao') || seg.includes('material de construcao') || seg.includes('construcao')) {
      return 'materiais_construcao';
    }

    if (seg.includes('mercado') || seg.includes('mercearia') || seg.includes('supermerc')) return 'mercado';
    if (seg.includes('petshop') || seg.includes('pet shop')) return 'petshop';
    if (seg.includes('vestuario') || seg.includes('roupa') || seg.includes('moda')) return 'vestuario';
    if (seg.includes('joalher') || seg.includes('otica')) return 'joalheria_otica';
    if (seg.includes('fornecedor') || seg.includes('atacado') || seg.includes('distribu')) return 'fornecedor_atacado';
    if (seg.includes('equipamento') || seg.includes('locacao') || seg.includes('locacao')) return 'equipamentos';
    if (seg.includes('producao') || seg.includes('fabrica') || seg.includes('industr')) return 'producao';

    if (seg.includes('loja') || seg.includes('varejo')) return 'loja_produtos';

    if (seg.includes('servico') || seg.includes('servicos')) {
      if (
        seg.includes('profissional') ||
        seg.includes('liberal') ||
        seg.includes('consult') ||
        seg.includes('escritorio') ||
        seg.includes('advoc') ||
        seg.includes('contabil') ||
        seg.includes('contador')
      ) {
        return 'servicos_profissionais';
      }

      if (seg.includes('gerais') || seg.includes('em geral') || seg.includes('geral')) {
        return 'servicos_gerais';
      }

      return 'servicos_profissionais';
    }

    if (seg.includes('profissional') || seg.includes('autonomo') || seg.includes('freelancer')) return 'profissional_autonomo';
  }

  return normalizeBusinessType(legacyBusinessType ?? null);
}

export function ensureOutros(options: string[]): string[] {
  const has = options.some(o => normalizeLabel(o) === 'outros');
  if (has) return options;
  return [...options, 'Outros'];
}

export type SystemCategoryKey = 'encomenda' | 'recebimento_fiado';

type SystemCategoryLabelConfig = {
  defaultLabel: string;
  byBusinessType?: Partial<Record<BusinessType, string>>;
};

const SYSTEM_CATEGORY_LABELS: Record<SystemCategoryKey, SystemCategoryLabelConfig> = {
  encomenda: {
    defaultLabel: 'Encomenda',
    byBusinessType: {
      restaurante: 'Pedidos/Encomendas',
      lanchonete_delivery: 'Pedidos/Encomendas',
    },
  },
  recebimento_fiado: {
    defaultLabel: 'Recebimento Fiado',
    byBusinessType: {
      restaurante: 'Fiado (Recebimento)',
      lanchonete_delivery: 'Fiado (Recebimento)',
      loja_produtos: 'Crediário/Fiado',
      servicos_gerais: 'Recebimento a Prazo',
      servicos_profissionais: 'Recebimento a Prazo',
      profissional_autonomo: 'Recebimento a Prazo',
    },
  },
};

function matchesEncomenda(normalized: string): boolean {
  return (
    normalized.includes('encomenda') ||
    normalized.startsWith('entrada de encomenda') ||
    normalized.startsWith('entrada encomenda')
  );
}

function matchesRecebimentoFiado(normalized: string): boolean {
  if (!normalized.includes('fiado')) return false;
  return normalized.includes('receb');
}

export function resolveSystemCategoryKey(
  category: string | null | undefined,
  description: string | null | undefined
): SystemCategoryKey | null {
  const candidates = [category, description].filter(Boolean) as string[];

  for (const raw of candidates) {
    const v = normalizeLabel(raw);
    if (!v) continue;

    if (matchesEncomenda(v)) return 'encomenda';
    if (matchesRecebimentoFiado(v)) return 'recebimento_fiado';
  }

  return null;
}

export function getSystemCategoryLabel(key: SystemCategoryKey, businessType: BusinessType): string {
  const cfg = SYSTEM_CATEGORY_LABELS[key];
  return cfg.byBusinessType?.[businessType] ?? cfg.defaultLabel;
}

export function getCategoryGroupKey(
  businessType: BusinessType,
  category: string | null | undefined,
  description: string | null | undefined,
  fallbackLabel: string = 'Outros'
): string {
  const sysKey = resolveSystemCategoryKey(category, description);
  if (sysKey) return getSystemCategoryLabel(sysKey, businessType);

  const raw = (category ?? description ?? fallbackLabel).trim();
  if (!raw) return fallbackLabel;

  return raw;
}

export function getCategoryDisplayLabel(
  businessType: BusinessType,
  category: string | null | undefined,
  description: string | null | undefined,
  fallbackLabel: string = '-'
): string {
  const sysKey = resolveSystemCategoryKey(category, description);
  if (sysKey) return getSystemCategoryLabel(sysKey, businessType);

  const raw = (category ?? '').trim();
  if (raw) return raw;

  return fallbackLabel;
}
