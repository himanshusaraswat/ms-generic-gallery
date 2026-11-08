import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { ObjectId } from "@fastify/mongodb";

interface Records {
  items: any[];
  count: number;
}

const gallery: FastifyPluginAsync = async (fastify: any): Promise<void> => {
  fastify.register(require("fastify-pagination"));

  // 1. Get paginated items for any category (e.g. /gallery/nfl, /gallery/marvel)
  fastify.get("/:category", async function (request: any, reply: any) {
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
  });

  // 2. Verify guess for any item
  fastify.get("/:category/verify", async function (request: FastifyRequest, reply: FastifyReply) {
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
    const guess = name.trim().toLowerCase();
    return reply.send(itemName === guess);
  });

  // 3. Search items by keyword in category
  fastify.get("/:category/search", async function (request: any, reply: any) {
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
  });
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
