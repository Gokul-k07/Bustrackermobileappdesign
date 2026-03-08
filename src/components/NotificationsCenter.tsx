import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Bus, Clock3, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiClient, LiveNotification } from '../utils/api';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';

export interface NotificationFeature {
  title: string;
  detail: string;
}

type UserRole = 'driver' | 'passenger' | 'admin' | null;

interface NotificationsCenterProps {
  userRole: UserRole;
  canBroadcast: boolean;
  activeBusName?: string;
  futureNotifications: NotificationFeature[];
}

const NOTIFICATION_POLL_INTERVAL_MS = 15000;

const formatRelativeTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const formatExpiry = (value: string) => {
  const diffMs = new Date(value).getTime() - Date.now();
  if (diffMs <= 0) return 'Expires soon';

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);

  if (diffHours > 0) return `${diffHours}h ${diffMinutes}m left`;
  return `${Math.max(1, diffMinutes)}m left`;
};

export function NotificationsCenter({
  userRole,
  canBroadcast,
  activeBusName,
  futureNotifications,
}: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadNotifications = async (showLoader = false) => {
    try {
      if (showLoader) {
        setIsRefreshing(true);
      }

      const response = await apiClient.getNotifications();
      setNotifications(response.notifications || []);
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
      toast.error(error.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast.error('Enter a notification message');
      return;
    }

    if (!canBroadcast) {
      toast.error('Start your driver trip to send notifications');
      return;
    }

    try {
      setIsSending(true);
      const response = await apiClient.sendDriverNotification(trimmedMessage);
      setNotifications((prev) => [response.notification, ...prev]);
      setMessage('');
      toast.success('Notification sent to all users');
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const liveNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => new Date(notification.expiresAt).getTime() > Date.now()
      ),
    [notifications]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Driver broadcasts are visible to all signed-in users and expire automatically after 24 hours.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadNotifications(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {userRole === 'driver' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Driver Broadcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={canBroadcast ? 'default' : 'secondary'}>
                {canBroadcast ? 'Live route connected' : 'Trip offline'}
              </Badge>
              {activeBusName ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Bus className="h-3 w-3" />
                  {activeBusName}
                </Badge>
              ) : null}
            </div>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Send a route update, delay notice, or stop announcement to all users..."
              rows={4}
              maxLength={400}
              disabled={!canBroadcast || isSending}
              className="resize-none"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Example: "PSNA-12 will reach Central Plaza in 8 minutes."
              </p>
              <Button onClick={handleSend} disabled={!canBroadcast || isSending || !message.trim()}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Driver Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : liveNotifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No live notifications right now.
            </div>
          ) : (
            liveNotifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{notification.busName}</Badge>
                      <span className="text-sm font-medium">{notification.driverName}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6">{notification.message}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatRelativeTime(notification.createdAt)}</p>
                    <p className="mt-1 flex items-center justify-end gap-1">
                      <Clock3 className="h-3 w-3" />
                      {formatExpiry(notification.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {futureNotifications.map((item) => (
            <div key={item.title} className="rounded-xl border bg-muted/40 p-4">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
