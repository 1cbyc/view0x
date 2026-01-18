import { Request, Response } from "express";
import { AnalysisTemplate } from "../models/AnalysisTemplate";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export const createTemplate = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { name, description, options, isDefault } = req.body;

  if (!name) {
    throw new ValidationError("Template name is required");
  }

  if (isDefault) {
    await AnalysisTemplate.update(
      { isDefault: false },
      { where: { userId } },
    );
  }

  const template = await AnalysisTemplate.create({
    userId: userId!,
    name,
    description,
    options: options || {},
    isDefault: isDefault || false,
  });

  logger.info(`Template created: ${template.id} by user ${userId}`);

  res.status(201).json({
    success: true,
    data: template,
  });
};

export const getTemplates = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const templates = await AnalysisTemplate.findAll({
    where: { userId },
    order: [["isDefault", "DESC"], ["createdAt", "DESC"]],
  });

  res.json({
    success: true,
    data: templates,
  });
};

export const getTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const template = await AnalysisTemplate.findByPk(id);
  if (!template) {
    throw new NotFoundError("Template not found");
  }

  if (template.userId !== userId) {
    throw new AuthorizationError("Not authorized");
  }

  res.json({
    success: true,
    data: template,
  });
};

export const updateTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const { name, description, options, isDefault } = req.body;

  const template = await AnalysisTemplate.findByPk(id);
  if (!template) {
    throw new NotFoundError("Template not found");
  }

  if (template.userId !== userId) {
    throw new AuthorizationError("Not authorized");
  }

  if (isDefault && !template.isDefault) {
    await AnalysisTemplate.update(
      { isDefault: false },
      { where: { userId } },
    );
  }

  template.name = name || template.name;
  template.description = description !== undefined ? description : template.description;
  template.options = options || template.options;
  template.isDefault = isDefault !== undefined ? isDefault : template.isDefault;
  await template.save();

  res.json({
    success: true,
    data: template,
  });
};

export const deleteTemplate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const template = await AnalysisTemplate.findByPk(id);
  if (!template) {
    throw new NotFoundError("Template not found");
  }

  if (template.userId !== userId) {
    throw new AuthorizationError("Not authorized");
  }

  await template.destroy();

  res.status(204).send();
};
