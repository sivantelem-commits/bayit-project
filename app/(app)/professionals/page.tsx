'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, Phone, Mail, Star, X, Check, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Professional {
  id: string; name: string; role: string; phone: string | null;
  email: string | null; company: string | null; contract_amount: number | null;
  paid_amount: number; status: string; rating: number | null; notes: string | null;
  start_date: string | null; end_date: string | null;
}

const STATUS = {
  pending:   { label: 'טרם התחיל', color: 'bg-gray-100 text-gray-600' },
  active:    { label: 'פעיל',      color: 'bg-green-100 text-green-700' },
  completed: { label: 'הושלם',    color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'בוטל',     color: 'bg-red-100 text-red-600' },
};

const ROLES = [
  'אדריכל', 'מהנדס קונסטרוקציה', 'קבלן ראשי', 'קבלן עפר',
  'חשמלאי', 'אינסטלטור', 'טייח', 'מרצף', 'נגר', 'צבעי',
  'מסגר אלומיניום', 'גבסן', 'מיזוג אוויר', 'גנן', 'מעצב פנים', 'אחר',
];

const emptyForm = {
  name: '', role: '', phone: '', email: '', company: '',
  contract_amount: '', paid_amount: '0',
  status: 'pending', start_date: '', end_date: '', notes: '',
};

export default function ProfessionalsPage() {
  const supabase = createClient();
  const [pros, setPros] = useState<Professional[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('professionals').select('*').order('created_at');
    setPros(data ?? []);
  }

  async function save() {
    if (!form.name || !form.role) return;
    setSaving(true);
    const project = await supabase.from('projects').select('id').single();
    await supabase.from('professionals').insert({
      project_id: project.data?.id,
      name: form.name, role: form.role,
      phone: form.phone || null, email: form.email || null,
      company: form.company || null,
      contract_amount: form.contract_amount ? parseFloat(form.contract_amount) : null,
      paid_amount: parseFloat(form.paid_amount) || 0,
      status: form.status,
      start_date: form.start_date || null, end_date: form.end_date || null,
      notes: form.notes || null,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deletePro(id: string) {
    if (!confirm('למחוק איש מקצוע זה?')) return;
    await supabase.from('professionals').delete().eq('id', id);
    load();
  }

  const filtered = activeStatus === 'all' ? pros : pros.filter(p => p.status === activeStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">אנשי מקצוע</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול קבלנים וספקים</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> הוסף איש מקצוע
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS).map(([key, { label, color }]) => (
          <div key={key} className="card !p-4 text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveStatus(activeStatus === key ? 'all' : key)}>
            <div className={`badge ${color} mx-auto mb-1`}>{label}</div>
            <div className="text-xl font-bold text-gray-900">
              {pros.filter(p => p.status === key).length}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(pro => {
          const st = STATUS[pro.status as keyof typeof STATUS] ?? STATUS.pending;
          const paidPct = pro.contract_amount
            ? Math.min(100, Math.round((pro.paid_amount / pro.contract_amount) * 100))
            : 0;
          return (
            <div key={pro.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{pro.name}</div>
                  <div className="text-sm text-gray-500">{pro.role}</div>
                  {pro.company && <div className="text-xs text-gray-400">{pro.company}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${st.color}`}>{st.label}</span>
                  <button onClick={() => deletePro(pro.id)} className="text-gray-200 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {pro.phone && (
                  <a href={`tel:${pro.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                    <Phone className="w-3.5 h-3.5" /> {pro.phone}
                  </a>
                )}
                {pro.email && (
                  <a href={`mailto:${pro.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                    <Mail className="w-3.5 h-3.5" /> {pro.email}
                  </a>
                )}
              </div>

              {pro.contract_amount && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>תשלום</span>
                    <span>{fmt(pro.paid_amount)} / {fmt(pro.contract_amount)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${paidPct}%` }} />
                  </div>
                </div>
              )}

              {pro.rating && (
                <div className="flex mt-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= pro.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">👷</div>
            <div>אין אנשי מקצוע עדיין</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">איש מקצוע חדש</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">שם *</label>
                  <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="label">תפקיד *</label>
                  <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="">בחר תפקיד</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">חברה</label>
                <input className="input" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">טלפון</label>
                  <input className="input" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="label">אימייל</label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">סכום חוזה (₪)</label>
                  <input className="input" type="number" value={form.contract_amount} onChange={e => setForm({...form, contract_amount: e.target.value})} />
                </div>
                <div>
                  <label className="label">שולם עד כה (₪)</label>
                  <input className="input" type="number" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">סטטוס</label>
                  <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">תחילת עבודה</label>
                  <input className="input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">סיום משוער</label>
                  <input className="input" type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">הערות</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
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

function fmt(n: number) { return `₪${n.toLocaleString('he-IL')}`; }
