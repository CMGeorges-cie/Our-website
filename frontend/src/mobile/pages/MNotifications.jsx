import { useNavigate } from 'react-router-dom';
import { CheckCheck, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { MHeader, Loading, Empty } from '../components/MUi';
import { useLoad, useAction } from '../components/useLoad';
import { cn } from '@/lib/utils';

const ROUTES = { invoice: 'invoices', lead: 'leads', project: 'projects', client: 'clients', quote: 'quotes' };
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
};

export default function MNotifications() {
  const navigate = useNavigate();
  const { run } = useAction();
  const { data, setData, loading } = useLoad(async () => (await adminApi.getNotifications({ limit: 100 })).data);

  const open = async (n) => {
    if (!n.is_read) adminApi.markNotificationRead(n.id).catch(() => {});
    const r = ROUTES[n.entity_type];
    if (r && n.entity_id) navigate(`/m/${r}/${n.entity_id}`);
    else setData(data.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };
  const readAll = async () => {
    if (await run('all', () => adminApi.markAllNotificationsRead(), 'Tout marqué comme lu')) setData(data.map((x) => ({ ...x, is_read: true })));
  };
  const remove = async (e, n) => {
    e.stopPropagation();
    if (await run(n.id, () => adminApi.deleteNotification(n.id))) setData(data.filter((x) => x.id !== n.id));
  };

  return (
    <div data-testid="m-notifications-page">
      <MHeader back title="Notifications" subtitle={data ? `${data.filter((n) => !n.is_read).length} non lue(s)` : ''}
        action={<button data-testid="m-notif-read-all" onClick={readAll} className="h-10 w-10 rounded-full border border-[#1E293B] flex items-center justify-center active:bg-white/10"><CheckCheck className="h-4 w-4 text-[#D4AF37]" /></button>} />
      <div className="px-5 space-y-2 m-stagger">
        {loading ? <Loading /> : !data?.length ? <Empty text="Aucune notification" /> : data.map((n) => (
          <div key={n.id} data-testid={`m-notif-${n.id}`} onClick={() => open(n)}
            className={cn('flex gap-3 rounded-2xl border p-4 active:scale-[0.98] transition-transform cursor-pointer', n.is_read ? 'border-[#1E293B] bg-[#111827]/60' : 'border-[#D4AF37]/25 bg-[#111827]')}>
            <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', n.is_read ? 'bg-transparent' : 'bg-[#D4AF37]')} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', n.is_read ? 'text-slate-400' : 'text-white font-semibold')}>{n.title}</p>
              {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
              <p className="text-[11px] text-slate-600 mt-1">{ago(n.created_at)}</p>
            </div>
            <button data-testid={`m-notif-delete-${n.id}`} onClick={(e) => remove(e, n)} className="self-start text-slate-600 active:text-rose-300"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
