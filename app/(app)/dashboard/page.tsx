'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Wallet, CalendarDays, HardHat, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalBudget: number;
  totalSpent: number;
  activeStages: number;
  completedStages: number;
  totalStages: number;
  activeProfessionals: number;
  recentExpenses: Array<{ title: string; amount: number; expense_date: string }>;
  budgetByCategory: Array<{ name: string; allocated: number; spent: number }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const [projectRes, expensesRes, stagesRes, profRes, catRes] = await Promise.all([
          supabase.from('projects').select('*').single(),
          supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
          supabase.from('stages').select('*'),
          supabase.from('professionals').select('*').eq('status', 'active'),
          supabase.from('budget_categories').select('id, name, allocated_amount'),
        ]);

        const expenses = expensesRes.data ?? [];
        const stages = stagesRes.data ?? [];
        const categories = catRes.data ?? [];
        const totalSpent = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

        const budgetByCategory = categories.slice(0, 6).map(cat => {
          const spent = expenses
            .filter(e => e.category_id === cat.id)
            .reduce((s, e) => s + e.amount, 0);
          return { name: cat.name, allocated: cat.allocated_amount, spent };
        });

        setStats({
          totalBudget: projectRes.data?.total_budget ?? 0,
          totalSpent,
          activeStages: stages.filter(s => s.status === 'in_progress').length,
          completedStages: stages.filter(s => s.status === 'completed').length,
          totalStages: stages.length,
          activeProfessionals: profRes.data?.length ?? 0,
          recentExpenses: expenses.slice(0, 5),
          budgetByCategory,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const spent = stats?.totalSpent ?? 0;
  const budget = stats?.totalBudget ?? 1;
  const remaining = budget - spent;
  const spentPct = Math.min(100, Math.round((spent / budget) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">סקירה כללית</h1>
        <p className="text-gray-500 text-sm mt-1">מצב הפרויקט עדכני</p>
      </div>

      {/* יתרה בולטת */}
      <div className={`rounded-2xl p-6 text-white ${remaining < 0 ? 'bg-red-500' : remaining < budget * 0.1 ? 'bg-amber-500' : 'bg-brand-600'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80 mb-1">יתרת תקציב</div>
            <div className="text-4xl font-bold">{formatMoney(remaining)}</div>
            <div className="text-sm opacity-70 mt-1">
              {remaining < 0 ? '⚠️ חריגה מהתקציב!' : `${spentPct}% מהתקציב נוצל`}
            </div>
          </div>
          <div className="text-left opacity-80 text-sm space-y-1">
            <div>תקציב כולל: <span className="font-semibold">{formatMoney(budget)}</span></div>
            <div>הוצאה עד כה: <span className="font-semibold">{formatMoney(spent)}</span></div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: `${spentPct}%` }}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="תקציב כולל"
          value={formatMoney(budget)}
          icon={<Wallet className="w-5 h-5" />}
          color="brand"
        />
        <KpiCard
          label="הוצאה עד כה"
          value={formatMoney(spent)}
          icon={<TrendingUp className="w-5 h-5" />}
          color={spentPct > 90 ? 'red' : 'green'}
        />
        <KpiCard
          label="שלבים"
          value={`${stats?.completedStages ?? 0}/${stats?.totalStages ?? 0}`}
          sub={`${stats?.activeStages ?? 0} בביצוע`}
          icon={<CalendarDays className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          label="אנשי מקצוע"
          value={stats?.activeProfessionals ?? 0}
          icon={<HardHat className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Budget by category */}
        {stats?.budgetByCategory && stats.budgetByCategory.some(c => c.spent > 0) && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">הוצאות לפי קטגוריה</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.budgetByCategory} layout="vertical">
                <XAxis type="number" tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="spent" name="הוצאה" fill="#389168" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent expenses */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">הוצאות אחרונות</h2>
          {(stats?.recentExpenses.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Clock className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">אין הוצאות עדיין</span>
            </div>
          ) : (
            <ul className="space-y-3">
              {stats?.recentExpenses.map((e, i) => (
                <li key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{e.title}</div>
                    <div className="text-xs text-gray-400">{new Date(e.expense_date).toLocaleDateString('he-IL')}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">{formatMoney(e.amount)}</div>
                    <div className="text-xs text-red-400">-{formatMoney(e.amount)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card !p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function formatMoney(n: number) {
  return `₪${n.toLocaleString('he-IL')}`;
}
