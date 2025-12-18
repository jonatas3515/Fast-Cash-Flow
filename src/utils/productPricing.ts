/**
 * Funções de cálculo para precificação de produtos
 * Todos os valores monetários são em CENTAVOS
 */

// =====================================================
// INTERFACES
// =====================================================

export interface IngredientCostInput {
  packagePrice: number;    // Preço do pacote em centavos
  usedAmount: number;      // Quantidade usada (gramas/ml)
  packageWeight: number;   // Peso total do pacote (gramas/ml)
}

export interface ProductPricingInput {
  totalIngredientCost: number;      // Custo total dos ingredientes em centavos
  ingredientCostPercent: number;    // % de variáveis incalculáveis (default 25%)
  laborCostPercent: number;         // % de mão de obra (default 30%)
  profitMarginPercent: number;      // % de lucro (default 100%)
  packagingCostPerUnit: number;     // Custo de embalagem por unidade em centavos
  recipientAmount: number;          // Rendimento da receita (quantidade de unidades)
}

export interface ProductPricingResult {
  totalIngredientCost: number;      // Custo total dos ingredientes
  variablesCost: number;            // Custo de variáveis incalculáveis
  laborCost: number;                // Custo de mão de obra
  profitAmount: number;             // Valor do lucro
  costPerUnit: number;              // Custo por unidade
  packagingCostPerUnit: number;     // Custo de embalagem por unidade
  finalSalePrice: number;           // Preço final de venda direta
  iFoodBasicPrice: number;          // Preço para iFood plano básico (17%)
  iFoodPartnerPrice: number;        // Preço para iFood plano parceiro (28%)
}

// =====================================================
// FUNÇÕES DE CÁLCULO
// =====================================================

/**
 * Calcula o custo de um ingrediente individual
 * Fórmula: (preço do pacote × quantidade usada) / peso do pacote
 */
export function calculateIngredientCost(input: IngredientCostInput): number {
  const { packagePrice, usedAmount, packageWeight } = input;
  
  if (packageWeight === 0 || packageWeight === null || packageWeight === undefined) {
    return 0;
  }
  
  // Calcula o custo proporcional
  const cost = (packagePrice * usedAmount) / packageWeight;
  
  // Arredonda para centavos
  return Math.round(cost);
}

/**
 * Calcula o custo de variáveis incalculáveis (energia, gás, água, desgaste)
 * Fórmula: custo total × (percentual / 100)
 */
export function calculateVariablesCost(totalIngredientCost: number, percent: number): number {
  return Math.round(totalIngredientCost * (percent / 100));
}

/**
 * Calcula o custo de mão de obra
 * Fórmula: (custo total + variáveis) × (percentual / 100)
 */
export function calculateLaborCost(
  totalIngredientCost: number,
  variablesCost: number,
  laborPercent: number
): number {
  const base = totalIngredientCost + variablesCost;
  return Math.round(base * (laborPercent / 100));
}

/**
 * Calcula o valor do lucro
 * Fórmula: (custo total + variáveis + mão de obra) × (percentual / 100)
 */
export function calculateProfit(
  totalIngredientCost: number,
  variablesCost: number,
  laborCost: number,
  profitPercent: number
): number {
  const base = totalIngredientCost + variablesCost + laborCost;
  return Math.round(base * (profitPercent / 100));
}

/**
 * Calcula o custo por unidade
 * Fórmula: (custo total + variáveis + mão de obra) / rendimento
 */
export function calculateCostPerUnit(
  totalIngredientCost: number,
  variablesCost: number,
  laborCost: number,
  recipientAmount: number
): number {
  if (recipientAmount === 0) return 0;
  
  const totalCost = totalIngredientCost + variablesCost + laborCost;
  return Math.round(totalCost / recipientAmount);
}

/**
 * Calcula o preço final de venda direta
 * Fórmula: custo por unidade + lucro por unidade + embalagem
 */
export function calculateFinalSalePrice(
  costPerUnit: number,
  profitPerUnit: number,
  packagingCostPerUnit: number
): number {
  return costPerUnit + profitPerUnit + packagingCostPerUnit;
}

/**
 * Calcula o preço para iFood plano básico (17% de comissão)
 * Fórmula: preço final / (1 - 0.17)
 */
export function calculateIFoodBasicPrice(finalPrice: number): number {
  if (finalPrice === 0) return 0;
  return Math.round(finalPrice / 0.83);
}

/**
 * Calcula o preço para iFood plano parceiro (28% de comissão)
 * Fórmula: preço final / (1 - 0.28)
 */
export function calculateIFoodPartnerPrice(finalPrice: number): number {
  if (finalPrice === 0) return 0;
  return Math.round(finalPrice / 0.72);
}

/**
 * Calcula preço para uma plataforma com comissão customizada
 * @param finalPrice - Preço final de venda direta em centavos
 * @param commissionPercent - Percentual de comissão da plataforma
 */
export function calculatePlatformPrice(finalPrice: number, commissionPercent: number): number {
  if (finalPrice === 0 || commissionPercent >= 100) return 0;
  return Math.round(finalPrice / (1 - commissionPercent / 100));
}

/**
 * Calcula todos os valores de precificação de um produto
 * Esta é a função principal que deve ser usada na tela
 */
export function calculateFullProductPricing(input: ProductPricingInput): ProductPricingResult {
  const {
    totalIngredientCost,
    ingredientCostPercent,
    laborCostPercent,
    profitMarginPercent,
    packagingCostPerUnit,
    recipientAmount,
  } = input;

  // 1. Calcular variáveis incalculáveis
  const variablesCost = calculateVariablesCost(totalIngredientCost, ingredientCostPercent);

  // 2. Calcular mão de obra
  const laborCost = calculateLaborCost(totalIngredientCost, variablesCost, laborCostPercent);

  // 3. Calcular lucro total
  const profitAmount = calculateProfit(totalIngredientCost, variablesCost, laborCost, profitMarginPercent);

  // 4. Calcular custo por unidade (sem lucro e sem embalagem)
  const costPerUnit = calculateCostPerUnit(totalIngredientCost, variablesCost, laborCost, recipientAmount);

  // 5. Calcular lucro por unidade
  const profitPerUnit = recipientAmount > 0 ? Math.round(profitAmount / recipientAmount) : 0;

  // 6. Calcular preço final de venda direta
  const finalSalePrice = calculateFinalSalePrice(costPerUnit, profitPerUnit, packagingCostPerUnit);

  // 7. Calcular preços para plataformas
  const iFoodBasicPrice = calculateIFoodBasicPrice(finalSalePrice);
  const iFoodPartnerPrice = calculateIFoodPartnerPrice(finalSalePrice);

  return {
    totalIngredientCost,
    variablesCost,
    laborCost,
    profitAmount,
    costPerUnit,
    packagingCostPerUnit,
    finalSalePrice,
    iFoodBasicPrice,
    iFoodPartnerPrice,
  };
}

/**
 * Calcula o total de ingredientes a partir de uma lista
 */
export function calculateTotalIngredientCost(
  ingredients: Array<{ ingredient_cost: number }>
): number {
  return ingredients.reduce((sum, ing) => sum + (ing.ingredient_cost || 0), 0);
}

/**
 * Formata um valor em centavos para exibição em BRL
 */
export function formatCentsToBRL(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte um valor em BRL (string) para centavos
 */
export function parseBRLToCents(value: string): number {
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.-]/g, '');
  
  // Substitui vírgula por ponto para parseFloat
  const normalized = cleaned.replace(',', '.');
  
  // Converte para número e multiplica por 100
  const number = parseFloat(normalized);
  
  if (isNaN(number)) return 0;
  
  return Math.round(number * 100);
}

/**
 * Valida se os dados de entrada são válidos para cálculo
 */
export function validatePricingInput(input: Partial<ProductPricingInput>): string[] {
  const errors: string[] = [];

  if (input.recipientAmount !== undefined && input.recipientAmount <= 0) {
    errors.push('O rendimento da receita deve ser maior que zero');
  }

  if (input.ingredientCostPercent !== undefined && (input.ingredientCostPercent < 0 || input.ingredientCostPercent > 100)) {
    errors.push('O percentual de variáveis deve estar entre 0 e 100');
  }

  if (input.laborCostPercent !== undefined && (input.laborCostPercent < 0 || input.laborCostPercent > 100)) {
    errors.push('O percentual de mão de obra deve estar entre 0 e 100');
  }

  if (input.profitMarginPercent !== undefined && input.profitMarginPercent < 0) {
    errors.push('O percentual de lucro não pode ser negativo');
  }

  if (input.packagingCostPerUnit !== undefined && input.packagingCostPerUnit < 0) {
    errors.push('O custo de embalagem não pode ser negativo');
  }

  return errors;
}

// =====================================================
// CONSTANTES PADRÃO
// =====================================================

export const DEFAULT_INGREDIENT_COST_PERCENT = 25;
export const DEFAULT_LABOR_COST_PERCENT = 30;
export const DEFAULT_PROFIT_MARGIN_PERCENT = 100;
export const DEFAULT_PACKAGING_COST = 0;

export const IFOOD_BASIC_COMMISSION = 17;
export const IFOOD_PARTNER_COMMISSION = 28;
