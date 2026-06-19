'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Check, Save } from 'lucide-react';

interface Project {
  id: string; name: string; address: string | null;
  total_budget: number; start_date: string | null;
  target_end_date: string | null; status: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: '', address: '', total_budget: '',
    start_date: '', target_end_date: '', status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('projects').select('*').single();
    if (data) {
      setProject(data);
      setForm({
        name: data.name ?? '',
        address: data.address ?? '',
        total_budget: String(data.total_budget ?? ''),
        start_date: data.start_date ?? '',
        target_end_date: data.target_end_date ?? '',
        status: data.status ?? 'active',
      });
    }
    setLoading(false);
  }

  async function save() {
    if (!project) return;
    setSaving(true);
    await supabase.from('projects').update({
      name: form.name,
      address: form.address || null,
      total_budget: parseFloat(form.total_budget) || 0,
      start_date: form.start_date || null,
      target_end_date: form.target_end_date || null,
      status: form.status,
    }).eq('id', project.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הגדרות פרויקט</h1>
        <p className="text-sm text-gray-500 mt-0.5">עדכון פרטי הפרויקט בכל עת</p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label">שם הפרויקט</label>
          <input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div>
          <label className="label">כתובת הנכס</label>
          <input className="input" placeholder="רחוב, עיר"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>

        <div>
          <label className="label">תקציב כולל (₪)</label>
          <input className="input text-lg font-medium" type="number"
            value={form.total_budget}
            onChange={e => setForm({ ...form, total_budget: e.target.value })} />
          {form.total_budget && (
            <p className="text-sm text-brand-600 mt-1 font-medium">
              ₪{parseFloat(form.total_budget).toLocaleString('he-IL')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">תאריך התחלה</label>
            <input className="input" type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <label className="label">יעד כניסה לבית</label>
            <input className="input" type="date" value={form.target_end_date}
              onChange={e => setForm({ ...form, target_end_date: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">סטטוס פרויקט</label>
          <select className="input" value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="planning">בתכנון</option>
            <option value="active">פעיל</option>
            <option value="completed">הושלם</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            className="btn-primary w-full justify-center py-3"
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <><Check className="w-5 h-5" />נשמר בהצלחה!</>
            ) : (
              <><Save className="w-5 h-5" />שמור שינויים</>
            )}
          </button>
        </div>
      </div>

      {/* Project info */}
      {project && (
        <div className="card bg-sand-50 !border-sand-200">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm">פרטי פרויקט</h2>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>מזהה פרויקט</span>
              <span className="font-mono text-xs">{project.id.slice(0, 8)}...</span>
            </div>
            {form.start_date && (
              <div className="flex justify-between">
                <span>תאריך התחלה</span>
                <span>{new Date(form.start_date).toLocaleDateString('he-IL')}</span>
              </div>
            )}
            {form.target_end_date && (
              <div className="flex justify-between">
                <span>יעד סיום</span>
                <span>{new Date(form.target_end_date).toLocaleDateString('he-IL')}</span>
              </div>
            )}
            {form.start_date && form.target_end_date && (
              <div className="flex justify-between">
                <span>ימים לסיום</span>
                <span className="font-medium text-brand-600">
                  {Math.max(0, Math.ceil((new Date(form.target_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} ימים
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
