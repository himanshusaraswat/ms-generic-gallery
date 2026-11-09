import { z } from 'zod';

export const HealthcheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']).describe('Overall service health status'),
  root: z.boolean().describe('Root healthcheck boolean indicator'),
  service: z.literal('ms-generic-gallery').optional().describe('Service identifier'),
  database: z.object({
    status: z.string().describe('Database status (connected, mock-dev, unhealthy)'),
    cluster: z.string().describe('Database cluster host'),
    name: z.string().describe('Database name')
  }),
  uptime: z.number().describe('Node.js process uptime in seconds'),
  timestamp: z.string().describe('Current server ISO timestamp')
});

export type HealthcheckResponse = z.infer<typeof HealthcheckResponseSchema>;
