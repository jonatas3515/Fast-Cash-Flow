/**
 * Helpers para a tela de PDV (POSScreen)
 * Conversão de produtos para itens de cupom
 */

// Tipos são definidos inline para evitar dependências circulares

export interface ReceiptItem {
    id: string;
    product_id?: string;
    code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price_cents: number;
    subtotal_cents: number;
}

export interface CartItem {
    product: {
        id: string;
        code: string | null;
        name: string;
        price_cents: number;
        unit: string;
        stock_quantity: number;
        category?: string | null;
        image_url?: string | null;
    };
    quantity: number;
}

/**
 * Converte um produto do carrinho em um item de cupom fiscal
 */
export function productToReceiptItem(product: CartItem['product'], quantity: number): ReceiptItem {
    return {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        code: product.code || '',
        description: product.name,
        quantity,
        unit: product.unit,
        unit_price_cents: product.price_cents,
        subtotal_cents: Math.round(product.price_cents * quantity),
    };
}

/**
 * Converte todo o carrinho em uma lista de itens de cupom fiscal
 */
export function cartToReceiptItems(cart: CartItem[]): ReceiptItem[] {
    return cart.map(item => productToReceiptItem(item.product, item.quantity));
}

/**
 * Calcula o total do carrinho em centavos
 */
export function calculateCartTotal(cart: CartItem[]): number {
    return cart.reduce((sum, item) => sum + (item.product.price_cents * item.quantity), 0);
}

/**
 * Calcula o total de itens no carrinho
 */
export function calculateCartItemCount(cart: CartItem[]): number {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}
