import { z } from "zod";

export function parseJson<T>(value: string, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(value));
}

export function stringifyJson<T>(value: T): string {
  return JSON.stringify(value);
}

export const stringArraySchema = z.array(z.string().min(1)).default([]);
