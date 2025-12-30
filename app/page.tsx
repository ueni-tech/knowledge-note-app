"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

async function fetchNotes(q: string): Promise<NoteDto[]> {
  const params = new URLSearchParams();
  if (q.trim().length > 0) params.set("q", q);

  const qs = params.toString();
  const url = qs.length > 0 ? `/api/notes?${qs}` : "/api/notes";

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("ノートの取得に失敗しました");
  return (await res.json()) as NoteDto[];
}

export default function Page() {
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(() => {
    const trimmed = q.trim();
    if (trimmed.length === 0) return "一覧を表示中";
    if (trimmed.length < 2) return "検索は2文字以上で有効";
    return `検索中: "${trimmed}"`;
  }, [q]);

  async function load(nextQ: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotes(nextQ);
      setNotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("")
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <h1>Knowladge Note</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/new">+ 新規メモを作成</Link>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>検索</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(q);
          }}
          style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="タイトル/本文を部分一致検索（2文字以上）"
            style={{ width: 360, padding: 8 }}
          />
          <button type="submit" disabled={loading}>
            検索
          </button>
          <button
            type="button"
            onClick={() => {
              setQ("");
              void load("");
            }}
            disabled={loading}
          >
            クリア
          </button>
        </form>
        <p style={{ color: "#555", marginTop: 8 }}>{hint}</p>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>一覧</h2>
        {loading ? <p>読み込み中...</p> : null}
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

        {notes.length === 0 ? (
          <p>まだメモがありません</p>
        ) : (
          <ul>
            {notes.map((n) => (
              <li key={n.id}>
                <strong>{n.title}</strong>
                <div style={{ color: "#555", fontSize: 12 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}