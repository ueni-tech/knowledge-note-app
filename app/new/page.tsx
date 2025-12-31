"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

async function createNote(title: string, body: string): Promise<void> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "作成に失敗しました");
  }
}

export default function Page() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createNote(title, body);
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>新規メモ</h1>
      <div style={{ margin: "12px 0" }}>
        <Link href="/">← 一覧に戻る</Link>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label>
          タイトル
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="100文字以内"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }} />
        </label>

        <label>
          本文
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="2000文字以内"
            rows={8}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        {error ? <p style={{color: "crimson"}}>{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "作成中..." : "作成"}
        </button>
      </form>
    </main>
  )
}