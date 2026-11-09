import { z } from 'zod';

// Standard Error Envelope
export const ErrorResponseSchema = z.object({
  statusCode: z.number().int().describe('HTTP status code'),
  error: z.string().describe('Error name (e.g. Bad Request, Not Found)'),
  message: z.string().describe('Human-readable error description'),
  issues: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
        code: z.string()
      })
    )
    .optional()
    .describe('Field-level validation issues')
});

// Normalized Media Thumbnail
export const ThumbnailSchema = z.object({
  path: z.string().describe('Base image URI path without extension'),
  extension: z.string().describe('Image file extension (jpg, png, webp)')
});

// Normalized Media Item Schema
export const GalleryItemSchema = z.object({
  id: z.string().describe('Unique identifier'),
  name: z.string().describe('Display name of hero or player'),
  Name: z.string().optional().describe('Legacy capitalized Name property'),
  image: z.string().describe('Direct HD image URL'),
  thumbnail: ThumbnailSchema.describe('Structured thumbnail object'),
  alterEgo: z.string().optional().describe('Character alter ego or real name (e.g. Tony Stark)'),
  team: z.string().optional().describe('NFL Team name'),
  category: z.string().optional().describe('Collection category name')
});

export type GalleryItem = z.infer<typeof GalleryItemSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
