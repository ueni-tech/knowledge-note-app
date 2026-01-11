# Day5：Nest.js導入 + /notes API作成 + Next側のfetch先をNestに切り替え

## 1. 今日のゴール（3行）
- Nest.jsを導入し、`/notes` API（GET/POST）を実装する
- `shared/domain` 層をNestから再利用し、domain層がフレームワークに依存しないことを体感する
- Next.js側のfetch先をNest API（`http://localhost:3001`）に切り替え、CORS設定で動作確認する

## 2. 今日やることチェックリスト（チェックボックス）
- [ ] Nest.jsプロジェクトを `apps/api` ディレクトリに作成する
- [ ] `apps/api/src/infrastructure/InMemoryNoteRepository.ts` を追加し、`shared/infrastructure` からコピーまたはシンボリックリンクで共有する
- [ ] `apps/api/src/notes/notes.service.ts` を作成し、`shared/domain/NoteService` を利用する
- [ ] `apps/api/src/notes/notes.controller.ts` を作成し、GET/POSTエンドポイントを実装する
- [ ] `apps/api/src/notes/notes.module.ts` を作成し、依存関係を設定する
- [ ] `apps/api/src/main.ts` でCORSを有効化し、ポート3001で起動する
- [ ] Next.js側の `app/page.tsx` と `app/new/page.tsx` のfetch先を環境変数で切り替えられるようにする
- [ ] 両方のサーバを起動し、動作確認する

## 3. ディレクトリ構成（ツリー）

```text
knowledge-note-app/
  app/                          # Next.js側（既存）
    api/
      notes/
        route.ts                # Day5後も残るが、Nestに切り替える想定
    new/
      page.tsx                  # fetch先を環境変数で切り替え
    page.tsx                    # fetch先を環境変数で切り替え
  apps/                         # Day5追加
    api/                        # Nest.jsプロジェクト
      src/
        infrastructure/
          InMemoryNoteRepository.ts  # shared/infrastructureからコピーまたは参照
        notes/
          notes.controller.ts
          notes.module.ts
          notes.service.ts
        main.ts
      nest-cli.json
      package.json
      tsconfig.json
  doc/
    day5.md                     # 本資料（新規）
  shared/                       # 既存（変更なし）
    domain/
      Note.ts
      NoteRepository.ts
      NoteService.ts
      SearchQuery.ts
    infrastructure/
      InMemoryNoteRepository.ts  # Nest側でも使う（コピーまたは参照）
  package.json                  # ルート（変更なし）
  .env.local                    # Day5追加：API_BASE_URL設定
```

## 4. 実装手順（Step1, Step2...）

### Step1: Nest.jsプロジェクトを作成する

`apps/api` ディレクトリにNest.jsプロジェクトを作成します。monorepoツール（Nxなど）は使わず、独立したNest.jsプロジェクトとして作成します。

**詰まりポイント**：
- `nest-cli.json` の `sourceRoot` が `src` になっているか確認
- TypeScriptの設定で `shared` ディレクトリを参照できるようにする必要がある

### Step2: shared/domain を参照できるようにする

Nest.jsプロジェクトから `shared/domain` を参照する方法は2つあります：

**方法A（推奨）：相対パスで参照**
- `apps/api/tsconfig.json` で `paths` を設定し、`@shared/*` で参照できるようにする
- または相対パス `../../shared/domain/*` で直接参照する

**方法B：シンボリックリンクまたはコピー**
- `apps/api/src/shared` にシンボリックリンクを作成する
- または `shared` をコピーする（変更が同期されないので非推奨）

今回は**方法A（相対パス）**を推奨します。

### Step3: InMemoryNoteRepositoryをNest側に配置する

`shared/infrastructure/InMemoryNoteRepository.ts` を `apps/api/src/infrastructure/InMemoryNoteRepository.ts` にコピーします。

> 注意：Day6で永続化を差し替える際に、Nest側の実装を変更する想定です。そのため、Nest側にコピーして独立させます。

### Step4: NotesServiceを作成する（Nest側）

`apps/api/src/notes/notes.service.ts` を作成し、`shared/domain/NoteService` をラップします。Nest.jsの `@Injectable()` デコレータを付けて、DIコンテナに登録します。

### Step5: NotesControllerを作成する

`apps/api/src/notes/notes.controller.ts` を作成し、GET/POSTエンドポイントを実装します。DTOは最小限（型だけ）でOKです。

### Step6: NotesModuleを作成する

`apps/api/src/notes/notes.module.ts` を作成し、`NotesController` と `NotesService` を登録します。`InMemoryNoteRepository` は `NotesService` のコンストラクタで注入します。

### Step7: main.tsでCORSを有効化する

`apps/api/src/main.ts` でCORSを有効化し、`http://localhost:3000`（Next.js側）からのリクエストを許可します。ポートは3001に設定します。

### Step8: Next.js側のfetch先を切り替える

`app/page.tsx` と `app/new/page.tsx` のfetch先を環境変数 `NEXT_PUBLIC_API_BASE_URL` で切り替えられるようにします。デフォルトは `/api/notes`（Next.jsのRoute Handler）にし、環境変数が設定されていればNest側（`http://localhost:3001/notes`）を参照します。

## 5. 写経用コード（ファイルパスごとにコードブロック）

### `apps/api/package.json`（新規作成）

```json
{
  "name": "api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "nest start",
    "dev": "nest start --watch",
    "build": "nest build"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `apps/api/nest-cli.json`（新規作成）

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

### `apps/api/tsconfig.json`（新規作成）

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@shared/*": ["../../shared/*"]
    }
  }
}
```

### `apps/api/src/infrastructure/InMemoryNoteRepository.ts`（新規作成：sharedからコピー）

```ts
import { Note, NoteId } from "../../../shared/domain/Note";
import { NoteRepository } from "../../../shared/domain/NoteRepository";
import { SearchQuery } from "../../../shared/domain/SearchQuery";

/**
 * インメモリ実装（サーバ再起動で消える）
 * - domainはinterface のみ維持し、infrastructure に実装を置く
 * - Day5: Nest.js側でも使用（Day6で永続化を差し替える想定）
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

  async search(query: SearchQuery): Promise<Note[]> {
    const text = query.text?.trim().toLowerCase() ?? "";
    const tag = query.tag?.trim().toLowerCase() ?? "";

    if (text.length === 0 && tag.length === 0) return [];

    return (await this.findAll()).filter((n) => {
      const matchesText =
        text.length === 0 ||
        n.title.toLowerCase().includes(text) ||
        n.body.toLowerCase().includes(text);

      const matchesTags =
        tag.length === 0 || n.tags.some((t) => t.toLowerCase().includes(tag));

      return matchesText && matchesTags;
    });
  }
}
```

### `apps/api/src/notes/notes.service.ts`（新規作成）

```ts
import { Injectable } from "@nestjs/common";
import { NoteService } from "../../../shared/domain/NoteService";
import { CreateNoteParams } from "../../../shared/domain/Note";
import { SearchQuery } from "../../../shared/domain/SearchQuery";
import { InMemoryNoteRepository } from "../infrastructure/InMemoryNoteRepository";

/**
 * Nest.js側のService層
 * shared/domain/NoteService をラップして、Nest.jsのDIコンテナに登録する
 */
@Injectable()
export class NotesService {
  private readonly noteService: NoteService;

  constructor() {
    // Day5: InMemoryNoteRepositoryを直接インスタンス化
    // Day6以降: DIで注入する想定
    const repo = new InMemoryNoteRepository();
    this.noteService = new NoteService(repo);
  }

  async create(params: CreateNoteParams) {
    return await this.noteService.create(params);
  }

  async list() {
    return await this.noteService.list();
  }

  async search(query: SearchQuery) {
    return await this.noteService.search(query);
  }
}
```

### `apps/api/src/notes/notes.controller.ts`（新規作成）

```ts
import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { NotesService } from "./notes.service";
import { CreateNoteParams } from "../../../shared/domain/Note";
import { SearchQuery } from "../../../shared/domain/SearchQuery";

/**
 * DTO型定義（最小限：型だけ）
 */
type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type CreateNoteDto = {
  title: string;
  body: string;
  tags?: string[];
};

/**
 * NoteエンティティをDTOに変換
 */
function toDto(note: any): NoteDto {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async getNotes(
    @Query("q") q?: string,
    @Query("tag") tag?: string
  ): Promise<NoteDto[]> {
    // 検索条件が無ければ一覧、あれば検索
    if (!q && !tag) {
      const notes = await this.notesService.list();
      return notes.map(toDto);
    }

    // SearchQueryを構築
    const searchQuery: SearchQuery = {};
    if (q && q.trim().length > 0) {
      searchQuery.text = q;
    }
    if (tag && tag.trim().length > 0) {
      searchQuery.tag = tag;
    }

    const notes = await this.notesService.search(searchQuery);
    return notes.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(@Body() body: CreateNoteDto): Promise<NoteDto> {
    // バリデーション（最小限：型チェックのみ）
    if (typeof body.title !== "string" || typeof body.body !== "string") {
      throw new Error("title/body は文字列で指定してください");
    }

    const params: CreateNoteParams = {
      title: body.title,
      body: body.body,
      tags: body.tags ?? [],
    };

    try {
      const note = await this.notesService.create(params);
      return toDto(note);
    } catch (e) {
      const message = e instanceof Error ? e.message : "不明なエラー";
      throw new Error(message);
    }
  }
}
```

### `apps/api/src/notes/notes.module.ts`（新規作成）

```ts
import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";

@Module({
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
```

### `apps/api/src/app.module.ts`（新規作成）

```ts
import { Module } from "@nestjs/common";
import { NotesModule } from "./notes/notes.module";

@Module({
  imports: [NotesModule],
})
export class AppModule {}
```

### `apps/api/src/main.ts`（新規作成）

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS設定：Next.js側（localhost:3000）からのリクエストを許可
  app.enableCors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  });

  const port = 3001;
  await app.listen(port);
  console.log(`Nest.js API server is running on http://localhost:${port}`);
}

bootstrap();
```

### `.env.local`（新規作成：Next.js側のルートに配置）

```env
# Day5: Nest.js APIのベースURL
# 設定されていればNest側、なければNext.jsのRoute Handlerを使用
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### `app/page.tsx`（変更：fetch先を環境変数で切り替え）

```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type SearchTarget = "all" | "title" | "body";

/**
 * APIのベースURLを取得（環境変数またはデフォルト）
 */
function getApiBaseUrl(): string {
  // 環境変数が設定されていればNest側、なければNext.jsのRoute Handler
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

async function fetchNotes(q: string, target: SearchTarget, tag: string): Promise<NoteDto[]> {
  const baseUrl = getApiBaseUrl();
  const apiPath = baseUrl ? `${baseUrl}/notes` : "/api/notes";
  
  const params = new URLSearchParams();
  if (q.trim().length > 0) params.set("q", q);
  params.set("target", target);
  if (tag.trim().length > 0) params.set("tag", tag);

  const qs = params.toString();
  const url = qs.length > 0 ? `${apiPath}?${qs}` : apiPath;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("ノートの取得に失敗しました");
  return (await res.json()) as NoteDto[];
}

/**
 * 検索関連の状態とロジックを集約するカスタムフック
 */
function useNoteSearch() {
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<SearchTarget>("all");
  const [tag, setTag] = useState("");
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

  async function load(nextQ: string, nextTarget: SearchTarget, nextTag: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotes(nextQ, nextTarget, nextTag);
      setNotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }

  return {
    q,
    setQ,
    target,
    setTarget,
    tag,
    setTag,
    notes,
    error,
    loading,
    hint,
    load,
  };
}

export default function Page() {
  const { q, setQ, target, setTarget, tag, setTag, notes, error, loading, hint, load } =
    useNoteSearch();

  useEffect(() => {
    void load("", "all", "");
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
            void load(q, target, tag);
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
            <input
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
                setTag("");
                void load("", target, "");
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
                {n.tags.length > 0 && (
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
  );
}
```

### `app/new/page.tsx`（変更：fetch先を環境変数で切り替え）

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * APIのベースURLを取得（環境変数またはデフォルト）
 */
function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "";
}

async function createNote(title: string, body: string, tags: string[]): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const apiPath = baseUrl ? `${baseUrl}/notes` : "/api/notes";
  
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, tags }),
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
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
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

        <label>
          タグ（カンマ区切り）
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="例: 技術,メモ,重要"
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

### Step1: Nest.jsプロジェクトのセットアップ

```bash
cd /home/uenishi/dev/knowledge-note-app

# Nest.js CLIをグローバルにインストール（初回のみ）
npm install -g @nestjs/cli

# apps/apiディレクトリにNest.jsプロジェクトを作成
nest new api apps/api --skip-git --package-manager npm

# 作成後、apps/apiディレクトリに移動
cd apps/api

# 依存関係をインストール
npm install
```

**詰まりポイント**：
- `nest new` が失敗する場合は、`npm install -g @nestjs/cli` を実行してから再試行
- `apps/api` ディレクトリが既に存在する場合は、手動で削除してから再実行

### Step2: Nest.jsサーバの起動

```bash
cd /home/uenishi/dev/knowledge-note-app/apps/api
npm run dev
```

- **期待結果**：
  - `Nest.js API server is running on http://localhost:3001` が表示される
  - エラーが出ない

**詰まりポイント**：
- ポート3001が既に使用されている場合は、`main.ts` の `port` を変更する
- TypeScriptのコンパイルエラーが出る場合は、`tsconfig.json` の `paths` 設定を確認

### Step3: Next.jsサーバの起動（別ターミナル）

```bash
cd /home/uenishi/dev/knowledge-note-app
npm run dev
```

- **期待結果**：
  - `http://localhost:3000` でNext.jsアプリが起動する

### Step4: 動作確認（ブラウザ）

1. ブラウザで `http://localhost:3000` を開く
2. 一覧ページが表示される
3. 「+ 新規メモを作成」からメモを作成できる
4. 検索が動作する

- **期待結果**：
  - すべての機能が正常に動作する
  - DevToolsのConsoleにエラーが出ない

### DevToolsでの調査（必須：Network / Console / Elements / Breakpoints）

#### Network（Nest.js APIへのリクエストを確認）
- **操作**：
  - ブラウザで `http://localhost:3000` を開く
  - DevToolsを開き、**Network** タブを開く
  - 一覧ページで「検索」ボタンを押す
  - 次に `/new` ページでメモを作成する
- **見る観点**（対象リクエスト：`http://localhost:3001/notes`）：
  - URL：`http://localhost:3001/notes` または `http://localhost:3001/notes?q=...`
  - Method：GET または POST
  - Status：200 または 201
  - Request Headers：`Origin: http://localhost:3000` が含まれている
  - Response Headers：`Access-Control-Allow-Origin: http://localhost:3000` が含まれている
  - Response：JSON配列またはJSONオブジェクトが返っている
- **期待結果**：
  - Nest.js API（`localhost:3001`）へのリクエストが発生している
  - CORSヘッダーが正しく設定されている
  - レスポンスが期待通り

#### Console（CORSエラーが出ていないか）
- **操作**：DevToolsの **Console** タブを開く
- **見る観点**：
  - 赤いエラー（特にCORS関連）が出ていない
  - `Access to fetch at 'http://localhost:3001/notes' from origin 'http://localhost:3000' has been blocked by CORS policy` のようなエラーが出ていない
- **期待結果**：
  - CORSエラーが0件（もし出たら、`main.ts` のCORS設定を確認）

#### Elements（fetch先が正しく切り替わっているか）
- **操作**：DevToolsの **Elements** タブで、`app/page.tsx` のfetch関数にブレークポイントを置く
- **見る観点**：
  - `getApiBaseUrl()` が `http://localhost:3001` を返している
  - `apiPath` が `http://localhost:3001/notes` になっている
- **期待結果**：
  - 環境変数が正しく読み込まれ、fetch先がNest.js側に切り替わっている

#### Breakpoints（Nest.js側の処理を追う）
- **操作**：
  - Nest.js側の `apps/api/src/notes/notes.controller.ts` の `getNotes()` メソッドにブレークポイントを置く（IDEで）
  - ブラウザで検索を実行する
- **見る観点**：
  - `q` や `tag` パラメータが正しく渡されている
  - `notesService.search()` が呼ばれている
  - レスポンスが正しく返っている
- **期待結果**：
  - Nest.js側の処理が正しく動作している

### `curl` で Nest.js API 確認（GET/POST）

#### GET（一覧）

```bash
curl -s "http://localhost:3001/notes" | jq .
```

- **期待結果**：
  - 配列で返る（空配列でもOK）

#### GET（検索）

```bash
curl -s "http://localhost:3001/notes?q=test" | jq .
```

- **期待結果**：
  - 検索結果が配列で返る

#### POST（作成）

```bash
curl -s -X POST "http://localhost:3001/notes" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nest.js経由のメモ","body":"本文です","tags":["技術","Nest"]}' | jq .
```

- **期待結果**：
  - `id/title/body/tags/createdAt/updatedAt` を含むJSONが返る
  - `createdAt` と `updatedAt` はISO文字列

#### CORS確認（Originヘッダー付き）

```bash
curl -s -X GET "http://localhost:3001/notes" \
  -H "Origin: http://localhost:3000" \
  -v 2>&1 | grep -i "access-control"
```

- **期待結果**：
  - `Access-Control-Allow-Origin: http://localhost:3000` が含まれている

## 7. ミニ課題（5〜15分で終わる）

- **課題A**：`apps/api/src/notes/notes.controller.ts` にエラーハンドリングを追加する（`@HttpException` を使って400エラーを返す）
- **課題B**：環境変数 `NEXT_PUBLIC_API_BASE_URL` を削除して、Next.jsのRoute Handler（`/api/notes`）に戻ることを確認する
- **課題C**：Nest.js側のポートを3002に変更し、`.env.local` も更新して動作確認する
- **課題D（DevTools復習）**：Networkで `POST http://localhost:3001/notes` を実際に発生させ、URL/Method/Status/Response/Request Headers（特に `Origin`）/Response Headers（特に `Access-Control-Allow-Origin`）を確認する

## 8. 今日の振り返りテンプレ（箇条書き3つ）

- **今日できたこと**：
- **詰まったところ / 次回までに潰したい不安**：
- **設計で“守れた境界”（domain層の独立性）**：
  - （例：`shared/domain` をNest.js側から参照できた。domain層がフレームワークに依存していないことを確認できた）
  - （例：`NoteService` をNest.js側で再利用できた。domain層のロジックがフレームワークに依存していないことを実感した）
