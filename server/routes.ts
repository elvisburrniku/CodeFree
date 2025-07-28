import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { generateCode, chatWithAI } from "./openai";
import { analyzeProjectWithAI, generateCodeWithContext } from "./anthropic";
import { insertProjectSchema, insertProjectFileSchema, insertAiGenerationSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import { promises as fs } from "fs";
import { GitHubService, exchangeCodeForToken } from "./github";

// Stripe integration - optional for development
let stripe: Stripe | undefined;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });
} else {
  console.log("STRIPE_SECRET_KEY not provided, payment features will be disabled");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes are now handled in supabaseAuth.ts

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse({ ...req.body, userId });
      const project = await storage.createProject(projectData);
      
      // Create initial files based on template
      const initialFiles = getInitialFiles(project.template || 'react');
      for (const file of initialFiles) {
        await storage.createOrUpdateProjectFile({
          projectId: project.id,
          ...file
        });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user owns the project
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(req.params.id, updates);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // GitHub OAuth routes
  app.get('/api/auth/github', (req, res) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(503).json({ message: "GitHub OAuth not configured" });
    }
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;
    res.json({ authUrl: githubAuthUrl });
  });

  app.post('/api/auth/github/callback', isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json({ message: "Authorization code required" });
      }

      // Exchange code for access token
      const accessToken = await exchangeCodeForToken(code);
      
      // Get GitHub user info
      const githubService = new GitHubService(accessToken);
      const githubUser = await githubService.getUser();

      // Update user with GitHub info
      await storage.updateUserGitHubInfo(userId, accessToken, githubUser.login);

      res.json({ 
        message: "GitHub account connected successfully",
        username: githubUser.login 
      });
    } catch (error) {
      console.error("GitHub OAuth error:", error);
      res.status(400).json({ message: "Failed to connect GitHub account" });
    }
  });

  // GitHub repository routes
  app.get('/api/github/repositories', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (!user?.githubAccessToken) {
        return res.status(400).json({ message: "GitHub account not connected" });
      }

      const githubService = new GitHubService(user.githubAccessToken);
      const repositories = await githubService.getUserRepositories();
      
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  app.post('/api/github/repositories', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (!user?.githubAccessToken) {
        return res.status(400).json({ message: "GitHub account not connected" });
      }

      const { name, description, private: isPrivate } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Repository name is required" });
      }

      const githubService = new GitHubService(user.githubAccessToken);
      const repository = await githubService.createRepository(name, description, isPrivate);
      
      res.json(repository);
    } catch (error) {
      console.error("Error creating repository:", error);
      res.status(500).json({ message: "Failed to create repository" });
    }
  });

  // Project GitHub integration routes
  app.post('/api/projects/:id/github/connect', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { repoUrl, branch = 'main' } = req.body;
      
      if (!repoUrl) {
        return res.status(400).json({ message: "Repository URL is required" });
      }

      // Update project with GitHub info
      const updatedProject = await storage.updateProject(req.params.id, {
        githubRepoUrl: repoUrl,
        githubBranch: branch,
        gitStatus: 'connected',
        lastSyncAt: new Date(),
      });

      res.json(updatedProject);
    } catch (error) {
      console.error("Error connecting repository:", error);
      res.status(500).json({ message: "Failed to connect repository" });
    }
  });

  app.post('/api/projects/:id/github/clone', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user?.githubAccessToken) {
        return res.status(400).json({ message: "GitHub account not connected" });
      }

      if (!project.githubRepoUrl) {
        return res.status(400).json({ message: "No GitHub repository connected" });
      }

      await storage.updateProject(req.params.id, { gitStatus: 'syncing' });

      const githubService = new GitHubService(user.githubAccessToken);
      
      // Clone repository
      await githubService.cloneRepository(project.githubRepoUrl, project.id);
      
      // Sync files from workspace to project
      const updatedFiles = await githubService.syncWorkspaceToProject(project.id);
      
      // Update project status
      await storage.updateProject(req.params.id, {
        gitStatus: 'connected',
        lastSyncAt: new Date(),
      });

      res.json({ 
        message: "Repository cloned successfully",
        filesCount: updatedFiles.length 
      });
    } catch (error) {
      console.error("Error cloning repository:", error);
      await storage.updateProject(req.params.id, { gitStatus: 'error' });
      res.status(500).json({ message: "Failed to clone repository" });
    }
  });

  app.post('/api/projects/:id/github/push', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user?.githubAccessToken) {
        return res.status(400).json({ message: "GitHub account not connected" });
      }

      if (!project.githubRepoUrl) {
        return res.status(400).json({ message: "No GitHub repository connected" });
      }

      const { commitMessage = 'Update from CodeCraft AI' } = req.body;

      await storage.updateProject(req.params.id, { gitStatus: 'syncing' });

      const githubService = new GitHubService(user.githubAccessToken);
      
      // Sync project files to workspace
      await githubService.syncProjectToWorkspace(project.id);
      
      // Push changes to GitHub
      await githubService.pushToRepository(project.id, commitMessage);
      
      // Update project status
      await storage.updateProject(req.params.id, {
        gitStatus: 'connected',
        lastSyncAt: new Date(),
      });

      res.json({ message: "Changes pushed to GitHub successfully" });
    } catch (error) {
      console.error("Error pushing to repository:", error);
      await storage.updateProject(req.params.id, { gitStatus: 'error' });
      res.status(500).json({ message: "Failed to push to repository" });
    }
  });

  app.post('/api/projects/:id/github/pull', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getUser(userId);
      if (!user?.githubAccessToken) {
        return res.status(400).json({ message: "GitHub account not connected" });
      }

      if (!project.githubRepoUrl) {
        return res.status(400).json({ message: "No GitHub repository connected" });
      }

      await storage.updateProject(req.params.id, { gitStatus: 'syncing' });

      const githubService = new GitHubService(user.githubAccessToken);
      
      // Pull latest changes from GitHub
      await githubService.pullFromRepository(project.id);
      
      // Sync files from workspace to project
      const updatedFiles = await githubService.syncWorkspaceToProject(project.id);
      
      // Update project status
      await storage.updateProject(req.params.id, {
        gitStatus: 'connected',
        lastSyncAt: new Date(),
      });

      res.json({ 
        message: "Latest changes pulled from GitHub successfully",
        filesCount: updatedFiles.length 
      });
    } catch (error) {
      console.error("Error pulling from repository:", error);
      await storage.updateProject(req.params.id, { gitStatus: 'error' });
      res.status(500).json({ message: "Failed to pull from repository" });
    }
  });

  app.delete('/api/projects/:id/github/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Disconnect GitHub repository
      const updatedProject = await storage.updateProject(req.params.id, {
        githubRepoUrl: null,
        githubBranch: 'main',
        githubAccessToken: null,
        lastSyncAt: null,
        gitStatus: 'unconnected',
      });

      res.json({ 
        message: "GitHub repository disconnected successfully",
        project: updatedProject 
      });
    } catch (error) {
      console.error("Error disconnecting repository:", error);
      res.status(500).json({ message: "Failed to disconnect repository" });
    }
  });

  // Project file routes
  app.get('/api/projects/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const files = await storage.getProjectFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ message: "Failed to fetch project files" });
    }
  });

  app.put('/api/projects/:id/files', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.id;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const fileData = insertProjectFileSchema.parse({
        projectId: req.params.id,
        ...req.body
      });
      
      const file = await storage.createOrUpdateProjectFile(fileData);
      res.json(file);
    } catch (error) {
      console.error("Error updating project file:", error);
      res.status(500).json({ message: "Failed to update project file" });
    }
  });

  // AI generation routes
  app.post('/api/ai/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.credits ?? 0) < 10) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      const { prompt, language, framework, context, projectId } = req.body;
      
      const result = await generateCode({
        prompt,
        language,
        framework,
        context
      });
      
      // Deduct credits
      await storage.updateUserCredits(userId, (user.credits ?? 0) - result.creditsUsed);
      
      // Save AI generation record
      await storage.createAiGeneration({
        userId,
        projectId,
        prompt,
        response: result.explanation,
        creditsUsed: result.creditsUsed,
        model: "gpt-4o"
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error generating code:", error);
      res.status(500).json({ message: "Failed to generate code" });
    }
  });

  app.post('/api/ai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.credits ?? 0) < 5) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      const { messages, projectId } = req.body;
      
      const result = await chatWithAI(messages);
      
      // Deduct credits
      await storage.updateUserCredits(userId, (user.credits ?? 0) - result.creditsUsed);
      
      // Save AI generation record
      await storage.createAiGeneration({
        userId,
        projectId,
        prompt: messages[messages.length - 1]?.content || "",
        response: result.response,
        creditsUsed: result.creditsUsed,
        model: "gpt-4o"
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error chatting with AI:", error);
      res.status(500).json({ message: "Failed to chat with AI" });
    }
  });

  // Smart Agent endpoints with project context
  app.post('/api/ai/analyze-project', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.credits ?? 0) < 10) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      const { query, projectId, model = "claude-sonnet-4-20250514" } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID required" });
      }
      
      // Create a project workspace directory
      const projectPath = await createProjectWorkspace(projectId);
      
      const result = await analyzeProjectWithAI(projectPath, query, model);
      
      // Deduct credits
      await storage.updateUserCredits(userId, (user.credits ?? 0) - result.creditsUsed);
      
      // Save AI generation record
      await storage.createAiGeneration({
        userId,
        projectId,
        prompt: query,
        response: result.response,
        creditsUsed: result.creditsUsed,
        model
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error analyzing project:", error);
      res.status(500).json({ message: "Failed to analyze project" });
    }
  });

  app.post('/api/ai/generate-with-context', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || (user.credits ?? 0) < 15) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      const { prompt, projectId, targetFile, model = "claude-sonnet-4-20250514" } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID required" });
      }
      
      // Create a project workspace directory
      const projectPath = await createProjectWorkspace(projectId);
      
      const result = await generateCodeWithContext(projectPath, prompt, targetFile, model);
      
      // Save generated files to project
      for (const file of result.files) {
        await storage.createOrUpdateProjectFile({
          projectId,
          path: file.path,
          content: file.content,
          language: file.language
        });
      }
      
      // Deduct credits
      await storage.updateUserCredits(userId, (user.credits ?? 0) - result.creditsUsed);
      
      // Save AI generation record
      await storage.createAiGeneration({
        userId,
        projectId,
        prompt,
        response: result.explanation,
        creditsUsed: result.creditsUsed,
        model
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error generating code with context:", error);
      res.status(500).json({ message: "Failed to generate code with context" });
    }
  });

  // Subscription route
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Payment services not available" });
    }

    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      return res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    }
    
    if (!user.email) {
      return res.status(400).json({ message: 'No user email on file' });
    }

    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product: 'prod_codecraft_ai_pro',
            unit_amount: 1900, // $19.00
            recurring: {
              interval: 'month',
            },
          },
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customer.id, subscription.id);
  
      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  // Stripe webhook for handling subscription updates
  app.post('/api/stripe/webhook', async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Payment services not available" });
    }

    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription;
      
      // Find user by subscription ID and grant credits
      const users = await storage.getUserProjects(''); // This is a hack, we need a better way to find users
      // In a real implementation, we'd have a proper user lookup by subscription ID
      
      console.log('Payment succeeded for subscription:', subscriptionId);
      // Grant 1000 credits for successful payment
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to create project workspace from database files
async function createProjectWorkspace(projectId: string): Promise<string> {
  const workspaceDir = path.join(process.cwd(), 'temp', 'workspaces', projectId);
  
  try {
    // Ensure workspace directory exists
    await fs.mkdir(workspaceDir, { recursive: true });
    
    // Get all project files from database
    const files = await storage.getProjectFiles(projectId);
    
    // Write files to workspace
    for (const file of files) {
      const filePath = path.join(workspaceDir, file.path);
      const fileDir = path.dirname(filePath);
      
      // Ensure directory exists
      await fs.mkdir(fileDir, { recursive: true });
      
      // Write file content
      await fs.writeFile(filePath, file.content || '', 'utf-8');
    }
    
    return workspaceDir;
  } catch (error) {
    console.error('Error creating project workspace:', error);
    throw new Error('Failed to create project workspace');
  }
}

function getInitialFiles(template: string): Array<{ path: string; content: string; language: string }> {
  switch (template) {
    case 'react':
      return [
        {
          path: 'src/App.jsx',
          content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Your React App</h1>
        <p>Start building something amazing!</p>
      </header>
    </div>
  );
}

export default App;`,
          language: 'javascript'
        },
        {
          path: 'src/App.css',
          content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

h1 {
  margin-bottom: 16px;
}`,
          language: 'css'
        },
        {
          path: 'package.json',
          content: `{
  "name": "react-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}`,
          language: 'json'
        }
      ];
    default:
      return [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Welcome to your new project.</p>
</body>
</html>`,
          language: 'html'
        }
      ];
  }
}
