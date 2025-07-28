import { useState } from "react";
import { ProjectFile } from "@/pages/editor";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  FileCode, 
  FileImage, 
  File as FileIcon,
  ChevronRight,
  ChevronDown
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  file?: ProjectFile;
}

interface FileExplorerProps {
  files: ProjectFile[];
  activeFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
}

export default function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));

  // Build file tree structure
  const buildFileTree = (files: ProjectFile[]): FileNode[] => {
    const tree: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    files.forEach(file => {
      const pathParts = file.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Create folder structure
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        if (!folderMap.has(folderPath)) {
          const folderNode: FileNode = {
            name: folderName,
            path: folderPath,
            type: 'folder',
            children: []
          };
          folderMap.set(folderPath, folderNode);
          
          if (currentPath === '') {
            tree.push(folderNode);
          } else {
            const parentFolder = folderMap.get(currentPath);
            if (parentFolder) {
              parentFolder.children!.push(folderNode);
            }
          }
        }
        currentPath = folderPath;
      }

      // Add file to tree
      const fileNode: FileNode = {
        name: fileName,
        path: file.path,
        type: 'file',
        file
      };

      if (pathParts.length === 1) {
        tree.push(fileNode);
      } else {
        const parentFolderPath = pathParts.slice(0, -1).join('/');
        const parentFolder = folderMap.get(parentFolderPath);
        if (parentFolder) {
          parentFolder.children!.push(fileNode);
        }
      }
    });

    return tree;
  };

  const getFileIcon = (fileName: string, language?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="w-4 h-4 text-yellow-400" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'html':
        return <FileCode className="w-4 h-4 text-orange-400" />;
      case 'json':
        return <FileCode className="w-4 h-4 text-green-400" />;
      case 'md':
        return <FileText className="w-4 h-4 text-slate-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="w-4 h-4 text-purple-400" />;
      default:
        return <FileIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activeFile?.id === node.file?.id;
    const paddingLeft = level * 12 + 8;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className="flex items-center py-1 px-2 hover:bg-slate-700 cursor-pointer transition-colors"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400 mr-1" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400 mr-1" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-400 mr-2" />
            ) : (
              <Folder className="w-4 h-4 text-blue-400 mr-2" />
            )}
            <span className="text-sm text-slate-300">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={`flex items-center py-1 px-2 cursor-pointer transition-colors ${
          isActive 
            ? 'bg-slate-700 text-slate-100' 
            : 'hover:bg-slate-700 text-slate-300 hover:text-slate-100'
        }`}
        style={{ paddingLeft }}
        onClick={() => node.file && onFileSelect(node.file)}
      >
        {getFileIcon(node.name, node.file?.language)}
        <span className="text-sm ml-2 truncate">{node.name}</span>
      </div>
    );
  };

  const fileTree = buildFileTree(files);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-slate-200">Files</h4>
        <span className="text-xs text-slate-500">{files.length} files</span>
      </div>
      
      {fileTree.length > 0 ? (
        <div className="space-y-1">
          {fileTree.map(node => renderNode(node))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No files yet</p>
          <p className="text-xs text-slate-500">Files will appear here as you create them</p>
        </div>
      )}
    </div>
  );
}
