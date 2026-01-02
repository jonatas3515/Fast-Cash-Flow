/**
 * Transaction Classification Utilities
 * Extracted from RangeScreen.tsx for reuse across DRE, reports, and other screens.
 * 
 * IMPORTANT: Do NOT modify behavior - this is a direct extraction of existing logic.
 */

import { listRecurringExpenses, RecurringExpense } from '../repositories/recurring_expenses';

/**
 * Checks if a transaction matches a recurring expense pattern.
 * Used to classify expenses as "fixed" (recurring) vs "variable" (one-time).
 * 
 * Matching criteria:
 * - Description contains or is contained by recurring description
 * - Amount is within 8% tolerance (min 200 cents)
 * - Date is within recurring expense date range
 */
export function isTxFromRecurring(tx: any, recurring: RecurringExpense[]): boolean {
    if (!tx || tx.type !== 'expense') return false;
    const descTx = (tx.description || '').toLowerCase().trim();
    if (!descTx) return false;

    for (const rec of recurring) {
        const descRec = (rec.description || '').toLowerCase().trim();
        if (!descRec) continue;
        if (!(descTx.includes(descRec) || descRec.includes(descTx))) continue;

        const diff = Math.abs((tx.amount_cents || 0) - (rec.amount_cents || 0));
        const AMOUNT_TOLERANCE_PERCENT = 0.08;
        const MIN_TOLERANCE_CENTS = 200;
        const tolerance = Math.max(Math.round(rec.amount_cents * AMOUNT_TOLERANCE_PERCENT), MIN_TOLERANCE_CENTS);
        if (diff > tolerance) continue;

        const txDate = tx.date as string;
        if (rec.start_date && txDate < rec.start_date) continue;
        if (rec.end_date && txDate > rec.end_date) continue;

        return true;
    }

    return false;
}

/**
 * Classifies expense transactions as fixed (recurring) or variable (one-time).
 * Returns totals in cents.
 */
export async function classifyFixedVsVariable(txs: any[]): Promise<{ fixed: number; variable: number }> {
    const recurring = await listRecurringExpenses();
    let exp = 0;
    let fixed = 0;

    for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        const amount = tx.amount_cents || 0;
        exp += amount;
        if (isTxFromRecurring(tx, recurring)) {
            fixed += amount;
        }
    }

    const variable = Math.max(0, exp - fixed);
    return { fixed, variable };
}

/**
 * Classifies transactions with pre-loaded recurring expenses.
 * Use this when you already have the recurring list to avoid extra DB calls.
 */
export function classifyFixedVsVariableSync(txs: any[], recurring: RecurringExpense[]): { fixed: number; variable: number } {
    let exp = 0;
    let fixed = 0;

    for (const tx of txs) {
        if (tx.type !== 'expense') continue;
        const amount = tx.amount_cents || 0;
        exp += amount;
        if (isTxFromRecurring(tx, recurring)) {
            fixed += amount;
        }
    }

    const variable = Math.max(0, exp - fixed);
    return { fixed, variable };
}
