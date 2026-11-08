import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify: any, opts): Promise<void> => {
  fastify.get(
    '/',
    {
      schema: {
        description: 'System healthcheck and live MongoDB connectivity probe',
        tags: ['Healthcheck'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              root: { type: 'boolean' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  cluster: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async function (request: any, reply: any) {
      let dbStatus = 'disconnected';
      const dbHost = process.env.DB_HOST || 'local/in-memory';
      const dbName = process.env.DB_NAME || 'generic-gallery';

      if (fastify.mongo?.db) {
        try {
          if (typeof fastify.mongo.db.command === 'function') {
            await fastify.mongo.db.command({ ping: 1 });
            dbStatus = 'connected';
          } else {
            dbStatus = 'mock-dev';
          }
        } catch {
          dbStatus = 'unhealthy';
        }
      }

      return {
        status: dbStatus === 'connected' || dbStatus === 'mock-dev' ? 'ok' : 'degraded',
        root: true,
        uptime: Math.round(process.uptime() * 100) / 100,
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          cluster: dbHost,
          name: dbName
        }
      };
    }
  );
};

export default root;
