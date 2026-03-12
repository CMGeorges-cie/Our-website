import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';

const notificationTypeConfig = {
  new_lead: { icon: '🔔', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Nouveau lead' },
  invoice_created: { icon: '📄', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Facture créée' },
  payment_received: { icon: '💰', color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Paiement reçu' },
  project_status: { icon: '🔄', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Projet mis à jour' },
  default: { icon: '📌', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Notification' }
};

function getNotificationConfig(type) {
  return notificationTypeConfig[type] || notificationTypeConfig.default;
}

function getEntityLink(entityType, entityId) {
  const routes = {
    lead: `/admin/leads/${entityId}`,
    invoice: `/admin/invoices/${entityId}`,
    project: `/admin/projects/${entityId}`,
    client: `/admin/clients/${entityId}`,
  };
  return routes[entityType] || null;
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-CA');
}

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      const params = filter === 'unread' ? { unread_only: true } : {};
      const res = await adminApi.getNotifications(params);
      setNotifications(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await adminApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      toast.success('Marquée comme lue');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification supprimée');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleNavigate = (notification) => {
    const link = getEntityLink(notification.entity_type, notification.entity_id);
    if (link) {
      if (!notification.is_read) {
        handleMarkRead(notification.id);
      }
      navigate(link);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6" data-testid="admin-notifications-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-gold-500" />
            Centre de notifications
          </h1>
          <p className="text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes les notifications sont lues'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-gold-500 text-black hover:bg-gold-600' : 'border-gray-700 text-gray-300'}
            data-testid="filter-all-btn"
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className={filter === 'unread' ? 'bg-gold-500 text-black hover:bg-gold-600' : 'border-gray-700 text-gray-300'}
            data-testid="filter-unread-btn"
          >
            Non lues ({unreadCount})
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              data-testid="mark-all-read-btn"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center" data-testid="no-notifications">
              <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Aucune notification</p>
              <p className="text-gray-500 text-sm mt-1">
                {filter === 'unread' ? 'Toutes les notifications sont lues' : 'Vous n\'avez pas encore de notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {notifications.map((notification) => {
                const config = getNotificationConfig(notification.type);
                const link = getEntityLink(notification.entity_type, notification.entity_id);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 flex items-start gap-4 transition-colors ${
                      !notification.is_read ? 'bg-gold-500/5' : 'hover:bg-gray-800/50'
                    }`}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${config.color}`}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!notification.is_read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-400 mt-0.5">{notification.body}</p>
                        </div>
                        {!notification.is_read && (
                          <Badge className="bg-gold-500/20 text-gold-400 border-gold-500/30 text-xs shrink-0">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</span>
                        <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleNavigate(notification)}
                          className="text-gray-400 hover:text-gold-500 hover:bg-gold-500/10"
                          title="Voir les détails"
                          data-testid={`notification-view-${notification.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkRead(notification.id)}
                          className="text-gray-400 hover:text-green-500 hover:bg-green-500/10"
                          title="Marquer comme lue"
                          data-testid={`notification-mark-read-${notification.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                        title="Supprimer"
                        data-testid={`notification-delete-${notification.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
