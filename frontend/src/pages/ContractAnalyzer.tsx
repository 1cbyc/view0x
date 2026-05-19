import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import type { ContractExample } from "@/data/contractExamples";
import { ContractExamplesDialog } from "@/components/ContractExamplesDialog";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Services and Types
import { analysisApi, authApi } from "@/services/api";
import { clearDashboardCache, getGuestSessionId } from "@/lib/guestSession";
import { AddressScanPanel } from "@/components/AddressScanPanel";
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scanIdFromUrl = searchParams.get("scanId") ?? undefined;
  const addressFromUrl = searchParams.get("address") ?? undefined;
  const chainFromUrl = searchParams.get("chainId") ?? undefined;
  const tabFromUrl = searchParams.get("tab");
  const tabFromLogin = (location.state as { tab?: string } | null)?.tab;
  const defaultTab =
    scanIdFromUrl ||
    tabFromLogin === "address" ||
    tabFromUrl === "address" ||
    addressFromUrl
      ? "address"
      : "source";

  const [editorDark, setEditorDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setEditorDark(root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme") sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      obs.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);
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

  // After sign-in, attach any scans done while logged out
  useEffect(() => {
    if (!isAuthenticated) return;
    authApi
      .claimGuestWork(getGuestSessionId())
      .then(() => clearDashboardCache())
      .catch(() => {
        /* non-fatal */
      });
  }, [isAuthenticated]);

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
        try {
          const response = await analysisApi.createAnalysis({ contractCode });
          const jobId = response.data.data.jobId;
          setCurrentAnalysisId(jobId);
          setProgressMessage("Analysis queued. Waiting for results...");
          // WebSocket will handle updates via useEffect hook
        } catch (authError: any) {
          // If 401, token is invalid/expired - clear it and use public endpoint
          const is401 = authError.error?.statusCode === 401 || 
                       authError.status === 401 ||
                       authError.response?.status === 401 ||
                       (authError.response && authError.response.status === 401);
          
          if (is401) {
            console.warn("Authentication failed (401), falling back to public endpoint");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            setIsAuthenticated(false);
            // Continue to public endpoint below - don't return/throw
          } else {
            // Re-throw non-401 errors
            throw authError;
          }
        }
      }
      
      // Use public endpoint if not authenticated OR if authentication failed (401)
      const currentToken = localStorage.getItem("accessToken");
      if (!userIsAuthenticated || !currentToken) {
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

          const savedId =
            typeof response.data?.data?.analysisId === "string"
              ? response.data.data.analysisId
              : undefined;

          setAnalysisResult({
            id: savedId || `public-${Date.now()}`,
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
        err.error?.message ||
        err.message ||
        err.response?.data?.error?.message ||
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
            <CardContent className="grid grid-cols-2 gap-2.5 px-3 text-center sm:grid-cols-3 sm:gap-3 sm:px-4 md:grid-cols-5 md:gap-4 [&>div]:min-w-0">
              <div>
                <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                  High Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-destructive">
                  {summary.highSeverity}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                  Medium Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-500">
                  {summary.mediumSeverity}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                  Low Risk
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-500">
                  {summary.lowSeverity}
                </p>
              </div>
              {summary.gasOptimizations !== undefined && (
                <div>
                  <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                    Gas Optimizations
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-500">
                    {summary.gasOptimizations}
                  </p>
                </div>
              )}
              {summary.codeQualityIssues !== undefined && (
                <div>
                  <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
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
                        <div className="break-words" key={i}>
                          {`${el.type} "${el.name}" (Lines: ${el.source_mapping.lines.join(", ")})`}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <Card className="p-5 text-center sm:p-8">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500 sm:h-16 sm:w-16" />
              <h3 className="text-lg font-semibold sm:text-xl">
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
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge variant="outline" className="text-purple-500 border-purple-500 text-xs">
                            Gas
                          </Badge>
                          <span className="min-w-0 break-words text-sm font-medium">{opt.type}</span>
                        </div>
                        {opt.potentialSavings && (
                          <span className="text-xs font-medium text-purple-400 sm:whitespace-nowrap">
                            {opt.potentialSavings}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{opt.description}</p>
                      <p className="mb-1 break-words text-sm font-medium text-foreground">
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
                        <p className="break-words text-sm font-medium text-foreground">
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
      <Card className="border-2 border-dashed border-border bg-muted/40 p-5 text-center sm:p-8">
        <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70 sm:h-16 sm:w-16" />
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">Ready to Analyze</h3>
        <p className="mt-2 text-muted-foreground">
          Paste your contract code to get started.
        </p>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-3 sm:py-4 md:py-8 px-3 sm:px-4 md:px-6 max-w-7xl">
      <div className="text-center mb-4 sm:mb-6 md:mb-12">
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight text-foreground leading-tight px-1">
          Smart Contract Security Scanner
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-2 sm:mt-4 max-w-2xl mx-auto px-2">
          Paste Solidity source or scan a deployed contract address. No login required.
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-2 px-2">
          <Link 
            to="/login" 
            className="text-primary hover:text-primary/80 underline"
          >
            Sign in
          </Link>
          {' '}to save your analysis history and track your scans.
        </p>
      </div>

      <Tabs
        key={scanIdFromUrl || "analyze-tabs"}
        defaultValue={defaultTab}
        className="w-full"
      >
        <TabsList className="mx-auto mb-4 grid h-10 w-full max-w-md grid-cols-2">
          <TabsTrigger value="source">Paste source</TabsTrigger>
          <TabsTrigger value="address">Scan address</TabsTrigger>
        </TabsList>
        <TabsContent value="address" className="mt-0">
          <AddressScanPanel
            initialScanId={scanIdFromUrl}
            initialAddress={addressFromUrl}
            initialChainId={chainFromUrl}
          />
        </TabsContent>
        <TabsContent value="source" className="mt-0">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-8">
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
                        height="clamp(220px, 45vh, 360px)"
                        className="text-xs sm:text-sm"
                        theme={editorDark ? oneDark : "light"}
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
              <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap">
                <ContractExamplesDialog
                  open={showExamplesDialog}
                  onOpenChange={setShowExamplesDialog}
                  onSelect={(example: ContractExample) => {
                    resetState();
                    setContractCode(example.code);
                  }}
                />
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractAnalyzer;
