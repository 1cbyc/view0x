import React, { useState } from "react";
import { Loader2, Github, GitBranch, Lock, Unlock, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface AnalysisJob {
    jobId: string;
    filePath: string;
    status: string;
}

interface AnalysisResponse {
    success: boolean;
    message: string;
    data: {
        repository: string;
        branch: string;
        filesAnalyzed: number;
        totalFilesFound: number;
        jobs: AnalysisJob[];
    };
}

const RepositoryAnalyzer: React.FC = () => {
    const navigate = useNavigate();
    const [platform, setPlatform] = useState<"github" | "gitlab">("github");
    const [repositoryUrl, setRepositoryUrl] = useState("");
    const [branch, setBranch] = useState("main");
    const [token, setToken] = useState("");
    const [useToken, setUseToken] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<AnalysisResponse["data"] | null>(null);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const authToken = localStorage.getItem("accessToken");
            if (!authToken) {
                setError("You must be logged in to analyze repositories");
                setLoading(false);
                return;
            }

            const endpoint = platform === "github"
                ? `${API_BASE_URL}/repository/github`
                : `${API_BASE_URL}/repository/gitlab`;

            const payload: any = {
                repositoryUrl,
                branch,
            };

            if (useToken && token) {
                payload.token = token;
            }

            const response = await axios.post<AnalysisResponse>(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (response.data.success) {
                setResult(response.data.data);
            }
        } catch (err: any) {
            setError(
                err.response?.data?.error?.message ||
                "Failed to analyze repository. Please check the URL and try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const viewAnalysis = (jobId: string) => {
        navigate(`/analysis/${jobId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-dark-900 to-black py-16 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                        Repository Analyzer
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Analyze smart contracts directly from GitHub or GitLab repositories
                    </p>
                </div>

                {/* Main Form */}
                <div className="glass-card rounded-2xl p-8 shadow-2xl border border-white/10">
                    <form onSubmit={handleAnalyze} className="space-y-6">
                        {/* Platform Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Select Platform
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setPlatform("github")}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${platform === "github"
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-white/10 bg-dark-800/50 text-gray-400 hover:border-accent/50"
                                        }`}
                                >
                                    <Github className="w-5 h-5" />
                                    <span className="font-medium">GitHub</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPlatform("gitlab")}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${platform === "gitlab"
                                        ? "border-accent bg-accent/10 text-accent"
                                        : "border-white/10 bg-dark-800/50 text-gray-400 hover:border-accent/50"
                                        }`}
                                >
                                    <GitBranch className="w-5 h-5" />
                                    <span className="font-medium">GitLab</span>
                                </button>
                            </div>
                        </div>

                        {/* Repository URL */}
                        <div>
                            <label htmlFor="repositoryUrl" className="block text-sm font-medium text-gray-300 mb-2">
                                Repository URL
                            </label>
                            <input
                                type="url"
                                id="repositoryUrl"
                                value={repositoryUrl}
                                onChange={(e) => setRepositoryUrl(e.target.value)}
                                placeholder={
                                    platform === "github"
                                        ? "https://github.com/owner/repository"
                                        : "https://gitlab.com/owner/repository"
                                }
                                required
                                className="w-full px-4 py-3 bg-dark-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                            />
                        </div>

                        {/* Branch */}
                        <div>
                            <label htmlFor="branch" className="block text-sm font-medium text-gray-300 mb-2">
                                Branch <span className="text-gray-500">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="branch"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                placeholder="main"
                                className="w-full px-4 py-3 bg-dark-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                            />
                        </div>

                        {/* Access Token Toggle */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setUseToken(!useToken)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${useToken
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-white/10 bg-dark-800/50 text-gray-400"
                                    }`}
                            >
                                {useToken ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                <span className="text-sm font-medium">
                                    {useToken ? "Private Repository" : "Public Repository"}
                                </span>
                            </button>
                        </div>

                        {/* Access Token Input */}
                        {useToken && (
                            <div className="animate-fadeIn">
                                <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                                    Personal Access Token
                                </label>
                                <input
                                    type="password"
                                    id="token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    className="w-full px-4 py-3 bg-dark-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Required for private repositories. Your token is never stored.
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !repositoryUrl}
                            className="w-full px-6 py-3 bg-gradient-to-r from-accent to-primary text-white font-medium rounded-lg hover:shadow-lg hover:shadow-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Analyzing Repository...</span>
                                </>
                            ) : (
                                <span>Analyze Repository</span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Results */}
                {result && (
                    <div className="mt-8 glass-card rounded-2xl p-8 shadow-2xl border border-white/10 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-6">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-bold text-white">Analysis Queued Successfully</h2>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Repository:</span>
                                <span className="text-white font-medium">{result.repository}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Branch:</span>
                                <span className="text-white font-medium">{result.branch}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Files Found:</span>
                                <span className="text-white font-medium">{result.totalFilesFound}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Files Analyzed:</span>
                                <span className="text-white font-medium">{result.filesAnalyzed}</span>
                            </div>
                        </div>

                        {/* Analysis Jobs */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Analysis Jobs</h3>
                            <div className="space-y-2">
                                {result.jobs.map((job) => (
                                    <div
                                        key={job.jobId}
                                        className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg border border-white/10 hover:border-accent/50 transition-all"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">{job.filePath}</p>
                                            <p className="text-xs text-gray-400 mt-1">Job ID: {job.jobId}</p>
                                        </div>
                                        <button
                                            onClick={() => viewAnalysis(job.jobId)}
                                            className="px-4 py-2 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-lg transition-all text-sm font-medium"
                                        >
                                            View Results
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => navigate("/dashboard")}
                            className="mt-6 w-full px-6 py-3 bg-dark-800/50 text-white font-medium rounded-lg border border-white/10 hover:border-accent transition-all"
                        >
                            View All Analyses in Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RepositoryAnalyzer;
