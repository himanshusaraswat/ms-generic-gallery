import Fastify, { FastifyInstance } from 'fastify';
import appPlugin from '../../src/app';

export interface MockItem {
  _id: string;
  Name: string;
  [key: string]: any;
}

export function createMockMongo(seedData: Record<string, MockItem[]> = {}) {
  const store = { ...seedData };

  return {
    db: {
      collection: (name: string) => {
        const items = store[name] || [];
        return {
          countDocuments: async (query?: any) => {
            if (!query) return items.length;
            if (query.$or) {
              return items.filter((item) => {
                const name = item.Name || item.name || '';
                return query.$or.some((clause: any) => {
                  const pattern = clause.Name || clause.name;
                  return pattern ? pattern.test(name) : false;
                });
              }).length;
            }
            return items.length;
          },
          aggregate: (pipeline?: any[]) => ({
            toArray: async () => {
              if (!items.length) return [];
              const rand = items[Math.floor(Math.random() * items.length)];
              return [rand];
            }
          }),
          find: (query?: any) => {
            const getFiltered = () => {
              let filtered = items;
              if (query && query.$or) {
                filtered = items.filter((item) => {
                  const name = item.Name || item.name || '';
                  return query.$or.some((clause: any) => {
                    const pattern = clause.Name || clause.name;
                    return pattern ? pattern.test(name) : false;
                  });
                });
              }
              return filtered;
            };
            return {
              toArray: async () => getFiltered(),
              skip: (offset: number) => ({
                limit: (limit: number) => ({
                  toArray: async () => getFiltered().slice(offset, offset + limit)
                })
              })
            };
          },
          findOne: async (query: any) => {
            if (query._id) {
              const idStr = query._id.toString();
              return items.find((item) => item._id === idStr) || null;
            }
            if (query.id) {
              return items.find((item) => item.id === query.id || item._id === query.id) || null;
            }
            return items[0] || null;
          }
        };
      }
    }
  };
}

export async function buildApp(mockData?: Record<string, MockItem[]>): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  if (mockData) {
    (app as any).decorate('mongo', createMockMongo(mockData));
  }

  await app.register(appPlugin);
  await app.ready();
  return app;
}
