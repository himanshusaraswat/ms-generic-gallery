import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Generic Gallery Microservice API',
        description: 'High-performance Fastify 5 + Node 22 + MongoDB microservice for multimedia galleries, superhero archives, sports headshots, and guessing games.',
        version: '1.0.0',
        contact: {
          name: 'Himanshu Saraswat',
          url: 'https://github.com/himanshusaraswat'
        }
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local Development Server' }
      ],
      tags: [
        { name: 'Gallery', description: 'Generic multimedia gallery endpoints (Marvel, NFL, etc.)' },
        { name: 'NFL Headshots', description: 'Backward-compatible NFL fan club endpoints' },
        { name: 'Healthcheck', description: 'System health monitoring' }
      ]
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
});
