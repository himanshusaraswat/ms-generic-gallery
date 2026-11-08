import { z } from "zod";
import { GalleryItemSchema } from "./common.schema";

// 1. Category Path Parameter with security guard against NoSQL injection & path traversal
export const CategoryParamSchema = z.object({
  category: z
    .string()
    .min(1, "Category cannot be empty")
    .max(50, "Category too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Category must be alphanumeric (letters, numbers, hyphens, underscores)")
    .trim()
    .toLowerCase()
    .describe("Gallery category name (e.g. marvel, nfl)"),
});

// 2. Pagination Query Parameters with strict boundary guards
export const PaginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10)
    .describe("Number of items per page (1-100)"),
  offset: z.coerce
    .number()
    .int()
    .min(0, "Offset must be non-negative")
    .default(0)
    .describe("Number of items to skip"),
});

// 3. Paginated Gallery Response Envelope (dual envelope for standard REST + Angular Signals)
export const PaginatedGalleryResponseSchema = z.object({
  count: z.number().int().describe("Total number of records in collection"),
  next: z.string().nullable().describe("URL link for the next page"),
  previous: z.string().nullable().describe("URL link for the previous page"),
  results: z.array(GalleryItemSchema).describe("Standard array of gallery cards"),
  data: z
    .object({
      offset: z.number().int().describe("Current page offset"),
      limit: z.number().int().describe("Items limit per page"),
      total: z.number().int().describe("Total count across entire collection"),
      count: z.number().int().describe("Count of items in current page payload"),
      results: z.array(GalleryItemSchema).describe("Array for Angular Signals compatibility"),
    })
    .describe("Angular Signals compatibility envelope"),
});

// 4. Verification Query Parameters (Play / Guessing Trivia mode)
export const VerifyQuerySchema = z.object({
  id: z.string().min(1, "Item ID is required").max(100).describe("Unique item ID"),
  name: z.string().min(1, "Guess name is required").max(100).trim().describe("Guessed superhero or player name"),
});

// 5. Verification Response Contracts
export const VerifyResponseSchema = z.boolean().describe("True if guess matches character name or alter-ego");

export const VerifyNotFoundResponseSchema = z.object({
  error: z.string(),
  match: z.literal(false),
});

// 6. Keyword Search Query Parameters
export const SearchQuerySchema = z.object({
  q: z.string().min(1, "Search keyword cannot be empty").max(100, "Search keyword too long").trim().describe("Search keyword query"),
  limit: z.coerce.number().int().min(1).max(100).default(10).describe("Items per page"),
  offset: z.coerce.number().int().min(0).default(0).describe("Items to skip"),
});

// 7. Generic Not Found Schema
export const NotFoundResponseSchema = z.object({
  error: z.string().describe("Error message indicating empty collection or missing item"),
});

export type CategoryParam = z.infer<typeof CategoryParamSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginatedGalleryResponse = z.infer<typeof PaginatedGalleryResponseSchema>;
export type VerifyQuery = z.infer<typeof VerifyQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
