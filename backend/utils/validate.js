// Joi validation middleware — every new route validates its body through this.
import Joi from 'joi';

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        message: error.details.map((d) => d.message).join('; '),
      });
    }
    req.body = value;
    next();
  };
}

// Resume `data` object — permissive (it's user content) but bounded.
export const resumeDataSchema = Joi.object({
  fullName: Joi.string().allow('').max(200),
  email: Joi.string().allow('').max(320),
  phone: Joi.string().allow('').max(50),
  city: Joi.string().allow('').max(120),
  postalCode: Joi.string().allow('').max(20),
  linkedIn: Joi.string().allow('').max(500),
  github: Joi.string().allow('').max(500),
  isDeveloper: Joi.boolean(),
  summary: Joi.string().allow('').max(5000),
  title: Joi.string().allow('').max(160),
  targetRole: Joi.string().allow('').max(160),
  education: Joi.array()
    .items(
      Joi.object({
        school: Joi.string().allow('').max(300),
        degree: Joi.string().allow('').max(300),
        from: Joi.string().allow('').max(40),
        to: Joi.string().allow('').max(40),
        achievements: Joi.string().allow('').max(3000),
      })
    )
    .max(20),
  experience: Joi.array()
    .items(
      Joi.object({
        company: Joi.string().allow('').max(300),
        role: Joi.string().allow('').max(300),
        from: Joi.string().allow('').max(40),
        to: Joi.string().allow('').max(40),
        description: Joi.string().allow('').max(8000),
      })
    )
    .max(30),
  skills: Joi.array().items(Joi.string().allow('').max(120)).max(60),
  sectionOrder: Joi.array().items(Joi.string().valid('summary', 'experience', 'education', 'skills')).max(4),
  hiddenSections: Joi.array().items(Joi.string().valid('summary', 'experience', 'education', 'skills')).max(4),
  customization: Joi.object({
    accentColor: Joi.string().pattern(/^#[0-9a-fA-F]{3,8}$/).max(9),
    fontFamily: Joi.string().valid('sans', 'serif', 'mono'),
    density: Joi.string().valid('compact', 'normal', 'relaxed'),
  }),
}).unknown(false);

export const jobPreferencesSchema = Joi.object({
  titles: Joi.array().items(Joi.string().max(120)).max(15).default([]),
  skills: Joi.array().items(Joi.string().max(120)).max(40).default([]),
  locations: Joi.array().items(Joi.string().max(120)).max(15).default([]),
  workType: Joi.string().valid('any', 'full-time', 'part-time', 'contract', 'internship').default('any'),
  remote: Joi.string().valid('any', 'remote', 'hybrid', 'onsite').default('any'),
  salaryMin: Joi.number().min(0).max(10000000).allow(null).default(null),
  salaryMax: Joi.number().min(0).max(10000000).allow(null).default(null),
  alertsEnabled: Joi.boolean().default(true),
  emailAlerts: Joi.boolean().default(false),
  alertThreshold: Joi.number().min(0).max(100).default(75),
});
