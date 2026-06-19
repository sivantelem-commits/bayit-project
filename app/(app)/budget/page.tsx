'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, Trash2, Receipt, X, Check, Pencil } from 'lucide-react';
import { clsx } from 'clsx';

interface Category { id: string; name: string; allocated_amount: number; color: string; }
interface Expense {
  id: string; title: string; amount: number; expense_date: string;
  category_id: string | null; invoice_number: string | null;
  status: string; notes: string | null;
}
interface Project { id: string; total_budget: number; name: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid:      { label: 'שולם',  color: 'bg-green-100 text-green-700' },
  pending:   { label: 'ממתין', color: 'bg-amber-100 text-amber-700' },
  cancelled: { label: 'בוטל',  color: 'bg-gray-100 text-gray-500' },
};

const emptyForm = {
  title: '', amount: '', expense_date: new Date().toISOString().slice(0, 10),
  category_id: '', invoice_number: '', status: 'paid', notes: '',
};

export default function BudgetPage() {
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const [projRes, catRes, expRes] = await Promise.all([
      supabase.from('projects').select('*').single(),
      supabase.from('budget_categories').select('*').order('sort_order'),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    ]);
    setProject(projRes.data);
    setCategories(catRes.data ?? []);
    setExpenses(expRes.data ?? []);
  }

  async function saveBudget() {
    if (!newBudget || !project) return;
    setSaving(true);
    await supabase.from('projects').update({ total_budget: parseFloat(newBudget) }).eq('id', project.id);
    setShowBudgetEdit(false);
    setSaving(false);
    load();
  }

  async function saveExpense() {
    if (!form.title || !form.amount) return;
    setSaving(true);
    await supabase.from('expenses').insert({
      project_id: project?.id,
      title: form.title,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      category_id: form.category_id || null,
      invoice_number: form.invoice_number || null,
      status: form.status,
      notes: form.notes || null,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteExpense(id: string) {
    if (!confirm('למחוק הוצאה זו?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    load();
  }

  const filtered = activeCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category_id === activeCategory);

  const totalBudget = project?.total_budget ?? 0;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = totalBudget - totalSpent;
  const spentPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תקציב והוצאות</h1>
          <p className="text-sm text-gray-500 mt-0.5">מעקב חשבוניות וסיכום</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> הוצאה חדשה
        </button>
      </div>

      {/* Budget summary */}
      <div className={`rounded-2xl p-6 text-white ${remaining < 0 ? 'bg-red-500' : remaining < totalBudget * 0.1 ? 'bg-amber-500' : 'bg-brand-600'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm opacity-80 mb-1">יתרת תקציב</div>
            <div className="text-4xl font-bold">{fmt(remaining)}</div>
            <div className="text-sm opacity-70 mt-1">
              {remaining < 0 ? '⚠️ חריגה מהתקציב!' : `${spentPct}% מהתקציב נוצל`}
            </div>
          </div>
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70">תקציב כולל:</span>
              <span className="font-semibold">{fmt(totalBudget)}</span>
              <button
                onClick={() => { setNewBudget(String(totalBudget)); setShowBudgetEdit(true); }}
                className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            <div className="text-sm opacity-70">הוצאה עד כה: <span className="font-semibold">{fmt(totalSpent)}</span></div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${spentPct}%` }} />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-sand-50')}>
          הכל
        </button>
        {categories.map(c => {
          const spent = expenses.filter(e => e.category_id === c.id).reduce((s, e) => s + e.amount, 0);
          if (spent === 0) return null;
          return (
            <button key={c.id} onClick={() => setActiveCategory(c.id)}
              className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeCategory === c.id ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-sand-50')}>
              {c.name} · {fmt(spent)}
            </button>
          );
        })}
      </div>

      {/* Expenses table */}
      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sand-50 border-b border-sand-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-500">כותרת</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">תאריך</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">חשבונית</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">סטטוס</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">סכום</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <div>אין הוצאות עדיין</div>
                </td>
              </tr>
            )}
            {filtered.map(exp => {
              const cat = categories.find(c => c.id === exp.category_id);
              const st = STATUS_LABELS[exp.status] ?? STATUS_LABELS.paid;
              return (
                <tr key={exp.id} className="hover:bg-sand-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{exp.title}</td>
                  <td className="px-4 py-3 text-gray-500">{cat?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(exp.expense_date).toLocaleDateString('he-IL')}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{exp.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`badge ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-left">{fmt(exp.amount)}</td>
                  <td className="px-4 py-3 text-left">
                    <button onClick={() => deleteExpense(exp.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-sand-50 border-t border-sand-100">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-600">סה״כ</td>
                <td className="px-4 py-3 text-left font-bold text-gray-900">
                  {fmt(filtered.reduce((s, e) => s + e.amount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Edit budget modal */}
      {showBudgetEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">עדכון תקציב כולל</h2>
              <button onClick={() => setShowBudgetEdit(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <label className="label">תקציב כולל (₪)</label>
              <input className="input text-xl font-medium" type="number"
                value={newBudget} onChange={e => setNewBudget(e.target.value)}
                autoFocus />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button className="btn-primary flex-1 justify-center" onClick={saveBudget} disabled={saving}>
                {saving ? '...' : <><Check className="w-4 h-4" />שמור</>}
              </button>
              <button className="btn-secondary" onClick={() => setShowBudgetEdit(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">הוצאה חדשה</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">כותרת *</label>
                <input className="input" placeholder="תיאור ההוצאה" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">סכום (₪) *</label>
                  <input className="input" type="number" placeholder="0" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="label">תאריך</label>
                  <input className="input" type="date" value={form.expense_date}
                    onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">קטגוריה</label>
                <select className="input" value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">בחר קטגוריה</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">מס׳ חשבונית</label>
                  <input className="input" placeholder="INV-001" value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })} />
                </div>
                <div>
                  <label className="label">סטטוס</label>
                  <select className="input" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="paid">שולם</option>
                    <option value="pending">ממתין</option>
                    <option value="cancelled">בוטל</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">הערות</label>
                <textarea className="input resize-none" rows={2} value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button className="btn-primary flex-1 justify-center" onClick={saveExpense} disabled={saving}>
                {saving ? '...' : <><Check className="w-4 h-4" />שמור</>}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(n: number) { return `₪${n.toLocaleString('he-IL')}`; }
