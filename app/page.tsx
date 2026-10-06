"use client";

import { useState } from "react";

type Brief = {
  recipient: string;
  interests: string;
  clues: string;
  budget: string;
  occasion: string;
};

type Product = {
  title: string;
  price: string;
  link: string;
  thumbnail: string;
  source: string;
};

type Idea = {
  title: string;
  category: string;
  why: string;
  personal_touch: string;
  search_query: string;
  products?: Product[];
};

export default function Home() {
  const [brief, setBrief] = useState<Brief>({
    recipient: "",
    interests: "",
    clues: "",
    budget: "",
    occasion: "",
  });
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [error, setError] = useState("");

  function update(field: keyof Brief, value: string) {
    setBrief((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSearch() {
    setLoading(true);
    setError("");
    setIdeas([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "حصل خطأ");
      setIdeas(data.ideas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حصل خطأ");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-400 bg-white p-3 text-black placeholder-gray-500 outline-none focus:border-purple-500";

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-3xl font-bold">🎁 Gift Hunter</h1>
      <p className="mb-6 text-gray-400">
        احكيلي عن الشخص، وأنا أطلعلك أفكار هدايا تناسبه.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block font-medium">الشخص</label>
          <input
            className={inputClass}
            placeholder="مثال: صديقي أحمد، 25 سنة"
            value={brief.recipient}
            onChange={(e) => update("recipient", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">الاهتمامات</label>
          <input
            className={inputClass}
            placeholder="مثال: برمجة، كورة، قهوة (افصل بينهم بفاصلة)"
            value={brief.interests}
            onChange={(e) => update("interests", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">تلميحات شخصية</label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="مثال: بيشتكي دايمًا إن كيبورده قديم"
            value={brief.clues}
            onChange={(e) => update("clues", e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block font-medium">الميزانية (دولار)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="100"
              value={brief.budget}
              onChange={(e) => update("budget", e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block font-medium">المناسبة</label>
            <input
              className={inputClass}
              placeholder="عيد ميلاد"
              value={brief.occasion}
              onChange={(e) => update("occasion", e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !brief.recipient || !brief.interests}
          className="w-full rounded-lg bg-purple-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "بدور..." : "ابحث عن هدايا"}
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-center text-gray-400">
          بفكر في أفكار تناسبه... ⏳
        </p>
      )}

      {error && <p className="mt-4 text-center text-red-500">{error}</p>}

      {ideas.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ideas.map((idea, i) => (
            <div key={i} className="rounded-xl border border-gray-600 p-4">
              <span className="mb-2 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                {idea.category}
              </span>
              <h3 className="mb-1 text-lg font-bold">{idea.title}</h3>
              <p className="mb-2 text-sm text-gray-300">{idea.why}</p>
              <p className="text-sm text-purple-400">✨ {idea.personal_touch}</p>

              {idea.products && idea.products.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-gray-600 pt-3">
                  {idea.products.map((p, j) => (
                    <a
                      key={j}
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-gray-800 p-2 hover:bg-gray-700"
                    >
                      {p.thumbnail && (
                        <div
                          style={{ width: 56, height: 56, flexShrink: 0 }}
                          className="overflow-hidden rounded bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.thumbnail}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="truncate text-sm">{p.title}</p>
                        <p className="text-xs text-gray-400">
                          {p.price} · {p.source}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}