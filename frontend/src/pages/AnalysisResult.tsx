import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { analysisApi } from "@/services/api";
import { Loader2, AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

interface AnalysisDetail {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  contractInfo: {
    name: string | null;
  };
  result: {
    summary: {
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
      overallScore: number;
      riskLevel: "HIGH" | "MEDIUM" | "LOW";
    };
    vulnerabilities: Vulnerability[];
  } | null;
  error: string | null;
  createdAt: string;
}

// --- Helper Functions ---
const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSeverityVariant = (
  severity:
    | Vulnerability["impact"]
    | AnalysisDetail["result"]["summary"]["riskLevel"]
    | undefined,
): "destructive" | "secondary" | "outline" | "default" => {
  if (!severity) return "default";
  switch (severity) {
    case "High":
    case "HIGH":
      return "destructive";
    case "Medium":
    case "MEDIUM":
      return "secondary";
    case "Low":
    case "LOW":
      return "outline";
    default:
      return "default";
  }
};

// --- Sub-components ---
const VulnerabilityAccordionItem: React.FC<{ vuln: Vulnerability }> = ({
  vuln,
}) => {
  const formatLines = (lines: number[]) =>
    lines.length === 1
      ? `L${lines[0]}`
      : `L${lines[0]}-${lines[lines.length - 1]}`;

  return (
    <AccordionItem value={vuln.check}>
      <AccordionTrigger>
        <div className="flex items-center gap-4">
          <Badge variant={getSeverityVariant(vuln.impact)}>{vuln.impact}</Badge>
          <span className="text-left">{vuln.check}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{vuln.description}</p>
        <div className="text-xs font-mono text-muted-foreground">
          {vuln.elements.map((el, i) => (
            <div key={i}>
              {`${el.type} "${el.name}" (${formatLines(el.source_mapping.lines)})`}
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// --- Main Component ---
const AnalysisResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No analysis ID provided in the URL.");
      setIsLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        const response = await analysisApi.getAnalysis(id);
        setAnalysis(response.data.data);
      } catch (err: any) {
        setError(
          err.error?.message ||
            `Failed to fetch analysis details for ID ${id}.`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
        <p className="mt-4 text-white/60">
          Loading analysis results...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <AlertTitle className="text-red-400">An Error Occurred</AlertTitle>
        <AlertDescription className="text-red-400">{error}</AlertDescription>
        <Button asChild variant="link" className="p-0 h-auto mt-4 text-accent hover:text-accent/80">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </Alert>
    );
  }

  if (!analysis) {
    return null;
  }

  const { contractInfo, result, status, createdAt } = analysis;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 -ml-4 text-white/60 hover:text-white">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-white">
          {contractInfo.name || "Analysis Details"}
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Analyzed on {formatDate(createdAt)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {result ? (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Overall Risk
                </p>
                <Badge
                  variant={getSeverityVariant(result?.summary?.riskLevel)}
                  className="text-2xl font-bold mt-1 px-4 py-1"
                >
                  {result?.summary?.riskLevel || "N/A"}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Security Score
                </p>
                <p className="text-3xl font-bold">
                  {result?.summary?.overallScore || 0}/100
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    High
                  </p>
                  <p className="text-xl font-bold text-destructive">
                    {result?.summary?.highSeverity || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Medium
                  </p>
                  <p className="text-xl font-bold text-yellow-500">
                    {result?.summary?.mediumSeverity || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Low
                  </p>
                  <p className="text-xl font-bold text-blue-500">
                    {result?.summary?.lowSeverity || 0}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="md:col-span-3 text-center p-4">
              <h3 className="font-semibold text-lg">
                {status === "failed"
                  ? "Analysis Failed"
                  : "Analysis Incomplete"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {analysis.error || "The analysis did not produce a result."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && result.vulnerabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Vulnerabilities Found ({result.vulnerabilities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {result.vulnerabilities.map((vuln, index) => (
                <VulnerabilityAccordionItem key={index} vuln={vuln} />
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {result && result.vulnerabilities.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg bg-black/50">
          <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">No Vulnerabilities Found</h3>
          <p className="mt-2 text-white/60">
            Our scanner did not find any issues in this contract.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalysisResultPage;
