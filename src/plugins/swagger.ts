import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Generic Gallery Microservice API',
        description:
          'High-performance Fastify + Node 24 + MongoDB microservice for multimedia galleries, superhero archives, sports headshots, and guessing games.',
        version: '1.0.0',
        contact: {
          name: 'Himanshu Saraswat',
          url: 'https://github.com/himanshusaraswat'
        }
      },
      servers: [{ url: 'http://localhost:3000', description: 'Local Development Server' }],
      tags: [
        {
          name: 'Gallery',
          description: 'Generic multimedia gallery endpoints (Marvel, NFL, Custom)'
        },
        { name: 'Healthcheck', description: 'System health monitoring' }
      ]
    },
    transform: jsonSchemaTransform
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
