import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Project, ProjectFile } from "@/pages/editor";
import { RefreshCw, ExternalLink, Eye, AlertCircle } from "lucide-react";

interface PreviewPanelProps {
  project: Project | null;
  files: ProjectFile[];
}

export default function PreviewPanel({ project, files }: PreviewPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate preview content based on project files
  const generatePreviewContent = () => {
    if (!files.length) return null;

    // Find the main HTML file or create one
    let htmlFile = files.find(f => f.path.endsWith('.html') || f.path.endsWith('index.html'));
    
    if (!htmlFile) {
      // If no HTML file exists, create a basic one for React/JS projects
      const jsFiles = files.filter(f => 
        f.path.endsWith('.js') || f.path.endsWith('.jsx') || 
        f.path.endsWith('.ts') || f.path.endsWith('.tsx')
      );
      
      const cssFiles = files.filter(f => 
        f.path.endsWith('.css') || f.path.endsWith('.scss')
      );

      if (jsFiles.length > 0) {
        // Create a basic HTML template for React/JS
        let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project?.name || 'Preview'}</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;

        // Add CSS files
        cssFiles.forEach(cssFile => {
          htmlContent += `\n    <style>\n${cssFile.content}\n    </style>`;
        });

        htmlContent += `
</head>
<body>
    <div id="root"></div>`;

        // Add JavaScript files
        jsFiles.forEach(jsFile => {
          const scriptType = jsFile.path.endsWith('.jsx') || jsFile.path.endsWith('.tsx') 
            ? 'text/babel' 
            : 'text/javascript';
          htmlContent += `\n    <script type="${scriptType}">\n${jsFile.content}\n    </script>`;
        });

        htmlContent += `
</body>
</html>`;

        return htmlContent;
      }
    }

    return htmlFile?.content || null;
  };

  const refreshPreview = () => {
    setIsLoading(true);
    setError(null);

    try {
      const content = generatePreviewContent();
      if (content) {
        // Create a blob URL for the HTML content
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        setError("No previewable content found. Create an HTML file or add some React components.");
      }
    } catch (err) {
      setError("Failed to generate preview. Check your code for syntax errors.");
      console.error("Preview generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  // Auto-refresh when files change
  useEffect(() => {
    if (files.length > 0) {
      const timeoutId = setTimeout(() => {
        refreshPreview();
      }, 1000); // Debounce updates

      return () => clearTimeout(timeoutId);
    }
  }, [files]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const getStatusColor = () => {
    if (error) return 'text-red-400';
    if (isLoading) return 'text-orange-400';
    return 'text-green-400';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isLoading) return 'Loading';
    return 'Live';
  };

  return (
    <div className="bg-slate-800 flex flex-col h-full">
      {/* Preview Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-slate-200">Preview</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              error ? 'bg-red-500' : isLoading ? 'bg-orange-500 animate-pulse' : 'bg-green-500 animate-pulse'
            }`} />
            <span className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          {project && (
            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
              {project.template}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={refreshPreview}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 text-xs font-medium"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={openInNewTab}
            disabled={!previewUrl || isLoading}
            size="sm"
            variant="outline"
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 text-xs font-medium"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open
          </Button>
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="flex-1 bg-white relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-200 mb-2">Preview Error</h3>
              <p className="text-sm text-slate-400 mb-4">{error}</p>
              <Button 
                onClick={refreshPreview}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-400">Compiling preview...</p>
            </div>
          </div>
        ) : previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : files.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center max-w-md mx-auto p-6">
              <Eye className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Files to Preview</h3>
              <p className="text-sm text-slate-400 mb-4">
                Create some files to see your application come to life in real-time.
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center max-w-md mx-auto p-6">
              <Eye className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Preview Available</h3>
              <p className="text-sm text-slate-400 mb-4">
                Add an HTML file or create React components to see a preview.
              </p>
              <Button 
                onClick={refreshPreview}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Preview
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
