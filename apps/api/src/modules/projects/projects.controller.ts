import type { Request, Response } from "express";
import { CreateProjectSchema, UpdateProjectSchema } from "./projects.schemas";
import { createProject, listProjects, updateProject, archiveProject, getProjectById } from "./projects.service";

export async function create(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  const input = CreateProjectSchema.parse(req.body);
  const project = await createProject(userId, input);

  return res.status(201).json({ project });
}

export async function list(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const includeArchived = req.query.includeArchived === "true";

  const projects = await listProjects(userId, { includeArchived });
  return res.json({ projects });
}

export async function getOne(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const projectId = Number(req.params.id);

  const project = await getProjectById(userId, projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  return res.json({ project });
}

export async function patch(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const projectId = Number(req.params.id);

  const patchBody = UpdateProjectSchema.parse(req.body);
  const project = await updateProject(userId, projectId, patchBody as any);

  if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json({ project });
}

export async function remove(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const projectId = Number(req.params.id);

  const project = await archiveProject(userId, projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  return res.json({ project });
}