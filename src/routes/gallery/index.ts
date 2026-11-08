import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { ObjectId } from "@fastify/mongodb";

interface Records {
  items: any[];
  count: number;
}

const gallery: FastifyPluginAsync = async (fastify: any): Promise<void> => {
  fastify.register(require("fastify-pagination"));

  // 1. Get paginated items for any category (e.g. /gallery/nfl, /gallery/marvel)
  fastify.get(
    "/:category",
    {
      schema: {
        description: "Fetch paginated gallery items for any category (e.g. marvel, nfl)",
        tags: ["Gallery"],
        params: {
          type: "object",
          properties: {
            category: { type: "string", description: "Gallery category name (e.g. marvel, nfl)" }
          },
          required: ["category"]
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 10, description: "Number of items per page" },
            offset: { type: "integer", default: 0, description: "Number of items to skip" }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              count: { type: "number" },
              next: { type: "string", nullable: true },
              previous: { type: "string", nullable: true },
              results: { type: "array", items: { type: "object", additionalProperties: true } },
              data: { type: "object", additionalProperties: true }
            }
          }
        }
      }
    },
    async function (request: any, reply: any) {
      const { category } = request.params;
      const collectionName = resolveCollection(category);
      const { limit, offset } = request.parsePagination();
      const { items, count } = await getItemsAndTotalCount(fastify, collectionName, limit, offset);

      const formatted = items.map((item: any) => ({
        ...item,
        id: item.id || item._id?.toString(),
        name: item.name || item.Name || '',
        image: item.image || (item.thumbnail?.path ? `${item.thumbnail.path}.${item.thumbnail.extension || 'jpg'}` : ''),
        thumbnail: item.thumbnail || {
          path: item.image ? item.image.replace(/\.[^/.]+$/, '') : '',
          extension: item.image ? item.image.split('.').pop() || 'jpg' : 'jpg'
        }
      }));

      reply.sendWithPagination({
        count,
        page: formatted,
        data: {
          offset,
          limit,
          total: count,
          count: formatted.length,
          results: formatted
        }
      });
    }
  );

  // 2. Get a single random item for guessing games & trivia mode
  fastify.get(
    "/:category/random",
    {
      schema: {
        description: "Get a single random item from category for guessing game / trivia mode",
        tags: ["Gallery"],
        params: {
          type: "object",
          properties: {
            category: { type: "string", description: "Gallery category (e.g. marvel, nfl)" }
          },
          required: ["category"]
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              image: { type: "string" },
              thumbnail: { type: "object", additionalProperties: true },
              team: { type: "string" },
              category: { type: "string" },
              alterEgo: { type: "string" }
            }
          },
          404: { type: "object", properties: { error: { type: "string" } } }
        }
      }
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { category } = request.params as any;
      const collectionName = resolveCollection(category);
      const collection = fastify.mongo.db.collection(collectionName);

      let item: any = null;
      if (typeof collection.aggregate === 'function') {
        const samples = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();
        item = samples[0];
      } else {
        const all = await collection.find().toArray();
        if (all && all.length > 0) {
          item = all[Math.floor(Math.random() * all.length)];
        }
      }

      if (!item) {
        return reply.code(404).send({ error: `No items found in category '${category}'` });
      }

      return reply.send({
        id: item.id || item._id?.toString(),
        name: item.name || item.Name || '',
        image: item.image || (item.thumbnail?.path ? `${item.thumbnail.path}.${item.thumbnail.extension || 'jpg'}` : ''),
        thumbnail: item.thumbnail || {
          path: item.image ? item.image.replace(/\.[^/.]+$/, '') : '',
          extension: item.image ? item.image.split('.').pop() || 'jpg' : 'jpg'
        },
        team: item.team || item.Team || '',
        category,
        alterEgo: item.alterEgo || ''
      });
    }
  );

  // 3. Verify guess for any item (checks superhero/player name and alter ego)
  fastify.get(
    "/:category/verify",
    {
      schema: {
        description: "Verify a player or superhero guess by ID and name/alter-ego (case-insensitive)",
        tags: ["Gallery"],
        params: {
          type: "object",
          properties: {
            category: { type: "string", description: "Gallery category" }
          },
          required: ["category"]
        },
        querystring: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique item ID" },
            name: { type: "string", description: "Guessed character / player name or alter ego" }
          },
          required: ["id", "name"]
        },
        response: {
          200: { type: "boolean", description: "True if guess matches character name or alter-ego" },
          400: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" }, match: { type: "boolean" } } }
        }
      }
    },
    async function (request: FastifyRequest, reply: FastifyReply) {
      const { category } = request.params as any;
      const { name, id } = request.query as any;

      if (!id || !name) {
        return reply.code(400).send({ error: "Both id and name are required" });
      }

      const collectionName = resolveCollection(category);
      const item = await findById(fastify, collectionName, id);

      if (!item) {
        return reply.code(404).send({ error: "Item not found", match: false });
      }

      const itemName = (item.Name || item.name || "").trim().toLowerCase();
      const alterEgo = (item.alterEgo || "").trim().toLowerCase();
      const guess = name.trim().toLowerCase();
      
      const isMatch = itemName === guess || (alterEgo && alterEgo === guess);
      return reply.type('application/json').send(JSON.stringify(Boolean(isMatch)));
    }
  );

  // 4. Search items by keyword in category
  fastify.get(
    "/:category/search",
    {
      schema: {
        description: "Search items in a gallery category by name keyword",
        tags: ["Gallery"],
        params: {
          type: "object",
          properties: {
            category: { type: "string", description: "Gallery category" }
          },
          required: ["category"]
        },
        querystring: {
          type: "object",
          properties: {
            q: { type: "string", description: "Search query text" },
            limit: { type: "integer", default: 10 },
            offset: { type: "integer", default: 0 }
          },
          required: ["q"]
        }
      }
    },
    async function (request: any, reply: any) {
      const { category } = request.params;
      const { q } = request.query;
      if (!q) {
        return reply.code(400).send({ error: "Query parameter 'q' is required" });
      }

      const collectionName = resolveCollection(category);
      const { limit, offset } = request.parsePagination();
      const regex = new RegExp(q, "i");
      const query = { $or: [{ Name: regex }, { name: regex }] };

      const collection = fastify.mongo.db.collection(collectionName);
      const count = await collection.countDocuments(query);
      const items = await collection.find(query).skip(offset).limit(limit).toArray();

      const formatted = items.map((item: any) => ({
        ...item,
        id: item.id || item._id?.toString(),
        name: item.name || item.Name || '',
        image: item.image || (item.thumbnail?.path ? `${item.thumbnail.path}.${item.thumbnail.extension || 'jpg'}` : ''),
        thumbnail: item.thumbnail || {
          path: item.image ? item.image.replace(/\.[^/.]+$/, '') : '',
          extension: item.image ? item.image.split('.').pop() || 'jpg' : 'jpg'
        }
      }));

      reply.sendWithPagination({
        count,
        page: formatted,
        data: {
          offset,
          limit,
          total: count,
          count: formatted.length,
          results: formatted
        }
      });
    }
  );
};

function resolveCollection(category: string): string {
  const normalized = (category || "").toLowerCase();
  if (normalized === "nfl" || normalized === "headshots") {
    return "nfl-headshot";
  }
  return normalized;
}

async function getItemsAndTotalCount(
  fastify: any,
  collectionName: string,
  limit: number,
  offset: number
): Promise<Records> {
  const collection = fastify.mongo.db.collection(collectionName);
  const totalCount = await collection.countDocuments();
  const items = await collection.find().skip(offset).limit(limit).toArray();
  return { items, count: totalCount };
}

async function findById(fastify: any, collectionName: string, id: string) {
  try {
    const query = ObjectId.isValid(id) && id.length === 24 ? { _id: new ObjectId(id) } : { id };
    const item = await fastify.mongo.db.collection(collectionName).findOne(query);
    if (item) return item;
    return await fastify.mongo.db.collection(collectionName).findOne({ _id: id });
  } catch {
    return null;
  }
}

export default gallery;
