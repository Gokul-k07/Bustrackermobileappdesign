import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Bus, Clock3, Loader2, MapPin, RefreshCw, Send } from 'lucide-react';
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

interface BusAlertLocation {
  id: string;
  route: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  lastUpdated?: string;
  previousLocations?: Array<{
    lat: number;
    lng: number;
    timestamp?: string | null;
  }>;
}

interface NotificationsCenterProps {
  userRole: UserRole;
  canBroadcast: boolean;
  activeBusName?: string;
  futureNotifications: NotificationFeature[];
  busLocations: BusAlertLocation[];
  currentLocation: { lat: number; lng: number };
  locationPermissionGranted?: boolean;
  onNotificationCountChange?: (count: number) => void;
}

const NOTIFICATION_POLL_INTERVAL_MS = 15000;
const WATCHLIST_STORAGE_KEY = 'nextstop_alert_watchlist';
const ALERT_HISTORY_STORAGE_KEY = 'nextstop_alert_history';
const ARRIVAL_ALERT_WINDOW_MINUTES = 5;
const ALERT_COOLDOWN_MS = 20 * 60 * 1000;
const FALLBACK_BUS_SPEED_KMH = 24;

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

const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateBusSpeedKmh = (bus: BusAlertLocation) => {
  const history = bus.previousLocations || [];
  const previousPoint = history[history.length - 1];

  if (!previousPoint || !previousPoint.timestamp || !bus.lastUpdated) {
    return FALLBACK_BUS_SPEED_KMH;
  }

  const hoursElapsed =
    (new Date(bus.lastUpdated).getTime() - new Date(previousPoint.timestamp).getTime()) /
    (60 * 60 * 1000);

  if (hoursElapsed <= 0) {
    return FALLBACK_BUS_SPEED_KMH;
  }

  const travelledDistanceKm = calculateDistanceKm(
    previousPoint.lat,
    previousPoint.lng,
    bus.lat,
    bus.lng
  );
  const speed = travelledDistanceKm / hoursElapsed;

  if (!Number.isFinite(speed) || speed < 5 || speed > 90) {
    return FALLBACK_BUS_SPEED_KMH;
  }

  return speed;
};

const estimateMinutesToLocation = (bus: BusAlertLocation, location: { lat: number; lng: number }) => {
  const distanceKm = calculateDistanceKm(bus.lat, bus.lng, location.lat, location.lng);
  const speedKmh = estimateBusSpeedKmh(bus);
  const minutes = (distanceKm / speedKmh) * 60;

  return {
    distanceKm,
    etaMinutes: distanceKm <= 0.15 ? 1 : Math.max(1, Math.round(minutes)),
  };
};

export function NotificationsCenter({
  userRole,
  canBroadcast,
  activeBusName,
  futureNotifications,
  busLocations,
  currentLocation,
  locationPermissionGranted,
  onNotificationCountChange,
}: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [watchedRoutes, setWatchedRoutes] = useState<string[]>([]);
  const [alertHistory, setAlertHistory] = useState<Record<string, number>>({});

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

  useEffect(() => {
    try {
      const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const storedHistory = localStorage.getItem(ALERT_HISTORY_STORAGE_KEY);

      if (storedWatchlist) {
        const parsedWatchlist = JSON.parse(storedWatchlist);
        if (Array.isArray(parsedWatchlist)) {
          setWatchedRoutes(parsedWatchlist.filter((value) => typeof value === 'string'));
        }
      }

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (parsedHistory && typeof parsedHistory === 'object') {
          setAlertHistory(parsedHistory);
        }
      }
    } catch (error) {
      console.error('Failed to restore alert preferences:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchedRoutes));
  }, [watchedRoutes]);

  useEffect(() => {
    localStorage.setItem(ALERT_HISTORY_STORAGE_KEY, JSON.stringify(alertHistory));
  }, [alertHistory]);

  const activeBuses = useMemo(
    () =>
      busLocations
        .filter((bus) => bus.isOnline && bus.route)
        .sort((left, right) => left.route.localeCompare(right.route)),
    [busLocations]
  );

  const watchedBusSummaries = useMemo(
    () =>
      activeBuses
        .filter((bus) => watchedRoutes.includes(bus.route))
        .map((bus) => ({
          ...bus,
          ...estimateMinutesToLocation(bus, currentLocation),
        })),
    [activeBuses, watchedRoutes, currentLocation]
  );

  useEffect(() => {
    if (!locationPermissionGranted || watchedBusSummaries.length === 0) {
      return;
    }

    const nextHistory = { ...alertHistory };
    let historyChanged = false;

    watchedBusSummaries.forEach((bus) => {
      const lastAlertAt = alertHistory[bus.route] || 0;
      const withinWindow = bus.etaMinutes <= ARRIVAL_ALERT_WINDOW_MINUTES;
      const cooldownPassed = Date.now() - lastAlertAt > ALERT_COOLDOWN_MS;

      if (!withinWindow || !cooldownPassed) {
        return;
      }

      const alertMessage = `${bus.route} is about ${bus.etaMinutes} min away from your location.`;
      toast.info('Bus arriving soon', {
        description: alertMessage,
        duration: 6000,
      });

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted') {
          new window.Notification('NextStop Alert', { body: alertMessage });
        }
      }

      nextHistory[bus.route] = Date.now();
      historyChanged = true;
    });

    if (historyChanged) {
      setAlertHistory(nextHistory);
    }
  }, [alertHistory, locationPermissionGranted, watchedBusSummaries]);

  const toggleRouteWatch = async (route: string) => {
    const isWatching = watchedRoutes.includes(route);

    setWatchedRoutes((previous) =>
      isWatching ? previous.filter((value) => value !== route) : [...previous, route]
    );

    if (!isWatching && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (window.Notification.permission === 'default') {
          await window.Notification.requestPermission();
        }
      } catch (error) {
        console.error('Notification permission request failed:', error);
      }
    }
  };

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

  // Notify parent component when notification count changes
  useEffect(() => {
    if (onNotificationCountChange) {
      onNotificationCountChange(liveNotifications.length);
    }
  }, [liveNotifications, onNotificationCountChange]);

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
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4" />
            Bus Arrival Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={locationPermissionGranted ? 'default' : 'secondary'}>
                {locationPermissionGranted ? 'Using your current location' : 'Using saved location'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Select buses below. You will get a popup when the selected bus is estimated to reach this location within 5 minutes.
            </p>
          </div>

          {watchedBusSummaries.length > 0 && (
            <div className="space-y-2">
              {watchedBusSummaries.map((bus) => (
                <div key={`watch-${bus.id}`} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge>{bus.route}</Badge>
                        <span className="text-sm font-medium">{bus.etaMinutes} min away</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Approx. {bus.distanceKm.toFixed(2)} km from this location
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleRouteWatch(bus.route)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeBuses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No buses are live right now.
            </div>
          ) : (
            <div className="space-y-2">
              {activeBuses.map((bus) => {
                const isWatching = watchedRoutes.includes(bus.route);
                const { etaMinutes, distanceKm } = estimateMinutesToLocation(bus, currentLocation);

                return (
                  <div key={bus.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isWatching ? 'default' : 'outline'}>{bus.route}</Badge>
                          <span className="text-sm text-muted-foreground">{etaMinutes} min away</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Approx. {distanceKm.toFixed(2)} km from this location
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isWatching ? 'secondary' : 'outline'}
                        onClick={() => toggleRouteWatch(bus.route)}
                      >
                        {isWatching ? 'Watching' : 'Notify me'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
