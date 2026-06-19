'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, X, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Stage {
  id: string; name: string; description: string | null;
  start_date: string | null; end_date: string | null;
  status: string; progress_pct: number; color: string; sort_order: number;
}

const STATUS = {
  pending:     { label: 'טרם התחיל', color: 'bg-gray-100 text-gray-500' },
  in_progress: { label: 'בביצוע',    color: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'הושלם',    color: 'bg-green-100 text-green-700' },
  delayed:     { label: 'באיחור',   color: 'bg-red-100 text-red-600' },
};

const COLORS = ['#6366F1','#EF4444','#F59E0B','#3B82F6','#EC4899','#14B8A6','#8B5CF6','#22C55E','#F97316','#06B6D4'];

const emptyForm = {
  name: '', description: '', start_date: '', end_date: '',
  status: 'pending', progress_pct: '0', color: '#389168',
};

export default function TimelinePage() {
  const supabase = createClient();
  const [stages, setStages] = useState<Stage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('stages').select('*').order('sort_order');
    setStages(data ?? []);
  }

  async function save() {
    if (!form.name) return;
    setSaving(true);
    const project = await supabase.from('projects').select('id').single();
    await supabase.from('stages').insert({
      project_id: project.data?.id,
      name: form.name, description: form.description || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      status: form.status,
      progress_pct: parseInt(form.progress_pct) || 0,
      color: form.color,
      sort_order: stages.length + 1,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function updateProgress(id: string, pct: number) {
    await supabase.from('stages').update({ progress_pct: pct }).eq('id', id);
    load();
  }

  async function updateStatus(id: string, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.progress_pct = 100;
    if (status === 'in_progress' && stages.find(s => s.id === id)?.progress_pct === 0)
      updates.progress_pct = 10;
    await supabase.from('stages').update(updates).eq('id', id);
    load();
  }

  const hasDates = stages.some(s => s.start_date && s.end_date);
  const allDates = stages.flatMap(s => [s.start_date, s.end_date]).filter(Boolean) as string[];
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => new Date(d).getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : new Date(Date.now() + 365*24*60*60*1000);
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000*60*60*24));

  function barLeft(d: string) {
    return ((new Date(d).getTime() - minDate.getTime()) / (1000*60*60*24) / totalDays) * 100;
  }
  function barWidth(s: string, e: string) {
    return Math.max(1, (new Date(e).getTime() - new Date(s).getTime()) / (1000*60*60*24) / totalDays * 100);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">לוח זמנים</h1>
          <p className="text-sm text-gray-500 mt-0.5">שלבי הבנייה ומעקב התקדמות</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> שלב חדש
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS).map(([k, { label, color }]) => (
          <div key={k} className="card !p-4 text-center">
            <span className={`badge ${color} mb-1`}>{label}</span>
            <div className="text-2xl font-bold text-gray-900">{stages.filter(s => s.status === k).length}</div>
          </div>
        ))}
      </div>

      {hasDates && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-gray-900 mb-4">גאנט</h2>
          <div className="min-w-[600px]">
            {stages.filter(s => s.start_date && s.end_date).map(stage => (
              <div key={stage.id} className="flex items-center gap-3 mb-2">
                <div className="w-36 text-xs text-gray-600 font-medium truncate flex-shrink-0 text-right">{stage.name}</div>
                <div className="flex-1 h-7 bg-gray-100 rounded-lg relative">
                  <div
                    className="absolute h-full rounded-lg opacity-80 flex items-center px-2"
                    style={{
                      right: `${barLeft(stage.start_date!)}%`,
                      width: `${barWidth(stage.start_date!, stage.end_date!)}%`,
                      backgroundColor: stage.color,
                    }}
                  >
                    <span className="text-white text-xs font-medium truncate">{stage.progress_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {stages.map((stage, i) => {
          const st = STATUS[stage.status as keyof typeof STATUS] ?? STATUS.pending;
          return (
            <div key={stage.id} className="card">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: stage.color }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                    <span className={`badge ${st.color}`}>{st.label}</span>
                  </div>
                  {stage.description && <p className="text-sm text-gray-500 mb-2">{stage.description}</p>}
                  {(stage.start_date || stage.end_date) && (
                    <div className="text-xs text-gray-400 mb-2">
                      {stage.start_date && new Date(stage.start_date).toLocaleDateString('he-IL')}
                      {stage.start_date && stage.end_date && ' — '}
                      {stage.end_date && new Date(stage.end_date).toLocaleDateString('he-IL')}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${stage.progress_pct}%`, backgroundColor: stage.color }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{stage.progress_pct}%</span>
                  </div>
                </div>
                <select
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={stage.status}
                  onChange={e => updateStatus(stage.id, e.target.value)}
                >
                  {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400 ml-2 self-center">התקדמות:</span>
                {[0,25,50,75,90,100].map(p => (
                  <button key={p}
                    onClick={() => updateProgress(stage.id, p)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded-lg transition-colors',
                      stage.progress_pct === p
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {stages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🏗️</div>
            <div>הוסף את שלבי הבנייה</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">שלב חדש</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">שם השלב *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="label">תיאור</label>
                <textarea className="input resize-none" rows={2} value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">תאריך התחלה</label>
                  <input className="input" type="date" value={form.start_date}
                    onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">תאריך סיום</label>
                  <input className="input" type="date" value={form.end_date}
                    onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">סטטוס</label>
                  <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">צבע</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setForm({...form, color: c})}
                        className={clsx('w-6 h-6 rounded-full transition-transform', form.color === c && 'ring-2 ring-offset-1 ring-gray-400 scale-110')}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>
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
