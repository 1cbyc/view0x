import React, { useState, useEffect, useCallback } from "react";
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

type AddressScanPanelProps = {
  initialScanId?: string;
};

function isAuthenticated(): boolean {
  return typeof localStorage !== "undefined" && !!localStorage.getItem("accessToken");
}

export const AddressScanPanel: React.FC<AddressScanPanelProps> = ({
  initialScanId,
}) => {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [runSlither, setRunSlither] = useState(false);
  const [result, setResult] = useState<AddressScanResult | null>(null);
  const [walletLinks, setWalletLinks] = useState<WalletRiskLinks | null>(null);

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Scan by address</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Check a deployed contract on Ethereum or BSC.
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
                <SelectItem value="1">Ethereum</SelectItem>
                <SelectItem value="56">BNB Smart Chain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scan-address">Contract address</Label>
            <Input id="scan-address" placeholder="0x..." value={address} onChange={(e) => setAddress(e.target.value)} />
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
        <CardFooter>
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
              <Badge variant={riskVariant(result.riskLevel)}>{result.riskLevel} · {result.reputationScore}/100</Badge>
            </div>
            <CardDescription>
              {result.chainName} · {result.contractType} · {result.explorer.contractName || "Unnamed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href={result.explorer.explorerUrl} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
              View on explorer <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={exportCsvFile}>
                Export CSV
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportJsonFile}>
                Export JSON
              </Button>
              {authenticated && result.scanId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={sharing}
                  onClick={createShareLink}
                >
                  {sharing ? "Creating…" : shareCopied ? "Link copied!" : "Copy share link"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={loadWalletTools}>
                Wallet / allowance links
              </Button>
            </div>
            {result.heuristics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk flags detected.</p>
            ) : (
              <ul className="space-y-2">
                {result.heuristics.map((f) => (
                  <li key={f.id} className="text-sm border border-border rounded-md p-2 sm:p-3">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="font-medium">{f.title}</span>
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
                <div className="flex flex-col gap-1">
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
    </div>
  );
};
