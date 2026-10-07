import { useRef } from 'react';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAction } from './useLoad';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const src = (p) => (p.url?.startsWith('/') ? `${BACKEND}${p.url}` : p.url);

export const ProjectPhotos = ({ projectId, photos, onChange }) => {
  const camRef = useRef(null);
  const galRef = useRef(null);
  const { busy, run } = useAction();
  const list = photos.filter((p) => p.url);

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).slice(0, 10).forEach((f) => fd.append('files', f));
    const r = await run('upload', () => adminApi.uploadProjectPhotos(projectId, fd), `${files.length} photo(s) ajoutée(s)`);
    if (r) onChange([...photos, ...r.data.photos]);
  };

  const remove = async (pid) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    if (await run(pid, () => adminApi.deleteProjectPhoto(projectId, pid), 'Photo supprimée')) onChange(photos.filter((p) => p.id !== pid));
  };

  return (
    <div data-testid="m-project-photos">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button data-testid="m-photo-camera-btn" onClick={() => camRef.current?.click()} disabled={busy === 'upload'}
          className="h-12 rounded-xl bg-[#D4AF37] text-[#0B1120] text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
          {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Prendre photo
        </button>
        <button data-testid="m-photo-gallery-btn" onClick={() => galRef.current?.click()} disabled={busy === 'upload'}
          className="h-12 rounded-xl bg-white/5 border border-[#1E293B] text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
          <ImagePlus className="h-4 w-4" /> Galerie
        </button>
      </div>
      <input ref={camRef} data-testid="m-photo-camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      <input ref={galRef} data-testid="m-photo-gallery-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune photo de chantier.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {list.map((p) => (
            <div key={p.id} className="relative" data-testid={`m-photo-${p.id}`}>
              <a href={src(p)} target="_blank" rel="noopener noreferrer"><img src={src(p)} alt="" className="aspect-square w-full rounded-xl object-cover" loading="lazy" /></a>
              <button data-testid={`m-photo-delete-${p.id}`} onClick={() => remove(p.id)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 flex items-center justify-center">
                {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin text-white" /> : <X className="h-3.5 w-3.5 text-white" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
