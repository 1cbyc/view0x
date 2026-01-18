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
import { FileUpload } from "@/components/FileUpload";
import { contractExamples, ContractExample } from "@/data/contractExamples";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface GasOptimization {
  type: string;
  description: string;
  recommendation: string;
  potentialSavings?: string;
  lineNumber?: number;
}

interface CodeQualityIssue {
  type: string;
  description: string;
  recommendation: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  lineNumber?: number;
}

interface AnalysisResult {
  id: string;
  summary: {
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    overallScore: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
    gasOptimizations?: number;
    codeQualityIssues?: number;
  };
  vulnerabilities: Vulnerability[];
  gasOptimizations?: GasOptimization[];
  codeQuality?: CodeQualityIssue[];
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
  const [showExamplesDialog, setShowExamplesDialog] = useState<boolean>(false);
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
    // Only connect to WebSocket if user is authenticated
    const token = localStorage.getItem("accessToken");
    
    if (token && currentAnalysisId) {
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

      socketService.subscribeToAnalysis(currentAnalysisId, handleUpdate);

      return () => {
        socketService.unsubscribeFromAnalysis(currentAnalysisId);
      };
    } else {
      // Disconnect WebSocket if not authenticated
      socketService.disconnect();
    }
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

    // Always use public endpoint - no login required for scanning
    // Users can login to save their analysis history later
    try {
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

          // Transform gas optimizations
          const gasOptimizations: GasOptimization[] = (result.gasOptimizations || []).map((opt: any) => ({
            type: opt.type || "unknown",
            description: opt.description || "",
            recommendation: opt.recommendation || "",
            potentialSavings: opt.potentialSavings,
            lineNumber: opt.location?.line || opt.lineNumber
          }));

          // Transform code quality issues
          const codeQuality: CodeQualityIssue[] = (result.codeQuality || []).map((issue: any) => ({
            type: issue.type || "unknown",
            description: issue.description || "",
            recommendation: issue.recommendation || "",
            severity: (issue.severity || "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
            lineNumber: issue.location?.line || issue.lineNumber
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
              gasOptimizations: gasOptimizations.length,
              codeQualityIssues: codeQuality.length,
            },
            vulnerabilities: transformedVulnerabilities,
            gasOptimizations,
            codeQuality,
          });
          setIsAnalyzing(false);
        } else {
          throw new Error("Failed to analyze contract.");
        }
    } catch (err: any) {
      // Handle errors
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to analyze contract. Please try again.";
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
      const { summary, vulnerabilities, gasOptimizations, codeQuality } = analysisResult;
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
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
              {summary.gasOptimizations !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Gas Optimizations
                  </p>
                  <p className="text-2xl font-bold text-purple-500">
                    {summary.gasOptimizations}
                  </p>
                </div>
              )}
              {summary.codeQualityIssues !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Code Quality
                  </p>
                  <p className="text-2xl font-bold text-orange-500">
                    {summary.codeQualityIssues}
                  </p>
                </div>
              )}
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

          {gasOptimizations && gasOptimizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Gas Optimizations ({gasOptimizations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {gasOptimizations.map((opt, index) => (
                    <AccordionItem value={`gas-${index}`} key={index}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-purple-500 border-purple-500">
                            Gas
                          </Badge>
                          <span>{opt.type}</span>
                          {opt.potentialSavings && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {opt.potentialSavings}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{opt.description}</p>
                        <p className="text-sm font-medium text-foreground">
                          Recommendation: {opt.recommendation}
                        </p>
                        {opt.lineNumber && (
                          <p className="text-xs font-mono text-muted-foreground">
                            Line {opt.lineNumber}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {codeQuality && codeQuality.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Code Quality Issues ({codeQuality.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {codeQuality.map((issue, index) => (
                    <AccordionItem value={`quality-${index}`} key={index}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-4">
                          <Badge 
                            variant={issue.severity === "HIGH" ? "destructive" : 
                                    issue.severity === "MEDIUM" ? "secondary" : "outline"}
                          >
                            {issue.severity}
                          </Badge>
                          <span>{issue.type}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        <p className="text-sm font-medium text-foreground">
                          Recommendation: {issue.recommendation}
                        </p>
                        {issue.lineNumber && (
                          <p className="text-xs font-mono text-muted-foreground">
                            Line {issue.lineNumber}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
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
    <div className="container mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
          Smart Contract Security Scanner
        </h1>
        <p className="text-base sm:text-lg text-white/60 mt-4 max-w-2xl mx-auto">
          Paste your Solidity code to get an instant security analysis, powered
          by Slither. No login required to scan contracts.
        </p>
        <p className="text-xs sm:text-sm text-white/40 mt-2">
          <Link 
            to="/login" 
            className="text-primary hover:text-primary/80 underline"
          >
            Sign in
          </Link>
          {' '}to save your analysis history and track your scans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Code</CardTitle>
              <CardDescription>
                Upload a file or paste your Solidity source code below.
              </CardDescription>
            </CardHeader>
                  <CardContent className="space-y-4">
                    <FileUpload
                      onFileSelect={(content, fileName) => {
                        setContractCode(content);
                        setError(null);
                      }}
                      accept=".sol,.vy,.txt"
                      maxSize={5 * 1024 * 1024}
                    />
                    <div className="border border-border rounded-md overflow-hidden">
                      <CodeMirror
                        value={contractCode}
                        height="300px"
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
                  <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
              <div className="space-x-2">
                <Dialog open={showExamplesDialog} onOpenChange={setShowExamplesDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost">
                      <FileText className="w-4 h-4 mr-2" />
                      Load Example
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Contract Examples Library</DialogTitle>
                      <DialogDescription>
                        Browse and load example smart contracts to analyze. These examples demonstrate various patterns and vulnerabilities.
                      </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="vulnerable" className="flex-1 flex flex-col overflow-hidden mt-4">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="vulnerable">Vulnerable</TabsTrigger>
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="best-practice">Best Practice</TabsTrigger>
                      </TabsList>
                      <TabsContent value="vulnerable" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-full pr-4">
                          <div className="space-y-3">
                            {contractExamples
                              .filter((e) => e.category === "vulnerable")
                              .map((example) => (
                                <Card
                                  key={example.id}
                                  className="cursor-pointer hover:bg-white/5 transition-colors bg-card border-border"
                                  onClick={() => {
                                    resetState();
                                    setContractCode(example.code);
                                    setShowExamplesDialog(false);
                                  }}
                                >
                                  <CardHeader>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <CardTitle className="text-lg text-foreground">{example.name}</CardTitle>
                                        <CardDescription className="mt-1 text-muted-foreground">
                                          {example.description}
                                        </CardDescription>
                                      </div>
                                      <Badge variant="outline" className="ml-2">
                                        {example.difficulty}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                      {example.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent value="basic" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-full pr-4">
                          <div className="space-y-3">
                            {contractExamples
                              .filter((e) => e.category === "basic" || e.category === "erc20" || e.category === "erc721")
                              .map((example) => (
                                <Card
                                  key={example.id}
                                  className="cursor-pointer hover:bg-white/5 transition-colors bg-card border-border"
                                  onClick={() => {
                                    resetState();
                                    setContractCode(example.code);
                                    setShowExamplesDialog(false);
                                  }}
                                >
                                  <CardHeader>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <CardTitle className="text-lg text-foreground">{example.name}</CardTitle>
                                        <CardDescription className="mt-1 text-muted-foreground">
                                          {example.description}
                                        </CardDescription>
                                      </div>
                                      <Badge variant="outline" className="ml-2">
                                        {example.difficulty}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                      {example.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent value="best-practice" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-full pr-4">
                          <div className="space-y-3">
                            {contractExamples
                              .filter((e) => e.category === "best-practice")
                              .map((example) => (
                                <Card
                                  key={example.id}
                                  className="cursor-pointer hover:bg-white/5 transition-colors bg-card border-border"
                                  onClick={() => {
                                    resetState();
                                    setContractCode(example.code);
                                    setShowExamplesDialog(false);
                                  }}
                                >
                                  <CardHeader>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <CardTitle className="text-lg text-foreground">{example.name}</CardTitle>
                                        <CardDescription className="mt-1 text-muted-foreground">
                                          {example.description}
                                        </CardDescription>
                                      </div>
                                      <Badge variant="outline" className="ml-2">
                                        {example.difficulty}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                      {example.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
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
                      className="w-full sm:w-auto"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span className="hidden sm:inline">Analyzing...</span>
                          <span className="sm:hidden">Analyzing</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Analyze Contract</span>
                          <span className="sm:hidden">Analyze</span>
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
