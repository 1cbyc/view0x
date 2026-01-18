import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  FileText,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

// UI Components from the new theme
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// Services and Types
import { analysisApi } from "@/services/api";
import { socketService, AnalysisUpdatePayload } from "@/services/socketService";

// --- Type Definitions ---

interface VulnerabilityElement {
  type: string;
  name: string;
  source_mapping: {
    lines: number[];
  };
}

interface Vulnerability {
  check: string;
  description: string;
  impact: "High" | "Medium" | "Low" | "Informational" | "Optimization";
  confidence: "High" | "Medium" | "Low";
  elements: VulnerabilityElement[];
}

interface AnalysisResult {
  id: string;
  summary: {
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    overallScore: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
  };
  vulnerabilities: Vulnerability[];
}

const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableContract {
    mapping(address => uint256) public balances;
    address public owner;
    bool private locked;

    constructor() {
        owner = msg.sender;
    }

    // Missing access control - anyone can change owner
    function setOwner(address newOwner) public {
        owner = newOwner;
    }

    // Reentrancy vulnerability - state updated after external call
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Dangerous tx.origin usage - vulnerable to phishing
    function transfer(address to, uint256 amount) public {
        require(tx.origin == owner, "Not authorized");
        balances[to] += amount;
    }

    // Integer overflow/underflow (fixed in Solidity 0.8.0+, but shown for demonstration)
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // Missing zero address check
    function setBalance(address account, uint256 amount) public {
        balances[account] = amount;
    }
}`;

const getSeverityClass = (severity: Vulnerability["impact"]) => {
  switch (severity) {
    case "High":
      return "destructive";
    case "Medium":
      return "secondary";
    case "Low":
      return "outline";
    default:
      return "default";
  }
};

const ContractAnalyzer: React.FC = () => {
  const [contractCode, setContractCode] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Real-time update state
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    socketService.connect();
    const handleUpdate = (payload: AnalysisUpdatePayload) => {
      if (payload.analysisId !== currentAnalysisId) return;

      setProgress(payload.progress);
      setProgressMessage(payload.message || "");

      if (payload.status === "completed") {
        setAnalysisResult(payload.result);
        setIsAnalyzing(false);
        setCurrentAnalysisId(null);
      } else if (payload.status === "failed") {
        setError(payload.error || "An unknown error occurred during analysis.");
        setIsAnalyzing(false);
        setCurrentAnalysisId(null);
      }
    };

    if (currentAnalysisId) {
      socketService.subscribeToAnalysis(currentAnalysisId, handleUpdate);
    }

    return () => {
      if (currentAnalysisId) {
        socketService.unsubscribeFromAnalysis(currentAnalysisId);
      }
    };
  }, [currentAnalysisId]);

  // Disconnect socket on component unmount
  useEffect(() => () => socketService.disconnect(), []);

  const resetState = () => {
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage("");
    if (currentAnalysisId) {
      socketService.unsubscribeFromAnalysis(currentAnalysisId);
      setCurrentAnalysisId(null);
    }
  };

  const handleAnalyze = async () => {
    if (!contractCode.trim()) return;

    resetState();
    setIsAnalyzing(true);
    setProgressMessage("Submitting for analysis...");

    // Check if user is authenticated
    const token = localStorage.getItem("accessToken");

    try {
      if (token) {
        // Use authenticated endpoint with WebSocket updates
        const response = await analysisApi.createAnalysis({ contractCode });
        const initialAnalysis = response.data.data;

        if (initialAnalysis && initialAnalysis.id) {
          setCurrentAnalysisId(initialAnalysis.id);
        } else {
          throw new Error("Failed to start analysis: No analysis ID received.");
        }
      } else {
        // Use public endpoint (synchronous, no WebSocket)
        setProgressMessage("Analyzing contract...");
        const response = await analysisApi.createPublicAnalysis({ contractCode });
        const result = response.data.data;

        if (result) {
          // Transform public API response to match expected format
          const transformedVulnerabilities: Vulnerability[] = (result.vulnerabilities || []).map((vuln: any) => ({
            check: vuln.type || "Unknown",
            description: vuln.description || "",
            impact: (vuln.severity === "HIGH" ? "High" : 
                    vuln.severity === "MEDIUM" ? "Medium" : 
                    vuln.severity === "LOW" ? "Low" : "Informational") as Vulnerability["impact"],
            confidence: "High" as Vulnerability["confidence"],
            elements: [{
              type: "function",
              name: vuln.type || "Unknown",
              source_mapping: {
                lines: vuln.lineNumber ? [vuln.lineNumber] : []
              }
            }]
          }));

          setAnalysisResult({
            id: `public-${Date.now()}`,
            summary: {
              highSeverity: result.summary.highSeverity || 0,
              mediumSeverity: result.summary.mediumSeverity || 0,
              lowSeverity: result.summary.lowSeverity || 0,
              overallScore: result.summary.totalVulnerabilities > 0 ? 50 : 100,
              riskLevel: result.summary.highSeverity > 0 ? "HIGH" : 
                        result.summary.mediumSeverity > 0 ? "MEDIUM" : "LOW",
            },
            vulnerabilities: transformedVulnerabilities,
          });
          setIsAnalyzing(false);
        } else {
          throw new Error("Failed to analyze contract.");
        }
      }
    } catch (err: any) {
      // Handle 401 specifically - fallback to public endpoint
      if (err.response?.status === 401 && token) {
        // Token expired or invalid, try public endpoint instead
        try {
          setProgressMessage("Analyzing contract (public mode)...");
          const response = await analysisApi.createPublicAnalysis({ contractCode });
          const result = response.data.data;

          if (result) {
            const transformedVulnerabilities: Vulnerability[] = (result.vulnerabilities || []).map((vuln: any) => ({
              check: vuln.type || "Unknown",
              description: vuln.description || "",
              impact: (vuln.severity === "HIGH" ? "High" : 
                      vuln.severity === "MEDIUM" ? "Medium" : 
                      vuln.severity === "LOW" ? "Low" : "Informational") as Vulnerability["impact"],
              confidence: "High" as Vulnerability["confidence"],
              elements: [{
                type: "function",
                name: vuln.type || "Unknown",
                source_mapping: {
                  lines: vuln.lineNumber ? [vuln.lineNumber] : []
                }
              }]
            }));

            setAnalysisResult({
              id: `public-${Date.now()}`,
              summary: {
                highSeverity: result.summary.highSeverity || 0,
                mediumSeverity: result.summary.mediumSeverity || 0,
                lowSeverity: result.summary.lowSeverity || 0,
                overallScore: result.summary.totalVulnerabilities > 0 ? 50 : 100,
                riskLevel: result.summary.highSeverity > 0 ? "HIGH" : 
                          result.summary.mediumSeverity > 0 ? "MEDIUM" : "LOW",
              },
              vulnerabilities: transformedVulnerabilities,
            });
            setIsAnalyzing(false);
            // Clear invalid token
            localStorage.removeItem("accessToken");
            return;
          }
        } catch (publicErr: any) {
          // If public endpoint also fails, show error
          const errorMessage =
            publicErr.response?.data?.error?.message ||
            publicErr.message ||
            "Failed to analyze contract. Please try again.";
          setError(errorMessage);
          setIsAnalyzing(false);
          return;
        }
      }
      
      // Other errors
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to submit analysis.";
      setError(errorMessage);
      setIsAnalyzing(false);
    }
  };

  const renderResults = () => {
    if (isAnalyzing) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Analysis in Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              {progressMessage || "Please wait..."}
            </p>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (analysisResult) {
      const { summary, vulnerabilities } = analysisResult;
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  High Risk
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {summary.highSeverity}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Medium Risk
                </p>
                <p className="text-2xl font-bold text-yellow-500">
                  {summary.mediumSeverity}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Low Risk
                </p>
                <p className="text-2xl font-bold text-blue-500">
                  {summary.lowSeverity}
                </p>
              </div>
            </CardContent>
          </Card>

          {vulnerabilities.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {vulnerabilities.map((vuln, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-4">
                      <Badge variant={getSeverityClass(vuln.impact)}>
                        {vuln.impact}
                      </Badge>
                      <span>{vuln.check}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {vuln.description}
                    </p>
                    <div className="text-xs font-mono text-muted-foreground">
                      {vuln.elements.map((el, i) => (
                        <div
                          key={i}
                        >{`${el.type} "${el.name}" (Lines: ${el.source_mapping.lines.join(", ")})`}</div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">
                No Vulnerabilities Found
              </h3>
              <p className="mt-2 text-muted-foreground">
                Our scanner did not find any issues.
              </p>
            </Card>
          )}
        </div>
      );
    }

    return (
      <Card className="text-center p-8 border-2 border-dashed border-white/10 bg-black/50">
        <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white">Ready to Analyze</h3>
        <p className="mt-2 text-white/60">
          Paste your contract code to get started.
        </p>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Smart Contract Security Scanner
        </h1>
        <p className="text-lg text-white/60 mt-4 max-w-2xl mx-auto">
          Paste your Solidity code to get an instant security analysis, powered
          by Slither. No login required to scan contracts.
        </p>
        <p className="text-sm text-white/40 mt-2">
          <Link to="/login" className="text-primary hover:text-primary/80 underline">
            Sign in
          </Link>
          {' '}to save your analysis history and track your scans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Code</CardTitle>
              <CardDescription>
                Paste your Solidity source code below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <CodeMirror
                  value={contractCode}
                  height="384px"
                  theme={oneDark}
                  extensions={[javascript({ jsx: false })]}
                  onChange={(value) => setContractCode(value)}
                  placeholder="// Your Solidity code here..."
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                  }}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetState();
                    setContractCode(sampleContract);
                  }}
                >
                  Load Sample
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetState();
                    setContractCode("");
                  }}
                >
                  Clear
                </Button>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !contractCode.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Analyze Contract
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="space-y-4">{renderResults()}</div>
      </div>
    </div>
  );
};

export default ContractAnalyzer;
