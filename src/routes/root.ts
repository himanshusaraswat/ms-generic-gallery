import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { HealthcheckResponseSchema } from '../schemas/root.schema';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        description: 'System healthcheck and live MongoDB connectivity probe',
        tags: ['Healthcheck'],
        response: {
          200: HealthcheckResponseSchema,
        },
      },
    },
    async function (request, reply) {
      let dbStatus = 'disconnected';
      const dbHost = process.env.DB_HOST || 'local/in-memory';
      const dbName = process.env.DB_NAME || 'generic-gallery';

      if ((fastify as any).mongo?.db) {
        try {
          if (typeof (fastify as any).mongo.db.command === 'function') {
            await (fastify as any).mongo.db.command({ ping: 1 });
            dbStatus = 'connected';
          } else {
            dbStatus = 'mock-dev';
          }
        } catch {
          dbStatus = 'unhealthy';
        }
      }

      const overallStatus: 'ok' | 'degraded' =
        dbStatus === 'connected' || dbStatus === 'mock-dev' ? 'ok' : 'degraded';

      return {
        status: overallStatus,
        root: true,
        service: 'ms-generic-gallery' as const,
        uptime: Math.round(process.uptime() * 100) / 100,
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          cluster: dbHost,
          name: dbName,
        },
      };
    }
  );
};

export default root;
