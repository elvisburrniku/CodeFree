import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain, Code, FileText, Lightbulb, Loader2, Sparkles } from "lucide-react";

interface SmartAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface AnalysisResult {
  response: string;
  suggestions: string[];
  creditsUsed: number;
}

interface GenerationResult {
  code: string;
  explanation: string;
  files: Array<{ path: string; content: string; language: string }>;
  creditsUsed: number;
}

export default function SmartAgentModal({ isOpen, onClose, projectId }: SmartAgentModalProps) {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze');
  const [query, setQuery] = useState('');
  const [targetFile, setTargetFile] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [result, setResult] = useState<AnalysisResult | GenerationResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeProjectMutation = useMutation({
    mutationFn: async ({ query, model }: { query: string; model: string }) => {
      const response = await apiRequest("POST", "/api/ai/analyze-project", {
        query,
        projectId,
        model
      });
      return response.json();
    },
    onSuccess: (data: AnalysisResult) => {
      setResult(data);
      toast({ title: "Project analysis completed!", description: `Used ${data.creditsUsed} credits` });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: async ({ prompt, targetFile, model }: { prompt: string; targetFile?: string; model: string }) => {
      const response = await apiRequest("POST", "/api/ai/generate-with-context", {
        prompt,
        projectId,
        targetFile,
        model
      });
      return response.json();
    },
    onSuccess: (data: GenerationResult) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({ 
        title: "Code generated successfully!", 
        description: `Generated ${data.files.length} files using ${data.creditsUsed} credits` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Code generation failed", description: error.message, variant: "destructive" });
    },
  });

  const handleAnalyze = () => {
    if (!query.trim()) {
      toast({ title: "Please enter a question", variant: "destructive" });
      return;
    }
    analyzeProjectMutation.mutate({ query, model });
  };

  const handleGenerate = () => {
    if (!query.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }
    generateCodeMutation.mutate({ prompt: query, targetFile, model });
  };

  const isLoading = analyzeProjectMutation.isPending || generateCodeMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Smart AI Agent
          </DialogTitle>
          <DialogDescription>
            Intelligent AI assistant that understands your entire project structure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'analyze' ? 'default' : 'outline'}
              onClick={() => setActiveTab('analyze')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Analyze Project
            </Button>
            <Button
              variant={activeTab === 'generate' ? 'default' : 'outline'}
              onClick={() => setActiveTab('generate')}
              className="flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Generate Code
            </Button>
          </div>

          {/* Model Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Model:</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-1 border rounded-md bg-background"
            >
              <option value="claude-sonnet-4-20250514">Claude 4.0 Sonnet (Latest)</option>
              <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            </select>
          </div>

          {/* Input Section */}
          <div className="space-y-3">
            <Textarea
              placeholder={
                activeTab === 'analyze'
                  ? "Ask me anything about your project: architecture, code quality, bugs, improvements, etc."
                  : "Describe what you want to build. I'll generate code that fits your project structure."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="resize-none"
            />
            
            {activeTab === 'generate' && (
              <Input
                placeholder="Target file (optional, e.g., components/NewComponent.tsx)"
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
              />
            )}
            
            <div className="flex items-center gap-2">
              <Button
                onClick={activeTab === 'analyze' ? handleAnalyze : handleGenerate}
                disabled={isLoading || !query.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {activeTab === 'analyze' ? 'Analyze Project' : 'Generate Code'}
              </Button>
              
              <Badge variant="secondary">
                Cost: {activeTab === 'analyze' ? '10' : '15'} credits
              </Badge>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  {activeTab === 'analyze' ? 'Analysis Results' : 'Generated Code'}
                </CardTitle>
                <CardDescription>
                  Used {result.creditsUsed} credits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {activeTab === 'analyze' 
                      ? (result as AnalysisResult).response 
                      : (result as GenerationResult).explanation
                    }
                  </div>
                </div>

                {/* Suggestions for analysis */}
                {activeTab === 'analyze' && (result as AnalysisResult).suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Suggestions:</h4>
                    <ul className="space-y-1">
                      {(result as AnalysisResult).suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Generated files for code generation */}
                {activeTab === 'generate' && (result as GenerationResult).files.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Generated Files:</h4>
                    <div className="space-y-2">
                      {(result as GenerationResult).files.map((file, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{file.language}</Badge>
                            <span className="font-mono text-sm">{file.path}</span>
                          </div>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            <code>{file.content}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}