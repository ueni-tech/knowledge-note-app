# Day2：InMemoryNoteRepository + Route Handler(/api/notes) + UI（一覧/検索/作成）

## 1. 今日のゴール（3行）
- `shared/infrastructure` に `InMemoryNoteRepository` を実装し、メモ作成/一覧/検索が動く
- Next.js の Route Handler で `/api/notes`（GET/POST）を用意し、UIから叩ける
- 画面は「一覧＋検索フォーム」「新規作成フォーム」を用意する（見た目は雑でOK）

## 2. 今日やることチェックリスト（チェックボックス）
- [ ] `shared/infrastructure/InMemoryNoteRepository.ts` を追加し、`NoteRepository` を実装する
- [ ] `app/api/notes/route.ts` を追加し、GET/POSTで `NoteService` を呼ぶ
- [ ] `app/page.tsx` を「一覧＋検索フォーム（/api/notes をfetch）」に差し替える
- [ ] `app/new/page.tsx` を「新規作成フォーム（POST /api/notes）」として追加する
- [ ] `curl` で API の動作確認をする（GET/POST/検索）

## 3. ディレクトリ構成（ツリー）
（Day2で増えるところ中心。Next.jsの生成物は省略あり）

```text
knowledge-note-app/
  app/
    api/
      notes/
        route.ts
    new/
      page.tsx
    page.tsx
  doc/
    day1.md
    day2.md
  shared/
    domain/
      Note.ts
      NoteRepository.ts
      NoteService.ts
    infrastructure/
      InMemoryNoteRepository.ts
```

## 4. 実装手順（Step1, Step2...）
### Step1: InMemoryNoteRepository（永続化の差し替え点）を作る
Day2は「サーバ再起動で消える」前提でOKなので、配列で `Note` を保持します。

- `NoteRepository` の interface を満たす
- `searchByText` は title/body の部分一致（大小無視）でOK
- `findAll` / `searchByText` は「新しい順」に並べる（UIで見やすい）

### Step2: Route Handler で NoteService を組み立てる（サーバ内シングルトン）
Route Handler から `NoteService` を使うには、`NoteRepository` 実装が必要です。
ここでは **route.ts の module スコープ**に `repo` と `service` を作って「同一プロセス内でメモが残る」ようにします。

> 注意：開発中のNextサーバを再起動すると消えます（仕様）。また実運用のサーバレス環境では永続化されないことがあります（Day6で差し替えます）。

### Step3: `/api/notes` を実装（GET/POST）
- **GET**：
  - `q` が無ければ一覧（`service.list()`）
  - `q` があれば検索（`service.search(q)`）
    - domainの仕様で **2文字未満は必ず空配列**になります
- **POST**：
  - `title`/`body` を受け取り `service.create` する
  - domainのバリデーションエラーは 400 を返す

### Step4: 一覧＋検索フォーム（`app/page.tsx`）を「APIを叩く版」に差し替える
`useState`/`useEffect` を使うので `"use client"` が必要です。

### Step5: 新規作成フォーム（`app/new/page.tsx`）を追加する
submit時に `POST /api/notes` を呼び、成功したら `/` に戻します。

## 5. 写経用コード（ファイルパスごとにコードブロック）
### `shared/infrastructure/InMemoryNoteRepository.ts`

```ts
import type { NoteRepository } from "../domain/NoteRepository";
import type { Note, NoteId } from "../domain/Note";

/**
 * Day2: インメモリ実装（サーバ再起動で消える）
 * - domain は interface のみ維持し、infrastructure に実装を置く
 */
export class InMemoryNoteRepository implements NoteRepository {
  private notes: Note[] = [];

  async save(note: Note): Promise<void> {
    const idx = this.notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      this.notes[idx] = note;
      return;
    }
    this.notes.push(note);
  }

  async findAll(): Promise<Note[]> {
    return [...this.notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(id: NoteId): Promise<Note | null> {
    return this.notes.find((n) => n.id === id) ?? null;
  }

  async searchByText(query: string): Promise<Note[]> {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    return (await this.findAll()).filter((n) => {
      const title = n.title.toLowerCase();
      const body = n.body.toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }
}
```

### `app/api/notes/route.ts`

```ts
import { NextResponse } from "next/server";
import { NoteService } from "../../../shared/domain/NoteService";
import { InMemoryNoteRepository } from "../../../shared/infrastructure/InMemoryNoteRepository";
import type { Note } from "../../../shared/domain/Note";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

function toDto(note: Note): NoteDto {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

// Day2: 同一プロセス内だけで保持する（サーバ再起動で消える）
const repo = new InMemoryNoteRepository();
const service = new NoteService(repo);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const notes = q.trim().length === 0 ? await service.list() : await service.search(q);
  return NextResponse.json(notes.map(toDto));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
    }

    const { title, body: noteBody } = body as { title?: unknown; body?: unknown };

    if (typeof title !== "string" || typeof noteBody !== "string") {
      return NextResponse.json(
        { error: "title/body は文字列で指定してください" },
        { status: 400 }
      );
    }

    const note = await service.create({ title, body: noteBody });
    return NextResponse.json(toDto(note), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

### `app/page.tsx`

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    if (trimmed.length < 2) return "検索は2文字以上で有効（domain仕様）";
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
    // 初回ロード（一覧）
    void load("");
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <h1>Knowledge Note</h1>

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
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
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
          <p>まだメモがありません（または検索結果0件）</p>
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
  );
}
```

### `app/new/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="100文字以内"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
          />
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

        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "作成中..." : "作成"}
        </button>
      </form>
    </main>
  );
}
```

## 6. 動作確認（コマンドと期待結果）
### Next.js の起動

```bash
cd /home/uenishi/dev/knowledge-note-app
npm run dev
```

- **期待結果**：
  - `http://localhost:3000` で「一覧＋検索フォーム」が表示される
  - `+ 新規メモを作成` から `/new` に遷移できる

### `curl` で API 確認（GET/POST/検索）
別ターミナルで実行（URLは環境に合わせて変えてOK）。

> メモ：`jq` が無い場合は、末尾の `| jq .` を外してください（または `python -m json.tool` でもOK）。

#### POST（作成）

```bash
curl -s -X POST "http://localhost:3000/api/notes" \
  -H "Content-Type: application/json" \
  -d '{"title":"はじめてのメモ","body":"本文です"}' | jq .
```

- **期待結果**：
  - `id/title/body/createdAt/updatedAt` を含むJSONが返る
  - `createdAt` と `updatedAt` はISO文字列

#### GET（一覧）

```bash
curl -s "http://localhost:3000/api/notes" | jq .
```

- **期待結果**：
  - 配列で返る（作成したメモが含まれる）

#### GET（検索）

```bash
curl -s "http://localhost:3000/api/notes?q=%E3%81%AF%E3%81%98" | jq .
```

- **期待結果**：
  - `q` を含む title/body のメモだけが配列で返る（部分一致）

#### GET（検索：1文字は0件になる仕様確認）
domainの `NoteService.search` 仕様で **2文字未満は必ず空配列**です。

```bash
curl -s "http://localhost:3000/api/notes?q=a" | jq .
```

- **期待結果**：
  - `[]` が返る

## 7. ミニ課題（5〜15分で終わる）
- **課題A**：検索を「titleだけ」「bodyだけ」で切り替えできるようにする（UIにラジオボタン追加 → APIに `target=title|body|all` 追加）
- **課題B**：`InMemoryNoteRepository` の `findAll()` を「新しい順」ではなく「古い順」に変えて、UIで並びが変わることを確認する
- **課題C**：POSTのバリデーション（title/bodyが空）で 400 が返るのを `curl` で確認し、エラーメッセージをUIに表示する

## 8. 今日の振り返りテンプレ（箇条書き3つ）
- **今日できたこと**：
- **詰まったところ / 次回までに潰したい不安**：
- **設計で“守れた境界”（domain/application/infrastructure）**：


