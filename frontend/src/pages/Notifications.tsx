import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Loader2, LogIn } from "lucide-react";
import { notificationApi, type NotificationItem } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setNeedsAuth(true);
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setNeedsAuth(false);
    setLoading(true);
    setError(null);
    try {
      const response = await notificationApi.list({ limit: 100 });
      const payload = response.data?.data;
      const list = Array.isArray(payload?.notifications) ? payload.notifications : [];
      setNotifications(list);
      setUnreadCount(typeof payload?.unreadCount === "number" ? payload.unreadCount : 0);
    } catch (err: unknown) {
      const apiErr = err as {
        status?: number;
        error?: { message?: string };
        message?: string;
      };
      if (apiErr.status === 401 || apiErr.status === 403) {
        setNeedsAuth(true);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      setError(
        apiErr.error?.message ||
          apiErr.message ||
          "Could not load notifications. Please try again.",
      );
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      await loadNotifications();
    } catch {
      setError("Could not mark notifications as read.");
    }
  };

  if (needsAuth) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <LogIn className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Sign in required</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Notifications are tied to your account. Sign in to see analysis updates and alerts.
            </p>
            <Button asChild>
              <Link to="/login" state={{ from: "/notifications" }}>
                Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 min-h-[50vh]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-accent shrink-0" />
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void markAllRead()}
          disabled={!unreadCount || loading}
          className="w-full sm:w-auto"
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Could not load notifications</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void loadNotifications()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No notifications yet. When an analysis finishes, you will see it here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.readAt ? "opacity-75" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{notification.title}</CardTitle>
                  {!notification.readAt && <Badge variant="secondary">New</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  <div className="flex gap-2">
                    {notification.metadata &&
                    typeof notification.metadata === "object" &&
                    "analysisId" in notification.metadata &&
                    typeof (notification.metadata as { analysisId?: string }).analysisId ===
                      "string" ? (
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to={`/analysis/${(notification.metadata as { analysisId: string }).analysisId}`}
                        >
                          View analysis
                        </Link>
                      </Button>
                    ) : null}
                    {!notification.readAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            await notificationApi.markRead(notification.id);
                            await loadNotifications();
                          } catch {
                            setError("Could not mark notification as read.");
                          }
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
