import { supabase } from '../lib/supabase';

// =====================================================
// INTERFACES
// =====================================================

export interface Product {
  id: string;
  company_id: string;
  name: string;
  category: string;
  description?: string;
  recipient_amount: number;
  recipient_unit: string;
  production_date: string;
  
  // Custos
  total_ingredient_cost: number;
  ingredient_cost_percent: number;
  labor_cost_percent: number;
  profit_margin_percent: number;
  
  // Preços calculados (em centavos)
  cost_per_unit: number;
  packaging_cost_per_unit: number;
  final_sale_price: number;
  ifood_basic_price?: number;
  ifood_partner_price?: number;
  
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: string;
  name: string;
  package_weight: number;
  package_price: number;
  used_amount: number;
  ingredient_cost: number;
  created_at: string;
  updated_at: string;
}

export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductIngredientInput = Omit<ProductIngredient, 'id' | 'created_at' | 'updated_at'>;

// =====================================================
// CATEGORIAS PADRÃO
// =====================================================

export const PRODUCT_CATEGORIES = [
  'Doce',
  'Salgado',
  'Bolo',
  'Pizza',
  'Bebida',
  'Lanche',
  'Refeição',
  'Sobremesa',
  'Outros',
];

export const RECIPIENT_UNITS = [
  'unidades',
  'gramas',
  'kg',
  'litros',
  'ml',
  'fatias',
  'porções',
];

// =====================================================
// FUNÇÕES DE PRODUTOS
// =====================================================

/**
 * Lista todos os produtos de uma empresa
 */
export async function listProducts(companyId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .order('production_date', { ascending: false });

  if (error) {
    console.error('[Products] Erro ao listar produtos:', error);
    throw error;
  }
  return data || [];
}

/**
 * Busca um produto pelo ID
 */
export async function getProduct(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[Products] Erro ao buscar produto:', error);
    throw error;
  }
  return data;
}

/**
 * Cria um novo produto
 */
export async function createProduct(product: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error('[Products] Erro ao criar produto:', error);
    throw error;
  }
  return data;
}

/**
 * Atualiza um produto existente
 */
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[Products] Erro ao atualizar produto:', error);
    throw error;
  }
  return data;
}

/**
 * Deleta um produto (e seus ingredientes em cascata)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('[Products] Erro ao deletar produto:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE INGREDIENTES
// =====================================================

/**
 * Lista todos os ingredientes de um produto
 */
export async function listProductIngredients(productId: string): Promise<ProductIngredient[]> {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Products] Erro ao listar ingredientes:', error);
    throw error;
  }
  return data || [];
}

/**
 * Cria um novo ingrediente
 */
export async function createProductIngredient(ingredient: ProductIngredientInput): Promise<ProductIngredient> {
  const { data, error } = await supabase
    .from('product_ingredients')
    .insert([ingredient])
    .select()
    .single();

  if (error) {
    console.error('[Products] Erro ao criar ingrediente:', error);
    throw error;
  }
  return data;
}

/**
 * Atualiza um ingrediente existente
 */
export async function updateProductIngredient(
  ingredientId: string,
  updates: Partial<ProductIngredient>
): Promise<ProductIngredient> {
  const { data, error } = await supabase
    .from('product_ingredients')
    .update(updates)
    .eq('id', ingredientId)
    .select()
    .single();

  if (error) {
    console.error('[Products] Erro ao atualizar ingrediente:', error);
    throw error;
  }
  return data;
}

/**
 * Deleta um ingrediente
 */
export async function deleteProductIngredient(ingredientId: string): Promise<void> {
  const { error } = await supabase
    .from('product_ingredients')
    .delete()
    .eq('id', ingredientId);

  if (error) {
    console.error('[Products] Erro ao deletar ingrediente:', error);
    throw error;
  }
}

/**
 * Deleta todos os ingredientes de um produto
 */
export async function deleteAllProductIngredients(productId: string): Promise<void> {
  const { error } = await supabase
    .from('product_ingredients')
    .delete()
    .eq('product_id', productId);

  if (error) {
    console.error('[Products] Erro ao deletar ingredientes:', error);
    throw error;
  }
}

/**
 * Busca produtos por categoria
 */
export async function listProductsByCategory(companyId: string, category: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .eq('category', category)
    .order('production_date', { ascending: false });

  if (error) {
    console.error('[Products] Erro ao listar produtos por categoria:', error);
    throw error;
  }
  return data || [];
}

/**
 * Busca produtos por nome (pesquisa)
 */
export async function searchProducts(companyId: string, searchTerm: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .ilike('name', `%${searchTerm}%`)
    .order('production_date', { ascending: false });

  if (error) {
    console.error('[Products] Erro ao pesquisar produtos:', error);
    throw error;
  }
  return data || [];
}
