import { PlanSchema, type Idea } from "./schema";

export type Brief = {
    recipient: string;
    interests: string;
    clues: string;
    budget: string;
    occasion: string;
};

const MODEL = "gemini-flash-lite-latest";

async function callModel(prompt: string, model = MODEL): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;

    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                },
            }),
        });

        if (res.ok) {
            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts ?? [];
            return parts
                .filter((p: { thought?: boolean }) => !p.thought)
                .map((p: { text?: string }) => p.text ?? "")
                .join("");
        }

        lastError = `Model error ${res.status}: ${await res.text()}`;
        if (res.status !== 500 && res.status !== 503 && res.status !== 429) break;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    throw new Error(lastError);
}

function buildPrompt(b: Brief): string {
    return `You are a thoughtful gift-planning assistant.

Recipient: ${b.recipient}
Interests: ${b.interests}
Personal clues: ${b.clues || "none"}
Budget (USD): ${b.budget || "not specified"}
Occasion: ${b.occasion || "not specified"}

Generate EXACTLY 8 distinct gift ideas, each of a DIFFERENT kind
(tech, experience, handmade, book, subscription, food, accessory, hobby gear).
Keep every idea within the budget.
Keep "why" and "personal_touch" under 20 words each.
Write every idea in full. Never use "..." or placeholders, and never skip ideas.
Write "title", "why" and "personal_touch" in simple, correct Arabic (keep well-known book/product names in English). Keep "search_query" in English.
Use exactly the keys title, category, why, personal_touch, search_query, always in "key":"value" syntax.
"category" must be one of: tech, experience, handmade, book, subscription, food, accessory, hobby gear.

Return ONLY valid JSON, no markdown, no extra text.
Example of ONE idea object (you must output 8 of them in the "ideas" array):
{"title":"Custom mechanical keyboard","category":"tech","why":"He codes daily and a good keyboard improves comfort.","personal_touch":"Engrave his initials on a keycap.","search_query":"custom mechanical keyboard"}

Output format: {"ideas":[ <8 idea objects> ]}`;
}

function parsePlan(raw: string): Idea[] {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const json = cleaned.slice(start, end + 1);
    return PlanSchema.parse(JSON.parse(json)).ideas;
}

export async function planGifts(brief: Brief): Promise<Idea[]> {
    const prompt = buildPrompt(brief);
    const first = await callModel(prompt);
    console.log("RAW:", first);

    try {
        return parsePlan(first);
    } catch (err) {
        console.warn("Plan invalid, repairing:", String(err));
        const repair = await callModel(
            `${prompt}\n\nYour previous answer was invalid:\n${first}\n\nError: ${String(
                err
            )}\n\nReturn ONLY the corrected JSON.`
        );
        return parsePlan(repair);
    }
}

export async function pickBestProducts(
    idea: { title: string; why: string },
    titles: string[],
    interests: string
): Promise<number[]> {
    const list = titles.map((t, i) => `${i}: ${t}`).join("\n");
    const prompt = `Gift idea: ${idea.title} (${idea.why})
Recipient interests: ${interests}

Products:
${list}

Pick the 4 products that best fit the gift idea and the interests.
Return ONLY a JSON array of the product numbers, like [2,0,5,7].`;

    try {
        const raw = await callModel(prompt);
        console.log("PICK RAW:", idea.title, "→", raw);
        const match = raw.match(/\[[\d,\s]*\]/);
        if (!match) return [];
        const nums = JSON.parse(match[0]) as number[];
        return nums.filter(
            (n) => Number.isInteger(n) && n >= 0 && n < titles.length
        );
    } catch (e) {
        console.error("pickBestProducts failed:", e);
        return [];
    }
}