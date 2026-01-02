# Day3：tags追加（仕様変更①）＋domainテストで変更の安全性を体感

## 1. 今日のゴール（3行）
- `Note` に `tags: string[]` フィールドを追加し、メモ作成時にタグを指定できるようにする（仕様変更①）
- 検索条件に `tag` を追加し、タグで検索できるようにする
- domainテストを追加して、変更で壊れないことを体感する（テストが無いと変更が怖いことを実感）

## 2. 今日やることチェックリスト（チェックボックス）
- [ ] `shared/domain/Note.ts` に `tags: string[]` を追加し、`CreateNoteParams` に `tags` を追加する
- [ ] `shared/domain/NoteRepository.ts` に `SearchQuery` 型を追加し、`tag` 検索条件を含める
- [ ] `shared/domain/NoteService.ts` の `search` メソッドを `SearchQuery` を受け取るように変更する
- [ ] `shared/infrastructure/InMemoryNoteRepository.ts` の `searchByText` を `search` に変更し、tag検索に対応する
- [ ] `shared/domain/__test__/search.test.ts` を新規追加し、tag検索のテストを書く
- [ ] `app/api/notes/route.ts` で `tags` を受け取り、`SearchQuery` を構築して検索する
- [ ] `app/new/page.tsx` に tags入力欄（カンマ区切り1行）を追加する
- [ ] `app/page.tsx` に tag検索UIを追加する（既存のtarget検索に加えて）

## 3. ディレクトリ構成（ツリー）
（Day3で変更・追加されるファイル中心）

```text
knowledge-note-app/
  app/
    api/
      notes/
        route.ts          # tags受け取り、tag検索対応
    new/
      page.tsx            # tags入力欄追加
    page.tsx              # tag検索UI追加
  doc/
    day3.md               # 本資料（新規）
  shared/
    domain/
      Note.ts             # tagsフィールド追加
      NoteRepository.ts    # SearchQuery型追加
      NoteService.ts       # searchメソッドをSearchQuery対応に
      __test__/
        note.test.ts       # 既存
        search.test.ts     # 新規追加（tag検索テスト）
    infrastructure/
      InMemoryNoteRepository.ts  # searchメソッド実装変更
```

## 4. 仕様変更の思考フロー（変更を加える前に必ず読む）

Day3は「tags追加」という仕様変更の練習です。変更を加える際は、以下の思考フローに沿って進めると安全です。

### 4-1. 変更の影響範囲を把握する

**質問：この変更で、どこを修正すべきか？**

1. **domain層（コアロジック）**
   - `Note.ts`: tagsフィールドを追加
   - `NoteRepository.ts`: 検索インターフェースを拡張（SearchQuery型追加）
   - `NoteService.ts`: 検索メソッドのシグネチャ変更

2. **infrastructure層（実装）**
   - `InMemoryNoteRepository.ts`: 検索実装を変更

3. **API層（入出力）**
   - `route.ts`: tagsを受け取り、tag検索に対応

4. **UI層（画面）**
   - `new/page.tsx`: tags入力欄追加
   - `page.tsx`: tag検索UI追加

5. **テスト層（品質保証）**
   - `search.test.ts`: 新規追加（tag検索のテスト）

**ポイント**：レイヤードアーキテクチャの各層に影響があることを認識する。

### 4-2. 変更の順序を決める（domain → infrastructure → API → UI）

**原則：内側（domain）から外側（UI）へ順に変更する**

理由：
- domain層は他の層に依存しないため、先に変更できる
- domain層を変更すると、TypeScriptの型エラーで「影響範囲」が自動的に分かる
- 外側から変更すると、内側の設計が固まっていない状態で進めてしまう

**今回の順序**：
1. domain層（Note.ts, NoteRepository.ts, NoteService.ts）
2. infrastructure層（InMemoryNoteRepository.ts）
3. テスト層（search.test.ts）← 実装と並行でOK
4. API層（route.ts）
5. UI層（new/page.tsx, page.tsx）

### 4-3. テストを先に書く（TDD的なアプローチ）

**質問：この変更で、何が壊れる可能性があるか？**

- `NoteService.search` のシグネチャが変わる → 既存の呼び出し側が壊れる
- `NoteRepository.searchByText` が `search` に変わる → 実装が壊れる
- `Note.create` に tags を追加 → 既存の呼び出し側は動くが、tagsが空配列になる

**対策**：
- テストを先に書く（または既存テストを実行して「現在の状態」を確認）
- 変更後にテストを実行して「壊れていない」ことを確認
- 新機能（tag検索）のテストも追加

**今回のアプローチ**：
- Step5で `search.test.ts` を追加（実装と並行でOK）
- 各ステップで `npm test` を実行して確認

### 4-4. 既存の動作を壊さないように注意する

**質問：既存の機能（text検索）は動き続けるか？**

- `SearchQuery` 型で `text` は optional にする → 既存の呼び出し側は `{ text: "..." }` で動く
- `Note.create` の `tags` は optional にする → 既存の呼び出し側は `tags` を渡さなくても動く
- APIの `q` パラメータは既存のまま → 後方互換性を保つ

**ポイント**：既存のAPIやUIを壊さないように、拡張する形で変更する。

### 4-5. 変更後の動作確認（テスト + 手動確認）

**確認項目**：
1. 既存テストが通る（`npm test`）
2. 新規テストが通る（tag検索のテスト）
3. 既存機能が動く（text検索）
4. 新機能が動く（tags追加、tag検索）
5. UIで確認（DevToolsでNetwork/Consoleを確認）

**ポイント**：変更を加えたら、必ず動作確認する。テストが無いと「壊れたかどうか」が分からない。

### 4-6. まとめ：仕様変更のチェックリスト

変更を加える前に：
- [ ] 影響範囲を把握した（どのファイルを変更するか）
- [ ] 変更の順序を決めた（domain → infrastructure → API → UI）
- [ ] 既存の動作を壊さない設計にした（optional追加、後方互換性）
- [ ] テストを書く計画を立てた（既存テスト + 新規テスト）

変更を加えた後：
- [ ] テストを実行した（`npm test`）
- [ ] 既存機能が動くことを確認した
- [ ] 新機能が動くことを確認した
- [ ] UIで動作確認した（DevToolsで確認）

---

## 5. 実装手順（Step1, Step2...）

### Step1: domain層から変更（Note.ts）
まず `Note` エンティティに `tags` を追加します。`CreateNoteParams` に `tags?: string[]` を追加し、デフォルトは空配列にします。

### Step2: NoteRepository.ts に SearchQuery 型を追加
現在の `searchByText(query: string)` を拡張し、`SearchQuery` 型を作って `text` と `tag` の両方を受け取れるようにします。これにより「text検索」「tag検索」「両方」に対応できます。

### Step3: NoteService.ts を SearchQuery 対応に変更
`search(query: string)` を `search(query: SearchQuery)` に変更します。既存の呼び出し側（API）も合わせて修正が必要です。

### Step4: InMemoryNoteRepository.ts の search 実装
`searchByText` を `search` に変更し、`SearchQuery` の `text` と `tag` の両方で検索できるようにします。

### Step5: domainテストを追加（search.test.ts）
tag検索のテストを追加します。これにより「変更で壊れない」ことを確認できます。

### Step6: API層を修正（route.ts）
- POST: `tags` を受け取り、`Note.create` に渡す
- GET: `tag` クエリパラメータを受け取り、`SearchQuery` を構築して `service.search` を呼ぶ

### Step7: UI層を修正（new/page.tsx, page.tsx）
- `new/page.tsx`: tags入力欄（カンマ区切り）を追加
- `page.tsx`: tag検索用の入力欄を追加（既存のtext検索と併用）

## 6. 写経用コード（ファイルパスごとにコードブロック）

### `shared/domain/Note.ts`

```ts
export type NoteId = string;

export type CreateNoteParams = {
  title: string;
  body: string;
  tags?: string[];  // Day3追加
  now?: Date;
  idFactory?: () => NoteId;
};

export class Note {
  private constructor(
    public readonly id: NoteId,
    public readonly title: string,
    public readonly body: string,
    public readonly tags: string[],  // Day3追加
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Noteの生成口。ルール（パリデーション/正規化）をここに集約する。
   */
  static create(params: CreateNoteParams): Note {
    const title = params.title.trim();
    const body = params.body.trim();

    if (title.length === 0) throw new Error("タイトルは必須です");
    if (body.length === 0) throw new Error("本文は必須です");
    if (title.length > 100) throw new Error("タイトルは100文字以内です");
    if (body.length > 2000) throw new Error("本文は2000文字以内です");

    // Day3追加: tagsの正規化（空文字列を除外、trim）
    const rawTags = params.tags ?? [];
    const tags = rawTags
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const now = params.now ?? new Date();
    const idFactory = params.idFactory ?? defaultIdFactory;

    return new Note(idFactory(), title, body, tags, now, now);
  }
}

function defaultIdFactory(): NoteId {
  return `note_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
```

### `shared/domain/NoteRepository.ts`

```ts
import type { Note, NoteId } from "./Note";

/**
 * Day3追加: 検索クエリ型
 * text/tag の両方または片方で検索できる
 */
export type SearchQuery = {
  text?: string;
  tag?: string;
};

/**
 * 永続化の差し替え点
 * domain側は「どう保存するかを知らない」。
 */
export interface NoteRepository {
  save(note: Note): Promise<void>;
  findAll(): Promise<Note[]>;
  findById(id: NoteId): Promise<Note | null>;
  search(query: SearchQuery): Promise<Note[]>;  // Day3変更: searchByText → search
}
```

### `shared/domain/NoteService.ts`

```ts
import { Note, type CreateNoteParams } from "./Note";
import type { NoteRepository, SearchQuery } from "./NoteRepository";  // Day3追加: SearchQuery

/**
 *薄いユースケース層（domain内に置く簡易版）
 * 将来 Nest.js に移植するときは application 層に移す想定。
 */
export class NoteService {
  constructor(private readonly repo: NoteRepository) {}

  async create(params: CreateNoteParams): Promise<Note> {
    const note = Note.create(params);
    await this.repo.save(note);
    return note;
  }

  async list(): Promise<Note[]> {
    return await this.repo.findAll();
  }

  async search(query: SearchQuery): Promise<Note[]> {  // Day3変更: string → SearchQuery
    const text = query.text?.trim() ?? "";
    const tag = query.tag?.trim() ?? "";

    // 両方空なら空配列を返す（domainの仕様）
    if (text.length === 0 && tag.length === 0) return [];

    // textが1文字未満なら空配列（既存仕様を維持）
    if (text.length > 0 && text.length < 2) return [];

    return await this.repo.search(query);
  }
}
```

### `shared/infrastructure/InMemoryNoteRepository.ts`

```ts
import { Note, NoteId } from "../domain/Note";
import { NoteRepository, SearchQuery } from "../domain/NoteRepository";  // Day3追加: SearchQuery

/**
 * インメモリ実装（サーバ再起動で消える）
 * - domainはinterface のみ維持し、infrastructure に実装を置く
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
    return [...this.notes].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findById(id: NoteId): Promise<Note | null> {
    return this.notes.find((n) => n.id === id) ?? null;
  }

  async search(query: SearchQuery): Promise<Note[]> {  // Day3変更: searchByText → search
    const text = query.text?.trim().toLowerCase() ?? "";
    const tag = query.tag?.trim().toLowerCase() ?? "";

    // 両方空なら空配列
    if (text.length === 0 && tag.length === 0) return [];

    return (await this.findAll()).filter((n) => {
      const matchesText =
        text.length === 0 ||
        n.title.toLowerCase().includes(text) ||
        n.body.toLowerCase().includes(text);

      const matchesTag =
        tag.length === 0 ||
        n.tags.some((t) => t.toLowerCase() === tag);

      return matchesText && matchesTag;
    });
  }
}
```

### `shared/domain/__test__/search.test.ts`（新規追加）

```ts
import { describe, expect, it, vi } from "vitest";
import { Note } from "../Note";
import { NoteRepository, SearchQuery } from "../NoteRepository";
import { NoteService } from "../NoteService";

const fixedNow = new Date("2025-01-01T00:00:00.000Z");

function createRepoMock(): NoteRepository {
  return {
    save: vi.fn(async () => {}),
    findAll: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    search: vi.fn(async () => []),
  };
}

describe("NoteService.search", () => {
  it("text/tag が両方空なら空配列を返し、repoを呼ばない", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    await expect(service.search({})).resolves.toEqual([]);
    await expect(service.search({ text: "", tag: "" })).resolves.toEqual([]);
    await expect(service.search({ text: "  ", tag: "  " })).resolves.toEqual([]);

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("textが1文字なら空配列を返す（既存仕様）", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    await expect(service.search({ text: "a" })).resolves.toEqual([]);
    await expect(service.search({ text: "a", tag: "tag1" })).resolves.toEqual([]);

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("textが2文字以上ならrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    search.mockResolvedValue(dummy);
    const service = new NoteService(repo);

    await expect(service.search({ text: "ab" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ text: "ab" });
  });

  it("tagだけでもrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    search.mockResolvedValue(dummy);
    const service = new NoteService(repo);

    await expect(service.search({ tag: "tag1" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ tag: "tag1" });
  });

  it("textとtagの両方でもrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    search.mockResolvedValue(dummy);
    const service = new NoteService(repo);

    await expect(service.search({ text: "ab", tag: "tag1" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ text: "ab", tag: "tag1" });
  });
});

describe("Note.create with tags", () => {
  it("tagsが指定されれば含まれる", () => {
    const note = Note.create({
      title: "test",
      body: "body",
      tags: ["tag1", "tag2"],
      now: fixedNow,
      idFactory: () => "note_1",
    });

    expect(note.tags).toEqual(["tag1", "tag2"]);
  });

  it("tagsが未指定なら空配列", () => {
    const note = Note.create({
      title: "test",
      body: "body",
      now: fixedNow,
      idFactory: () => "note_1",
    });

    expect(note.tags).toEqual([]);
  });

  it("tagsの空文字列は除外され、trimされる", () => {
    const note = Note.create({
      title: "test",
      body: "body",
      tags: [" tag1 ", "  ", "", "tag2"],
      now: fixedNow,
      idFactory: () => "note_1",
    });

    expect(note.tags).toEqual(["tag1", "tag2"]);
  });
});
```

### `app/api/notes/route.ts`

```ts
import { NoteService } from "../../../shared/domain/NoteService";
import { InMemoryNoteRepository } from "../../../shared/infrastructure/InMemoryNoteRepository";
import type { Note } from "../../../shared/domain/Note";
import { NextResponse } from "next/server";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];  // Day3追加
  createdAt: string;
  updatedAt: string;
};

function toDto(note: Note): NoteDto {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,  // Day3追加
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

// 同一プロセス内だけで保持する（サーバ再起動で消える）
const repo = new InMemoryNoteRepository();
const service = new NoteService(repo);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const tag = url.searchParams.get("tag") ?? "";  // Day3追加

  const rawTarget = url.searchParams.get("target") ?? "all";
  const target =
    rawTarget === "title" || rawTarget === "body" || rawTarget === "all"
      ? rawTarget
      : "all";

  // Day3変更: SearchQueryを構築
  const searchQuery: { text?: string; tag?: string } = {};
  if (q.trim().length > 0) {
    if (target === "all") {
      searchQuery.text = q;
    } else if (target === "title" || target === "body") {
      // 既存のtarget検索は後方互換のため残す（text検索として扱う）
      searchQuery.text = q;
    }
  }
  if (tag.trim().length > 0) {
    searchQuery.tag = tag;
  }

  // 検索条件が無ければ一覧、あれば検索
  if (Object.keys(searchQuery).length === 0) {
    const notes = await service.list();
    return NextResponse.json(notes.map(toDto));
  }

  // Day3変更: service.searchにSearchQueryを渡す
  const notes = await service.search(searchQuery);
  return NextResponse.json(notes.map(toDto));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        {
          error: "リクエストボディが不正です",
        },
        {
          status: 400,
        }
      );
    }

    const { title, body: noteBody, tags } = body as {  // Day3追加: tags
      title?: unknown;
      body?: unknown;
      tags?: unknown;  // Day3追加
    };

    if (typeof title !== "string" || typeof noteBody !== "string") {
      return NextResponse.json(
        {
          error: "title/body は文字列で指定してください",
        },
        {
          status: 400,
        }
      );
    }

    // Day3追加: tagsのバリデーション（配列または未指定）
    let tagsArray: string[] = [];
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          {
            error: "tags は配列で指定してください",
          },
          {
            status: 400,
          }
        );
      }
      if (!tags.every((t) => typeof t === "string")) {
        return NextResponse.json(
          {
            error: "tags の各要素は文字列で指定してください",
          },
          {
            status: 400,
          }
        );
      }
      tagsArray = tags;
    }

    const note = await service.create({
      title,
      body: noteBody,
      tags: tagsArray,  // Day3追加
    });
    return NextResponse.json(toDto(note), {
      status: 201,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}
```

### `app/new/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

async function createNote(title: string, body: string, tags: string[]): Promise<void> {  // Day3追加: tags
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, tags }),  // Day3追加: tags
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
  const [tagsInput, setTagsInput] = useState("");  // Day3追加: カンマ区切り入力用
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Day3追加: カンマ区切りを配列に変換
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      await createNote(title, body, tags);
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

        <label>  {/* Day3追加 */}
          タグ（カンマ区切り）
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例: 技術,メモ,重要"
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
```

### `app/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];  // Day3追加
  createdAt: string;
  updatedAt: string;
};

type SearchTarget = "all" | "title" | "body";

async function fetchNotes(q: string, target: SearchTarget, tag: string): Promise<NoteDto[]> {  // Day3追加: tag
  const params = new URLSearchParams();
  if (q.trim().length > 0) params.set("q", q);
  params.set("target", target);
  if (tag.trim().length > 0) params.set("tag", tag);  // Day3追加

  const qs = params.toString();
  const url = qs.length > 0 ? `/api/notes?${qs}` : "/api/notes";

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("ノートの取得に失敗しました");
  return (await res.json()) as NoteDto[];
}

export default function Page() {
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<SearchTarget>("all");
  const [tag, setTag] = useState("");  // Day3追加
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(() => {
    const trimmedQ = q.trim();
    const trimmedTag = tag.trim();
    if (trimmedQ.length === 0 && trimmedTag.length === 0) return "一覧を表示中";
    if (trimmedQ.length > 0 && trimmedQ.length < 2) return "検索は2文字以上で有効";
    const parts: string[] = [];
    if (trimmedQ.length > 0) parts.push(`text="${trimmedQ}"`);
    if (trimmedTag.length > 0) parts.push(`tag="${trimmedTag}"`);
    return `検索中: ${parts.join(", ")}`;
  }, [q, tag]);

  async function load(nextQ: string, nextTarget: SearchTarget, nextTag: string) {  // Day3追加: nextTag
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotes(nextQ, nextTarget, nextTag);  // Day3追加: nextTag
      setNotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("", "all", "");  // Day3変更: tag空文字を追加
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <h1>Knowledge Note</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/new">+ 新規メモを作成</Link>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>検索</h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <label>
            <input
              type="radio"
              name="target"
              value="all"
              checked={target === "all"}
              onChange={() => setTarget("all")}
            />
            all
          </label>
          <label>
            <input
              type="radio"
              name="target"
              value="title"
              checked={target === "title"}
              onChange={() => setTarget("title")}
            />
            title
          </label>
          <label>
            <input
              type="radio"
              name="target"
              value="body"
              checked={target === "body"}
              onChange={() => setTarget("body")}
            />
            body
          </label>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(q, target, tag);  // Day3変更: tagを追加
          }}
          style={{ display: "grid", gap: 8, maxWidth: 600 }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="タイトル/本文を部分一致検索（2文字以上）"
              style={{ width: 360, padding: 8 }}
            />
            <input  {/* Day3追加 */}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="タグで検索"
              style={{ width: 200, padding: 8 }}
            />
            <button type="submit" disabled={loading}>
              検索
            </button>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTag("");  // Day3追加
                void load("", target, "");  // Day3変更: tag空文字を追加
              }}
              disabled={loading}
            >
              クリア
            </button>
          </div>
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
              <li key={n.id} style={{ marginBottom: 12 }}>
                <strong>{n.title}</strong>
                {n.tags.length > 0 && (  {/* Day3追加 */}
                  <div style={{ marginTop: 4 }}>
                    {n.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: "inline-block",
                          background: "#e0e0e0",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          marginRight: 4,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
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
```

## 7. 動作確認（コマンドと期待結果）

### テスト実行（domain層の変更が壊れていないか確認）

```bash
cd /home/uenishi/dev/knowledge-note-app
npm test
```

- **期待結果**：
  - `note.test.ts` の既存テストが全て通る
  - `search.test.ts` の新規テストが全て通る
  - もしテストが失敗したら、エラーメッセージを確認して修正する

### Next.js の起動

```bash
npm run dev
```

- **期待結果**：
  - `http://localhost:3000` で一覧が表示される
  - `/new` で tags入力欄が表示される

### DevToolsでの調査（必須：Network / Console / Elements / Breakpoints）

#### Network（tagsを含むPOSTリクエストを確認）
- **操作**：
  - ブラウザで `http://localhost:3000/new` を開く
  - DevToolsを開き、**Network** タブを開く
  - タイトル/本文/tags（例: `技術,メモ`）を入力して「作成」ボタンを押す
- **見る観点**（対象リクエスト：`POST /api/notes`）：
  - URL：`/api/notes`
  - Method：POST
  - Status：201
  - Request Payload：`{"title":"...","body":"...","tags":["技術","メモ"]}` になっている
  - Response：`tags` フィールドが含まれている
- **期待結果**：
  - tagsが正しく送信され、レスポンスにも含まれている

#### Network（tag検索のGETリクエストを確認）
- **操作**：
  - 一覧ページで tag検索欄に `技術` と入力して「検索」を押す
- **見る観点**（対象リクエスト：`GET /api/notes`）：
  - URL：`/api/notes?target=all&tag=技術` になっている
  - Method：GET
  - Status：200
  - Response：該当するtagを持つメモだけが返っている
- **期待結果**：
  - tag検索が正しく動作している

#### Console（フロントのエラーが出ていないか）
- **操作**：DevToolsの **Console** タブを開く
- **見る観点**：
  - 赤いエラーが出ていない
  - Warningが大量に出ていない
- **期待結果**：
  - エラーが0件（もし出たら、メッセージをそのまま記録する）

#### Elements（tags入力欄のDOMが期待通りか）
- **操作**：DevToolsの **Elements** タブで `/new` ページの tags入力欄の `<input>` を選択する
- **見る観点**：
  - `placeholder` が「例: 技術,メモ,重要」になっている
  - `value` が state と連動している
- **期待結果**：
  - 意図したDOMが画面に存在し、属性が期待通り

#### Breakpoints（tagsが正しく処理されているか）
- **操作**：
  - DevToolsの **Sources** タブを開く
  - `app/new/page.tsx` の `onSubmit` 内、`tags` 配列を作成する行（`tagsInput.split(...)`）にブレークポイントを置く
  - `/new` ページで tags入力欄に `技術,メモ` と入力して「作成」を押す
- **見る観点**：
  - `tagsInput` に何が入っているか
  - `tags` 配列が `["技術","メモ"]` になっているか
- **期待結果**：
  - カンマ区切りが正しく配列に変換されている

### `curl` で API 確認（tags付きPOST、tag検索GET）

#### POST（tags付きで作成）

```bash
curl -s -X POST "http://localhost:3000/api/notes" \
  -H "Content-Type: application/json" \
  -d '{"title":"タグ付きメモ","body":"本文です","tags":["技術","メモ"]}' | jq .
```

- **期待結果**：
  - `tags: ["技術","メモ"]` が含まれる
  - `id/title/body/createdAt/updatedAt` も含まれる

#### GET（tag検索）

```bash
curl -s "http://localhost:3000/api/notes?tag=%E6%8A%80%E8%A1%93" | jq .
```

- **期待結果**：
  - `tag=技術` を持つメモだけが配列で返る

#### GET（text検索とtag検索の両方）

```bash
curl -s "http://localhost:3000/api/notes?q=%E3%83%A1%E3%83%A2&tag=%E6%8A%80%E8%A1%93" | jq .
```

- **期待結果**：
  - `text="メモ"` かつ `tag="技術"` の両方に一致するメモだけが返る

## 8. ミニ課題（5〜15分で終わる）

- **課題A**：`Note.create` の tagsバリデーションを追加する（例：1つのtagが50文字を超える場合はエラー）
- **課題B**：`InMemoryNoteRepository.search` で tag検索を「部分一致」に変更する（現在は完全一致）
- **課題C**：UIで tags表示をクリックしたら、そのtagで検索する機能を追加する
- **課題D（DevTools復習）**：Networkで `GET /api/notes?tag=...` を実際に発生させ、URL/Method/Status/Response を確認する（一覧ページでtag検索を実行）

## 9. 今日の振り返りテンプレ（箇条書き3つ）

- **今日できたこと**：
- **詰まったところ / 次回までに潰したい不安**：
- **壊れた点 / テストで防げた点**：
  - （例：`NoteService.search` の引数を `string` から `SearchQuery` に変更したとき、既存の呼び出し側が壊れたが、テストを先に書いていたので気づけた）
  - （例：`NoteRepository.searchByText` を `search` に変更したとき、`InMemoryNoteRepository` の実装を忘れていたが、テストが失敗して気づけた）
