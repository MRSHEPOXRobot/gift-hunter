import { z } from "zod";

export const IdeaSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  why: z.string().min(1),
  personal_touch: z.string().min(1),
  search_query: z.string().min(1),
});

export const PlanSchema = z.object({
  ideas: z.array(IdeaSchema).length(8),
});

export type Idea = z.infer<typeof IdeaSchema>;