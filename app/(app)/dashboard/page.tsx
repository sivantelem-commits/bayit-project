'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import {
  Wallet, CalendarDays, HardHat, TrendingUp,
  AlertTriangle, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalBudget: number;
  totalSpent: number;
  activeStages: number;
  completedStages: number;
  totalStages: number;
  activeProfessionals: number;
  pendingTasks: number;
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
        const [projectRes, expensesRes, stagesRes, profRes, tasksRes, catRes] = await Promise.all([
          supabase.from('projects').select('*').single(),
          supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
          supabase.from('stages').select('*'),
          supabase.from('professionals').select('*').eq('status', 'active'),
          supabase.from('tasks').select('*').neq('status', 'done'),
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
          pendingTasks: tasksRes.data?.length ?? 0,
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
  const spentPct = Math.min(100, Math.round((spent / budget) * 100));
  const remaining = budget - spent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">סקירה כללית</h1>
        <p className="text-gray-500 text-sm mt-1">מצב הפרויקט עדכני</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="תקציב שנוצל"
          value={`${spentPct}%`}
          sub={`${formatMoney(spent)} מתוך ${formatMoney(budget)}`}
          icon={<Wallet className="w-5 h-5" />}
          color="brand"
          alert={spentPct > 80}
        />
        <KpiCard
          label="יתרת תקציב"
          value={formatMoney(remaining)}
          sub={remaining < 0 ? 'חריגה מהתקציב!' : 'נותר לשימוש'}
          icon={<TrendingUp className="w-5 h-5" />}
          color={remaining < 0 ? 'red' : 'green'}
        />
        <KpiCard
          label="שלבים פעילים"
          value={`${stats?.completedStages ?? 0}/${stats?.totalStages ?? 0}`}
          sub={`${stats?.activeStages ?? 0} בביצוע כעת`}
          icon={<CalendarDays className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          label="אנשי מקצוע"
          value={stats?.activeProfessionals ?? 0}
          sub={`${stats?.pendingTasks ?? 0} משימות פתוחות`}
          icon={<HardHat className="w-5 h-5" />}
          color="purple"
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">ניצול תקציב</h2>
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${spentPct > 90 ? 'bg-red-500' : spentPct > 70 ? 'bg-amber-400' : 'bg-brand-500'}`}
            style={{ width: `${spentPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>₪0</span>
          <span className="font-medium text-gray-700">{spentPct}% נוצל</span>
          <span>{formatMoney(budget)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {stats?.budgetByCategory && stats.budgetByCategory.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">הוצאות לפי קטגוריה</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.budgetByCategory} layout="vertical">
                <XAxis type="number" tickFormatter={v => `₪${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="allocated" name="תקציב" fill="#e2e8f0" radius={[0,4,4,0]} />
                <Bar dataKey="spent" name="הוצאה" fill="#389168" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">הוצאות אחרונות</h2>
          {stats?.recentExpenses.length === 0 ? (
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
                  <span className="text-sm font-semibold text-gray-900">{formatMoney(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color, alert }: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; alert?: boolean;
}) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className={`card !p-5 relative ${alert ? 'ring-1 ring-amber-300' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
      {alert && <AlertTriangle className="w-4 h-4 text-amber-400 absolute top-4 left-4" />}
    </div>
  );
}

function formatMoney(n: number) {
  return `₪${n.toLocaleString('he-IL')}`;
}
