import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FileExplorer from "./FileExplorer";
import { Project, ProjectFile } from "@/pages/editor";
import { Code, Settings, Zap, Circle } from "lucide-react";

interface SidebarProps {
  currentProject: Project | null;
  projectFiles: ProjectFile[];
  activeFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
  onOpenAIChat: () => void;
}

export default function Sidebar({ 
  currentProject, 
  projectFiles, 
  activeFile, 
  onFileSelect, 
  onOpenAIChat 
}: SidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'text-green-400';
      case 'building':
        return 'text-orange-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Circle className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'building':
        return <Circle className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />;
      case 'error':
        return <Circle className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <Circle className="w-2 h-2 bg-slate-500 rounded-full" />;
    }
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Project Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-slate-200">Current Project</h3>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        {currentProject ? (
          <div className="bg-slate-700 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded flex items-center justify-center">
                <Code className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm truncate">{currentProject.name}</span>
            </div>
            {currentProject.description && (
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                {currentProject.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {currentProject.template} • {projectFiles.length} files
              </span>
              <div className="flex items-center space-x-1">
                {getStatusIcon(currentProject.status)}
                <span className={`text-xs capitalize ${getStatusColor(currentProject.status)}`}>
                  {currentProject.status}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-700 rounded-lg p-3 text-center">
            <Code className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No project selected</p>
            <p className="text-xs text-slate-500">Start coding with AI</p>
          </div>
        )}
      </div>

      {/* File Explorer */}
      <div className="flex-1 overflow-y-auto">
        <FileExplorer
          files={projectFiles}
          activeFile={activeFile}
          onFileSelect={onFileSelect}
        />
      </div>

      {/* AI Assistant Panel */}
      <div className="border-t border-slate-700 p-4">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-sm">AI Assistant</span>
          </div>
          <p className="text-xs text-slate-300 mb-3">Ready to help you code faster</p>
          <Button 
            onClick={onOpenAIChat}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate Code
          </Button>
        </div>
      </div>
    </div>
  );
}
