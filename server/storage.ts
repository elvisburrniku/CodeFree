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

export const storage = new DatabaseStorage();
