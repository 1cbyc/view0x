import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clearDashboardCache } from "@/lib/guestSession";
import { formatCategory, formatSeverity } from "@/lib/scanLabels";
import { scanApi, walletApi, type AddressScanResult } from "@/services/api";
import { ScannerDiscovery } from "@/components/ScannerDiscovery";
import { ScannerFaq } from "@/components/ScannerFaq";

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildAddressScanCsv(d: AddressScanResult) {
  const parts: string[] = [
    `${csvEscape("address")},${csvEscape(d.address)}`,
    `${csvEscape("chainId")},${csvEscape(String(d.chainId))}`,
    `${csvEscape("chainName")},${csvEscape(d.chainName)}`,
    `${csvEscape("riskLevel")},${csvEscape(d.riskLevel)}`,
    `${csvEscape("reputationScore")},${csvEscape(String(d.reputationScore))}`,
    `${csvEscape("explorerUrl")},${csvEscape(d.explorer.explorerUrl)}`,
    "",
    ["id", "category", "severity", "title", "description", "guidance"].map(csvEscape).join(","),
  ];
  for (const h of d.heuristics) {
    parts.push(
      [
        csvEscape(h.id),
        csvEscape(h.category),
        csvEscape(h.severity),
        csvEscape(h.title),
        csvEscape(h.description),
        csvEscape(h.guidance || ""),
      ].join(","),
    );
  }
  return parts.join("\n");
}

type WalletRiskLinks = {
  revokeCash: string;
  explorerApprovalScanner: string;
  walletPortfolioAggregator: string;
  note?: string;
};

function riskVariant(risk: AddressScanResult["riskLevel"]) {
  switch (risk) {
    case "LOW":
      return "default";
    case "MEDIUM":
      return "secondary";
    case "HIGH":
    case "CRITICAL":
      return "destructive";
    default:
      return "outline";
  }
}

const PENDING_SCAN_KEY = "view0x_pending_address_scan";

type PendingAddressScan = {
  address: string;
  chainId: string;
  runSlither: boolean;
};

type ScanChain = {
  chainId: number;
  name: string;
};

type AddressScanPanelProps = {
  initialScanId?: string;
  initialAddress?: string;
  initialChainId?: string;
};

function isAuthenticated(): boolean {
  return typeof localStorage !== "undefined" && !!localStorage.getItem("accessToken");
}

export const AddressScanPanel: React.FC<AddressScanPanelProps> = ({
  initialScanId,
  initialAddress,
  initialChainId,
}) => {
  const navigate = useNavigate();
  const [address, setAddress] = useState(initialAddress || "");
  const [chainId, setChainId] = useState(initialChainId || "1");
  const [chains, setChains] = useState<ScanChain[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [flagSearch, setFlagSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [runSlither, setRunSlither] = useState(false);
  const [result, setResult] = useState<AddressScanResult | null>(null);
  const [walletLinks, setWalletLinks] = useState<WalletRiskLinks | null>(null);

  useEffect(() => {
    scanApi
      .getChains()
      .then((r) => {
        const payload = r.data as { data?: { chains?: ScanChain[] } };
        const list = payload.data?.chains;
        if (list?.length) setChains(list);
      })
      .catch(() => {
        /* fallback chains in select */
      });
  }, []);

  useEffect(() => {
    if (initialAddress) setAddress(initialAddress);
    if (initialChainId) setChainId(initialChainId);
  }, [initialAddress, initialChainId]);

  const filteredHeuristics = useMemo(() => {
    if (!result) return [];
    return result.heuristics.filter((f) => {
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (flagSearch.trim()) {
        const q = flagSearch.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [result, severityFilter, categoryFilter, flagSearch]);

  const redirectToSignIn = useCallback(
    (message: string) => {
      const pending: PendingAddressScan = {
        address: address.trim(),
        chainId,
        runSlither: true,
      };
      sessionStorage.setItem(PENDING_SCAN_KEY, JSON.stringify(pending));
      navigate("/login", {
        state: {
          from: "/analyze",
          tab: "address",
          message,
        },
      });
    },
    [address, chainId, navigate],
  );

  useEffect(() => {
    if (!isAuthenticated()) return;
    try {
      const raw = sessionStorage.getItem(PENDING_SCAN_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as PendingAddressScan;
      sessionStorage.removeItem(PENDING_SCAN_KEY);
      if (pending.address) setAddress(pending.address);
      if (pending.chainId) setChainId(pending.chainId);
      if (pending.runSlither) setRunSlither(true);
    } catch {
      sessionStorage.removeItem(PENDING_SCAN_KEY);
    }
  }, []);

  useEffect(() => {
    if (!initialScanId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await scanApi.getScan(initialScanId);
        if (cancelled) return;
        const data = res.data.data;
        setResult(data);
        setAddress(data.address);
        setChainId(String(data.chainId));
      } catch (err: unknown) {
        if (cancelled) return;
        const apiErr = err as {
          error?: { message?: string };
          response?: { data?: { error?: { message?: string } } };
          message?: string;
        };
        setError(
          apiErr.error?.message ||
            apiErr.response?.data?.error?.message ||
            apiErr.message ||
            "Could not load scan",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialScanId]);

  const handleScan = async () => {
    if (runSlither && !isAuthenticated()) {
      redirectToSignIn("Sign in to queue a full Slither scan for verified contracts.");
      return;
    }

    setLoading(true);
    setError(null);
    setSharing(false);
    setShareCopied(false);
    setWalletLinks(null);
    try {
      const res = await scanApi.scanAddress({
        address: address.trim(),
        chainId: Number(chainId),
        runSlither,
      });
      setResult(res.data.data);
      if (localStorage.getItem("accessToken")) {
        clearDashboardCache();
      }
    } catch (err: unknown) {
      const apiErr = err as {
        error?: { message?: string };
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      const msg =
        apiErr.error?.message ||
        apiErr.response?.data?.error?.message ||
        apiErr.message ||
        "Scan failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const authenticated = isAuthenticated();

  const handleSlitherToggle = (checked: boolean) => {
    if (checked && !authenticated) {
      redirectToSignIn("Sign in to enable Slither scans on verified contracts.");
      return;
    }
    setRunSlither(checked);
  };

  const createShareLink = async () => {
    if (!authenticated) {
      redirectToSignIn("Sign in to create share links for your scans.");
      return;
    }
    if (!result?.scanId) return;
    setSharing(true);
    try {
      const r = await scanApi.createShareLink(result.scanId);
      const url = r.data.data.shareUrl as string;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      setError(
        "Sign in and run scans while logged in to create share links tied to your account.",
      );
    } finally {
      setSharing(false);
    }
  };

  const exportCsvFile = () => {
    if (!result) return;
    const csv = buildAddressScanCsv(result);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `view0x-scan-${result.address.slice(2, 10)}-${result.chainId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJsonFile = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `view0x-scan-${result.address.slice(2, 10)}-${result.chainId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadWalletTools = async () => {
    if (!address.trim()) {
      setError("Enter an address above (contract or wallet) for revoke / approval links.");
      return;
    }
    try {
      setError(null);
      const r = await walletApi.getRiskResources(address.trim(), Number(chainId));
      setWalletLinks(r.data.data);
    } catch {
      setError("Could not load wallet risk resources.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 lg:max-w-none">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Scan by address</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Scan a deployed <strong className="font-medium text-foreground">smart contract</strong> on
            supported EVM chains. Wallet addresses (EOAs) are detected separately — use Shield for
            approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="scan-chain">Chain</Label>
            <Select value={chainId} onValueChange={setChainId}>
              <SelectTrigger id="scan-chain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chains.length > 0
                  ? chains.map((c) => (
                      <SelectItem key={c.chainId} value={String(c.chainId)}>
                        {c.name}
                      </SelectItem>
                    ))
                  : (
                    <>
                      <SelectItem value="1">Ethereum</SelectItem>
                      <SelectItem value="56">BNB Smart Chain</SelectItem>
                      <SelectItem value="8453">Base</SelectItem>
                      <SelectItem value="42161">Arbitrum</SelectItem>
                      <SelectItem value="137">Polygon</SelectItem>
                      <SelectItem value="10">Optimism</SelectItem>
                      <SelectItem value="43114">Avalanche</SelectItem>
                    </>
                  )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scan-address">Address</Label>
            <Input
              id="scan-address"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={runSlither && authenticated}
              disabled={!authenticated}
              onChange={(e) => handleSlitherToggle(e.target.checked)}
              className="rounded border-border mt-0.5 shrink-0"
            />
            <span>
              Queue full Slither scan if verified{" "}
              {authenticated ? (
                <span className="text-foreground/50">(signed in)</span>
              ) : (
                <>
                  —{" "}
                  <Link
                    to="/login"
                    state={{
                      from: "/analyze",
                      tab: "address",
                      message: "Sign in to queue Slither on verified contracts.",
                    }}
                    className="text-primary underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    sign in required
                  </Link>
                </>
              )}
            </span>
          </label>
        </CardContent>
        <CardFooter className="pt-2">
          <Button className="w-full" onClick={handleScan} disabled={loading || !address.trim()}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning</>) : ("Scan address")}
          </Button>
        </CardFooter>
      </Card>
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Scan error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Risk report</CardTitle>
              {result.contractType === "contract" ? (
                <Badge variant={riskVariant(result.riskLevel)}>
                  {result.riskLevel} · {result.reputationScore}/100
                </Badge>
              ) : (
                <Badge variant="secondary">Wallet (EOA)</Badge>
              )}
            </div>
            <CardDescription className="break-words">
              {result.chainName} · {result.contractType === "eoa" ? "wallet / EOA" : result.contractType}
              {result.contractType === "contract"
                ? ` · ${result.explorer.contractName || "Unnamed"}`
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.contractType === "eoa" ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Not a smart contract</AlertTitle>
                <AlertDescription>
                  This address has no contract bytecode — it is a wallet (EOA). Contract heuristics do
                  not apply. Open{" "}
                  <Link
                    to={`/shield?chainId=${result.chainId}&address=${result.address}`}
                    className="text-primary underline"
                  >
                    Shield
                  </Link>{" "}
                  to scan token approvals, or paste a token/protocol contract address above.
                </AlertDescription>
              </Alert>
            ) : null}
            <a href={result.explorer.explorerUrl} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
              View on explorer <ExternalLink className="w-3 h-3" />
            </a>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={exportCsvFile}>
                Export CSV
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={exportJsonFile}>
                Export JSON
              </Button>
              {authenticated && result.scanId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={sharing}
                  onClick={createShareLink}
                >
                  {sharing ? "Creating…" : shareCopied ? "Link copied!" : "Copy share link"}
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" asChild>
                <Link to={`/shield?chainId=${result.chainId}&address=${result.address}`}>
                  Open in Shield
                </Link>
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={loadWalletTools}>
                External revoke links
              </Button>
            </div>
            <div className="rounded-md border border-border p-3 space-y-2 bg-muted/10">
              <p className="text-xs font-medium text-foreground">Advanced filters</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Search flags…"
                  value={flagSearch}
                  onChange={(e) => setFlagSearch(e.target.value)}
                  className="text-sm h-8"
                />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="ownership">Ownership</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="liquidity">Liquidity</SelectItem>
                    <SelectItem value="proxy">Proxy</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {filteredHeuristics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {result.contractType === "eoa"
                  ? "No contract-level flags — this target is a wallet, not deployed code."
                  : result.heuristics.length === 0
                    ? "No risk flags detected for this contract."
                    : "No flags match the current filters."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredHeuristics.map((f) => (
                  <li key={f.id} className="text-sm border border-border rounded-md p-2 sm:p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="min-w-0 break-words font-medium">{f.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {formatSeverity(f.severity)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatCategory(f.category)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{f.description}</p>
                    {f.guidance ? (
                      <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                        <span className="font-medium text-foreground">Tip: </span>
                        {f.guidance}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {result.slitherJobId && (
              <p className="text-xs text-primary">
                Slither job queued: {result.slitherJobId}
                {result.analysisStatus ? ` (${result.analysisStatus})` : ""}
              </p>
            )}
            {result.sourceAvailable && !result.slitherJobId && (
              <p className="text-xs text-muted-foreground">
                Verified source on explorer — enable Slither above when signed in.
              </p>
            )}
            {walletLinks && (
              <div className="text-xs space-y-2 rounded-md border border-border p-3 bg-muted/20">
                <p className="font-medium text-foreground">Wallet tooling (external)</p>
                <p className="text-muted-foreground">{walletLinks.note}</p>
                <div className="flex flex-col gap-1 break-words">
                  <a href={walletLinks.revokeCash} className="text-primary underline" target="_blank" rel="noreferrer">
                    revoke.cash
                  </a>
                  <a
                    href={walletLinks.explorerApprovalScanner}
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer token approval checker
                  </a>
                  <a
                    href={walletLinks.walletPortfolioAggregator}
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Portfolio overview
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <ScannerDiscovery />
      <ScannerFaq />
    </div>
  );
};
