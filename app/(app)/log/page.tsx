'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, BookOpen, X, Check, Trash2 } from 'lucide-react';

interface LogEntry {
  id: string; log_date: string; summary: string;
  workers_on_site: string | null; weather: string | null;
}

const WEATHER = ['☀️ בהיר', '⛅ מעונן חלקית', '☁️ מעונן', '🌧️ גשם', '🌩️ סופה', '❄️ קור'];

const emptyForm = {
  log_date: new Date().toISOString().slice(0, 10),
  summary: '', workers_on_site: '', weather: '',
};

export default function LogPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('daily_logs').select('*').order('log_date', { ascending: false });
    setLogs(data ?? []);
  }

  async function save() {
    if (!form.summary) return;
    setSaving(true);
    const project = await supabase.from('projects').select('id').single();
    await supabase.from('daily_logs').insert({
      project_id: project.data?.id,
      log_date: form.log_date,
      summary: form.summary,
      workers_on_site: form.workers_on_site || null,
      weather: form.weather || null,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteLog(id: string) {
    if (!confirm('למחוק רשומה זו?')) return;
    await supabase.from('daily_logs').delete().eq('id', id);
    load();
  }

  const grouped: Record<string, LogEntry[]> = {};
  logs.forEach(l => {
    const month = l.log_date.slice(0, 7);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(l);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">יומן עבודה</h1>
          <p className="text-sm text-gray-500 mt-0.5">לוג יומי של ההתקדמות באתר</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> רשומה חדשה
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-medium">היומן ריק</div>
          <div className="text-sm mt-1">תעד מה קרה באתר כל יום</div>
        </div>
      ) : (
        Object.entries(grouped).map(([month, entries]) => (
          <div key={month}>
            <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <span>{new Date(month + '-01').toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
              <span className="w-8 h-px bg-gray-200 inline-block" />
              <span className="text-gray-400 font-normal">{entries.length} רשומות</span>
            </h2>
            <div className="space-y-3">
              {entries.map(log => (
                <div key={log.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 text-center bg-sand-100 rounded-xl px-3 py-2 min-w-[52px]">
                        <div className="text-xs text-gray-400">
                          {new Date(log.log_date).toLocaleDateString('he-IL', { weekday: 'short' })}
                        </div>
                        <div className="text-xl font-bold text-gray-900 leading-tight">
                          {new Date(log.log_date).getDate()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {log.weather && <span className="text-sm">{log.weather}</span>}
                          {log.workers_on_site && (
                            <span className="text-xs text-gray-400">👷 {log.workers_on_site}</span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{log.summary}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteLog(log.id)} className="text-gray-200 hover:text-red-400 mr-2 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">רשומה חדשה</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">תאריך</label>
                <input className="input" type="date" value={form.log_date}
                  onChange={e => setForm({...form, log_date: e.target.value})} />
              </div>
              <div>
                <label className="label">מה נעשה היום *</label>
                <textarea className="input resize-none" rows={4}
                  placeholder="תאר את העבודה שבוצעה, הישגים, בעיות שעלו..."
                  value={form.summary}
                  onChange={e => setForm({...form, summary: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">מי היה באתר</label>
                  <input className="input" placeholder="שמות, מספר פועלים..." value={form.workers_on_site}
                    onChange={e => setForm({...form, workers_on_site: e.target.value})} />
                </div>
                <div>
                  <label className="label">מזג אוויר</label>
                  <select className="input" value={form.weather}
                    onChange={e => setForm({...form, weather: e.target.value})}>
                    <option value="">בחר</option>
                    {WEATHER.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
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
