import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { erc20Abi } from "viem";
import { Loader2, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  shieldApi,
  type ShieldApproval,
  type ShieldChain,
  type ShieldSnapshot,
} from "@/services/api";
import { pushShieldHistory } from "@/lib/shieldHistory";

function riskVariant(risk: string) {
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

function isHighRiskLevel(risk: string | undefined) {
  return risk === "HIGH" || risk === "CRITICAL";
}

const ShieldPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [chains, setChains] = useState<ShieldChain[]>([]);
  const [chainId, setChainId] = useState(
    () => searchParams.get("chainId") || "1",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ShieldSnapshot | null>(null);
  const [approvals, setApprovals] = useState<ShieldApproval[]>([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [revokingKey, setRevokingKey] = useState<string | null>(null);

  const { writeContract, data: revokeHash, isPending: revokePending } =
    useWriteContract();
  const { isLoading: revokeConfirming } = useWaitForTransactionReceipt({
    hash: revokeHash,
  });

  useEffect(() => {
    shieldApi.getChains().then((r) => {
      setChains(r.data.data || []);
    });
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("chainId");
    if (fromUrl) setChainId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (isConnected && connectedChainId) {
      setChainId(String(connectedChainId));
    }
  }, [isConnected, connectedChainId]);

  const loadShield = useCallback(async () => {
    if (!address) return;
    const cid = Number(chainId);
    setLoading(true);
    setError(null);
    try {
      const scanRes = await shieldApi.scan(address, cid);
      const { snapshot: snap, approvals: list } = scanRes.data.data;
      setSnapshot(snap);
      setApprovals(list || []);
      pushShieldHistory(snap);
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      const code = (apiErr.response?.data as { error?: { code?: string } })?.error
        ?.code;
      const message =
        apiErr.response?.data?.error?.message ||
        apiErr.message ||
        "Shield scan failed";
      setError(
        code === "RPC_RATE_LIMIT"
          ? `${message} Wallet connection may still work; use Refresh after a short wait.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    if (isConnected && address) {
      loadShield();
    }
  }, [isConnected, address, chainId, loadShield]);

  useEffect(() => {
    if (revokeHash && !revokeConfirming) {
      setRevokingKey(null);
      loadShield();
    }
  }, [revokeHash, revokeConfirming, loadShield]);

  const filteredApprovals = useMemo(() => {
    let list = approvals;
    if (!advancedMode) {
      list = list.filter(
        (a) =>
          isHighRiskLevel(a.spenderRisk?.riskLevel) ||
          isHighRiskLevel(a.tokenRisk?.riskLevel) ||
          a.isUnlimited,
      );
    }
    if (severityFilter !== "all") {
      list = list.filter((a) => {
        const levels = [a.spenderRisk?.riskLevel, a.tokenRisk?.riskLevel].filter(
          Boolean,
        ) as string[];
        if (severityFilter === "high") {
          return levels.some((l) => l === "HIGH" || l === "CRITICAL");
        }
        if (severityFilter === "medium") {
          return levels.includes("MEDIUM");
        }
        if (severityFilter === "low") {
          return levels.includes("LOW");
        }
        return true;
      });
    }
    return list;
  }, [approvals, advancedMode, severityFilter]);

  const handleRevoke = (approval: ShieldApproval) => {
    if (!address) return;
    const key = `${approval.token}:${approval.spender}`;
    setRevokingKey(key);
    const targetChainId = Number(chainId);
    if (connectedChainId !== targetChainId) {
      switchChain({ chainId: targetChainId });
    }
    writeContract({
      address: approval.token as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [approval.spender as `0x${string}`, 0n],
      chainId: targetChainId,
    });
  };

  return (
    <div className="container max-w-4xl py-6 px-3 sm:px-4 md:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Shield
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            De.Fi-style wallet security — approvals, token risks, and in-app revoke.
          </p>
        </div>
        <ConnectButton />
      </div>

      {!isConnected ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connect your wallet</AlertTitle>
          <AlertDescription>
            Connect a wallet to scan approvals and revoke risky spenders on-chain.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Network</CardTitle>
          <CardDescription>Scan must match the chain you revoke on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="shield-chain">Chain</Label>
            <Select value={chainId} onValueChange={setChainId}>
              <SelectTrigger id="shield-chain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chains.map((c) => (
                  <SelectItem key={c.chainId} value={String(c.chainId)}>
                    {c.name}
                  </SelectItem>
                ))}
                {chains.length === 0 ? (
                  <>
                    <SelectItem value="1">Ethereum</SelectItem>
                    <SelectItem value="56">BNB Smart Chain</SelectItem>
                    <SelectItem value="8453">Base</SelectItem>
                    <SelectItem value="42161">Arbitrum</SelectItem>
                    <SelectItem value="137">Polygon</SelectItem>
                    <SelectItem value="10">Optimism</SelectItem>
                    <SelectItem value="43114">Avalanche</SelectItem>
                  </>
                ) : null}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="advanced"
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
            />
            <Label htmlFor="advanced" className="text-sm cursor-pointer">
              Advanced mode (show all approvals)
            </Label>
          </div>
          {advancedMode ? (
            <div className="grid gap-2 max-w-xs">
              <Label>Severity filter</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High / Critical</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={loadShield} disabled={!isConnected || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning wallet…
              </>
            ) : (
              "Refresh Shield scan"
            )}
          </Button>
        </CardFooter>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Shield error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {snapshot ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Wallet health</CardTitle>
              <Badge variant={riskVariant(snapshot.healthLevel)}>
                {snapshot.healthLevel} · {snapshot.healthScore}/100
              </Badge>
            </div>
            <CardDescription>{snapshot.indexerNote}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Approvals</p>
              <p className="font-medium">{snapshot.counts.approvals}</p>
            </div>
            <div>
              <p className="text-muted-foreground">High-risk</p>
              <p className="font-medium text-destructive">
                {snapshot.counts.highRiskApprovals}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">NFT operators</p>
              <p className="font-medium">{snapshot.counts.nftApprovals}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {filteredApprovals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Token approvals</CardTitle>
            <CardDescription>
              Revoke sets allowance to zero — the spender can no longer move tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredApprovals.map((a) => {
              const key = `${a.token}:${a.spender}`;
              const revoking = revokingKey === key && (revokePending || revokeConfirming);
              return (
                <div
                  key={key}
                  className="border border-border rounded-md p-3 space-y-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {a.tokenSymbol || "Token"}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.token.slice(0, 10)}…
                      </span>
                    </span>
                    {a.isUnlimited ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Unlimited
                      </Badge>
                    ) : null}
                    {a.spenderRisk ? (
                      <Badge variant={riskVariant(a.spenderRisk.riskLevel)} className="text-[10px]">
                        Spender {a.spenderRisk.riskLevel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    Spender: {a.spender}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!isConnected || revoking}
                      onClick={() => handleRevoke(a)}
                    >
                      {revoking ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Revoking…
                        </>
                      ) : (
                        "Revoke"
                      )}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={`/analyze?tab=address&address=${a.spender}&chainId=${chainId}`}
                      >
                        Scan spender
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={`https://revoke.cash/address/${address}?chainId=${chainId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        revoke.cash <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : snapshot && !loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {advancedMode
            ? "No active ERC-20 approvals found in the recent block window."
            : "No high-risk approvals in the recent window. Enable Advanced mode to see all."}
        </p>
      ) : null}
    </div>
  );
};

export default ShieldPage;
