import { Request, Response } from "express";
import { repositoryService } from "../services/repositoryService";
import { analysisService } from "../services/analysisService";
import { User } from "../models/User";
import {
    AuthenticationError,
    ValidationError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";

/**
 * @description Analyze a GitHub repository
 * @route POST /api/repository/github
 */
export const analyzeGitHubRepo = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new AuthenticationError("Authentication required");
    }

    const { repositoryUrl, branch = "main", token, contractName } = req.body;

    if (!repositoryUrl) {
        throw new ValidationError("Repository URL is required");
    }

    // Check if user can perform analysis
    const user = await User.findByPk(userId);
    if (!user) {
        throw new AuthenticationError("User not found");
    }

    try {
        // Parse repository URL
        const repoInfo = repositoryService.parseRepositoryUrl(repositoryUrl);

        if (repoInfo.platform !== "github") {
            throw new ValidationError(
                "Invalid GitHub URL. Use /api/repository/gitlab for GitLab repositories.",
            );
        }

        // Fetch Solidity files from repository
        const files = await repositoryService.fetchGitHubFiles(
            repoInfo.owner,
            repoInfo.repo,
            branch || repoInfo.branch,
            repoInfo.path,
            token,
        );

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NO_SOLIDITY_FILES",
                    message: "No Solidity files found in the repository",
                },
            });
        }

        // Create analysis jobs for each file
        const analysisJobs = [];
        for (const file of files) {
            if (!user.canAnalyze()) {
                logger.warn(
                    `User ${userId} reached analysis limit while processing repository`,
                );
                break;
            }

            const jobData = {
                contractCode: file.content,
                contractName:
                    contractName || `${repoInfo.repo}/${file.path}`,
                metadata: {
                    source: "github",
                    repository: `${repoInfo.owner}/${repoInfo.repo}`,
                    branch: branch || repoInfo.branch,
                    filePath: file.path,
                    sha: file.sha,
                },
            };

            const analysisJob = await analysisService.create(userId, jobData);
            await user.incrementUsage();

            analysisJobs.push({
                jobId: analysisJob.id,
                filePath: file.path,
                status: analysisJob.status,
            });
        }

        logger.info(
            `Created ${analysisJobs.length} analysis jobs for GitHub repository: ${repoInfo.owner}/${repoInfo.repo}`,
        );

        res.status(202).json({
            success: true,
            message: `Repository analysis queued: ${analysisJobs.length} contracts`,
            data: {
                repository: `${repoInfo.owner}/${repoInfo.repo}`,
                branch: branch || repoInfo.branch,
                filesAnalyzed: analysisJobs.length,
                totalFilesFound: files.length,
                jobs: analysisJobs,
            },
        });
    } catch (error: any) {
        logger.error("GitHub repository analysis error:", error);
        throw error;
    }
};

/**
 * @description Analyze a GitLab repository
 * @route POST /api/repository/gitlab
 */
export const analyzeGitLabRepo = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new AuthenticationError("Authentication required");
    }

    const { repositoryUrl, branch = "main", token, contractName } = req.body;

    if (!repositoryUrl) {
        throw new ValidationError("Repository URL is required");
    }

    // Check if user can perform analysis
    const user = await User.findByPk(userId);
    if (!user) {
        throw new AuthenticationError("User not found");
    }

    try {
        // Parse repository URL
        const repoInfo = repositoryService.parseRepositoryUrl(repositoryUrl);

        if (repoInfo.platform !== "gitlab") {
            throw new ValidationError(
                "Invalid GitLab URL. Use /api/repository/github for GitHub repositories.",
            );
        }

        // Fetch Solidity files from repository
        const files = await repositoryService.fetchGitLabFiles(
            repoInfo.owner,
            repoInfo.repo,
            branch || repoInfo.branch,
            repoInfo.path,
            token,
        );

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NO_SOLIDITY_FILES",
                    message: "No Solidity files found in the repository",
                },
            });
        }

        // Create analysis jobs for each file
        const analysisJobs = [];
        for (const file of files) {
            if (!user.canAnalyze()) {
                logger.warn(
                    `User ${userId} reached analysis limit while processing repository`,
                );
                break;
            }

            const jobData = {
                contractCode: file.content,
                contractName:
                    contractName || `${repoInfo.repo}/${file.path}`,
                metadata: {
                    source: "gitlab",
                    repository: `${repoInfo.owner}/${repoInfo.repo}`,
                    branch: branch || repoInfo.branch,
                    filePath: file.path,
                    sha: file.sha,
                },
            };

            const analysisJob = await analysisService.create(userId, jobData);
            await user.incrementUsage();

            analysisJobs.push({
                jobId: analysisJob.id,
                filePath: file.path,
                status: analysisJob.status,
            });
        }

        logger.info(
            `Created ${analysisJobs.length} analysis jobs for GitLab repository: ${repoInfo.owner}/${repoInfo.repo}`,
        );

        res.status(202).json({
            success: true,
            message: `Repository analysis queued: ${analysisJobs.length} contracts`,
            data: {
                repository: `${repoInfo.owner}/${repoInfo.repo}`,
                branch: branch || repoInfo.branch,
                filesAnalyzed: analysisJobs.length,
                totalFilesFound: files.length,
                jobs: analysisJobs,
            },
        });
    } catch (error: any) {
        logger.error("GitLab repository analysis error:", error);
        throw error;
    }
};

/**
 * @description Analyze repository (auto-detect platform)
 * @route POST /api/repository/analyze
 */
export const analyzeRepository = async (req: Request, res: Response) => {
    const { repositoryUrl } = req.body;

    if (!repositoryUrl) {
        throw new ValidationError("Repository URL is required");
    }

    try {
        const repoInfo = repositoryService.parseRepositoryUrl(repositoryUrl);

        if (repoInfo.platform === "github") {
            return analyzeGitHubRepo(req, res);
        } else {
            return analyzeGitLabRepo(req, res);
        }
    } catch (error: any) {
        logger.error("Repository analysis error:", error);
        throw error;
    }
};
