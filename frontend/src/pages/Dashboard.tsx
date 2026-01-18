import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { analysisApi } from "@/services/api";
import { socketService, AnalysisUpdatePayload } from "@/services/socketService";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  FileText,
  ChevronRight,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpDown,
  X,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

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

type SortField = "createdAt" | "contractName" | "status" | "highSeverity";
type SortOrder = "asc" | "desc";

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
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Optimistic update: show cached data if available while fetching
        const cached = localStorage.getItem("dashboard_cache");
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheTime = new Date(cachedData.timestamp);
            const now = new Date();
            // Use cache if less than 30 seconds old
            if (now.getTime() - cacheTime.getTime() < 30000) {
              setAnalyses(cachedData.data || []);
              setIsLoading(false); // Clear loading state to show cached data
            }
          } catch (e) {
            // Ignore cache parse errors
          }
        }
        const response = await analysisApi.getHistory();
        const data = response.data.data || [];
        setAnalyses(data);
        // Cache the data
        localStorage.setItem("dashboard_cache", JSON.stringify({
          data,
          timestamp: new Date().toISOString(),
        }));
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          localStorage.removeItem("dashboard_cache");
          navigate("/login", { replace: true });
          return;
        }
        setError(
          err.response?.data?.error?.message ||
            "Failed to fetch analysis history. Please check your connection and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    // Connect to WebSocket for real-time updates
    if (token) {
      socketService.connect();
      setIsConnected(true);

      // Listen for analysis updates
      const handleAnalysisUpdate = (payload: AnalysisUpdatePayload) => {
        setAnalyses((prev) => {
          const updated = prev.map((analysis) => {
            if (analysis.id === payload.analysisId) {
              return {
                ...analysis,
                status: payload.status,
                ...(payload.status === "completed" && payload.result
                  ? {
                      summary: {
                        highSeverity:
                          payload.result.summary?.highSeverity || 0,
                        mediumSeverity:
                          payload.result.summary?.mediumSeverity || 0,
                        lowSeverity: payload.result.summary?.lowSeverity || 0,
                      },
                    }
                  : {}),
              };
            }
            return analysis;
          });
          return updated;
        });
      };

      // Subscribe to all user analyses for real-time updates
      socketService.socketInstance?.on("analysis:update", handleAnalysisUpdate);

      return () => {
        socketService.socketInstance?.off("analysis:update", handleAnalysisUpdate);
      };
    }
  }, [navigate]);

  // Filtered and sorted analyses
  const filteredAndSortedAnalyses = useMemo(() => {
    let filtered = [...analyses];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (analysis) =>
          analysis.contractName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          analysis.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((analysis) => analysis.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "contractName":
          aValue = a.contractName || "";
          bValue = b.contractName || "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "highSeverity":
          aValue = a.summary?.highSeverity || 0;
          bValue = b.summary?.highSeverity || 0;
          break;
        case "createdAt":
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [analyses, searchTerm, statusFilter, sortField, sortOrder]);

  // Statistics calculations
  const stats = useMemo(() => {
    const completed = analyses.filter((a) => a.status === "completed");
    const totalVulns = completed.reduce((sum, a) => {
      if (!a.summary) return sum;
      return sum + a.summary.highSeverity + a.summary.mediumSeverity + a.summary.lowSeverity;
    }, 0);
    const highVulns = completed.reduce((sum, a) => sum + (a.summary?.highSeverity || 0), 0);
    const avgVulns = completed.length > 0 ? (totalVulns / completed.length).toFixed(1) : "0";

    // Calculate trends (comparing last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = analyses.filter(
      (a) => new Date(a.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    );
    const prev7Days = analyses.filter(
      (a) => {
        const date = new Date(a.createdAt);
        return date >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
               date < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    );
    const trend = last7Days.length - prev7Days.length;

    return {
      total: analyses.length,
      completed: completed.length,
      failed: analyses.filter((a) => a.status === "failed").length,
      processing: analyses.filter((a) => a.status === "processing" || a.status === "queued").length,
      totalVulns,
      highVulns,
      avgVulns,
      trend,
    };
  }, [analyses]);

  // Sanitize CSV cell to prevent CSV injection
  const sanitizeCSVCell = (cell: any): string => {
    const str = String(cell);
    // Escape cells that start with formula characters to prevent CSV injection
    if (/^[=+\-@]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    // Escape cells containing commas, quotes, or newlines
    if (/[,"\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ["Contract Name", "Status", "High", "Medium", "Low", "Created At"];
    const rows = filteredAndSortedAnalyses.map((a) => [
      a.contractName || "Untitled",
      a.status,
      a.summary?.highSeverity || 0,
      a.summary?.mediumSeverity || 0,
      a.summary?.lowSeverity || 0,
      formatDate(a.createdAt),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => sanitizeCSVCell(cell)).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `view0x-analyses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = filteredAndSortedAnalyses.map((a) => ({
      id: a.id,
      contractName: a.contractName,
      status: a.status,
      vulnerabilities: a.summary
        ? {
            high: a.summary.highSeverity,
            medium: a.summary.mediumSeverity,
            low: a.summary.lowSeverity,
          }
        : null,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `view0x-analyses-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Analysis History</h1>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-4 sm:space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Analysis Dashboard</h1>
            {isConnected && (
              <Badge variant="outline" className="text-green-500 border-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            View and manage your smart contract analyses
            {isConnected && " • Real-time updates enabled"}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            asChild 
            className="bg-white text-black hover:bg-gray-200 flex-1 sm:flex-initial text-sm sm:text-base"
          >
            <Link to="/analyze">
              <ShieldAlert className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Analysis</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.trend > 0 ? (
                <span className="text-green-500 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> +{stats.trend} this week
                </span>
              ) : stats.trend < 0 ? (
                <span className="text-red-500 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" /> {stats.trend} this week
                </span>
              ) : (
                "No change"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? `${Math.round((stats.completed / stats.total) * 100)}% success rate`
                : "No analyses yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highVulns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completed > 0 ? `Avg: ${stats.avgVulns} per analysis` : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">
              {stats.processing > 0 ? "Currently analyzing" : "All done"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by contract name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input/30 text-foreground"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-input/30">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-input/30">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSort("createdAt")}>
                    Date {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("contractName")}>
                    Name {sortField === "contractName" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("status")}>
                    Status {sortField === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("highSeverity")}>
                    High Severity {sortField === "highSeverity" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-input/30">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToJSON}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Error Loading Data</AlertTitle>
          <AlertDescription className="text-red-400">
            {error}
            <Button
              variant="link"
              className="text-red-400 p-0 ml-2 h-auto"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Analysis Table */}
      {filteredAndSortedAnalyses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-lg bg-black/50">
          <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white">
            {searchTerm || statusFilter !== "all" ? "No Results Found" : "No Analyses Found"}
          </h3>
          <p className="mt-2 text-white/60">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your filters or search terms."
              : "You haven't analyzed any contracts yet."}
          </p>
          {(!searchTerm && statusFilter === "all") && (
            <Button asChild className="mt-6 bg-white text-black hover:bg-gray-200">
              <Link to="/analyze">Start Your First Analysis</Link>
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort("contractName")}
                    >
                      <span className="hidden sm:inline">Contract</span>
                      <span className="sm:hidden">Name</span>
                      {sortField === "contractName" && (
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      {sortField === "status" && <ArrowUpDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort("highSeverity")}
                    >
                      <span className="hidden sm:inline">Vulnerabilities</span>
                      <span className="sm:hidden">Vulns</span>
                      {sortField === "highSeverity" && (
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 -ml-3"
                      onClick={() => handleSort("createdAt")}
                    >
                      Date
                      {sortField === "createdAt" && <ArrowUpDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <span>Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedAnalyses.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell className="font-medium">
                      {analysis.contractName || "Untitled Contract"}
                    </TableCell>
                    <TableCell>{getStatusIndicator(analysis.status)}</TableCell>
                    <TableCell>
                      {analysis.status === "completed" && analysis.summary ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm">
                          <span className="text-destructive font-bold">
                            <span className="hidden sm:inline">{analysis.summary.highSeverity} High</span>
                            <span className="sm:hidden">{analysis.summary.highSeverity}H</span>
                          </span>
                          <span className="text-yellow-500 font-bold">
                            <span className="hidden sm:inline">{analysis.summary.mediumSeverity} Med</span>
                            <span className="sm:hidden">{analysis.summary.mediumSeverity}M</span>
                          </span>
                          <span className="text-blue-500 font-bold">
                            <span className="hidden sm:inline">{analysis.summary.lowSeverity} Low</span>
                            <span className="sm:hidden">{analysis.summary.lowSeverity}L</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs sm:text-sm">{formatDate(analysis.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        asChild 
                        variant="ghost" 
                        size="sm"
                        className="text-xs sm:text-sm"
                      >
                        <Link to={`/analysis/${analysis.id}`}>
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
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
      )}
    </div>
  );
};

export default Dashboard;
