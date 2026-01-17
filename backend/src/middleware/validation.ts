import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Define the validation schema for creating an analysis
const createAnalysisSchema = Joi.object({
  contractCode: Joi.string().min(10).max(5000000).required().messages({
    'string.base': 'Contract code must be a string.',
    'string.empty': 'Contract code is required.',
    'string.min': 'Contract code must be at least 10 characters long.',
    'string.max': 'Contract code cannot exceed 5MB.',
    'any.required': 'Contract code is required.',
  }),
  contractName: Joi.string().max(255).optional().messages({
    'string.max': 'Contract name cannot exceed 255 characters.',
  }),
  options: Joi.object({
    includeGasOptimization: Joi.boolean().optional(),
    includeCodeQuality: Joi.boolean().optional(),
    severityFilter: Joi.array()
      .items(Joi.string().valid('HIGH', 'MEDIUM', 'LOW'))
      .optional(),
    timeout: Joi.number().integer().min(10).max(600).optional(),
  }).optional(),
});

/**
 * Middleware to validate the request body for creating an analysis.
 */
export const validateCreateAnalysis = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { error, value } = createAnalysisSchema.validate(req.body, {
    abortEarly: false, // Return all errors
    stripUnknown: true, // Remove unknown properties
  });

  if (error) {
    // Format Joi error for consistent API response
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    const firstErrorField = error.details[0]?.path[0] as string | undefined;

    return next(new ValidationError(errorMessage, firstErrorField));
  }

  // Replace request body with validated and cleaned value
  req.body = value;
  next();
};

// You can add other validation schemas here as needed

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    company: Joi.string().max(100).optional().allow(''),
    agreeToTerms: Joi.boolean().optional(),
});

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const message = error.details.map(i => i.message).join(', ');
        return next(new ValidationError(message));
    }
    req.body = value;
    next();
};

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const message = error.details.map(i => i.message).join(', ');
        return next(new ValidationError(message));
    }
    req.body = value;
    next();
};
