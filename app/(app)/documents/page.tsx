'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, FileText, X, Check, Trash2, AlertCircle, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

interface Document {
  id: string; title: string; category: string; file_url: string | null;
  file_name: string | null; issued_date: string | null; expiry_date: string | null;
  issuer: string | null; notes: string | null;
}

const CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  permit:     { label: 'היתר',      color: 'bg-purple-100 text-purple-700', icon: '🏛️' },
  contract:   { label: 'חוזה',      color: 'bg-blue-100 text-blue-700',     icon: '📋' },
  invoice:    { label: 'חשבונית',   color: 'bg-green-100 text-green-700',   icon: '🧾' },
  blueprint:  { label: 'תוכנית',    color: 'bg-orange-100 text-orange-700', icon: '📐' },
  insurance:  { label: 'ביטוח',     color: 'bg-red-100 text-red-700',       icon: '🛡️' },
  inspection: { label: 'בדיקה',     color: 'bg-teal-100 text-teal-700',     icon: '🔍' },
  other:      { label: 'אחר',       color: 'bg-gray-100 text-gray-600',     icon: '📄' },
};

const emptyForm = {
  title: '', category: 'permit', issued_date: '', expiry_date: '',
  issuer: '', notes: '', file_url: '',
};

export default function DocumentsPage() {
  const supabase = createClient();
  const [docs, setDocs] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocs(data ?? []);
  }

  async function save() {
    if (!form.title) return;
    setSaving(true);
    const project = await supabase.from('projects').select('id').single();
    await supabase.from('documents').insert({
      project_id: project.data?.id,
      title: form.title, category: form.category,
      issued_date: form.issued_date || null, expiry_date: form.expiry_date || null,
      issuer: form.issuer || null, notes: form.notes || null,
      file_url: form.file_url || null,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteDoc(id: string) {
    if (!confirm('למחוק מסמך זה?')) return;
    await supabase.from('documents').delete().eq('id', id);
    load();
  }

  const isExpiringSoon = (d: string) => {
    const days = (new Date(d).getTime() - Date.now()) / (1000*60*60*24);
    return days >= 0 && days <= 30;
  };
  const isExpired = (d: string) => new Date(d) < new Date();

  const filtered = activeCategory === 'all' ? docs : docs.filter(d => d.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מסמכים והיתרים</h1>
          <p className="text-sm text-gray-500 mt-0.5">ארכיון מסמכי הפרויקט</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> מסמך חדש
        </button>
      </div>

      {docs.filter(d => d.expiry_date && (isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date))).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-800 text-sm">מסמכים הדורשים תשומת לב</div>
            {docs.filter(d => d.expiry_date && (isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date))).map(d => (
              <div key={d.id} className="text-sm text-amber-700 mt-1">
                {d.title} — {isExpired(d.expiry_date!) ? 'פג תוקף' : 'פג תוקף בקרוב'}
                ({new Date(d.expiry_date!).toLocaleDateString('he-IL')})
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveCategory('all')}
          className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-sand-50')}>
          הכל ({docs.length})
        </button>
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => {
          const count = docs.filter(d => d.category === key).length;
          if (count === 0) return null;
          return (
            <button key={key} onClick={() => setActiveCategory(key)}
              className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                activeCategory === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-sand-50')}>
              {icon} {label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(doc => {
          const cat = CATEGORIES[doc.category] ?? CATEGORIES.other;
          const expired = doc.expiry_date && isExpired(doc.expiry_date);
          const expiring = doc.expiry_date && !expired && isExpiringSoon(doc.expiry_date);
          return (
            <div key={doc.id} className={clsx('card hover:shadow-md transition-shadow', expired && 'ring-1 ring-red-200')}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{doc.title}</div>
                    <span className={`badge ${cat.color} mt-0.5`}>{cat.label}</span>
                  </div>
                </div>
                <button onClick={() => deleteDoc(doc.id)} className="text-gray-200 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {doc.issuer && <div className="text-xs text-gray-500 mb-1">מנפיק: {doc.issuer}</div>}

              {doc.issued_date && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" /> הונפק: {new Date(doc.issued_date).toLocaleDateString('he-IL')}
                </div>
              )}

              {doc.expiry_date && (
                <div className={clsx('flex items-center gap-1 text-xs mt-0.5',
                  expired ? 'text-red-500' : expiring ? 'text-amber-500' : 'text-gray-400')}>
                  <AlertCircle className="w-3 h-3" />
                  תוקף: {new Date(doc.expiry_date).toLocaleDateString('he-IL')}
                  {expired && ' (פג תוקף)'}
                  {expiring && ' (בקרוב)'}
                </div>
              )}

              {doc.notes && <p className="text-xs text-gray-400 mt-2">{doc.notes}</p>}

              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  <FileText className="w-3.5 h-3.5" /> צפה בקובץ
                </a>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div>אין מסמכים עדיין</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">מסמך חדש</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">כותרת *</label>
                <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div>
                <label className="label">קטגוריה</label>
                <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">מנפיק</label>
                <input className="input" placeholder="עיריה, בנק, קבלן..." value={form.issuer}
                  onChange={e => setForm({...form, issuer: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">תאריך הנפקה</label>
                  <input className="input" type="date" value={form.issued_date}
                    onChange={e => setForm({...form, issued_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">תאריך תפוגה</label>
                  <input className="input" type="date" value={form.expiry_date}
                    onChange={e => setForm({...form, expiry_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">קישור לקובץ (URL)</label>
                <input className="input" type="url" placeholder="https://..." value={form.file_url}
                  onChange={e => setForm({...form, file_url: e.target.value})} />
                <p className="text-xs text-gray-400 mt-1">העלה קודם ל-Google Drive ושמור כאן את הקישור</p>
              </div>
              <div>
                <label className="label">הערות</label>
                <textarea className="input resize-none" rows={2} value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})} />
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
