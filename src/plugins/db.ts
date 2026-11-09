import fp from 'fastify-plugin';
import { fastifyMongodb, FastifyMongodbOptions } from '@fastify/mongodb';
import { MongoClient } from 'mongodb';

const sampleMockData: Record<string, any[]> = {
  'nfl-headshot': [
    {
      _id: '659a11111111111111111101',
      id: '659a11111111111111111101',
      Name: 'Patrick Mahomes',
      team: 'KC',
      position: 'QB',
      image: 'https://static.www.nfl.com/image/private/f_auto/league/vs40h82nvqaqvyephwwu'
    },
    {
      _id: '659a11111111111111111102',
      id: '659a11111111111111111102',
      Name: 'Travis Kelce',
      team: 'KC',
      position: 'TE',
      image: 'https://static.www.nfl.com/image/private/f_auto/league/pm5r4z2m32e9qg21r9f8'
    },
    {
      _id: '659a11111111111111111103',
      id: '659a11111111111111111103',
      Name: 'Lamar Jackson',
      team: 'BAL',
      position: 'QB',
      image: 'https://static.www.nfl.com/image/private/f_auto/league/gfm0bkj8n5hcmecrvsfs'
    }
  ],
  marvel: [
    {
      _id: '659a22222222222222222201',
      id: '659a22222222222222222201',
      Name: 'Iron Man',
      team: 'Avengers',
      alterEgo: 'Tony Stark'
    },
    {
      _id: '659a22222222222222222202',
      id: '659a22222222222222222202',
      Name: 'Captain America',
      team: 'Avengers',
      alterEgo: 'Steve Rogers'
    },
    {
      _id: '659a22222222222222222203',
      id: '659a22222222222222222203',
      Name: 'Thor',
      team: 'Avengers',
      alterEgo: 'Thor Odinson'
    }
  ]
};

function setupMockStore(fastify: any) {
  const mockStore: Record<string, any[]> = { ...sampleMockData };
  (fastify as any).decorate('mongo', {
    db: {
      collection: (name: string) => {
        const items = mockStore[name] || [];
        return {
          countDocuments: async (query?: any) => {
            if (!query || !query.$or) return items.length;
            return items.filter((item) => {
              const n = item.Name || item.name || '';
              return query.$or.some((c: any) => {
                const pattern = c.Name || c.name;
                return pattern ? pattern.test(n) : false;
              });
            }).length;
          },
          find: (query?: any) => ({
            skip: (offset: number) => ({
              limit: (limit: number) => ({
                toArray: async () => {
                  let filtered = items;
                  if (query && query.$or) {
                    filtered = items.filter((item) => {
                      const n = item.Name || item.name || '';
                      return query.$or.some((c: any) => {
                        const pattern = c.Name || c.name;
                        return pattern ? pattern.test(n) : false;
                      });
                    });
                  }
                  return filtered.slice(offset, offset + limit);
                }
              })
            })
          }),
          findOne: async (query: any) => {
            const target = query._id?.toString() || query.id;
            return items.find((item) => item._id === target || item.id === target) || null;
          }
        };
      }
    }
  });
}

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
    fastify.log.warn(
      'MongoDB credentials not configured. Initializing in-memory mock store for local dev.'
    );
    setupMockStore(fastify);
    return;
  }

  const connectionUrl =
    uri ||
    `mongodb+srv://${encodeURIComponent(user!)}:${encodeURIComponent(pass!)}@${dbHost}/?retryWrites=true&w=majority`;

  const client = new MongoClient(connectionUrl, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    await fastify.register(fastifyMongodb, {
      client,
      database: dbName
    });
    fastify.log.info(`Connected to MongoDB database '${dbName}'.`);
  } catch (err: any) {
    fastify.log.warn(`Could not connect to MongoDB at ${dbHost || uri}: ${err.message}`);
    fastify.log.warn('Falling back to in-memory mock dev store for local development.');
    setupMockStore(fastify);
  }
});
