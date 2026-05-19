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
  type ShieldNftApproval,
  type ShieldSnapshot,
} from "@/services/api";
import { pushShieldHistory } from "@/lib/shieldHistory";

const SET_APPROVAL_FOR_ALL_ABI = [
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

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
  const [nftApprovals, setNftApprovals] = useState<ShieldNftApproval[]>([]);
  const [scanAddress, setScanAddress] = useState(
    () => searchParams.get("address") || "",
  );
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
    const addressFromUrl = searchParams.get("address");
    if (addressFromUrl) setScanAddress(addressFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (isConnected && connectedChainId) {
      setChainId(String(connectedChainId));
    }
    if (isConnected && address && !scanAddress) {
      setScanAddress(address);
    }
  }, [address, connectedChainId, isConnected, scanAddress]);

  const activeScanAddress = (scanAddress || address || "").trim();
  const canRevoke =
    Boolean(address && activeScanAddress) &&
    address?.toLowerCase() === activeScanAddress.toLowerCase();

  const loadShield = useCallback(async () => {
    if (!activeScanAddress) return;
    const cid = Number(chainId);
    setLoading(true);
    setError(null);
    try {
      const scanRes = await shieldApi.scan(activeScanAddress, cid);
      const { snapshot: snap, approvals: list, nftApprovals: nftList } = scanRes.data.data;
      setSnapshot(snap);
      setApprovals(list || []);
      setNftApprovals(nftList || []);
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
  }, [activeScanAddress, chainId]);

  useEffect(() => {
    if (
      isConnected &&
      address &&
      activeScanAddress &&
      activeScanAddress.toLowerCase() === address.toLowerCase()
    ) {
      loadShield();
    }
  }, [activeScanAddress, address, isConnected, chainId, loadShield]);

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

  const filteredNftApprovals = useMemo(() => {
    let list = nftApprovals;
    if (!advancedMode) {
      list = list.filter((a) => isHighRiskLevel(a.operatorRisk?.riskLevel));
    }
    if (severityFilter !== "all") {
      list = list.filter((a) => {
        const level = a.operatorRisk?.riskLevel;
        if (severityFilter === "high") return level === "HIGH" || level === "CRITICAL";
        if (severityFilter === "medium") return level === "MEDIUM";
        if (severityFilter === "low") return level === "LOW";
        return true;
      });
    }
    return list;
  }, [advancedMode, nftApprovals, severityFilter]);

  const handleRevoke = (approval: ShieldApproval) => {
    if (!address || !canRevoke) return;
    const key = `erc20:${approval.token}:${approval.spender}`;
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

  const handleNftRevoke = (approval: ShieldNftApproval) => {
    if (!address || !canRevoke) return;
    const key = `nft:${approval.collection}:${approval.operator}`;
    setRevokingKey(key);
    const targetChainId = Number(chainId);
    if (connectedChainId !== targetChainId) {
      switchChain({ chainId: targetChainId });
    }
    writeContract({
      address: approval.collection as `0x${string}`,
      abi: SET_APPROVAL_FOR_ALL_ABI,
      functionName: "setApprovalForAll",
      args: [approval.operator as `0x${string}`, false],
      chainId: targetChainId,
    });
  };

  const shortAddress = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

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
          <CardDescription>Scan any wallet, then connect that same wallet to revoke on-chain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
            <div className="grid gap-2">
              <Label htmlFor="shield-address">Wallet address</Label>
              <input
                id="shield-address"
                value={scanAddress}
                onChange={(e) => setScanAddress(e.target.value)}
                placeholder={address || "0x…"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-2">
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
          </div>
          {isConnected && activeScanAddress && !canRevoke ? (
            <Alert>
              <AlertTitle>Read-only scan</AlertTitle>
              <AlertDescription>
                You are viewing {shortAddress(activeScanAddress)}. Connect that wallet to revoke approvals.
              </AlertDescription>
            </Alert>
          ) : null}
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
          <Button onClick={loadShield} disabled={!activeScanAddress || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning wallet…
              </>
            ) : (
              "Scan approvals"
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
            <CardDescription>
              {snapshot.chainName} · scanned{" "}
              {new Date(snapshot.scannedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </CardDescription>
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
            <div>
              <p className="text-muted-foreground">Holdings checked</p>
              <p className="font-medium">{snapshot.counts.holdings}</p>
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
              const key = `erc20:${a.token}:${a.spender}`;
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
                      disabled={!canRevoke || revoking}
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
            ? "No active token approvals found for this wallet on this chain."
            : "No high-risk approvals found. Turn on Advanced mode to see everything we detected."}
        </p>
      ) : null}

      {filteredNftApprovals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">NFT collection approvals</CardTitle>
            <CardDescription>
              Revoke removes operator access for the entire collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredNftApprovals.map((a) => {
              const key = `nft:${a.collection}:${a.operator}`;
              const revoking = revokingKey === key && (revokePending || revokeConfirming);
              return (
                <div
                  key={key}
                  className="border border-border rounded-md p-3 space-y-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      Collection{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.collection.slice(0, 10)}…
                      </span>
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {a.standard.toUpperCase()}
                    </Badge>
                    {a.operatorRisk ? (
                      <Badge variant={riskVariant(a.operatorRisk.riskLevel)} className="text-[10px]">
                        Operator {a.operatorRisk.riskLevel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    Operator: {a.operator}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!canRevoke || revoking}
                      onClick={() => handleNftRevoke(a)}
                    >
                      {revoking ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Revoking…
                        </>
                      ) : (
                        "Revoke operator"
                      )}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={`/analyze?tab=address&address=${a.operator}&chainId=${chainId}`}
                      >
                        Scan operator
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default ShieldPage;
