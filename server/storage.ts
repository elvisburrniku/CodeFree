import {
  users,
  projects,
  projectFiles,
  aiGenerations,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type ProjectFile,
  type InsertProjectFile,
  type AiGeneration,
  type InsertAiGeneration,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: string, credits: number): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  updateUserGitHubInfo(userId: string, accessToken: string, username: string): Promise<User>;
  
  // Project operations
  getUserProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Project file operations
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  getProjectFile(projectId: string, path: string): Promise<ProjectFile | undefined>;
  createOrUpdateProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: string, file: Partial<InsertProjectFile>): Promise<ProjectFile>;
  deleteProjectFile(projectId: string, path: string): Promise<void>;
  
  // AI generation operations
  createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration>;
  getUserAiGenerations(userId: string, limit?: number): Promise<AiGeneration[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCredits(userId: string, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ credits, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserGitHubInfo(userId: string, accessToken: string, username: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        githubAccessToken: accessToken,
        githubUsername: username,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Project operations
  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project file operations
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(projectFiles.path);
  }

  async getProjectFile(projectId: string, path: string): Promise<ProjectFile | undefined> {
    const [file] = await db
      .select()
      .from(projectFiles)
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
    return file;
  }

  async createOrUpdateProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    // Check if file exists first
    const existingFile = await this.getProjectFile(file.projectId, file.path);
    
    if (existingFile) {
      // Update existing file
      const [projectFile] = await db
        .update(projectFiles)
        .set({
          content: file.content,
          language: file.language,
          updatedAt: new Date(),
        })
        .where(and(eq(projectFiles.projectId, file.projectId), eq(projectFiles.path, file.path)))
        .returning();
      return projectFile;
    } else {
      // Create new file
      const [projectFile] = await db
        .insert(projectFiles)
        .values(file)
        .returning();
      return projectFile;
    }
  }

  async deleteProjectFile(projectId: string, path: string): Promise<void> {
    await db
      .delete(projectFiles)
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
  }

  // AI generation operations
  async createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration> {
    const [aiGeneration] = await db.insert(aiGenerations).values(generation).returning();
    return aiGeneration;
  }

  async getUserAiGenerations(userId: string, limit = 50): Promise<AiGeneration[]> {
    return await db
      .select()
      .from(aiGenerations)
      .where(eq(aiGenerations.userId, userId))
      .orderBy(desc(aiGenerations.createdAt))
      .limit(limit);
  }
}

// In-memory storage implementation for Replit development
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private projectFiles: Map<string, ProjectFile> = new Map();
  private aiGenerations: Map<string, AiGeneration> = new Map();
  private usersByEmail: Map<string, User> = new Map();

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user: User = {
      id: this.generateId(),
      email: userData.email,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      hashedPassword: userData.hashedPassword ?? null,
      credits: userData.credits ?? 1000,
      stripeCustomerId: userData.stripeCustomerId ?? null,
      stripeSubscriptionId: userData.stripeSubscriptionId ?? null,
      subscriptionStatus: userData.subscriptionStatus ?? "free",
      githubAccessToken: userData.githubAccessToken ?? null,
      githubUsername: userData.githubUsername ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(user.id, user);
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    // Check if user exists by email
    const existingUser = userData.email ? this.usersByEmail.get(userData.email) : undefined;
    
    if (existingUser) {
      // Update existing user
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      
      this.users.set(updatedUser.id, updatedUser);
      if (updatedUser.email) {
        this.usersByEmail.set(updatedUser.email, updatedUser);
      }
      return updatedUser;
    } else {
      // Create new user
      return this.createUser(userData);
    }
  }

  async updateUserCredits(userId: string, credits: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      credits,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
    return updatedUser;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId ?? null,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
    return updatedUser;
  }

  async updateUserGitHubInfo(userId: string, accessToken: string, username: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      githubAccessToken: accessToken,
      githubUsername: username,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    if (updatedUser.email) {
      this.usersByEmail.set(updatedUser.email, updatedUser);
    }
    return updatedUser;
  }

  // Project operations
  async getUserProjects(userId: string): Promise<Project[]> {
    const userProjects = Array.from(this.projects.values())
      .filter(project => project.userId === userId)
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    return userProjects;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const project: Project = {
      id: this.generateId(),
      userId: projectData.userId,
      name: projectData.name,
      description: projectData.description ?? null,
      template: projectData.template ?? "react",
      status: projectData.status ?? "draft",
      deployUrl: projectData.deployUrl ?? null,
      isPublic: projectData.isPublic ?? false,
      githubRepoUrl: projectData.githubRepoUrl ?? null,
      githubBranch: projectData.githubBranch ?? "main",
      githubAccessToken: projectData.githubAccessToken ?? null,
      lastSyncAt: projectData.lastSyncAt ?? null,
      gitStatus: projectData.gitStatus ?? "unconnected",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error("Project not found");
    }
    
    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    // Delete associated files
    Array.from(this.projectFiles.keys()).forEach(key => {
      const file = this.projectFiles.get(key);
      if (file?.projectId === id) {
        this.projectFiles.delete(key);
      }
    });
  }

  // Project file operations
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return Array.from(this.projectFiles.values())
      .filter(file => file.projectId === projectId)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async getProjectFile(projectId: string, path: string): Promise<ProjectFile | undefined> {
    const key = `${projectId}:${path}`;
    return this.projectFiles.get(key);
  }

  async createOrUpdateProjectFile(fileData: InsertProjectFile): Promise<ProjectFile> {
    const key = `${fileData.projectId}:${fileData.path}`;
    const existingFile = this.projectFiles.get(key);
    
    const file: ProjectFile = {
      id: existingFile?.id ?? this.generateId(),
      ...fileData,
      content: fileData.content ?? "",
      language: fileData.language ?? "javascript",
      createdAt: existingFile?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    
    this.projectFiles.set(key, file);
    return file;
  }

  async createProjectFile(fileData: InsertProjectFile): Promise<ProjectFile> {
    const file: ProjectFile = {
      id: this.generateId(),
      projectId: fileData.projectId,
      path: fileData.path,
      content: fileData.content ?? "",
      language: fileData.language ?? "javascript",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const key = `${fileData.projectId}:${fileData.path}`;
    this.projectFiles.set(key, file);
    return file;
  }

  async updateProjectFile(id: string, fileData: Partial<InsertProjectFile>): Promise<ProjectFile> {
    // Find file by id in memory storage
    const fileEntry = Array.from(this.projectFiles.entries()).find(([_, file]) => file.id === id);
    if (!fileEntry) {
      throw new Error("Project file not found");
    }
    
    const [key, file] = fileEntry;
    const updatedFile: ProjectFile = {
      ...file,
      ...fileData,
      updatedAt: new Date(),
    };
    
    this.projectFiles.set(key, updatedFile);
    return updatedFile;
  }

  async deleteProjectFile(projectId: string, path: string): Promise<void> {
    const key = `${projectId}:${path}`;
    this.projectFiles.delete(key);
  }

  // AI generation operations
  async createAiGeneration(generationData: InsertAiGeneration): Promise<AiGeneration> {
    const generation: AiGeneration = {
      id: this.generateId(),
      userId: generationData.userId,
      projectId: generationData.projectId ?? null,
      prompt: generationData.prompt,
      response: generationData.response ?? null,
      creditsUsed: generationData.creditsUsed ?? 0,
      model: generationData.model ?? "gpt-4o",
      createdAt: new Date(),
    };
    
    this.aiGenerations.set(generation.id, generation);
    return generation;
  }

  async getUserAiGenerations(userId: string, limit = 50): Promise<AiGeneration[]> {
    return Array.from(this.aiGenerations.values())
      .filter(gen => gen.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, limit);
  }
}

// Use in-memory storage for development, database storage for production
export const storage = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
