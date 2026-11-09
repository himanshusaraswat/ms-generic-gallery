import { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ObjectId } from '@fastify/mongodb';
import {
  CategoryParamSchema,
  PaginationQuerySchema,
  PaginatedGalleryResponseSchema,
  VerifyQuerySchema,
  VerifyResponseSchema,
  VerifyNotFoundResponseSchema,
  SearchQuerySchema,
  NotFoundResponseSchema
} from '../../schemas/gallery.schema';
import { GalleryItemSchema, ErrorResponseSchema } from '../../schemas/common.schema';

interface Records {
  items: any[];
  count: number;
}

const gallery: FastifyPluginAsync = async (fastify: FastifyInstance): Promise<void> => {
  fastify.register(require('fastify-pagination'));

  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. Get paginated items for any category (e.g. /gallery/nfl, /gallery/marvel)
  typedFastify.get(
    '/:category',
    {
      schema: {
        description: 'Fetch paginated gallery items for any category (e.g. marvel, nfl)',
        tags: ['Gallery'],
        params: CategoryParamSchema,
        querystring: PaginationQuerySchema,
        response: {
          200: PaginatedGalleryResponseSchema,
          400: ErrorResponseSchema
        }
      }
    },
    async function (request, reply) {
      const { category } = request.params;
      const collectionName = resolveCollection(category);
      const limit = Number(request.query.limit) || 10;
      const offset = Number(request.query.offset) || 0;
      const { items, count } = await getItemsAndTotalCount(fastify, collectionName, limit, offset);

      const formatted = items.map((item: any) => formatGalleryItem(item));

      const next =
        offset + limit < count
          ? `/gallery/${category}?limit=${limit}&offset=${offset + limit}`
          : null;
      const previous =
        offset > 0
          ? `/gallery/${category}?limit=${limit}&offset=${Math.max(0, offset - limit)}`
          : null;

      return reply.send({
        count,
        next,
        previous,
        results: formatted,
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
  typedFastify.get(
    '/:category/random',
    {
      schema: {
        description: 'Get a single random item from category for guessing game / trivia mode',
        tags: ['Gallery'],
        params: CategoryParamSchema,
        response: {
          200: GalleryItemSchema,
          400: ErrorResponseSchema,
          404: NotFoundResponseSchema
        }
      }
    },
    async function (request, reply) {
      const { category } = request.params;
      const collectionName = resolveCollection(category);
      const collection = (fastify as any).mongo.db.collection(collectionName);

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

      return reply.send(formatGalleryItem(item, category));
    }
  );

  // 3. Verify guess for any item (checks superhero/player name and alter ego)
  typedFastify.get(
    '/:category/verify',
    {
      schema: {
        description:
          'Verify a player or superhero guess by ID and name/alter-ego (case-insensitive)',
        tags: ['Gallery'],
        params: CategoryParamSchema,
        querystring: VerifyQuerySchema,
        response: {
          200: VerifyResponseSchema,
          400: ErrorResponseSchema,
          404: VerifyNotFoundResponseSchema
        }
      }
    },
    async function (request, reply) {
      const { category } = request.params;
      const { id, name } = request.query;

      const collectionName = resolveCollection(category);
      const item = await findById(fastify, collectionName, id);

      if (!item) {
        return reply.code(404).send({ error: 'Item not found', match: false });
      }

      const itemName = (item.Name || item.name || '').trim().toLowerCase();
      const alterEgo = (item.alterEgo || '').trim().toLowerCase();
      const guess = name.trim().toLowerCase();

      const isMatch = itemName === guess || (alterEgo && alterEgo === guess);
      return reply.send(Boolean(isMatch));
    }
  );

  // 4. Search items by keyword in category
  typedFastify.get(
    '/:category/search',
    {
      schema: {
        description: 'Search items in a gallery category by name keyword',
        tags: ['Gallery'],
        params: CategoryParamSchema,
        querystring: SearchQuerySchema,
        response: {
          200: PaginatedGalleryResponseSchema,
          400: ErrorResponseSchema
        }
      }
    },
    async function (request, reply) {
      const { category } = request.params;
      const { q } = request.query;
      const limit = Number(request.query.limit) || 10;
      const offset = Number(request.query.offset) || 0;

      const collectionName = resolveCollection(category);
      const safeKeyword = escapeRegex(q);
      const regex = new RegExp(safeKeyword, 'i');
      const query = { $or: [{ Name: regex }, { name: regex }] };

      const collection = (fastify as any).mongo.db.collection(collectionName);
      const count = await collection.countDocuments(query);
      const items = await collection.find(query).skip(offset).limit(limit).toArray();

      const formatted = items.map((item: any) => formatGalleryItem(item));

      const next =
        offset + limit < count
          ? `/gallery/${category}?limit=${limit}&offset=${offset + limit}`
          : null;
      const previous =
        offset > 0
          ? `/gallery/${category}?limit=${limit}&offset=${Math.max(0, offset - limit)}`
          : null;

      return reply.send({
        count,
        next,
        previous,
        results: formatted,
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
  const normalized = (category || '').toLowerCase();
  if (normalized === 'nfl' || normalized === 'headshots') {
    return 'nfl-headshot';
  }
  return normalized;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatGalleryItem(item: any, fallbackCategory?: string) {
  const image =
    item.image ||
    (item.thumbnail?.path ? `${item.thumbnail.path}.${item.thumbnail.extension || 'jpg'}` : '');
  const name = item.name || item.Name || '';
  return {
    id: item.id || item._id?.toString() || '',
    name,
    Name: name,
    image,
    thumbnail: item.thumbnail || {
      path: image ? image.replace(/\.[^/.]+$/, '') : '',
      extension: image ? image.split('.').pop() || 'jpg' : 'jpg'
    },
    team: item.team || item.Team || undefined,
    category: item.category || fallbackCategory || undefined,
    alterEgo: item.alterEgo || undefined
  };
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
