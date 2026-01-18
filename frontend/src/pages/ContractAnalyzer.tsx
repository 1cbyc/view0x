import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  FileText,
  Save,
  LogIn,
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

// Typing animation hook for placeholder
const useTypingAnimation = (text: string, speed: number = 100) => {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!text) return;
    
    let index = 0;
    setDisplayText("");
    setIsTyping(true);

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        // Restart after a delay
        setTimeout(() => {
          index = 0;
          setDisplayText("");
          setIsTyping(true);
        }, 3000);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isTyping };
};

const ContractAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [contractCode, setContractCode] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showExamplesDialog, setShowExamplesDialog] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is logged in
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Real-time update state
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(
    null,
  );

  // Typing animation for placeholder
  const placeholderText = "// Paste the Solidity code here...";
  const { displayText: animatedPlaceholder } = useTypingAnimation(
    placeholderText,
    80
  );

  useEffect(() => {
    // Only connect to WebSocket if user is authenticated
    const token = localStorage.getItem("accessToken");
    
    if (token && currentAnalysisId) {
      socketService.connect();
      
      // Set timeout for WebSocket updates (5 minutes max)
      const timeoutId = setTimeout(() => {
        if (isAnalyzing) {
          setError("Analysis is taking longer than expected. Please try again or check your backend logs.");
          setIsAnalyzing(false);
          setCurrentAnalysisId(null);
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      const handleUpdate = (payload: AnalysisUpdatePayload) => {
        if (payload.analysisId !== currentAnalysisId) return;

        setProgress(payload.progress);
        setProgressMessage(payload.currentStep || payload.message || "");

        if (payload.status === "completed") {
          // Clear timeout on completion
          clearTimeout(timeoutId);
          // Transform backend result format to match frontend format if needed
          if (payload.result) {
            // Backend sends result directly, transform if needed
            const result = payload.result;
            
            // Transform vulnerabilities if needed
            const transformedVulnerabilities: Vulnerability[] = (result.vulnerabilities || []).map((vuln: any) => ({
              check: vuln.check || vuln.type || "Unknown",
              description: vuln.description || "",
              impact: (vuln.impact === "HIGH" || vuln.severity === "HIGH" ? "High" : 
                      vuln.impact === "MEDIUM" || vuln.severity === "MEDIUM" ? "Medium" : 
                      vuln.impact === "LOW" || vuln.severity === "LOW" ? "Low" : "Informational") as Vulnerability["impact"],
              confidence: (vuln.confidence || "High") as Vulnerability["confidence"],
              elements: vuln.elements || [{
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
              id: result.id || currentAnalysisId || `analysis-${Date.now()}`,
              summary: result.summary || {
                highSeverity: result.highSeverity || 0,
                mediumSeverity: result.mediumSeverity || 0,
                lowSeverity: result.lowSeverity || 0,
                overallScore: result.overallScore || 50,
                riskLevel: result.riskLevel || "MEDIUM",
                gasOptimizations: gasOptimizations.length,
                codeQualityIssues: codeQuality.length,
              },
              vulnerabilities: transformedVulnerabilities,
              gasOptimizations,
              codeQuality,
            });
          }
          setIsAnalyzing(false);
          setCurrentAnalysisId(null);
        } else if (payload.status === "failed") {
          clearTimeout(timeoutId);
          setError(payload.error || "An unknown error occurred during analysis.");
          setIsAnalyzing(false);
          setCurrentAnalysisId(null);
        }
      };

      socketService.subscribeToAnalysis(currentAnalysisId, handleUpdate);

      return () => {
        clearTimeout(timeoutId);
        socketService.unsubscribeFromAnalysis(currentAnalysisId);
      };
    } else {
      // Disconnect WebSocket if not authenticated
      socketService.disconnect();
    }
  }, [currentAnalysisId]);

  // Disconnect socket on component unmount
  useEffect(() => () => socketService.disconnect(), []);

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsAuthenticated(!!token);
    
    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("accessToken");
      setIsAuthenticated(!!newToken);
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

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

    // Use state variable for authentication check
    const token = localStorage.getItem("accessToken");
    const userIsAuthenticated = !!token || isAuthenticated;

    try {
      if (userIsAuthenticated) {
        // Use authenticated endpoint - saves to account with WebSocket updates
        setProgressMessage("Creating analysis job...");
        const response = await analysisApi.createAnalysis({ contractCode });
        const jobId = response.data.data.jobId;
        setCurrentAnalysisId(jobId);
        setProgressMessage("Analysis queued. Waiting for results...");
        // WebSocket will handle updates via useEffect hook
      } else {
        // Use public endpoint - no login required, but results aren't saved
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
          {/* Save Prompt Banner for Non-Logged-In Users */}
          {!isAuthenticated && (
            <Alert className="bg-primary/10 border-primary/20">
              <Save className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Save Your Analysis</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 mt-2">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Sign up or log in to save this analysis to your account and access it anytime.
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/register")}
                    className="text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Sign Up
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => navigate("/login")}
                    className="text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    Log In
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4 text-center px-2 sm:px-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  High Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {summary.highSeverity}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Medium Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-500">
                  {summary.mediumSeverity}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Low Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-500">
                  {summary.lowSeverity}
                </p>
              </div>
              {summary.gasOptimizations !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Gas Optimizations
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-500">
                    {summary.gasOptimizations}
                  </p>
                </div>
              )}
              {summary.codeQualityIssues !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Code Quality
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-500">
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
                  <AccordionTrigger className="text-left py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Badge variant={getSeverityClass(vuln.impact)} className="text-xs flex-shrink-0">
                        {vuln.impact}
                      </Badge>
                      <span className="text-sm sm:text-base truncate">{vuln.check}</span>
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
                <div className="space-y-3">
                  {gasOptimizations.map((opt, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-md border border-border bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-purple-500 border-purple-500 text-xs">
                            Gas
                          </Badge>
                          <span className="text-sm font-medium">{opt.type}</span>
                        </div>
                        {opt.potentialSavings && (
                          <span className="text-xs text-purple-400 font-medium whitespace-nowrap">
                            {opt.potentialSavings}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{opt.description}</p>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Recommendation: <span className="text-primary">{opt.recommendation}</span>
                      </p>
                      {opt.lineNumber && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Line {opt.lineNumber}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
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
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Badge 
                            variant={issue.severity === "HIGH" ? "destructive" : 
                                    issue.severity === "MEDIUM" ? "secondary" : "outline"}
                            className="text-xs flex-shrink-0"
                          >
                            {issue.severity}
                          </Badge>
                          <span className="text-sm sm:text-base truncate">{issue.type}</span>
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
    <div className="container mx-auto py-3 sm:py-4 md:py-8 px-3 sm:px-4 md:px-6 max-w-7xl">
      <div className="text-center mb-4 sm:mb-6 md:mb-12">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight px-1">
          Smart Contract Security Scanner
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-white/60 mt-2 sm:mt-4 max-w-2xl mx-auto px-2">
          Paste your Solidity code to get an instant security analysis. No login required to scan contracts.
        </p>
        <p className="text-xs sm:text-sm text-white/40 mt-1 sm:mt-2 px-2">
          <Link 
            to="/login" 
            className="text-primary hover:text-primary/80 underline"
          >
            Sign in
          </Link>
          {' '}to save your analysis history and track your scans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-8">
        <div className="space-y-3 sm:space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Contract Code</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Paste your Solidity source code below or upload a file.
              </CardDescription>
            </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="border border-border rounded-md overflow-hidden">
                      <CodeMirror
                        value={contractCode}
                        height="180px"
                        className="text-xs sm:text-sm"
                        theme={oneDark}
                        extensions={[javascript({ jsx: false })]}
                        onChange={(value) => setContractCode(value)}
                        placeholder={contractCode ? "" : animatedPlaceholder}
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: true,
                          dropCursor: false,
                          allowMultipleSelections: false,
                        }}
                      />
                    </div>
                    <FileUpload
                      onFileSelect={(content, fileName) => {
                        setContractCode(content);
                        setError(null);
                      }}
                      accept=".sol,.vy,.txt"
                      maxSize={5 * 1024 * 1024}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-3 sm:pt-4">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Dialog open={showExamplesDialog} onOpenChange={setShowExamplesDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Load Example
                    </Button>
                  </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col m-2 sm:m-4">
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
        <div className="space-y-3 sm:space-y-4">{renderResults()}</div>
      </div>
    </div>
  );
};

export default ContractAnalyzer;
