import type { Idea } from "./schema";
import { pickBestProducts } from "./planner";


export type Product = {
    title: string;
    price: string;
    extracted_price: number;
    link: string;
    thumbnail: string;
    source: string;
};

export type IdeaWithProducts = Idea & { products: Product[] };

type SerpResult = {
    title?: string;
    price?: string;
    extracted_price?: number;
    product_link?: string;
    link?: string;
    thumbnail?: string;
    source?: string;
};

// Cache في الذاكرة (بيتمسح لما السيرفر يعيد التشغيل)
const cache = new Map<string, { at: number; data: Product[] }>();
const TTL = 1000 * 60 * 60; // ساعة

async function searchShopping(query: string): Promise<Product[]> {
    const key = query.toLowerCase().trim();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) {
        console.log("CACHE HIT:", key);
        return hit.data;
    }

    const url =
        `https://serpapi.com/search.json?engine=google_shopping` +
        `&q=${encodeURIComponent(query)}` +
        `&gl=us&hl=en` +
        `&api_key=${process.env.SERPAPI_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`SerpApi error ${res.status}`);
    const data = await res.json();
    console.log(
        "SerpApi:",
        query,
        "→",
        data.shopping_results?.length ?? 0,
        "results",
        data.error ?? ""
    );

    const products: Product[] = ((data.shopping_results ?? []) as SerpResult[])
        .filter((r) => typeof r.extracted_price === "number")
        .map((r) => ({
            title: r.title ?? "",
            price: r.price ?? "",
            extracted_price: r.extracted_price as number,
            link: r.product_link ?? r.link ?? "",
            thumbnail: r.thumbnail ?? "",
            source: r.source ?? "",
        }));

    cache.set(key, { at: Date.now(), data: products });
    return products;
}

const PURCHASABLE = new Set([
    "tech",
    "book",
    "accessory",
    "hobby gear",
    "hobbies",
    "food",
    "handmade",
]);

export async function findProducts(
    ideas: Idea[],
    budget: number | null,
    interests: string
): Promise<IdeaWithProducts[]> {
    const purchasable = ideas.filter((i) =>
        PURCHASABLE.has(i.category.toLowerCase())
    );
    const top = purchasable.slice(0, 3);
    const rest = ideas.filter((i) => !top.includes(i));

    const withProducts = await Promise.all(
        top.map(async (idea) => {
            try {
                let results = await searchShopping(idea.search_query);

                if (budget !== null) {
                    results = results.filter((p) => p.extracted_price <= budget);
                }
                console.log(
                    "After budget filter:",
                    idea.search_query,
                    "→",
                    results.length
                );

                const candidates = results.slice(0, 10);
                const picks = await pickBestProducts(
                    idea,
                    candidates.map((p) => p.title),
                    interests
                );
                const chosen = picks.length
                    ? picks.map((i) => candidates[i])
                    : candidates.slice(0, 4);

                return { ...idea, products: chosen.slice(0, 4) };
            } catch (err) {
                console.error("Shopping search failed:", idea.search_query, err);
                return { ...idea, products: [] as Product[] };
            }
        })
    );

    return [
        ...withProducts,
        ...rest.map((i) => ({ ...i, products: [] as Product[] })),
    ];
}