import fp from 'fastify-plugin';
import { fastifyMongodb, FastifyMongodbOptions } from '@fastify/mongodb';

export default fp<FastifyMongodbOptions>(async (fastify) => {
  if (fastify.hasDecorator('mongo')) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  const dbHost = process.env.DB_HOST;
  const dbName = process.env.DB_NAME || 'generic-gallery';

  if (!uri && (!user || !pass || !dbHost)) {
    fastify.log.warn('MongoDB credentials not provided in environment. Database connection skipped.');
    return;
  }

  const connectionUrl = uri || `mongodb+srv://${encodeURIComponent(user!)}:${encodeURIComponent(pass!)}@${dbHost}/?retryWrites=true&w=majority`;

  fastify.register(fastifyMongodb, {
    url: connectionUrl,
    forceClose: true,
    database: dbName,
  });
});
