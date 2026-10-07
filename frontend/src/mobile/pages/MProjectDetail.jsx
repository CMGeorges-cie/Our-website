import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, FileDown, FilePlus2, Trash2, Send, User } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, MCard, Section, Loading, Pill, MButton, KV, Chips, inputCls } from '../components/MUi';
import { ContactActions, fullAddress } from '../components/ContactActions';
import { ProjectForm } from '../components/ProjectForm';
import { ProjectPhotos } from '../components/ProjectPhotos';
import { ProjectTasks } from '../components/ProjectTasks';
import { useLoad, useAction } from '../components/useLoad';
import { openPdf } from './MQuoteDetail';
import { PROJECT_STATUS, SERVICE_TYPES, shortDate } from '../constants';

const STATUS_OPTS = Object.entries(PROJECT_STATUS).map(([k, v]) => [k, v.label]);

export default function MProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [edit, setEdit] = useState(false);
  const [note, setNote] = useState('');
  const { data, setData, loading, reload } = useLoad(async () => {
    const p = (await adminApi.getProject(id)).data;
    const c = p.client_id ? (await adminApi.getClient(p.client_id).catch(() => ({ data: null }))).data : null;
    return { project: p, client: c };
  }, [id]);

  if (loading || !data) return <Loading />;
  const { project: p, client } = data;
  const setProject = (patch) => setData({ ...data, project: { ...p, ...patch } });

  const changeStatus = async (status) => {
    if (await run('status', () => adminApi.updateProject(id, { status }), 'Statut mis à jour')) setProject({ status });
  };
  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    if (await run('note', () => adminApi.addProjectTimeline(id, 'note', note.trim()), 'Note ajoutée')) { setNote(''); reload(); }
  };
  const remove = async () => {
    if (!window.confirm('Supprimer ce projet ?')) return;
    if (await run('delete', () => adminApi.deleteProject(id), 'Projet supprimé')) navigate('/m/projects', { replace: true });
  };

  return (
    <div data-testid="m-project-detail">
      <MHeader back title={p.title} subtitle={`${SERVICE_TYPES[p.service_type] || p.service_type} · ${client?.full_name || ''}`}
        action={<button data-testid="m-project-edit" onClick={() => setEdit(true)} className="h-10 w-10 rounded-full border border-[#1E293B] flex items-center justify-center active:bg-white/10"><Pencil className="h-4 w-4 text-[#D4AF37]" /></button>} />

      <Section><ContactActions phone={client?.phone} email={client?.email} address={fullAddress(client)} /></Section>

      <Section title="Statut"><Chips options={STATUS_OPTS} value={p.status} onChange={changeStatus} testPrefix="m-project-status" /></Section>

      <Section>
        <MCard>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-slate-400">Progression</span>
            <span className="font-heading text-2xl font-bold text-white" data-testid="m-project-progress">{p.progress || 0}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-[#D4AF37] rounded-full transition-[width] duration-500" style={{ width: `${p.progress || 0}%` }} /></div>
          <div className="mt-3">
            <KV k="Date prévue" v={shortDate(p.scheduled_date)} />
            <KV k="Heures estimées / réelles" v={`${p.estimated_hours ?? '—'} / ${p.actual_hours ?? '—'}`} />
            <KV k="Adresse" v={fullAddress(client) || '—'} />
          </div>
          {p.description && <p className="text-sm text-slate-300 mt-3 pt-3 border-t border-[#1E293B] whitespace-pre-wrap">{p.description}</p>}
        </MCard>
      </Section>

      <Section title={`Tâches (${(p.tasks || []).length})`}><ProjectTasks projectId={id} tasks={p.tasks || []} onChange={reload} /></Section>

      <Section title="Photos de chantier"><ProjectPhotos projectId={id} photos={p.photos || []} onChange={(photos) => setProject({ photos })} /></Section>

      <Section title="Journal">
        <form onSubmit={addNote} className="flex gap-2 mb-3">
          <input data-testid="m-timeline-input" className={inputCls} placeholder="Ajouter une note au journal…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button data-testid="m-timeline-add" type="submit" disabled={busy === 'note'} className="h-11 w-11 shrink-0 rounded-xl bg-white/5 border border-[#1E293B] flex items-center justify-center text-[#D4AF37]"><Send className="h-4 w-4" /></button>
        </form>
        <div className="space-y-0 border-l border-[#1E293B] ml-1.5">
          {[...(p.timeline || [])].reverse().slice(0, 15).map((ev) => (
            <div key={ev.id} className="relative pl-4 pb-3">
              <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#D4AF37]/70" />
              <p className="text-sm text-slate-200">{ev.description}</p>
              <p className="text-[11px] text-slate-500">{shortDate(ev.created_at)} · {ev.created_by}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Actions">
        <div className="grid grid-cols-2 gap-2">
          <MButton data-testid="m-project-invoice" onClick={() => navigate(`/m/invoices/new?client=${p.client_id}&project=${id}`)}><FilePlus2 className="h-4 w-4" /> Facturer</MButton>
          <MButton variant="ghost" data-testid="m-project-report" onClick={() => run('pdf', () => openPdf(() => adminApi.getProjectReport(id)))} loading={busy === 'pdf'}><FileDown className="h-4 w-4" /> Rapport PDF</MButton>
          {client && <MButton variant="ghost" data-testid="m-project-client" onClick={() => navigate(`/m/clients/${client.id}`)}><User className="h-4 w-4" /> Client</MButton>}
          <MButton variant="danger" data-testid="m-project-delete" onClick={remove} loading={busy === 'delete'}><Trash2 className="h-4 w-4" /> Supprimer</MButton>
        </div>
      </Section>

      {edit && <ProjectForm open project={p} onOpenChange={setEdit} onSaved={(np) => setProject(np)} />}
    </div>
  );
}
