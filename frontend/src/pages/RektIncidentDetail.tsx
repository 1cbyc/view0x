import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { rektApi, type RektIncident } from "@/services/api";
import { getApiErrorMessage } from "@/lib/apiHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

function money(value: string | number | null | undefined) {
  const n = value == null ? 0 : Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function severityVariant(severity: RektIncident["severity"]) {
  if (severity === "CRITICAL" || severity === "HIGH") return "destructive" as const;
  if (severity === "MEDIUM") return "secondary" as const;
  return "outline" as const;
}

const RektIncidentDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<RektIncident | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setIncident(null);
    setError(null);
    rektApi
      .getIncident(slug)
      .then((res) => {
        if (!cancelled) setIncident(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load incident."));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (incident && slug && incident.slug !== slug) {
      navigate(`/rekt/${incident.slug}`, { replace: true });
    }
  }, [incident, slug, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/rekt">Back to Rekt Database</Link>
        </Button>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto box-border w-full max-w-5xl overflow-x-hidden px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Button asChild variant="ghost" className="mb-4 -ml-2 sm:-ml-3">
        <Link to="/rekt">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Rekt Database
        </Link>
      </Button>

      <div className="mb-6 min-w-0 w-full">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={severityVariant(incident.severity)}>{incident.severity}</Badge>
          <Badge variant="outline">{incident.status.replace(/_/g, " ")}</Badge>
          <span className="text-sm text-muted-foreground">{displayDate(incident.incidentDate)}</span>
        </div>
        <h1 className="w-full min-w-0 break-words text-2xl font-bold tracking-normal text-foreground [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">
          {incident.title}
        </h1>
        <p className="mt-3 w-full min-w-0 break-words text-base leading-7 text-muted-foreground [overflow-wrap:anywhere]">
          {incident.summary}
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Reported loss</CardDescription>
            <CardTitle>{money(incident.amountLostUsd)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recovered</CardDescription>
            <CardTitle>{money(incident.amountRecoveredUsd)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Project</CardDescription>
            <CardTitle>{incident.projectName}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Incident breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 space-y-5 text-sm leading-6 [overflow-wrap:anywhere]">
              {incident.rootCause ? (
                <div>
                  <h2 className="font-semibold text-foreground">Root cause</h2>
                  <p className="mt-1 text-muted-foreground">{incident.rootCause}</p>
                </div>
              ) : null}
              {incident.technicalDetails ? (
                <div>
                  <h2 className="font-semibold text-foreground">Technical details</h2>
                  <p className="mt-1 text-muted-foreground">{incident.technicalDetails}</p>
                </div>
              ) : null}
              {incident.remediation ? (
                <div>
                  <h2 className="font-semibold text-foreground">What would reduce this risk</h2>
                  <p className="mt-1 text-muted-foreground">{incident.remediation}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {incident.affectedAddresses?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Affected addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incident.affectedAddresses.map((item) => (
                  <div key={`${item.label}-${item.address}`} className="rounded-md border border-border p-3">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.address}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {incident.sourceUrls?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {incident.sourceUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 break-all text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {url}
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Chains</div>
                <div className="flex flex-wrap gap-1.5">
                  {incident.chains.map((chain) => (
                    <Badge key={chain} variant="secondary">{chain}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Categories</div>
                <div className="flex flex-wrap gap-1.5">
                  {incident.categories.map((category) => (
                    <Badge key={category} variant="outline">{category}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Attack types</div>
                <div className="flex flex-wrap gap-1.5">
                  {incident.attackTypes.map((type) => (
                    <Badge key={type} variant="outline">{type}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default RektIncidentDetail;
