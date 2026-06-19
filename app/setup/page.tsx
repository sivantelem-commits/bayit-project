'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Home, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: 'הבית שלי',
    address: '',
    total_budget: '',
    start_date: '',
    target_end_date: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.total_budget) return;
    setSaving(true);

    const { data: project } = await supabase.from('projects').insert({
      name: form.name,
      address: form.address || null,
      total_budget: parseFloat(form.total_budget),
      start_date: form.start_date || null,
      target_end_date: form.target_end_date || null,
    }).select().single();

    if (project) {
      await supabase.rpc('create_default_categories', { p_project_id: project.id });
      await supabase.rpc('create_default_stages', { p_project_id: project.id });
    }

    setSaving(false);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-sand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול בניית הבית</h1>
          <p className="text-gray-500 mt-2">הגדר את הפרויקט שלך להתחיל</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-sand-100 p-8 space-y-5">
          <div>
            <label className="label">שם הפרויקט</label>
            <input className="input" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="label">כתובת הנכס</label>
            <input className="input" placeholder="רחוב, עיר" value={form.address}
              onChange={e => setForm({...form, address: e.target.value})} />
          </div>
          <div>
            <label className="label">תקציב כולל (₪) *</label>
            <input className="input text-lg font-medium" type="number"
              placeholder="1500000" value={form.total_budget}
              onChange={e => setForm({...form, total_budget: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">תאריך התחלה</label>
              <input className="input" type="date" value={form.start_date}
                onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label className="label">יעד כניסה לבית</label>
              <input className="input" type="date" value={form.target_end_date}
                onChange={e => setForm({...form, target_end_date: e.target.value})} />
            </div>
          </div>

          <button
            className="btn-primary w-full justify-center py-3 text-base mt-2"
            onClick={save}
            disabled={saving || !form.total_budget}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check className="w-5 h-5" />התחל לנהל</>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          הגדרות ייווצרו אוטומטית: 15 קטגוריות תקציב + 14 שלבי בנייה
        </p>
      </div>
    </div>
  );
}
