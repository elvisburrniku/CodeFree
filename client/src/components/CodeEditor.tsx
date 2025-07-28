import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectFile } from '@/pages/editor';
import { Save, Zap, Play, Settings } from 'lucide-react';

interface CodeEditorProps {
  file: ProjectFile | null;
  onChange: (content: string) => void;
  onOpenAIChat: () => void;
}

export default function CodeEditor({ file, onChange, onOpenAIChat }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Monaco Editor
    const initMonaco = async () => {
      if (typeof window !== 'undefined') {
        // Load Monaco Editor from CDN
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js';
        script.async = true;
        
        script.onload = () => {
          // @ts-ignore
          require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.44.0/min/vs' }});
          // @ts-ignore
          require(['vs/editor/editor.main'], () => {
            if (editorRef.current && !monacoRef.current) {
              // @ts-ignore
              monacoRef.current = monaco.editor.create(editorRef.current, {
                value: file?.content || '// Start coding...',
                language: getLanguageFromFile(file),
                theme: 'vs-dark',
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                automaticLayout: true,
                wordWrap: 'on',
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
              });

              // Listen for content changes
              monacoRef.current.onDidChangeModelContent(() => {
                const content = monacoRef.current.getValue();
                onChange(content);
              });
            }
          });
        };
        
        document.head.appendChild(script);
      }
    };

    if (!monacoRef.current) {
      initMonaco();
    }

    return () => {
      if (monacoRef.current) {
        monacoRef.current.dispose();
        monacoRef.current = null;
      }
    };
  }, []);

  // Update editor content when file changes
  useEffect(() => {
    if (monacoRef.current && file) {
      const currentContent = monacoRef.current.getValue();
      if (currentContent !== file.content) {
        monacoRef.current.setValue(file.content);
        // @ts-ignore
        monaco.editor.setModelLanguage(monacoRef.current.getModel(), getLanguageFromFile(file));
      }
    }
  }, [file]);

  const getLanguageFromFile = (file: ProjectFile | null): string => {
    if (!file) return 'javascript';
    
    const ext = file.path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'css':
        return 'css';
      case 'scss':
      case 'sass':
        return 'scss';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      default:
        return file.language || 'javascript';
    }
  };

  const getStatusBadge = () => {
    if (!file) return null;
    
    return (
      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        Modified
      </Badge>
    );
  };

  return (
    <div className="flex flex-col bg-slate-900 h-full">
      {/* Editor Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-200">
            {file?.path || 'No file selected'}
          </span>
          {getStatusBadge()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={onOpenAIChat}
            size="sm"
            className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium"
          >
            <Zap className="w-3 h-3 mr-1" />
            AI Generate
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 text-xs font-medium"
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 text-xs font-medium"
          >
            <Play className="w-3 h-3 mr-1" />
            Run
          </Button>
        </div>
      </div>
      
      {/* Monaco Editor Container */}
      <div className="flex-1 relative">
        {file ? (
          <div ref={editorRef} className="absolute inset-0" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">No file selected</h3>
              <p className="text-slate-400 mb-4">Select a file from the sidebar to start editing</p>
              <Button onClick={onOpenAIChat} className="bg-purple-500 hover:bg-purple-600">
                <Zap className="w-4 h-4 mr-2" />
                Generate Code with AI
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
