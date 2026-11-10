import Fastify from 'fastify';
import app from './app';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

void server.register(app);

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

server.listen({ port, host }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  server.log.info(`Server listening at ${address}`);
});
