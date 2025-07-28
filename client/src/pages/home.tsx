import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User, Project } from "@shared/schema";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { 
  Plus, 
  Code, 
  Folder, 
  Zap, 
  Crown, 
  ExternalLink,
  Calendar,
  Activity,
  TrendingUp,
  Coins
} from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch user projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Create new project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string; template: string }) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully!",
      });
      setIsCreateDialogOpen(false);
      setLocation(`/editor/${project.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = (projectData: { name: string; description: string; template: string }) => {
    createProjectMutation.mutate(projectData);
  };

  const handleOpenProject = (projectId: string) => {
    setLocation(`/editor/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">CodeCraft AI</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Credits Display */}
            <div className="flex items-center space-x-2 bg-slate-700 px-3 py-2 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">{user?.credits || 0}</span>
              <span className="text-slate-400 text-sm">credits</span>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-2 bg-slate-700 rounded-lg px-3 py-2">
              {user?.profileImageUrl && (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="text-sm font-medium">
                {user?.firstName || user?.email || 'User'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-slate-400">
            Here's what's happening with your projects.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Projects</p>
                  <p className="text-2xl font-bold text-slate-50">{projects.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Folder className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">AI Generations</p>
                  <p className="text-2xl font-bold text-slate-50">0</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Credits Remaining</p>
                  <p className="text-2xl font-bold text-slate-50">{user?.credits || 0}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Coins className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Plan Status</p>
                  <p className="text-lg font-bold text-green-400">
                    {user?.subscriptionStatus === 'active' ? 'Pro' : 'Free'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Crown className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-50">Recent Projects</CardTitle>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={createProjectMutation.isPending}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-slate-700 animate-pulse rounded-lg p-4 h-24"></div>
                    ))}
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.map((project: any) => (
                      <div
                        key={project.id}
                        className="flex items-center space-x-4 p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                        onClick={() => handleOpenProject(project.id)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <Code className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-100">{project.name}</h3>
                          <p className="text-sm text-slate-400">{project.description || 'No description'}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-slate-500">
                              {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                            <Badge 
                              variant={project.status === 'deployed' ? 'default' : 'secondary'}
                              className={
                                project.status === 'deployed' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              }
                            >
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Folder className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">No projects yet</h3>
                    <p className="text-slate-400 mb-4">Create your first project to get started</p>
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      disabled={createProjectMutation.isPending}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-50">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={createProjectMutation.isPending}
                  className="w-full justify-start bg-slate-700 hover:bg-slate-600 text-slate-200"
                >
                  <Plus className="w-4 h-4 mr-3 text-purple-400" />
                  Create New Project
                </Button>
                <Button 
                  onClick={() => setLocation('/editor')}
                  className="w-full justify-start bg-slate-700 hover:bg-slate-600 text-slate-200"
                >
                  <Zap className="w-4 h-4 mr-3 text-purple-400" />
                  AI Code Generator
                </Button>
                <Button 
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Activity className="w-4 h-4 mr-3 text-blue-400" />
                  View Templates
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Info */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Crown className="w-5 h-5 text-purple-400" />
                  <span className="font-semibold text-slate-50">
                    {user?.subscriptionStatus === 'active' ? 'Pro Plan' : 'Free Plan'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  {user?.subscriptionStatus === 'active' ? '$19/month + credits' : 'Limited features'}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Credits remaining</span>
                    <span className="text-slate-200">{user?.credits || 0}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, ((user?.credits || 0) / 1000) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <Button 
                  onClick={() => setLocation('/subscribe')}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {user?.subscriptionStatus === 'active' ? 'Buy More Credits' : 'Upgrade to Pro'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Project Creation Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateProject={handleCreateProject}
        isLoading={createProjectMutation.isPending}
      />
    </div>
  );
}
