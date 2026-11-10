import { join } from 'path';
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload';
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // Set up Zod type provider compilers
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.register(helmet, { global: true });

  const ALLOWED_ORIGINS = [
    'https://meraki-public.web.app',
    'https://meraki-public.firebaseapp.com'
  ];

  fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests without origin (curl, server-to-server, healthchecks)
      if (!origin) {
        cb(null, true);
        return;
      }
      if (
        ALLOWED_ORIGINS.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Load all plugins defined in plugins
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  });

  // Load all routes defined in routes
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  });

  // Expose routes under /api for reverse proxy compatibility (Firebase Hosting /api/** rewrite)
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: { ...opts, prefix: '/api' }
  });
};

export default app;
export { app, options };
