import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarDays,
  ExternalLink,
  Search,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import { rektApi, type RektFacet, type RektFacets, type RektIncident, type RektStats } from "@/services/api";
import { getApiErrorMessage } from "@/lib/apiHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ALL = "__all__";

function money(value: string | number | null | undefined, compact = false) {
  const n = value == null ? 0 : Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(n);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function severityVariant(severity: RektIncident["severity"]) {
  if (severity === "CRITICAL" || severity === "HIGH") return "destructive" as const;
  if (severity === "MEDIUM") return "secondary" as const;
  return "outline" as const;
}

function statusLabel(status: RektIncident["status"]) {
  return status.replace(/_/g, " ");
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (!value || value === ALL) params.delete(key);
  else params.set(key, value);
  params.delete("page");
}

function FacetSelect({
  label,
  value,
  facets,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  facets: RektFacet[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || ALL} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {facets.map((facet) => (
            <SelectItem key={facet.value} value={facet.value}>
              {facet.value} ({facet.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IncidentRow({ incident }: { incident: RektIncident }) {
  return (
    <Link
      to={`/rekt/${incident.slug}`}
      className="grid gap-4 border-b border-border px-4 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold leading-snug text-foreground">{incident.projectName}</h2>
          <Badge variant={severityVariant(incident.severity)}>{incident.severity}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{incident.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {incident.attackTypes.slice(0, 3).map((type) => (
            <Badge key={type} variant="outline" className="text-[11px]">
              {type}
            </Badge>
          ))}
        </div>
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground md:hidden">Lost: </span>
        <span className="font-semibold">{money(incident.amountLostUsd, true)}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="md:hidden">Date: </span>
        {displayDate(incident.incidentDate)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {incident.chains.slice(0, 3).map((chain) => (
          <Badge key={chain} variant="secondary" className="text-[11px]">
            {chain}
          </Badge>
        ))}
      </div>
      <ExternalLink className="hidden h-4 w-4 text-muted-foreground md:block" />
    </Link>
  );
}

const RektDatabase: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<RektStats | null>(null);
  const [facets, setFacets] = useState<RektFacets | null>(null);
  const [incidents, setIncidents] = useState<RektIncident[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || undefined,
      chain: searchParams.get("chain") || undefined,
      category: searchParams.get("category") || undefined,
      attackType: searchParams.get("attackType") || undefined,
      severity: searchParams.get("severity") || undefined,
      page: Number(searchParams.get("page") || 1),
    }),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [statsRes, facetsRes] = await Promise.all([
          rektApi.getStats(),
          rektApi.getFacets(),
        ]);
        if (!cancelled) {
          setStats(statsRes.data.data);
          setFacets(facetsRes.data.data);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load Rekt Database metadata."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await rektApi.listIncidents({
          ...filters,
          limit: 20,
          sortBy: "amountLostUsd",
          sortOrder: "DESC",
        });
        if (!cancelled) {
          setIncidents(res.data.data || []);
          setPagination(res.data.meta?.pagination || pagination);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load incidents."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    setOrDelete(next, key, value);
    setSearchParams(next);
  };

  const submitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateFilter("q", query.trim());
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldAlert className="h-4 w-4" />
            Exploit intelligence
          </div>
          <h1 className="text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
            Rekt Database
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Search real-world exploits, rugs, bridge failures, oracle incidents, and protocol loss events.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/analyze">Scan a contract</Link>
        </Button>
      </div>

      {stats ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Incidents tracked</CardDescription>
              <CardTitle className="text-2xl">{stats.summary.incidentCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total lost</CardDescription>
              <CardTitle className="text-2xl">{money(stats.summary.totalLostUsd, true)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recovered</CardDescription>
              <CardTitle className="text-2xl">{money(stats.summary.totalRecoveredUsd, true)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Largest loss</CardDescription>
              <CardTitle className="text-2xl">{money(stats.summary.largestLossUsd, true)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Find incidents by chain, category, and exploit type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={submitSearch} className="space-y-2">
                <Label htmlFor="rekt-search">Search</Label>
                <div className="flex gap-2">
                  <Input
                    id="rekt-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Protocol, cause, tag"
                  />
                  <Button type="submit" size="icon" aria-label="Search incidents">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>
              {facets ? (
                <>
                  <FacetSelect
                    label="Chain"
                    value={filters.chain || ALL}
                    facets={facets.chains}
                    placeholder="All chains"
                    onChange={(value) => updateFilter("chain", value)}
                  />
                  <FacetSelect
                    label="Category"
                    value={filters.category || ALL}
                    facets={facets.categories}
                    placeholder="All categories"
                    onChange={(value) => updateFilter("category", value)}
                  />
                  <FacetSelect
                    label="Attack type"
                    value={filters.attackType || ALL}
                    facets={facets.attackTypes}
                    placeholder="All attack types"
                    onChange={(value) => updateFilter("attackType", value)}
                  />
                  <FacetSelect
                    label="Severity"
                    value={filters.severity || ALL}
                    facets={facets.severities}
                    placeholder="All severities"
                    onChange={(value) => updateFilter("severity", value)}
                  />
                </>
              ) : null}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setQuery("");
                  setSearchParams(new URLSearchParams());
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="min-w-0">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg">Incidents</CardTitle>
                  <CardDescription>
                    {pagination.total} records sorted by reported loss.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Loss impact
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Historical
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ArrowDownUp className="h-3.5 w-3.5" />
                    Filterable
                  </span>
                </div>
              </div>
            </CardHeader>
            {error ? (
              <CardContent className="p-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Could not load database</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </CardContent>
            ) : loading ? (
              <CardContent className="p-6 text-sm text-muted-foreground">Loading incidents...</CardContent>
            ) : incidents.length ? (
              <div>
                {incidents.map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} />
                ))}
                <div className="flex items-center justify-between gap-3 p-4">
                  <Button
                    variant="outline"
                    disabled={!pagination.hasPrev}
                    onClick={() => updateFilter("page", String(Math.max(1, pagination.page - 1)))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    disabled={!pagination.hasNext}
                    onClick={() => updateFilter("page", String(pagination.page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <CardContent className="p-6 text-sm text-muted-foreground">
                No incidents match these filters.
              </CardContent>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default RektDatabase;
