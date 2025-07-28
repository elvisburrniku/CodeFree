import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Project, ProjectFile } from "@/pages/editor";
import { 
  X, 
  Send, 
  Zap, 
  Copy, 
  Plus, 
  Mic, 
  Coins,
  User,
  AlertCircle
} from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  creditsUsed?: number;
  timestamp: Date;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  activeFile: ProjectFile | null;
  onCodeGenerated: (files: Array<{ path: string; content: string; language: string }>) => void;
}

export default function AIChatModal({ 
  isOpen, 
  onClose, 
  currentProject, 
  activeFile,
  onCodeGenerated 
}: AIChatModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your AI coding assistant powered by GPT-4. I can help you:

• Generate complete React components
• Create HTML/CSS layouts  
• Write JavaScript functions
• Debug and optimize code
• Convert designs to code
• Explain complex code concepts

What would you like me to help you build today?`,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  // Code generation mutation
  const generateCodeMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const context = activeFile ? `Currently editing: ${activeFile.path}\n\nCurrent file content:\n${activeFile.content}\n\n` : '';
      const projectContext = currentProject ? `Project: ${currentProject.name} (${currentProject.template})\n\n` : '';
      
      const response = await apiRequest("POST", "/api/ai/generate", {
        prompt,
        language: activeFile?.language || 'javascript',
        framework: currentProject?.template || 'react',
        context: projectContext + context,
        projectId: currentProject?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.explanation,
        files: data.files,
        creditsUsed: data.creditsUsed,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      toast({
        title: "Code Generated",
        description: `Used ${data.creditsUsed} credits`,
      });
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
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again or rephrase your request.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/ai/chat", {
        messages: [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: prompt }
        ],
        projectId: currentProject?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        creditsUsed: data.creditsUsed,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      toast({
        title: "Response Generated",
        description: `Used ${data.creditsUsed} credits`,
      });
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
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Chat Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  const handleSendMessage = () => {
    if (!inputText.trim() || isGenerating) return;

    if (!user || user.credits < 5) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 5 credits to send a message. Please purchase more credits.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    // Check if this is a code generation request
    const isCodeGenRequest = /\b(create|generate|build|make|write|code|component|function|class|module)\b/i.test(inputText);
    
    if (isCodeGenRequest) {
      generateCodeMutation.mutate(inputText);
    } else {
      chatMutation.mutate(inputText);
    }
    
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Code copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const insertCode = (files: Array<{ path: string; content: string; language: string }>) => {
    onCodeGenerated(files);
    toast({
      title: "Code Inserted",
      description: `Added ${files.length} file(s) to your project`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-50">AI Code Assistant</h3>
              <p className="text-sm text-slate-400">Powered by OpenAI GPT-4</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1 rounded-lg">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-slate-200">{user?.credits || 0}</span>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-xs' : ''}`}>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-purple-500 text-white ml-auto'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.creditsUsed && (
                    <div className="mt-2 text-xs opacity-75">
                      Cost: {message.creditsUsed} credits
                    </div>
                  )}
                </div>
                
                {/* Code blocks for generated files */}
                {message.files && message.files.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.files.map((file, index) => (
                      <div key={index} className="bg-slate-900 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-600">
                          <span className="text-xs text-slate-400 font-mono">{file.path}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => copyToClipboard(file.content)}
                              size="sm"
                              variant="ghost"
                              className="text-xs text-purple-400 hover:text-purple-300"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                        <pre className="p-4 text-xs text-slate-200 font-mono overflow-x-auto max-h-48">
                          <code>{file.content}</code>
                        </pre>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => insertCode(message.files!)}
                        size="sm"
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Insert Code
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-sm text-slate-400 ml-2">Generating response...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat Input */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you want to build or ask for help..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                disabled={isGenerating}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isGenerating}
                className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 text-xs font-medium rounded-lg"
                disabled
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-slate-400">
              Estimated cost: <span className="text-purple-400 font-medium">5-25 credits</span>
            </div>
            <div className="text-xs text-slate-500">
              Press Shift+Enter for new line
            </div>
          </div>
          
          {(!user || user.credits < 5) && (
            <div className="mt-3 flex items-center space-x-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-300">
                You need at least 5 credits to send messages. 
                <Button 
                  variant="link" 
                  className="text-orange-300 underline p-0 h-auto ml-1"
                  onClick={() => {
                    onClose();
                    window.location.href = '/subscribe';
                  }}
                >
                  Get more credits
                </Button>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
