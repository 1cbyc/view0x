import React, { useState } from "react";
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
import { scanApi, type AddressScanResult } from "@/services/api";

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

export const AddressScanPanel: React.FC = () => {
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddressScanResult | null>(null);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await scanApi.scanAddress({
        address: address.trim(),
        chainId: Number(chainId),
      });
      setResult(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        (err as Error).message ||
        "Scan failed";
      setError(msg);
    } finally {
      setLoading(false);
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
            {result.heuristics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk flags detected.</p>
            ) : (
              <ul className="space-y-2">
                {result.heuristics.map((f) => (
                  <li key={f.id} className="text-sm border border-border rounded-md p-2">
                    <span className="font-medium">{f.title}</span>
                    <p className="text-muted-foreground mt-1">{f.description}</p>
                  </li>
                ))}
              </ul>
            )}
            {result.sourceAvailable && (
              <p className="text-xs text-muted-foreground">Verified source found — run a full Slither scan from the Paste source tab.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
