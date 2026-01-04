# Day4：domainの責務整理と検索ロジックの改善

## 1. 今日のゴール（3行）
- `SearchQuery`型を独立ファイルに切り出し、検索条件のバリデーションロジックを明確化する
- `NoteService`の検索ロジックを読みやすくし、domain層の責務を整理する
- UIの状態管理を軽く整理し、変更しやすさを向上させる

## 2. 今日やることチェックリスト（チェックボックス）
- [ ] `shared/domain/SearchQuery.ts` を新規作成し、`SearchQuery`型とバリデーションロジックを移動する
- [ ] `shared/domain/NoteRepository.ts` から `SearchQuery` 型定義を削除し、`SearchQuery.ts` からインポートする
- [ ] `shared/domain/NoteService.ts` の `search` メソッドを簡潔にし、`SearchQuery` のバリデーションを活用する
- [ ] `shared/domain/__test__/search.test.ts` を更新し、`SearchQuery` を使ったテストに変更する
- [ ] `app/page.tsx` の状態管理を整理する（カスタムフック `useNoteSearch` を作成）
- [ ] すべてのテストが通ることを確認する
- [ ] `doc/day4-notes.md` に改善メモを記録する

## 3. ディレクトリ構成（ツリー）

```text
knowledge-note-app/
  app/
    page.tsx              # useNoteSearchフックで状態管理を整理
  doc/
    day4.md               # 本資料（新規）
    day4-notes.md         # 改善メモ（新規）
  shared/
    domain/
      SearchQuery.ts      # 新規追加（型定義＋バリデーション）
      Note.ts             # 変更なし
      NoteRepository.ts   # SearchQuery型定義を削除
      NoteService.ts      # searchメソッドを簡潔化
      __test__/
        search.test.ts    # SearchQueryを使ったテストに更新
```

## 4. 実装手順

### Step1: SearchQuery型を独立ファイルに切り出す

**変更前の意図**：
- `SearchQuery`型が`NoteRepository.ts`に定義されていたが、検索条件のバリデーションロジックは`NoteService`に散在していた
- 検索条件の「有効性」を判定するロジックが分散していた

**変更後の意図**：
- `SearchQuery`を独立したファイルに切り出し、バリデーションロジックも一緒に集約する
- 「検索条件が有効かどうか」を`SearchQuery`自身が判定できるようにする

**手順**：
1. `shared/domain/SearchQuery.ts` を新規作成
2. `SearchQuery`型と`isValid()`メソッドを定義
3. `NoteRepository.ts`から`SearchQuery`型定義を削除し、インポートに変更

### Step2: NoteServiceの検索ロジックを簡潔化

**変更前の意図**：
- `NoteService.search`内で`text`と`tag`を個別にtrimして、長さチェックしていた
- バリデーションロジックが`NoteService`に混在していた

**変更後の意図**：
- `SearchQuery.isValid()`を使ってバリデーションを委譲する
- `NoteService`は「有効なクエリなら検索を実行する」という責務に集中する

**手順**：
1. `NoteService.search`を`SearchQuery.isValid()`を使う形に変更
2. 不要なtrim処理を削除（`SearchQuery`側で処理）

### Step3: テストを更新して読みやすくする

**変更前の意図**：
- テストで`SearchQuery`を直接オブジェクトリテラルで作成していた
- バリデーションの意図がテストコードから読み取りにくかった

**変更後の意図**：
- `SearchQuery`の`isValid()`を使ったテストに変更
- テストの意図が明確になる（「有効なクエリ」「無効なクエリ」が分かりやすい）

**手順**：
1. `search.test.ts`を更新し、`SearchQuery.isValid()`を使ったテストに変更
2. テストケースの説明を明確化

### Step4: UIの状態管理を整理（軽く）

**変更前の意図**：
- `app/page.tsx`に検索関連の状態（`q`, `target`, `tag`, `notes`, `error`, `loading`）が散在していた
- 状態更新のロジックがコンポーネント内に混在していた

**変更後の意図**：
- カスタムフック`useNoteSearch`を作成し、検索関連の状態とロジックを集約する
- コンポーネントは「UIの描画」に集中できるようにする

**手順**：
1. `app/page.tsx`内に`useNoteSearch`フックを作成
2. 検索関連の状態とロジックを移動
3. コンポーネント側でフックを使う形に変更

## 5. 写経用コード（ファイルパスごとにコードブロック）

### 5-1. `shared/domain/SearchQuery.ts`（新規作成）

```typescript
/**
 * 検索クエリの型定義とバリデーション
 * domain層の責務として、検索条件の「有効性」を判定する
 */
export type SearchQuery = {
  text?: string;
  tag?: string;
};

/**
 * SearchQueryのバリデーションと正規化
 */
export class SearchQueryValidator {
  /**
   * 検索クエリが有効かどうかを判定する
   * - text/tagが両方空なら無効
   * - textが1文字以下なら無効（2文字以上が必要）
   * - tagは空文字列でも有効（tag検索のみの場合）
   */
  static isValid(query: SearchQuery): boolean {
    const text = query.text?.trim() ?? "";
    const tag = query.tag?.trim() ?? "";

    // 両方空なら無効
    if (text.length === 0 && tag.length === 0) return false;

    // textが1文字以下なら無効
    if (text.length > 0 && text.length < 2) return false;

    return true;
  }

  /**
   * SearchQueryを正規化する（trim処理）
   */
  static normalize(query: SearchQuery): SearchQuery {
    return {
      text: query.text?.trim() || undefined,
      tag: query.tag?.trim() || undefined,
    };
  }
}
```

### 5-2. `shared/domain/NoteRepository.ts`（変更）

**変更前**：
```typescript
export type SearchQuery = {
  text?: string;
  tag?: string;
};
```

**変更後**：
```typescript
import type { Note, NoteId } from "./Note";
import type { SearchQuery } from "./SearchQuery";

/**
 * 永続化の差し替え点
 * domain側は「どう保存するかを知らない」。
 */
export interface NoteRepository {
  save(note: Note): Promise<void>;
  findAll(): Promise<Note[]>;
  findById(id: NoteId): Promise<Note | null>;
  search(query: SearchQuery): Promise<Note[]>;
}
```

### 5-3. `shared/domain/NoteService.ts`（変更）

**変更前**：
```typescript
async search(query: SearchQuery): Promise<Note[]> {
  const text = query.text?.trim() ?? "";
  const tag = query.tag?.trim() ?? "";

  if (text.length === 0 && tag.length === 0) return [];

  if (text.length > 0 && text.length < 2) return [];

  return await this.repo.search(query);
}
```

**変更後**：
```typescript
import { Note, type CreateNoteParams } from "./Note";
import type { NoteRepository } from "./NoteRepository";
import type { SearchQuery } from "./SearchQuery";
import { SearchQueryValidator } from "./SearchQuery";

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

  async search(query: SearchQuery): Promise<Note[]> {
    // バリデーションをSearchQueryValidatorに委譲
    if (!SearchQueryValidator.isValid(query)) {
      return [];
    }

    // 正規化してから検索
    const normalized = SearchQueryValidator.normalize(query);
    return await this.repo.search(normalized);
  }
}
```

### 5-4. `shared/domain/__test__/search.test.ts`（変更）

**変更前**：
```typescript
import { NoteRepository, SearchQuery } from "../NoteRepository";
import { NoteService } from "../NoteService";

describe("NoteService.search", () => {
  it("text/tag が両方空なら空配列を返し、repoを呼ばない", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    await expect(service.search({})).resolves.toEqual([]);
    await expect(service.search({ text: "", tag: "" })).resolves.toEqual([]);
    await expect(service.search({ text: " ", tag: " " })).resolves.toEqual([]);

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("textが2文字以上ならrepo.searchを呼ぶ", async () => {
    // ...
  });
});
```

**変更後**：
```typescript
import { describe, expect, it, vi } from "vitest";
import { Note } from "../Note";
import { NoteRepository } from "../NoteRepository";
import { NoteService } from "../NoteService";
import type { SearchQuery } from "../SearchQuery";

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
  it("無効なクエリ（空/空白/1文字）なら空配列を返し、repoを呼ばない", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    // 無効なクエリのパターン
    const invalidQueries: SearchQuery[] = [
      {}, // 両方空
      { text: "", tag: "" }, // 明示的に空
      { text: " ", tag: " " }, // 空白のみ
      { text: "a", tag: "" }, // 1文字
      { text: " a ", tag: "" }, // 1文字（trim後）
    ];

    for (const query of invalidQueries) {
      await expect(service.search(query)).resolves.toEqual([]);
    }

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("有効なクエリ（textが2文字以上）ならrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    const service = new NoteService(repo);

    await expect(service.search({ text: "ab" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    // 正規化されたクエリが渡されることを確認
    expect(repo.search).toHaveBeenCalledWith({ text: "ab" });
  });

  it("有効なクエリ（tagのみ）ならrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    const service = new NoteService(repo);

    await expect(service.search({ tag: "typescript" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ tag: "typescript" });
  });
});
```

### 5-5. `app/page.tsx`（変更：状態管理を整理）

**変更前の状態管理部分**：
```typescript
const [q, setQ] = useState("");
const [target, setTarget] = useState<SearchTarget>("all");
const [tag, setTag] = useState("");
const [notes, setNotes] = useState<NoteDto[]>([]);
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
```

**変更後**（カスタムフックを追加）：

```typescript
"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type SearchTarget = "all" | "title" | "body";

async function fetchNotes(q: string, target: SearchTarget, tag: string): Promise<NoteDto[]> {
  const params = new URLSearchParams();
  if (q.trim().length > 0) params.set("q", q);
  params.set("target", target);
  if (tag.trim().length > 0) params.set("tag", tag);

  const qs = params.toString();
  const url = qs.length > 0 ? `/api/notes?${qs}` : "/api/notes";

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
    const trimmed = q.trim();
    if (trimmed.length === 0) return "一覧を表示中";
    if (trimmed.length < 2) return "検索は2文字以上で有効";
    return `検索中: "${trimmed}" （target=${target}）`;
  }, [q, target, tag]);

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

  function clear() {
    setQ("");
    setTag("");
    void load("", target, "");
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
    clear,
  };
}

export default function Page() {
  const {
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
    clear,
  } = useNoteSearch();

  useEffect(() => {
    void load("", "all", "");
  }, []);

  return (
    <main style={{ padding: 16 }}>
      <h1>Knowladge Note</h1>

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
          style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="タイトル/本文を部分一致検索（2文字以上）"
            style={{ width: 360, padding: 8 }}
          />
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="タグで検索"
            style={{ width: 200, padding: 8 }}
          />
          <button type="submit" disabled={loading}>
            検索
          </button>
          <button type="button" onClick={clear} disabled={loading}>
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
                          color: "#333",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          setQ("");
                          setTag(t);
                          void load(q, target, t);
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

## 6. 動作確認（コマンドと期待結果）

### 6-1. テストが通ることを確認

```bash
npm test
```

**期待結果**：
- すべてのテストがパスする
- `NoteService.search`のテストが`SearchQuery`を使った形で動作する

### 6-2. アプリケーションが動作することを確認

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開く

**確認手順**：
1. **一覧表示**：ページを開いたとき、既存のメモが一覧表示される
2. **検索機能**：
   - 検索欄に「ab」と入力して「検索」をクリック → 検索結果が表示される
   - 検索欄に「a」と入力して「検索」をクリック → 「検索は2文字以上で有効」と表示される
   - タグ欄に「typescript」と入力して「検索」をクリック → タグ検索結果が表示される
3. **クリア機能**：「クリア」ボタンをクリック → 検索条件がリセットされ、一覧が表示される

### 6-3. DevToolsでNetworkタブを確認

**確認手順**：
1. DevToolsを開く（F12）
2. Networkタブを開く
3. 検索欄に「test」と入力して「検索」をクリック
4. Networkタブで `/api/notes?q=test&target=all` のリクエストを確認
5. **確認ポイント**：
   - **URL**: `/api/notes?q=test&target=all` が正しく生成されているか
   - **Method**: `GET` になっているか
   - **Status**: `200` になっているか
   - **Response**: JSON形式でノートの配列が返ってきているか

## 7. ミニ課題（5〜15分で終わる）

### 課題1: SearchQueryValidatorのテストを追加する

`shared/domain/__test__/searchQuery.test.ts` を新規作成し、`SearchQueryValidator.isValid()` と `SearchQueryValidator.normalize()` のテストを書いてください。

**ヒント**：
- `isValid()`のテストケース：空クエリ、1文字、2文字以上、tagのみ、など
- `normalize()`のテストケース：前後の空白がtrimされるか、空文字列が`undefined`になるか

**確認手順**：
1. テストファイルを作成
2. `npm test` でテストが通ることを確認
3. テストカバレッジを確認（可能であれば）

### 課題2: DevToolsのConsoleタブでエラーを確認する

**確認手順**：
1. DevToolsを開く（F12）
2. Consoleタブを開く
3. アプリケーションで以下の操作を実行：
   - ページを開く
   - 検索を実行
   - クリアボタンをクリック
4. **確認ポイント**：
   - エラー（赤色）が出ていないか
   - Warning（黄色）が出ていないか
   - もしエラーが出た場合、メッセージをそのまま記録する

**期待結果**：
- エラーやWarningが出ないこと
- もし出た場合は、エラーメッセージを`doc/day4-notes.md`に記録する

## 8. 今日の振り返りテンプレ（箇条書き3つ）

- [ ] **責務の分離**：`SearchQuery`を独立ファイルに切り出し、バリデーションロジックを集約できた。これにより、検索条件の「有効性」を判定する責務が明確になった。
- [ ] **テストの読みやすさ**：`SearchQueryValidator.isValid()`を使うことで、テストの意図（「無効なクエリ」「有効なクエリ」）が明確になった。
- [ ] **変更しやすさ**：UIの状態管理を`useNoteSearch`フックに集約したことで、検索機能の変更がしやすくなった。また、`SearchQuery`が独立したファイルになったことで、検索条件の変更（例：新しい検索パラメータの追加）が容易になった。

---

## 補足：変更前後の比較

### SearchQueryの切り出し

**変更前**：
- `SearchQuery`型が`NoteRepository.ts`に定義されていた
- バリデーションロジックが`NoteService`に散在していた

**変更後**：
- `SearchQuery.ts`に型定義とバリデーションロジックを集約
- `SearchQueryValidator`クラスで「有効性判定」と「正規化」を提供

**メリット**：
- 検索条件の変更が1箇所で完結する
- バリデーションロジックが再利用可能になった
- テストが書きやすくなった

### NoteServiceの簡潔化

**変更前**：
```typescript
async search(query: SearchQuery): Promise<Note[]> {
  const text = query.text?.trim() ?? "";
  const tag = query.tag?.trim() ?? "";
  if (text.length === 0 && tag.length === 0) return [];
  if (text.length > 0 && text.length < 2) return [];
  return await this.repo.search(query);
}
```

**変更後**：
```typescript
async search(query: SearchQuery): Promise<Note[]> {
  if (!SearchQueryValidator.isValid(query)) {
    return [];
  }
  const normalized = SearchQueryValidator.normalize(query);
  return await this.repo.search(normalized);
}
```

**メリット**：
- ロジックが簡潔になり、読みやすくなった
- バリデーションの責務が`SearchQueryValidator`に委譲され、`NoteService`の責務が明確になった

### UIの状態管理整理

**変更前**：
- 検索関連の状態がコンポーネント内に散在していた
- 状態更新のロジックがコンポーネント内に混在していた

**変更後**：
- `useNoteSearch`フックに状態とロジックを集約
- コンポーネントはUIの描画に集中できる

**メリット**：
- 検索機能の変更がしやすくなった
- コンポーネントが読みやすくなった
- フックを再利用できる可能性がある
