import React, { useState, useEffect } from "react";
import { webhookApi } from "@/services/api";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const WEBHOOK_EVENTS = [
  "analysis.completed",
  "analysis.failed",
  "analysis.processing",
  "vulnerability.found",
  "report.generated",
];

const Webhooks: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState({
    url: "",
    events: [] as string[],
    secret: "",
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await webhookApi.getWebhooks();
      setWebhooks(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to fetch webhooks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      if (!formData.url || formData.events.length === 0) {
        setError("URL and at least one event are required");
        return;
      }

      if (editingWebhook) {
        await webhookApi.updateWebhook(
          editingWebhook.id,
          formData.url,
          formData.events,
          formData.secret || undefined,
          editingWebhook.isActive // Preserve current active status
        );
      } else {
        await webhookApi.createWebhook(
          formData.url,
          formData.events,
          formData.secret || undefined
        );
      }

      setIsDialogOpen(false);
      setFormData({ url: "", events: [], secret: "" });
      setEditingWebhook(null);
      fetchWebhooks();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to save webhook");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this webhook?")) return;

    try {
      await webhookApi.deleteWebhook(id);
      fetchWebhooks();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to delete webhook");
    }
  };

  const handleTest = async (id: string) => {
    try {
      await webhookApi.triggerTestWebhook(id);
      alert("Test webhook sent successfully!");
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to send test webhook");
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      url: webhook.url,
      events: webhook.events,
      secret: "",
    });
    setIsDialogOpen(true);
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    alert("Secret copied to clipboard!");
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Webhooks</h1>
          <p className="text-sm text-white/60 mt-1">
            Configure webhooks to receive real-time notifications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingWebhook(null);
                setFormData({ url: "", events: [], secret: "" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "Edit Webhook" : "Create Webhook"}
              </DialogTitle>
              <DialogDescription>
                Configure a webhook to receive notifications for selected events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="url">Webhook URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="bg-input/30"
                />
              </div>

              <div className="space-y-2">
                <Label>Events</Label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={event}
                        checked={formData.events.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <Label
                        htmlFor={event}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret">Secret (Optional)</Label>
                <Input
                  id="secret"
                  type="password"
                  placeholder="Leave empty to auto-generate"
                  value={formData.secret}
                  onChange={(e) =>
                    setFormData({ ...formData, secret: e.target.value })
                  }
                  className="bg-input/30"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  {editingWebhook ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && !isDialogOpen && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-white/60">No webhooks configured</p>
            <p className="text-sm text-white/40 mt-2">
              Create your first webhook to receive real-time notifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-mono text-sm">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {webhook.isActive ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-500">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-white/60">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTest(webhook.id)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(webhook)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {webhook.secret && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copySecret(webhook.secret!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Webhooks;
