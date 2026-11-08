import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { ObjectId } from "@fastify/mongodb";

interface Records {
  items: any[];
  count: number;
}

const nfl: FastifyPluginAsync = async (fastify: any): Promise<void> => {
  fastify.register(require("fastify-pagination"));

  fastify.get("/headshots", async function (request: any, reply: any) {
    const { limit, offset } = request.parsePagination();
    const { items, count } = await getItemsAndTotalCountWithPagination(fastify, limit, offset);
    reply.sendWithPagination({ count, page: items });
  });

  fastify.get("/headshots/gameResult", async function (request: FastifyRequest, reply: FastifyReply) {
    const { name, id }: any = request.query;
    if (!id || !name) {
      return reply.code(400).send({ error: "Both id and name are required" });
    }
    const result = await findById(fastify, id);
    if (!result || !result.Name) {
      return reply.code(404).send({ error: "Player not found", match: false });
    }
    return reply.send(result.Name.trim().toLowerCase() === name.trim().toLowerCase());
  });
};

const getItemsAndTotalCountWithPagination = async (
  fastify: any,
  limit: number,
  offset: number
): Promise<Records> => {
  const totalCount = await fastify.mongo.db.collection("nfl-headshot").countDocuments();
  const result = await fastify.mongo.db
    .collection("nfl-headshot")
    .find()
    .skip(offset)
    .limit(limit)
    .toArray();

  return {
    items: result,
    count: totalCount,
  };
};

const findById = async (fastify: any, id: string) => {
  try {
    const query = ObjectId.isValid(id) && id.length === 24 ? { _id: new ObjectId(id) } : { id };
    const item = await fastify.mongo.db.collection("nfl-headshot").findOne(query);
    if (item) return item;
    return await fastify.mongo.db.collection("nfl-headshot").findOne({ _id: id });
  } catch {
    return null;
  }
};

export default nfl;
