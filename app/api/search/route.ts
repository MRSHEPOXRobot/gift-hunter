import { NextResponse } from "next/server";
import { z } from "zod";
import { planGifts } from "@/lib/planner";
import { findProducts } from "@/lib/shopping";

const BriefSchema = z.object({
  recipient: z.string().min(1),
  interests: z.string().min(1),
  clues: z.string().optional().default(""),
  budget: z.string().optional().default(""),
  occasion: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const brief = BriefSchema.parse(body);

    console.log("Received brief:", brief);

    const ideas = await planGifts(brief);
    const budget = brief.budget ? Number(brief.budget) : null;
    const results = await findProducts(
      ideas,
      Number.isFinite(budget) ? budget : null,
      brief.interests
    );
    return NextResponse.json({ ok: true, ideas: results });
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "بيانات ناقصة أو غلط" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "حصل خطأ في السيرفر" },
      { status: 500 }
    );
  }
}