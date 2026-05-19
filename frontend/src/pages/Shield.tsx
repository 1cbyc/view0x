import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWalletClient,
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
  type ShieldEip7702Delegation,
  type ShieldNftApproval,
  type ShieldSnapshot,
} from "@/services/api";
import { pushShieldHistory } from "@/lib/shieldHistory";
import {
  type PendingShieldRevoke,
  revokeEip7702Delegation,
} from "@/lib/shieldRevoke";

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
  const { data: walletClient } = useWalletClient();

  const [chains, setChains] = useState<ShieldChain[]>([]);
  const [chainId, setChainId] = useState(
    () => searchParams.get("chainId") || "1",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ShieldSnapshot | null>(null);
  const [approvals, setApprovals] = useState<ShieldApproval[]>([]);
  const [nftApprovals, setNftApprovals] = useState<ShieldNftApproval[]>([]);
  const [eip7702, setEip7702] = useState<ShieldEip7702Delegation | null>(null);
  const [browseOther, setBrowseOther] = useState(false);
  const [otherAddress, setOtherAddress] = useState(
    () => searchParams.get("address") || "",
  );
  const [advancedMode, setAdvancedMode] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [revokingKey, setRevokingKey] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<PendingShieldRevoke | null>(
    null,
  );
  const [eip7702TxHash, setEip7702TxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, data: revokeHash, isPending: revokePending } =
    useWriteContract();
  const { isLoading: revokeConfirming } = useWaitForTransactionReceipt({
    hash: revokeHash,
  });
  const { isLoading: eip7702Confirming } = useWaitForTransactionReceipt({
    hash: eip7702TxHash,
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
    if (addressFromUrl) {
      setOtherAddress(addressFromUrl);
      if (addressFromUrl && (!isConnected || addressFromUrl.toLowerCase() !== address?.toLowerCase())) {
        setBrowseOther(true);
      }
    }
  }, [searchParams, address, isConnected]);

  useEffect(() => {
    if (isConnected && connectedChainId) {
      setChainId(String(connectedChainId));
    }
  }, [connectedChainId, isConnected]);

  const activeScanAddress = useMemo(() => {
    if (isConnected && address && !browseOther) return address;
    return otherAddress.trim();
  }, [address, browseOther, isConnected, otherAddress]);

  const canRevoke =
    isConnected &&
    Boolean(address) &&
    Boolean(activeScanAddress) &&
    address!.toLowerCase() === activeScanAddress.toLowerCase();

  const targetChainId = Number(chainId);
  const wrongNetwork =
    isConnected && connectedChainId != null && connectedChainId !== targetChainId;

  const loadShield = useCallback(async () => {
    if (!activeScanAddress) return;
    setLoading(true);
    setError(null);
    try {
      const scanRes = await shieldApi.scan(activeScanAddress, targetChainId);
      const {
        snapshot: snap,
        approvals: list,
        nftApprovals: nftList,
        eip7702: delegation,
      } = scanRes.data.data;
      setSnapshot(snap);
      setApprovals(list || []);
      setNftApprovals(nftList || []);
      setEip7702(delegation ?? null);
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
          ? `${message} Try again in a minute.`
          : message,
      );
    } finally {
      setLoading(false);
    }
  }, [activeScanAddress, targetChainId]);

  useEffect(() => {
    if (isConnected && address && !browseOther) {
      loadShield();
    }
  }, [address, browseOther, isConnected, targetChainId, loadShield]);

  useEffect(() => {
    if (revokeHash && !revokeConfirming) {
      setRevokingKey(null);
      setPendingRevoke(null);
      loadShield();
    }
  }, [revokeHash, revokeConfirming, loadShield]);

  useEffect(() => {
    if (eip7702TxHash && !eip7702Confirming) {
      setRevokingKey(null);
      setEip7702TxHash(undefined);
      setPendingRevoke(null);
      loadShield();
    }
  }, [eip7702TxHash, eip7702Confirming, loadShield]);

  const runPendingRevoke = useCallback(
    async (pending: PendingShieldRevoke) => {
      if (!address || !canRevoke) return;

      if (pending.kind === "eip7702") {
        if (!walletClient) {
          setError("Your wallet must support EIP-7702 signing. Try MetaMask or use revoke.cash.");
          return;
        }
        setRevokingKey("eip7702");
        try {
          const hash = await revokeEip7702Delegation(
            walletClient,
            address as `0x${string}`,
          );
          setEip7702TxHash(hash);
        } catch (err: unknown) {
          setRevokingKey(null);
          const msg = err instanceof Error ? err.message : "EIP-7702 revoke failed";
          setError(
            msg.includes("not supported") || msg.includes("rejected")
              ? "Wallet rejected the delegation revoke. Use a wallet with EIP-7702 support (e.g. MetaMask) or revoke.cash."
              : msg,
          );
        }
        return;
      }

      if (pending.kind === "erc20") {
        const a = pending.approval;
        const key = `erc20:${a.token}:${a.spender}`;
        setRevokingKey(key);
        writeContract({
          address: a.token as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [a.spender as `0x${string}`, 0n],
          chainId: targetChainId,
        });
        return;
      }

      const a = pending.approval;
      const key = `nft:${a.collection}:${a.operator}`;
      setRevokingKey(key);
      writeContract({
        address: a.collection as `0x${string}`,
        abi: SET_APPROVAL_FOR_ALL_ABI,
        functionName: "setApprovalForAll",
        args: [a.operator as `0x${string}`, false],
        chainId: targetChainId,
      });
    },
    [address, canRevoke, targetChainId, walletClient, writeContract],
  );

  useEffect(() => {
    if (!pendingRevoke || !isConnected || wrongNetwork) return;
    void runPendingRevoke(pendingRevoke);
    setPendingRevoke(null);
  }, [connectedChainId, isConnected, pendingRevoke, runPendingRevoke, wrongNetwork]);

  const queueRevoke = (pending: PendingShieldRevoke) => {
    if (!canRevoke) return;
    setError(null);
    if (wrongNetwork) {
      setPendingRevoke(pending);
      switchChain({ chainId: targetChainId });
      return;
    }
    void runPendingRevoke(pending);
  };

  const handleChainChange = (value: string) => {
    setChainId(value);
    const cid = Number(value);
    if (isConnected && connectedChainId !== cid) {
      switchChain({ chainId: cid });
    }
  };

  const handleRevoke = (approval: ShieldApproval) => {
    queueRevoke({ kind: "erc20", approval });
  };

  const handleNftRevoke = (approval: ShieldNftApproval) => {
    queueRevoke({ kind: "nft", approval });
  };

  const handleEip7702Revoke = () => {
    queueRevoke({ kind: "eip7702" });
  };

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

  const shortAddress = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;
  const txBusy =
    revokePending ||
    revokeConfirming ||
    eip7702Confirming ||
    Boolean(pendingRevoke);

  return (
    <div className="container max-w-4xl py-6 px-3 sm:px-4 md:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2 sm:text-2xl">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
            Shield
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your wallet to scan and revoke token approvals on-chain — like revoke.cash.
          </p>
        </div>
        <div className="w-full sm:w-auto shrink-0 [&_button]:w-full sm:[&_button]:w-auto">
          <ConnectButton />
        </div>
      </div>

      {!isConnected ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connect your wallet to start</AlertTitle>
          <AlertDescription>
            Revokes are signed and sent from the wallet you connect. Without a connection we can
            only show a read-only preview of another address.
          </AlertDescription>
        </Alert>
      ) : null}

      {isConnected && wrongNetwork ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wrong network</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Switch your wallet to the selected chain before revoking. Pending actions will run
              after you switch.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => switchChain({ chainId: targetChainId })}
            >
              Switch network
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your wallet</CardTitle>
          <CardDescription>
            {isConnected
              ? "Approvals are loaded for the connected account. Revoke buttons send transactions from that wallet."
              : "Connect a wallet, or enter an address below for a read-only preview."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isConnected && address && !browseOther ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">Connected wallet</p>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="shield-address">Address (read-only)</Label>
              <input
                id="shield-address"
                value={otherAddress}
                onChange={(e) => setOtherAddress(e.target.value)}
                placeholder="0x…"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              <Switch
                id="browse-other"
                checked={browseOther}
                onCheckedChange={(checked) => {
                  setBrowseOther(checked);
                  if (!checked && address) setOtherAddress("");
                }}
              />
              <Label htmlFor="browse-other" className="text-sm cursor-pointer">
                Preview a different address (cannot revoke)
              </Label>
            </div>
          ) : null}

          <div className="grid gap-2 max-w-xs sm:max-w-none">
            <Label htmlFor="shield-chain">Chain</Label>
            <Select value={chainId} onValueChange={handleChainChange}>
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
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={loadShield}
            disabled={!activeScanAddress || loading}
            variant={isConnected && !browseOther ? "outline" : "default"}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning…
              </>
            ) : (
              "Refresh scan"
            )}
          </Button>
          {browseOther || !isConnected ? (
            <p className="text-xs text-muted-foreground self-center">
              Connect your wallet to revoke on-chain.
            </p>
          ) : null}
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
              {snapshot.chainName} · {shortAddress(snapshot.address)} · scanned{" "}
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
            {(snapshot.counts.eip7702Delegations ?? 0) > 0 ? (
              <div>
                <p className="text-muted-foreground">EIP-7702</p>
                <p className="font-medium text-destructive">Delegated</p>
              </div>
            ) : null}
            <div>
              <p className="text-muted-foreground">Holdings checked</p>
              <p className="font-medium">{snapshot.counts.holdings}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {eip7702?.hasDelegation && eip7702.delegate ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">EIP-7702 delegation</CardTitle>
            <CardDescription>
              Your wallet has delegated execution to a smart contract. Revoke clears the
              delegation (same idea as revoke.cash).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-mono text-xs break-all text-muted-foreground">
              Delegate: {eip7702.delegate}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                size="sm"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!canRevoke || txBusy}
                onClick={handleEip7702Revoke}
              >
                {revokingKey === "eip7702" && txBusy ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Revoking delegation…
                  </>
                ) : (
                  "Revoke EIP-7702 delegation"
                )}
              </Button>
              <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                <Link
                  to={`/analyze?tab=address&address=${eip7702.delegate}&chainId=${chainId}`}
                >
                  Scan delegate contract
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires a wallet that supports EIP-7702 (e.g. MetaMask). Currently detected on
              Ethereum mainnet only.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {filteredApprovals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Token approvals</CardTitle>
            <CardDescription>
              Revoke sends an approval transaction from your connected wallet (allowance → 0).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredApprovals.map((a) => {
              const key = `erc20:${a.token}:${a.spender}`;
              const revoking = revokingKey === key && txBusy;
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={!canRevoke || revoking}
                      onClick={() => handleRevoke(a)}
                    >
                      {revoking ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Confirm in wallet…
                        </>
                      ) : (
                        "Revoke"
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                      <Link
                        to={`/analyze?tab=address&address=${a.spender}&chainId=${chainId}`}
                      >
                        Scan spender
                      </Link>
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
              Revoke removes operator access — signed by your connected wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredNftApprovals.map((a) => {
              const key = `nft:${a.collection}:${a.operator}`;
              const revoking = revokingKey === key && txBusy;
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={!canRevoke || revoking}
                      onClick={() => handleNftRevoke(a)}
                    >
                      {revoking ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Confirm in wallet…
                        </>
                      ) : (
                        "Revoke operator"
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
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
