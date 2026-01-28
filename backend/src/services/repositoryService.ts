import { Octokit } from "@octokit/rest";
import { Gitlab } from "@gitbeaker/node";
import { logger } from "../utils/logger";
import { ValidationError } from "../middleware/errorHandler";

interface RepositoryFile {
  path: string;
  content: string;
  sha: string;
}

interface RepositoryInfo {
  platform: "github" | "gitlab";
  owner: string;
  repo: string;
  branch: string;
  path?: string;
}

export class RepositoryService {
  private octokit: Octokit | null = null;
  private gitlab: typeof Gitlab.prototype | null = null;

  /**
   * Initialize GitHub client with optional token
   */
  private initGitHub(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Initialize GitLab client with optional token
   */
  private initGitLab(token?: string) {
    this.gitlab = new Gitlab({
      token: token || process.env.GITLAB_TOKEN,
    });
  }

  /**
   * Parse repository URL to extract platform, owner, repo, branch, and path
   */
  parseRepositoryUrl(url: string): RepositoryInfo {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // GitHub
      if (hostname.includes("github.com")) {
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length < 2) {
          throw new ValidationError(
            "Invalid GitHub URL. Expected format: https://github.com/owner/repo",
          );
        }

        const owner = pathParts[0];
        const repo = pathParts[1].replace(/\.git$/, "");
        const branch = pathParts[3] === "blob" || pathParts[3] === "tree" 
          ? pathParts[4] 
          : "main";
        const path = pathParts[3] === "blob" || pathParts[3] === "tree"
          ? pathParts.slice(5).join("/")
          : undefined;

        return { platform: "github", owner, repo, branch, path };
      }

      // GitLab
      if (hostname.includes("gitlab.com")) {
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        if (pathParts.length < 2) {
          throw new ValidationError(
            "Invalid GitLab URL. Expected format: https://gitlab.com/owner/repo",
          );
        }

        const owner = pathParts[0];
        const repo = pathParts[1].replace(/\.git$/, "");
        const branch = pathParts[4] === "blob" || pathParts[4] === "tree"
          ? pathParts[5]
          : "main";
        const path = pathParts[4] === "blob" || pathParts[4] === "tree"
          ? pathParts.slice(6).join("/")
          : undefined;

        return { platform: "gitlab", owner, repo, branch, path };
      }

      throw new ValidationError(
        "Unsupported repository platform. Only GitHub and GitLab are supported.",
      );
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Invalid repository URL: ${error.message}`);
    }
  }

  /**
   * Fetch Solidity files from GitHub repository
   */
  async fetchGitHubFiles(
    owner: string,
    repo: string,
    branch: string = "main",
    path: string = "",
    token?: string,
  ): Promise<RepositoryFile[]> {
    if (!this.octokit) {
      this.initGitHub(token);
    }

    try {
      const files: RepositoryFile[] = [];

      // Get repository contents
      const { data } = await this.octokit!.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item.type === "file" && item.name.endsWith(".sol")) {
          // Fetch file content
          const fileData = await this.octokit!.repos.getContent({
            owner,
            repo,
            path: item.path,
            ref: branch,
          });

          if (!Array.isArray(fileData.data) && fileData.data.type === "file") {
            const content = Buffer.from(
              fileData.data.content,
              "base64",
            ).toString("utf-8");

            files.push({
              path: item.path,
              content,
              sha: item.sha,
            });
          }
        } else if (item.type === "dir") {
          // Recursively fetch files from subdirectories
          const subFiles = await this.fetchGitHubFiles(
            owner,
            repo,
            branch,
            item.path,
            token,
          );
          files.push(...subFiles);
        }
      }

      logger.info(
        `Fetched ${files.length} Solidity files from GitHub: ${owner}/${repo}`,
      );
      return files;
    } catch (error: any) {
      logger.error("GitHub fetch error:", error);
      throw new ValidationError(
        `Failed to fetch files from GitHub: ${error.message}`,
      );
    }
  }

  /**
   * Fetch Solidity files from GitLab repository
   */
  async fetchGitLabFiles(
    owner: string,
    repo: string,
    branch: string = "main",
    path: string = "",
    token?: string,
  ): Promise<RepositoryFile[]> {
    if (!this.gitlab) {
      this.initGitLab(token);
    }

    try {
      const files: RepositoryFile[] = [];
      const projectId = `${owner}/${repo}`;

      // Get repository tree
      const tree = await this.gitlab!.Repositories.tree(projectId, {
        ref: branch,
        path,
        recursive: true,
      });

      // Filter Solidity files
      const solFiles = tree.filter(
        (item: any) => item.type === "blob" && item.name.endsWith(".sol"),
      );

      // Fetch content for each Solidity file
      for (const file of solFiles) {
        const fileData = await this.gitlab!.RepositoryFiles.show(
          projectId,
          file.path,
          branch,
        );

        const content = Buffer.from(fileData.content, "base64").toString(
          "utf-8",
        );

        files.push({
          path: file.path,
          content,
          sha: fileData.blob_id,
        });
      }

      logger.info(
        `Fetched ${files.length} Solidity files from GitLab: ${owner}/${repo}`,
      );
      return files;
    } catch (error: any) {
      logger.error("GitLab fetch error:", error);
      throw new ValidationError(
        `Failed to fetch files from GitLab: ${error.message}`,
      );
    }
  }

  /**
   * Fetch repository files based on URL
   */
  async fetchRepositoryFiles(
    url: string,
    token?: string,
  ): Promise<RepositoryFile[]> {
    const repoInfo = this.parseRepositoryUrl(url);

    if (repoInfo.platform === "github") {
      return this.fetchGitHubFiles(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.branch,
        repoInfo.path,
        token,
      );
    } else {
      return this.fetchGitLabFiles(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.branch,
        repoInfo.path,
        token,
      );
    }
  }
}

export const repositoryService = new RepositoryService();
