import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { analysisApi } from "@/services/api";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  FileText,
  ChevronRight,
} from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// This type should match the summary object from the backend Analysis model
interface AnalysisSummary {
  id: string;
  contractName: string | null;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
  duration: number | null;
  summary: {
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  } | null;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Dashboard: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await analysisApi.getHistory();
        setAnalyses(response.data.data);
      } catch (err: any) {
        setError(
          err.error?.message ||
            "Failed to fetch analysis history. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusIndicator = (status: AnalysisSummary["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3 mr-1" /> Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
          </Badge>
        );
      case "queued":
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" /> Queued
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-10">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto" />
          <p className="mt-4 text-white/60">
            Loading your analysis history...
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
        </Alert>
      );
    }

    if (analyses.length === 0) {
      return (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-lg bg-black/50">
          <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">No Analyses Found</h3>
          <p className="mt-2 text-white/60">
            You haven't analyzed any contracts yet.
          </p>
          <Button asChild className="mt-6 bg-white text-black hover:bg-gray-200">
            <Link to="/analyze">Start Your First Analysis</Link>
          </Button>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vulnerabilities</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  <span className="sr-only">View</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => (
                <TableRow key={analysis.id}>
                  <TableCell className="font-medium">
                    {analysis.contractName || "Untitled Contract"}
                  </TableCell>
                  <TableCell>{getStatusIndicator(analysis.status)}</TableCell>
                  <TableCell>
                    {analysis.status === "completed" && analysis.summary ? (
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="text-destructive font-bold">
                          {analysis.summary.highSeverity} High
                        </span>
                        <span className="text-yellow-500 font-bold">
                          {analysis.summary.mediumSeverity} Med
                        </span>
                        <span className="text-blue-500 font-bold">
                          {analysis.summary.lowSeverity} Low
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(analysis.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/analysis/${analysis.id}`}>
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Analysis History</h1>
        <Button asChild className="bg-white text-black hover:bg-gray-200">
          <Link to="/analyze">
            <ShieldAlert className="w-4 h-4 mr-2" />
            New Analysis
          </Link>
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default Dashboard;
