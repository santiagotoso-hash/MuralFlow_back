import * as Joi from 'joi';

// Falha logo na inicialização se faltar ou estiver errada uma variável crítica.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4001),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
  DB_HOST: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_SYNC: Joi.boolean().truthy('true').falsy('false').default(false),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.number().default(86400),

  FRONTEND_URL: Joi.string().default('http://localhost:3001'),

  // E-mails (Brevo). Sem BREVO_API_KEY os avisos só aparecem no log.
  BREVO_API_KEY: Joi.string().allow(''),
  MAIL_FROM_ADDRESS: Joi.string()
    .email()
    .when('BREVO_API_KEY', {
      is: Joi.string().min(1).required(),
      then: Joi.required(),
    }),
  MAIL_FROM_NAME: Joi.string().default('MuralFlow'),
  MAIL_FORCE_SEND: Joi.boolean().truthy('true').falsy('false').default(false),
});
