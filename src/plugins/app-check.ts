import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';

export interface AppCheckPluginOptions {
  enforce?: boolean;
}

const appCheckPlugin: FastifyPluginAsync<AppCheckPluginOptions> = async (fastify, opts) => {
  // Initialize Admin SDK with default Google Application Credentials (automatic on Cloud Run)
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GCP_PROJECT_ID || 'meraki-public'
    });
  }

  const isEnforced = process.env.APP_CHECK_ENFORCE === 'true' || opts.enforce === true;

  fastify.addHook('onRequest', async (req, reply) => {
    const url = req.url.split('?')[0];

    // Always bypass health checks, root status, and documentation endpoints
    const bypassPaths = [
      '/',
      '/api',
      '/api/',
      '/health',
      '/api/health',
      '/documentation',
      '/api/documentation',
      '/documentation/json',
      '/api/documentation/json'
    ];

    if (bypassPaths.includes(url) || url.startsWith('/documentation/')) {
      return;
    }

    const appCheckToken = req.headers['x-firebase-appcheck'];

    if (!appCheckToken || typeof appCheckToken !== 'string') {
      req.log.warn({ url: req.url }, 'App Check Token missing');
      if (isEnforced) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Missing required App Check token.'
        });
      }
      return;
    }

    try {
      const claims = await getAppCheck().verifyToken(appCheckToken);
      req.log.info({ appId: claims.appId }, 'App Check token verified successfully');
    } catch (err) {
      req.log.warn({ err, url: req.url }, 'App Check token verification failed');
      if (isEnforced) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or expired App Check token.'
        });
      }
    }
  });
};

export default fp(appCheckPlugin, {
  name: 'app-check'
});
