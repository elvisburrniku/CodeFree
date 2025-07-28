import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Github, 
  GitBranch, 
  Download, 
  Upload, 
  RefreshCw, 
  ExternalLink, 
  Plus,
  Unlink,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  default_branch: string;
}

import type { Project } from "@shared/schema";

interface GitHubIntegrationProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

export default function GitHubIntegration({ project, onProjectUpdate }: GitHubIntegrationProps) {
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [branch, setBranch] = useState("main");
  const [commitMessage, setCommitMessage] = useState("Update from CodeCraft AI");
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoData, setNewRepoData] = useState({
    name: "",
    description: "",
    private: false
  });
  const { toast } = useToast();

  useEffect(() => {
    setIsConnected(!!project.githubRepoUrl);
    if (project.githubBranch) {
      setBranch(project.githubBranch);
    }
  }, [project]);

  const loadRepositories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/github/repositories");
      if (!response.ok) {
        throw new Error(`Failed to load repositories: ${response.status}`);
      }
      const repos = await response.json();
      setRepositories(repos);
    } catch (error: any) {
      toast({
        title: "Failed to load repositories",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectToGitHub = async () => {
    try {
      const response = await fetch("/api/auth/github");
      if (!response.ok) {
        throw new Error(`GitHub connection failed: ${response.status}`);
      }
      const { authUrl } = await response.json();
      window.open(authUrl, "_blank", "width=600,height=700");
      
      // Listen for OAuth completion (in a real app, you'd handle this more elegantly)
      const checkInterval = setInterval(async () => {
        try {
          await loadRepositories();
          clearInterval(checkInterval);
          toast({
            title: "GitHub Connected",
            description: "Successfully connected to your GitHub account.",
          });
        } catch {
          // Still waiting for OAuth completion
        }
      }, 2000);
      
      // Clear interval after 30 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkInterval), 30000);
    } catch (error: any) {
      toast({
        title: "GitHub Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const connectRepository = async () => {
    if (!selectedRepo) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/github/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: selectedRepo,
          branch: branch
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to connect repository: ${response.status}`);
      }
      
      const updatedProject = await response.json();
      onProjectUpdate(updatedProject);
      setIsConnected(true);
      
      toast({
        title: "Repository Connected",
        description: "Successfully connected to GitHub repository.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectRepository = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/github/disconnect`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to disconnect repository: ${response.status}`);
      }
      
      const { project: updatedProject } = await response.json();
      onProjectUpdate(updatedProject);
      setIsConnected(false);
      setSelectedRepo("");
      
      toast({
        title: "Repository Disconnected",
        description: "Successfully disconnected from GitHub repository.",
      });
    } catch (error: any) {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cloneRepository = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/github/clone`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clone repository: ${response.status}`);
      }
      
      const { message, filesCount } = await response.json();
      
      toast({
        title: "Repository Cloned",
        description: `${message} (${filesCount} files imported)`,
      });
      
      // Refresh page to show updated files
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Clone Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pushChanges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/github/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitMessage })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to push changes: ${response.status}`);
      }
      
      const { message } = await response.json();
      
      toast({
        title: "Changes Pushed",
        description: message,
      });
    } catch (error: any) {
      toast({
        title: "Push Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pullChanges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/github/pull`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to pull changes: ${response.status}`);
      }
      
      const { message, filesCount } = await response.json();
      
      toast({
        title: "Changes Pulled",
        description: `${message} (${filesCount} files updated)`,
      });
      
      // Refresh page to show updated files
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Pull Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRepository = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/github/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRepoData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create repository: ${response.status}`);
      }
      
      const newRepo = await response.json();
      
      setRepositories([newRepo, ...repositories]);
      setSelectedRepo(newRepo.html_url);
      setShowCreateRepo(false);
      setNewRepoData({ name: "", description: "", private: false });
      
      toast({
        title: "Repository Created",
        description: `Successfully created ${newRepo.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (project.gitStatus) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (project.gitStatus) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Error';
      default:
        return 'Not connected';
    }
  };

  const getStatusColor = () => {
    switch (project.gitStatus) {
      case 'connected':
        return 'bg-green-500/20 text-green-300';
      case 'syncing':
        return 'bg-blue-500/20 text-blue-300';
      case 'error':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Github className="w-5 h-5 text-white" />
            <CardTitle className="text-slate-200">GitHub Integration</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-slate-400">
          Connect your project to GitHub for version control and collaboration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                onClick={loadRepositories}
                disabled={isLoading}
                className="flex-1 bg-gray-600 hover:bg-gray-700"
              >
                <Github className="w-4 h-4 mr-2" />
                Load Repositories
              </Button>
              
              <Dialog open={showCreateRepo} onOpenChange={setShowCreateRepo}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-slate-200">Create New Repository</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Create a new GitHub repository for your project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="repo-name" className="text-slate-300">Repository Name</Label>
                      <Input
                        id="repo-name"
                        value={newRepoData.name}
                        onChange={(e) => setNewRepoData({ ...newRepoData, name: e.target.value })}
                        placeholder={project.name}
                        className="bg-slate-700 border-slate-600 text-slate-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="repo-description" className="text-slate-300">Description (optional)</Label>
                      <Textarea
                        id="repo-description"
                        value={newRepoData.description}
                        onChange={(e) => setNewRepoData({ ...newRepoData, description: e.target.value })}
                        placeholder="A brief description of your project"
                        className="bg-slate-700 border-slate-600 text-slate-200"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="repo-private"
                        checked={newRepoData.private}
                        onCheckedChange={(checked) => setNewRepoData({ ...newRepoData, private: checked })}
                      />
                      <Label htmlFor="repo-private" className="text-slate-300">Private repository</Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={createRepository} disabled={!newRepoData.name || isLoading} className="flex-1">
                        Create Repository
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateRepo(false)} className="border-slate-600">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {repositories.length > 0 && (
              <div className="space-y-3">
                <Label className="text-slate-300">Select Repository</Label>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200">
                    <SelectValue placeholder="Choose a repository" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.html_url} className="text-slate-200">
                        <div className="flex items-center justify-between w-full">
                          <span>{repo.full_name}</span>
                          {repo.private && <Badge variant="secondary" className="ml-2 text-xs">Private</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div>
                  <Label className="text-slate-300">Branch</Label>
                  <Input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>
                
                <Button
                  onClick={connectRepository}
                  disabled={!selectedRepo || isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Connect Repository
                </Button>
              </div>
            )}

            {repositories.length === 0 && (
              <div className="text-center py-6">
                <p className="text-slate-400 mb-4">No repositories found. Connect your GitHub account first.</p>
                <Button onClick={connectToGitHub} className="bg-purple-600 hover:bg-purple-700">
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub Account
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-200">Connected Repository</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(project.githubRepoUrl!, "_blank")}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-slate-300 text-sm">{project.githubRepoUrl}</p>
              <p className="text-slate-400 text-xs">Branch: {project.githubBranch}</p>
              {project.lastSyncAt && (
                <p className="text-slate-500 text-xs">Last sync: {new Date(project.lastSyncAt).toLocaleString()}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={cloneRepository}
                disabled={isLoading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Clone/Import
              </Button>
              
              <Button
                onClick={pullChanges}
                disabled={isLoading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Pull
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">Commit Message</Label>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Update from CodeCraft AI"
                className="bg-slate-700 border-slate-600 text-slate-200"
              />
              <Button
                onClick={pushChanges}
                disabled={isLoading || !commitMessage}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Push Changes
              </Button>
            </div>

            <Button
              onClick={disconnectRepository}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect Repository
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}