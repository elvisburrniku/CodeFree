import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from './storage';
import { ProjectFile } from '@shared/schema';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  default_branch: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  // Get authenticated user info
  async getUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return {
      login: data.login,
      id: data.id,
      avatar_url: data.avatar_url,
      name: data.name,
      email: data.email,
    };
  }

  // List user repositories
  async getUserRepositories(): Promise<GitHubRepo[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
    });

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      private: repo.private,
      default_branch: repo.default_branch,
    }));
  }

  // Create a new repository
  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitHubRepo> {
    const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });

    return {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      html_url: data.html_url,
      description: data.description,
      private: data.private,
      default_branch: data.default_branch,
    };
  }

  // Get repository content
  async getRepositoryContent(owner: string, repo: string, path: string = ''): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error getting repository content:', error);
      return [];
    }
  }

  // Get file content from repository
  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in data && typeof data.content === 'string') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      console.error('Error getting file content:', error);
      return null;
    }
  }

  // Clone repository to local workspace
  async cloneRepository(repoUrl: string, projectId: string): Promise<void> {
    const workspaceDir = path.join(process.cwd(), 'temp', 'git-workspaces', projectId);
    
    try {
      // Ensure workspace directory exists
      await fs.mkdir(workspaceDir, { recursive: true });
      
      // Initialize git in workspace
      const git: SimpleGit = simpleGit(workspaceDir);
      
      // Clone the repository
      await git.clone(repoUrl, '.');
      
      console.log(`Successfully cloned ${repoUrl} to ${workspaceDir}`);
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  // Push local files to GitHub repository
  async pushToRepository(projectId: string, commitMessage: string): Promise<void> {
    const workspaceDir = path.join(process.cwd(), 'temp', 'git-workspaces', projectId);
    
    try {
      const git: SimpleGit = simpleGit(workspaceDir);
      
      // Add all files
      await git.add('.');
      
      // Commit changes
      await git.commit(commitMessage);
      
      // Push to origin
      await git.push('origin', 'main');
      
      console.log('Successfully pushed changes to repository');
    } catch (error) {
      console.error('Error pushing to repository:', error);
      throw new Error(`Failed to push to repository: ${error}`);
    }
  }

  // Pull latest changes from repository
  async pullFromRepository(projectId: string): Promise<void> {
    const workspaceDir = path.join(process.cwd(), 'temp', 'git-workspaces', projectId);
    
    try {
      const git: SimpleGit = simpleGit(workspaceDir);
      
      // Pull latest changes
      await git.pull('origin', 'main');
      
      console.log('Successfully pulled changes from repository');
    } catch (error) {
      console.error('Error pulling from repository:', error);
      throw new Error(`Failed to pull from repository: ${error}`);
    }
  }

  // Sync project files to workspace
  async syncProjectToWorkspace(projectId: string): Promise<void> {
    const workspaceDir = path.join(process.cwd(), 'temp', 'git-workspaces', projectId);
    const projectFiles = await storage.getProjectFiles(projectId);
    
    try {
      // Ensure workspace directory exists
      await fs.mkdir(workspaceDir, { recursive: true });
      
      // Write all project files to workspace
      for (const file of projectFiles) {
        const filePath = path.join(workspaceDir, file.path);
        const fileDir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.mkdir(fileDir, { recursive: true });
        
        // Write file content
        await fs.writeFile(filePath, file.content || '', 'utf-8');
      }
      
      console.log(`Synced ${projectFiles.length} files to workspace`);
    } catch (error) {
      console.error('Error syncing project to workspace:', error);
      throw new Error(`Failed to sync project to workspace: ${error}`);
    }
  }

  // Sync workspace back to project files
  async syncWorkspaceToProject(projectId: string): Promise<ProjectFile[]> {
    const workspaceDir = path.join(process.cwd(), 'temp', 'git-workspaces', projectId);
    const updatedFiles: ProjectFile[] = [];
    
    try {
      // Get all files in workspace
      const allFiles = await this.getAllFilesInDirectory(workspaceDir);
      
      for (const filePath of allFiles) {
        const relativePath = path.relative(workspaceDir, filePath);
        
        // Skip .git and node_modules directories
        if (relativePath.startsWith('.git') || relativePath.includes('node_modules')) {
          continue;
        }
        
        const content = await fs.readFile(filePath, 'utf-8');
        const language = this.getLanguageFromExtension(path.extname(filePath));
        
        // Update or create project file
        const projectFile = await storage.createOrUpdateProjectFile({
          projectId,
          path: relativePath,
          content,
          language,
        });
        
        updatedFiles.push(projectFile);
      }
      
      console.log(`Synced ${updatedFiles.length} files from workspace to project`);
      return updatedFiles;
    } catch (error) {
      console.error('Error syncing workspace to project:', error);
      throw new Error(`Failed to sync workspace to project: ${error}`);
    }
  }

  // Helper function to get all files in directory recursively
  private async getAllFilesInDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...await this.getAllFilesInDirectory(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Helper function to determine language from file extension
  private getLanguageFromExtension(ext: string): string {
    const extensionMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.css': 'css',
      '.html': 'html',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.xml': 'xml',
      '.sql': 'sql',
      '.sh': 'bash',
      '.rb': 'ruby',
      '.php': 'php',
      '.go': 'go',
      '.rs': 'rust',
    };
    
    return extensionMap[ext.toLowerCase()] || 'text';
  }
}

// OAuth GitHub integration
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new Error('GitHub OAuth credentials not configured');
  }

  console.log('Exchanging code for token, client ID:', process.env.GITHUB_CLIENT_ID);

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json();
  console.log('GitHub token response:', data);

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }

  if (!data.access_token) {
    throw new Error('No access token received from GitHub');
  }

  return data.access_token;
}