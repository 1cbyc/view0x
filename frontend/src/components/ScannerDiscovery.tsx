import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, TrendingUp, Scan, AlertTriangle, BookOpen } from "lucide-react";
import { scanApi, type ScannerDiscovery, type ScannerDiscoveryItem } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function DiscoveryRow({ item }: { item: ScannerDiscoveryItem }) {
  return (
    <Link
      to={item.href}
      className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm truncate">{item.title}</span>
          {item.badge ? (
            <Badge variant="outline" className="text-[10px]">
              {item.badge}
            </Badge>
          ) : null}
          {item.riskLevel ? (
            <Badge
              variant={
                item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL"
                  ? "destructive"
                  : "secondary"
              }
              className="text-[10px]"
            >
              {item.riskLevel}
            </Badge>
          ) : null}
        </div>
        {item.subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.subtitle}</p>
        ) : null}
      </div>
      {item.reputationScore != null ? (
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {item.reputationScore}/100
        </span>
      ) : null}
    </Link>
  );
}

function Section({
  title,
  description,
  icon,
  items,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: ScannerDiscoveryItem[];
}) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <DiscoveryRow key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

export const ScannerDiscovery: React.FC = () => {
  const [data, setData] = useState<ScannerDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scanApi
      .getDiscovery()
      .then((r) => setData(r.data.data))
      .catch(() => setError("Could not load scanner suggestions."));
  }, []);

  if (error) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground text-center py-4">Loading suggestions…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Quick picks like De.Fi — tap to scan or open an example.
        </p>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/rekt">Rekt Database</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Recent threats"
          description="High-risk address scans and notable exploits"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          items={data.recentThreats}
        />
        <Section
          title="Trending"
          description="Recently scanned contracts"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          items={data.trending}
        />
        <Section
          title="Most scanned"
          description="Popular targets in this community"
          icon={<Scan className="h-4 w-4" />}
          items={data.mostScanned}
        />
        <Section
          title="High-risk patterns"
          description="Ready-made vulnerable contracts to test the scanner"
          icon={<TrendingUp className="h-4 w-4" />}
          items={data.highRiskExamples}
        />
      </div>
      {data.practiceExamples.length ? (
        <Section
          title="Learn & practice"
          description="Safer baselines to compare against risky code"
          icon={<BookOpen className="h-4 w-4" />}
          items={data.practiceExamples}
        />
      ) : null}
    </div>
  );
};
