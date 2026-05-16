import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { notificationApi, type NotificationItem } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationApi.list({ limit: 100 });
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    await loadNotifications();
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={!unreadCount}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No notifications yet.
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
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  {!notification.readAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await notificationApi.markRead(notification.id);
                        await loadNotifications();
                      }}
                    >
                      Mark read
                    </Button>
                  )}
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
