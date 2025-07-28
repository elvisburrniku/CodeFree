import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User, Project, ProjectFile } from "@shared/schema";
import TopNavigation from "@/components/TopNavigation";
import Sidebar from "@/components/Sidebar";
import CodeEditor from "@/components/CodeEditor";
import PreviewPanel from "@/components/PreviewPanel";
import AIChatModal from "@/components/AIChatModal";
import SmartAgentModal from "@/components/SmartAgentModal";

// Types imported from @shared/schema

export default function Editor() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSmartAgentOpen, setIsSmartAgentOpen] = useState(false);

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

  // Fetch project data if projectId is provided
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch project files
  const { data: files = [], isLoading: filesLoading } = useQuery<ProjectFile[]>({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId && isAuthenticated,
  });

  // Set project and files when data is loaded
  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project]);

  useEffect(() => {
    if (files && files.length > 0) {
      // Transform the fetched files to match our interface
      const transformedFiles = files.map(file => ({
        ...file,
        content: file.content || "",
        language: file.language || "javascript",
        createdAt: file.createdAt || new Date(),
        updatedAt: file.updatedAt || new Date(),
      }));
      setProjectFiles(transformedFiles);
      // Open the first file by default
      if (!activeFile && transformedFiles.length > 0) {
        const firstFile = transformedFiles[0];
        setActiveFile(firstFile);
        setOpenFiles([firstFile]);
      }
    }
  }, [files, activeFile]);

  const handleFileSelect = (file: ProjectFile) => {
    setActiveFile(file);
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles([...openFiles, file]);
    }
  };

  const handleFileClose = (fileId: string) => {
    const updatedOpenFiles = openFiles.filter(f => f.id !== fileId);
    setOpenFiles(updatedOpenFiles);
    
    if (activeFile?.id === fileId) {
      if (updatedOpenFiles.length > 0) {
        setActiveFile(updatedOpenFiles[updatedOpenFiles.length - 1]);
      } else {
        setActiveFile(null);
      }
    }
  };

  const handleCodeChange = (newContent: string) => {
    if (activeFile) {
      const updatedFile = { ...activeFile, content: newContent };
      setActiveFile(updatedFile);
      
      // Update in open files
      setOpenFiles(openFiles.map(f => 
        f.id === activeFile.id ? updatedFile : f
      ));
      
      // Update in project files
      setProjectFiles(projectFiles.map(f => 
        f.id === activeFile.id ? updatedFile : f
      ));
    }
  };

  if (isLoading || (projectId && projectLoading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-50">
      {/* Top Navigation */}
      <TopNavigation 
        user={user}
        onOpenAIChat={() => setIsAiChatOpen(true)}
        onOpenSmartAgent={() => setIsSmartAgentOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentProject={currentProject}
          projectFiles={projectFiles}
          activeFile={activeFile}
          onFileSelect={handleFileSelect}
          onOpenAIChat={() => setIsAiChatOpen(true)}
          onProjectUpdate={(project) => setCurrentProject(project)}
        />

        {/* Editor and Preview Area */}
        <div className="flex-1 flex flex-col">
          {/* Editor Tabs */}
          {openFiles.length > 0 && (
            <div className="bg-slate-800 border-b border-slate-700 px-4 py-0">
              <div className="flex items-center space-x-0 overflow-x-auto">
                {openFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center px-4 py-3 cursor-pointer hover:bg-slate-600 transition-colors min-w-0 border-r border-slate-600 ${
                      activeFile?.id === file.id ? 'bg-slate-700' : 'bg-slate-800'
                    }`}
                    onClick={() => setActiveFile(file)}
                  >
                    <span className="text-sm text-slate-100 truncate mr-2">{file.path}</span>
                    <button
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileClose(file.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Editor/Preview Split */}
          <div className="flex-1 flex">
            {/* Code Editor */}
            <div className="flex-1">
              <CodeEditor
                file={activeFile}
                onChange={handleCodeChange}
                onOpenAIChat={() => setIsAiChatOpen(true)}
              />
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 border-l border-slate-700">
              <PreviewPanel
                project={currentProject}
                files={projectFiles}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Modal */}
      <AIChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        currentProject={currentProject}
        activeFile={activeFile}
        onCodeGenerated={(files) => {
          // Handle generated code files
          files.forEach(file => {
            const existingFile = projectFiles.find(f => f.path === file.path);
            if (existingFile) {
              handleCodeChange(file.content);
            } else {
              const newFile: ProjectFile = {
                id: `${Date.now()}-${Math.random()}`,
                projectId: projectId!,
                path: file.path,
                content: file.content,
                language: file.language,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              setProjectFiles([...projectFiles, newFile]);
              handleFileSelect(newFile);
            }
          });
        }}
      />

      {/* Smart Agent Modal */}
      {currentProject && (
        <SmartAgentModal
          isOpen={isSmartAgentOpen}
          onClose={() => setIsSmartAgentOpen(false)}
          projectId={currentProject.id}
        />
      )}
    </div>
  );
}
