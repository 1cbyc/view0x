import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { scanApi, type AddressScanResult } from "@/services/api";

export default function SharedAddressScanPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<(AddressScanResult & { scanId?: string }) | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    scanApi
      .getSharedScan(token)
      .then((r) => setData(r.data.data))
      .catch((e: { response?: { data?: { error?: { message?: string } } } }) => {
        setErr(e.response?.data?.error?.message || "Could not load shared scan.");
      });
  }, [token]);

  const riskVariant = (risk: AddressScanResult["riskLevel"]) => {
    if (risk === "LOW") return "default" as const;
    if (risk === "MEDIUM") return "secondary" as const;
    return "destructive" as const;
  };

  if (!token) {
    return (
      <div className="container max-w-xl mx-auto py-12 px-4">
        <Alert>
          <AlertDescription>Invalid link.</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (err) {
    return (
      <div className="container max-w-xl mx-auto py-12 px-4 space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/">Back home</Link>
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Shared address scan</h1>
        <Badge variant={riskVariant(data.riskLevel)}>
          {data.riskLevel} · {data.reputationScore}/100
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{data.explorer.contractName || data.address}</CardTitle>
          <CardDescription>
            {data.chainName} · <span className="font-mono text-xs">{data.address}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href={data.explorer.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary inline-flex items-center gap-1"
          >
            View on explorer <ExternalLink className="w-3 h-3" />
          </a>
          {!data.heuristics.length ? (
            <p className="text-sm text-muted-foreground">No risk flags detected.</p>
          ) : (
            <ul className="space-y-3">
              {data.heuristics.map((f) => (
                <li key={f.id} className="text-sm border border-border rounded-md p-3">
                  <span className="font-medium">{f.title}</span>
                  <p className="text-muted-foreground mt-1">{f.description}</p>
                  {f.guidance ? (
                    <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                      <strong className="text-foreground">What to do:</strong> {f.guidance}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Button variant="outline" asChild className="w-full sm:w-auto">
        <Link to="/analyze">Analyze another contract</Link>
      </Button>
    </div>
  );
}
