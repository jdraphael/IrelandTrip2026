import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BudgetIntelligence } from '../../../lib/budgetIntelligence';
import { euroMoney } from '../budgetShared';

export function SpendingOverviewChart({ intelligence }: { intelligence: BudgetIntelligence }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={intelligence.categories}>
        <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="title" tick={{ fill: '#cfe9d9', fontSize: 10 }} interval={0} tickFormatter={(value) => String(value).split(' ')[0]} />
        <YAxis tick={{ fill: '#9bb9a9', fontSize: 10 }} tickFormatter={(value) => `EUR ${Math.round(Number(value) / 1000)}k`} />
        <Tooltip formatter={(value) => euroMoney.format(Number(value))} contentStyle={{ background: '#06261d', border: '1px solid rgba(94,224,160,.25)', borderRadius: 12, color: '#fff8e9' }} />
        <Bar dataKey="planned" radius={[8, 8, 0, 0]}>
          {intelligence.categories.map((category) => <Cell key={category.id} fill={category.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendForecastChart({ intelligence }: { intelligence: BudgetIntelligence }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={intelligence.timeline.daily}>
        <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#cfe9d9', fontSize: 10 }} />
        <YAxis tick={{ fill: '#9bb9a9', fontSize: 10 }} tickFormatter={(value) => `EUR ${Number(value)}`} />
        <Tooltip formatter={(value) => euroMoney.format(Number(value))} contentStyle={{ background: '#06261d', border: '1px solid rgba(94,224,160,.25)', borderRadius: 12, color: '#fff8e9' }} />
        <Legend wrapperStyle={{ color: '#cfe9d9', fontSize: 12 }} />
        <Bar dataKey="planned" fill="#5ee0a0" radius={[8, 8, 0, 0]} />
        <Bar dataKey="actual" fill="#d9b95b" radius={[8, 8, 0, 0]} />
        <Line type="monotone" dataKey="transportation" stroke="#b9fff0" strokeWidth={2} dot={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
