'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, Camera, X, Check, Trash2, ZoomIn } from 'lucide-react';

interface Photo {
  id: string; url: string; caption: string | null;
  location_in_house: string | null; taken_at: string; stage_id: string | null;
}
interface Stage { id: string; name: string; }

const LOCATIONS = [
  'כניסה', 'סלון', 'מטבח', 'חדר שינה ראשי', 'חדר שינה 2', 'חדר שינה 3',
  'חדר אמבטיה', 'שירותים', 'מרפסת', 'חצר', 'גג', 'מחסן', 'גראז׳', 'כללי',
];

const emptyForm = {
  url: '', caption: '', location_in_house: '',
  taken_at: new Date().toISOString().slice(0,10), stage_id: ''
};

export default function PhotosPage() {
  const supabase = createClient();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [activeLocation, setActiveLocation] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const [pRes, sRes] = await Promise.all([
      supabase.from('photos').select('*').order('taken_at', { ascending: false }),
      supabase.from('stages').select('id, name').order('sort_order'),
    ]);
    setPhotos(pRes.data ?? []);
    setStages(sRes.data ?? []);
  }

  async function save() {
    if (!form.url) return;
    setSaving(true);
    const project = await supabase.from('projects').select('id').single();
    await supabase.from('photos').insert({
      project_id: project.data?.id,
      url: form.url, caption: form.caption || null,
      location_in_house: form.location_in_house || null,
      taken_at: form.taken_at,
      stage_id: form.stage_id || null,
    });
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deletePhoto(id: string) {
    if (!confirm('למחוק תמונה זו?')) return;
    await supabase.from('photos').delete().eq('id', id);
    load();
  }

  const locations = [...new Set(photos.map(p => p.location_in_house).filter(Boolean))];
  const filtered = activeLocation === 'all' ? photos : photos.filter(p => p.location_in_house === activeLocation);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תמונות ותיעוד</h1>
          <p className="text-sm text-gray-500 mt-0.5">{photos.length} תמונות בארכיון</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> הוסף תמונה
        </button>
      </div>

      {locations.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveLocation('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeLocation === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            הכל
          </button>
          {locations.map(loc => (
            <button key={loc!} onClick={() => setActiveLocation(loc!)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeLocation === loc ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {loc}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-medium">אין תמונות עדיין</div>
          <div className="text-sm mt-1">תעד את ההתקדמות עם תמונות מהאתר</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(photo => (
            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => setLightbox(photo)}>
              <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 w-6 h-6 transition-all" />
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-all">
                {photo.caption && <div className="text-white text-xs font-medium">{photo.caption}</div>}
                <div className="text-white/70 text-xs">{new Date(photo.taken_at).toLocaleDateString('he-IL')}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deletePhoto(photo.id); }}
                className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 left-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] text-center" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption ?? ''} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
            <div className="mt-3 text-white">
              {lightbox.caption && <div className="font-medium">{lightbox.caption}</div>}
              <div className="text-white/60 text-sm mt-1">
                {lightbox.location_in_house && `${lightbox.location_in_house} · `}
                {new Date(lightbox.taken_at).toLocaleDateString('he-IL')}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">תמונה חדשה</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">כתובת URL של התמונה *</label>
                <input className="input" type="url" placeholder="https://..." value={form.url}
                  onChange={e => setForm({...form, url: e.target.value})} />
                <p className="text-xs text-gray-400 mt-1">העלה ל-Google Photos / Imgur וצרף את הקישור</p>
              </div>
              {form.url && (
                <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={form.url} alt="" className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.style.display='none')} />
                </div>
              )}
              <div>
                <label className="label">כיתוב</label>
                <input className="input" placeholder="תיאור התמונה" value={form.caption}
                  onChange={e => setForm({...form, caption: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">מיקום בבית</label>
                  <select className="input" value={form.location_in_house}
                    onChange={e => setForm({...form, location_in_house: e.target.value})}>
                    <option value="">בחר מיקום</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">תאריך</label>
                  <input className="input" type="date" value={form.taken_at}
                    onChange={e => setForm({...form, taken_at: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">שלב בנייה</label>
                <select className="input" value={form.stage_id}
                  onChange={e => setForm({...form, stage_id: e.target.value})}>
                  <option value="">ללא שלב</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
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
