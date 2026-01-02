/**
 * Category Aggregation Utilities
 * Extracted common logic for aggregating transactions by category.
 * Used by Dashboard, DRE, and Category Reports.
 * 
 * IMPORTANT: Do NOT modify behavior - this preserves existing Dashboard logic.
 */

export interface CategoryTotal {
    category: string;
    amount_cents: number;
    count: number;
}

export interface CategoryBreakdown {
    income: CategoryTotal[];
    expense: CategoryTotal[];
    incomeTotal: number;
    expenseTotal: number;
}

/**
 * Aggregates transactions by category, separating income and expense.
 * Returns sorted arrays (highest amount first) with totals.
 */
export function aggregateByCategory(txs: any[]): CategoryBreakdown {
    const incomeMap = new Map<string, { amount: number; count: number }>();
    const expenseMap = new Map<string, { amount: number; count: number }>();
    let incomeTotal = 0;
    let expenseTotal = 0;

    for (const tx of txs) {
        const cat = (tx.category || 'Sem categoria').trim();
        const amount = tx.amount_cents || 0;

        if (tx.type === 'income') {
            incomeTotal += amount;
            const cur = incomeMap.get(cat) || { amount: 0, count: 0 };
            cur.amount += amount;
            cur.count += 1;
            incomeMap.set(cat, cur);
        } else if (tx.type === 'expense') {
            expenseTotal += amount;
            const cur = expenseMap.get(cat) || { amount: 0, count: 0 };
            cur.amount += amount;
            cur.count += 1;
            expenseMap.set(cat, cur);
        }
    }

    const income: CategoryTotal[] = Array.from(incomeMap.entries())
        .map(([category, data]) => ({ category, amount_cents: data.amount, count: data.count }))
        .sort((a, b) => b.amount_cents - a.amount_cents);

    const expense: CategoryTotal[] = Array.from(expenseMap.entries())
        .map(([category, data]) => ({ category, amount_cents: data.amount, count: data.count }))
        .sort((a, b) => b.amount_cents - a.amount_cents);

    return { income, expense, incomeTotal, expenseTotal };
}

/**
 * Calculates percentage of each category relative to total.
 * Returns array with percentage added to each category.
 */
export function addCategoryPercentages(categories: CategoryTotal[], total: number): (CategoryTotal & { percent: number })[] {
    if (total === 0) {
        return categories.map(c => ({ ...c, percent: 0 }));
    }
    return categories.map(c => ({
        ...c,
        percent: Math.round((c.amount_cents / total) * 100),
    }));
}

/**
 * Gets top N categories and groups the rest as "Outros".
 * Useful for pie charts with limited slices.
 */
export function getTopCategories(categories: CategoryTotal[], topN: number = 5): CategoryTotal[] {
    if (categories.length <= topN) return categories;

    const top = categories.slice(0, topN);
    const others = categories.slice(topN);
    const othersTotal = others.reduce((sum, c) => sum + c.amount_cents, 0);
    const othersCount = others.reduce((sum, c) => sum + c.count, 0);

    if (othersTotal > 0) {
        top.push({
            category: 'Outros',
            amount_cents: othersTotal,
            count: othersCount,
        });
    }

    return top;
}
