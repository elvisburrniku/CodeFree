import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Code, 
  Globe, 
  Smartphone, 
  Database, 
  Bot,
  Palette,
  Zap
} from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (data: { name: string; description: string; template: string }) => void;
  isLoading: boolean;
}

const PROJECT_TEMPLATES = [
  {
    id: "react",
    name: "React App",
    description: "Modern React application with TypeScript",
    icon: Code,
    category: "Frontend",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    features: ["React 18", "TypeScript", "Tailwind CSS", "Vite"]
  },
  {
    id: "html",
    name: "HTML Website",
    description: "Static website with HTML, CSS, and JavaScript",
    icon: Globe,
    category: "Static",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    features: ["HTML5", "CSS3", "Vanilla JS", "Responsive"]
  },
  {
    id: "vue",
    name: "Vue.js App",
    description: "Vue 3 application with Composition API",
    icon: Zap,
    category: "Frontend",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    features: ["Vue 3", "TypeScript", "Vite", "Pinia"]
  },
  {
    id: "landing",
    name: "Landing Page",
    description: "High-converting landing page template",
    icon: Palette,
    category: "Marketing",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    features: ["Responsive", "SEO Ready", "CTA Optimized", "Analytics"]
  },
  {
    id: "api",
    name: "REST API",
    description: "Node.js API with Express and database",
    icon: Database,
    category: "Backend",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    features: ["Express", "TypeScript", "Database", "Auth"]
  },
  {
    id: "chatbot",
    name: "AI Chatbot",
    description: "Intelligent chatbot with OpenAI integration",
    icon: Bot,
    category: "AI",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    features: ["OpenAI API", "Chat UI", "Context Memory", "Responsive"]
  }
];

export default function CreateProjectDialog({ 
  open, 
  onOpenChange, 
  onCreateProject, 
  isLoading 
}: CreateProjectDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("react");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    onCreateProject({
      name: projectName.trim(),
      description: projectDescription.trim(),
      template: selectedTemplate
    });

    // Reset form
    setProjectName("");
    setProjectDescription("");
    setSelectedTemplate("react");
  };

  const selectedTemplateData = PROJECT_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-800 border-slate-700 text-slate-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Project</DialogTitle>
          <DialogDescription className="text-slate-400">
            Choose a template and provide project details to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-200">Select Template</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROJECT_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedTemplate === template.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-600 bg-slate-700 hover:border-slate-500"
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-slate-100 text-sm">{template.name}</h3>
                            <Badge variant="outline" className={template.color}>
                              {template.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.features.slice(0, 2).map((feature) => (
                              <span
                                key={feature}
                                className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-200">
                Project Name
              </Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-slate-200">
                Description (Optional)
              </Label>
              <Input
                id="description"
                placeholder="Brief description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Selected Template Info */}
          {selectedTemplateData && (
            <div className="bg-slate-700 rounded-lg p-4">
              <h4 className="font-medium text-slate-200 mb-2">Template Features</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTemplateData.features.map((feature) => (
                  <Badge
                    key={feature}
                    variant="outline"
                    className="bg-slate-600 text-slate-300 border-slate-500"
                  >
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !projectName.trim()}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}