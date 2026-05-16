import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ensureArray, getApiErrorMessage, isAuthError } from '@/lib/apiHelpers';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface AnalyticsSummary {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    avgResponseTime: number;
}

interface AnalyticsData {
    summary: AnalyticsSummary;
    requestsByStatus: Array<{ statusCode: number; count: number }>;
    requestsByEndpoint: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
    requestsOverTime: Array<{ date: string; count: number }>;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const emptySummary: AnalyticsSummary = {
    totalRequests: 0,
    errorCount: 0,
    errorRate: 0,
    avgResponseTime: 0,
};

export default function AnalyticsDashboard() {
    const { ready, isAuthenticated } = useRequireAuth();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState('7d');

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/analytics/dashboard', {
                params: { dateRange },
            });
            const raw = response.data?.data ?? {};
            setAnalytics({
                summary: raw.summary ?? emptySummary,
                requestsByStatus: ensureArray(raw.requestsByStatus),
                requestsByEndpoint: ensureArray(raw.requestsByEndpoint),
                requestsOverTime: ensureArray(raw.requestsOverTime),
            });
        } catch (err: unknown) {
            if (isAuthError(err)) {
                setAnalytics(null);
                return;
            }
            setError(getApiErrorMessage(err, 'Could not load analytics.'));
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        if (isAuthenticated) {
            void fetchAnalytics();
        }
    }, [isAuthenticated, fetchAnalytics]);

    const handleExport = async (format: 'csv' | 'json') => {
        try {
            const response = await api.get(`/analytics/export?format=${format}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `analytics-${Date.now()}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Export failed.'));
        }
    };

    if (!ready || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="container mx-auto max-w-lg p-6">
                <Alert variant="destructive">
                    <AlertTitle>Analytics unavailable</AlertTitle>
                    <AlertDescription className="space-y-3">
                        <p>{error || 'No analytics data returned.'}</p>
                        <Button variant="outline" size="sm" onClick={() => void fetchAnalytics()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const statusCodeData = analytics.requestsByStatus.map((item) => ({
        name: `${item.statusCode}`,
        value: item.count,
    }));

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">API Analytics Dashboard</h1>
                    <p className="text-muted-foreground">Monitor your API usage and performance</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void fetchAnalytics()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Requests</CardDescription>
                        <CardTitle className="text-3xl">
                            {(analytics.summary.totalRequests ?? 0).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Error Count</CardDescription>
                        <CardTitle className="text-3xl text-red-500">
                            {(analytics.summary.errorCount ?? 0).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Error Rate</CardDescription>
                        <CardTitle className="text-3xl">
                            {(analytics.summary.errorRate ?? 0).toFixed(2)}%
                        </CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Avg Response Time</CardDescription>
                        <CardTitle className="text-3xl">
                            {analytics.summary.avgResponseTime ?? 0}ms
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Tabs value={dateRange} onValueChange={setDateRange} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="7d">Last 7 days</TabsTrigger>
                        <TabsTrigger value="30d">Last 30 days</TabsTrigger>
                        <TabsTrigger value="90d">Last 90 days</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Requests Over Time</CardTitle>
                        <CardDescription>Daily request volume</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.requestsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ fill: '#22c55e' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Status Code Distribution</CardTitle>
                        <CardDescription>Breakdown by HTTP status code</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statusCodeData.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-12 text-center">No status data yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={statusCodeData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusCodeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top Endpoints</CardTitle>
                        <CardDescription>Most frequently accessed endpoints</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analytics.requestsByEndpoint.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-12 text-center">No endpoint data yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.requestsByEndpoint.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="endpoint" angle={-45} textAnchor="end" height={100} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#22c55e" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="count" fill="#22c55e" name="Request Count" />
                                    <Bar
                                        yAxisId="right"
                                        dataKey="avgResponseTime"
                                        fill="#3b82f6"
                                        name="Avg Response Time (ms)"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Endpoint Details</CardTitle>
                    <CardDescription>Detailed metrics for each endpoint</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Endpoint</th>
                                    <th className="text-right p-2">Request Count</th>
                                    <th className="text-right p-2">Avg Response Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.requestsByEndpoint.map((endpoint, index) => (
                                    <tr key={index} className="border-b hover:bg-muted/50">
                                        <td className="p-2 font-mono text-xs">{endpoint.endpoint}</td>
                                        <td className="text-right p-2">{endpoint.count.toLocaleString()}</td>
                                        <td className="text-right p-2">{Math.round(endpoint.avgResponseTime)}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
