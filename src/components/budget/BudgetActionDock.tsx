import { Coins, Download, Plus, Save, Sparkles } from 'lucide-react';

export function BudgetActionDock({
  busy,
  onAddExpense,
  onComparePrices,
  onUpdateBudget,
  onAskSavings,
  onExport
}: {
  busy?: boolean;
  onAddExpense: () => void;
  onComparePrices: () => void;
  onUpdateBudget: () => void;
  onAskSavings: () => void;
  onExport: () => void;
}) {
  return (
    <nav className="budget-action-dock" aria-label="Budget actions">
      <button type="button" onClick={onAddExpense}><Plus size={16} /> Add Expense</button>
      <button type="button" onClick={onComparePrices} disabled={busy}><Coins size={16} /> Compare Prices</button>
      <button type="button" onClick={onUpdateBudget}><Save size={16} /> Update Budget</button>
      <button type="button" onClick={onAskSavings} disabled={busy}><Sparkles size={16} /> Ask AI About Savings</button>
      <button type="button" onClick={onExport}><Download size={16} /> Export Budget</button>
    </nav>
  );
}
