# Day1：Next.js(App Router)最小画面 + shared/domain土台 + Vitestでドメインテスト1本

## 1. 今日のゴール（3行）
- Next.js(App Router)で最低限の画面（一覧と作成リンク）を表示できる
- `shared/domain` に `Note` エンティティと作成関数（生成ルール）を用意する
- Vitestで domain のテスト1本が通る

## 2. 今日やることチェックリスト（チェックボックス）
- [ ] Next.js(App Router)プロジェクトを生成する（最小オプション）
- [ ] `shared/domain` に `Note` / `NoteRepository` / `NoteService` を追加する
- [ ] Vitestを追加し、`shared/domain` のテストを1本通す
- [ ] `app/page.tsx` に「一覧」と「作成リンク」を表示する

## 3. ディレクトリ構成（ツリー）
（create-next-appで生成されるものは省略あり）

```text
knowledge-note-app/
  app/
    page.tsx
  doc/
    day1.md
  shared/
    domain/
      Note.ts
      NoteRepository.ts
      NoteService.ts
      __tests__/
        note.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
  (その他: public/, next.config.*, etc...)
```

## 4. 実装手順（Step1, Step2...）
### Step1: Next.js(App Router)の土台を作る
このリポジトリは現状 `README.md` しか無いので、まず Next.js を入れます。

- **おすすめ（npm）**：

```bash
cd /home/uenishi/dev/knowledge-note-app

# 既にREADME.mdがあるため、create-next-appが拒否する場合があります。
# その場合は README.md を一時退避してから実行してください。
mv README.md README.md.bak

npx create-next-app@latest . --ts --app --no-eslint --no-tailwind --no-src-dir --import-alias "@/*"

# 終わったら README を戻したいなら（任意）
mv README.md.bak README.md
```

- **詰まりポイント**：
  - `create-next-app` が「空でないディレクトリは不可」と言う場合：上のように `README.md` を退避してください。
  - もし `npm` ではなく `pnpm` / `yarn` を使いたい場合：同様に `create-next-app` 実行時に選んでOKです（Day1の内容は変わりません）。

### Step2: Vitest（ドメイン用）を最小で入れる
UIのテストはDay1ではやりません。**Node環境で domain だけテスト**します。

```bash
cd /home/uenishi/dev/knowledge-note-app

# 依存は最小：Vitestのみ
npm i -D vitest
```

次に `package.json` にテスト用scriptを追加します（既存があれば上書きせず統合）。

- 例：
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`

そして `vitest.config.ts` を追加します（Node環境、tsconfigのpath解決もNext準拠でOK）。

### Step3: domain（shared/domain）を作る
Day1は「永続化」なし。なので domain は **純粋な型/ルール/インターフェース**だけ置きます。

- `Note.ts`: エンティティ + 生成ルール（create）
- `NoteRepository.ts`: 永続化の差し替え点（interfaceのみ）
- `NoteService.ts`: 薄いユースケース（Repositoryに依存、UI/Nextには依存しない）

### Step4: domain のテストを1本書いて通す
`shared/domain/__tests__/note.test.ts` を作り、**「Noteが生成できる」+「不正なら落ちる」** を1本で担保します。

### Step5: `app/page.tsx` に一覧と作成リンクを出す
Day1はまだRepository実装が無いので、一覧は **仮データ（ハードコード）**でOKです。

## 5. 写経用コード（ファイルパスごとにコードブロック）
### `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts"],
  },
});
```

### `shared/domain/Note.ts`

```ts
export type NoteId = string;

export type CreateNoteParams = {
  title: string;
  body: string;
  /**
   * テストしやすくするため注入可能にする（デフォルトは実時間）
   */
  now?: Date;
  /**
   * 生成規則を閉じ込めるため注入可能にする（デフォルトは簡易UUID）
   */
  idFactory?: () => NoteId;
};

export class Note {
  private constructor(
    public readonly id: NoteId,
    public readonly title: string,
    public readonly body: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  /**
   * Noteの生成口。ルール（バリデーション/正規化）をここに集約する。
   */
  static create(params: CreateNoteParams): Note {
    const title = params.title.trim();
    const body = params.body.trim();

    if (title.length === 0) throw new Error("title is required");
    if (body.length === 0) throw new Error("body is required");
    if (title.length > 100) throw new Error("title must be <= 100 chars");

    const now = params.now ?? new Date();
    const idFactory = params.idFactory ?? defaultIdFactory;

    return new Note(idFactory(), title, body, now, now);
  }
}

function defaultIdFactory(): NoteId {
  // Day1は「衝突しにくければOK」な簡易版（永続化導入時に差し替える前提）
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
```

### `shared/domain/NoteRepository.ts`

```ts
import type { Note, NoteId } from "./Note";

/**
 * 永続化の差し替え点（Day6で差し替える想定）。
 * domain側は「どう保存するか」を知らない。
 */
export interface NoteRepository {
  save(note: Note): Promise<void>;
  findAll(): Promise<Note[]>;
  findById(id: NoteId): Promise<Note | null>;
  searchByText(query: string): Promise<Note[]>;
}
```

### `shared/domain/NoteService.ts`

```ts
import { Note, type CreateNoteParams } from "./Note";
import type { NoteRepository } from "./NoteRepository";

/**
 * 薄いユースケース層（domain内に置く簡易版）。
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

  async search(query: string): Promise<Note[]> {
    const q = query.trim();
    if (q.length === 0) return [];
    return await this.repo.searchByText(q);
  }
}
```

### `shared/domain/__tests__/note.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { Note } from "../Note";

describe("Note.create", () => {
  it("タイトル/本文があれば生成でき、trimされ、createdAt/updatedAtが揃う", () => {
    const fixedNow = new Date("2025-01-01T00:00:00.000Z");

    const note = Note.create({
      title: "  hello  ",
      body: "  world  ",
      now: fixedNow,
      idFactory: () => "note_1",
    });

    expect(note.id).toBe("note_1");
    expect(note.title).toBe("hello");
    expect(note.body).toBe("world");
    expect(note.createdAt.toISOString()).toBe(fixedNow.toISOString());
    expect(note.updatedAt.toISOString()).toBe(fixedNow.toISOString());
  });

  it("空タイトル/空本文はエラー", () => {
    expect(() => Note.create({ title: "   ", body: "x" })).toThrow();
    expect(() => Note.create({ title: "x", body: "   " })).toThrow();
  });
});
```

### `app/page.tsx`

```tsx
import Link from "next/link";

type ViewNote = {
  id: string;
  title: string;
};

const dummyNotes: ViewNote[] = [
  { id: "note_1", title: "はじめてのノート" },
  { id: "note_2", title: "RAG構成メモ" },
];

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Knowledge Note</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/notes/new">+ 新規メモを作成</Link>
      </div>

      <h2>一覧</h2>
      {dummyNotes.length === 0 ? (
        <p>まだメモがありません</p>
      ) : (
        <ul>
          {dummyNotes.map((n) => (
            <li key={n.id}>{n.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

#### （任意・クリックで404を避けたい人向け）`app/notes/new/page.tsx`
Day1の必須ではありませんが、リンク先が404だと気持ち悪い場合はダミーページを置きます。

```tsx
import Link from "next/link";

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>新規メモ（Day1はダミー）</h1>
      <p>Day2以降で「作成」を実装します。</p>
      <Link href="/">一覧に戻る</Link>
    </main>
  );
}
```

## 6. 動作確認（コマンドと期待結果）
### Next.jsの起動

```bash
cd /home/uenishi/dev/knowledge-note-app
npm run dev
```

- **期待結果**：
  - `http://localhost:3000` にアクセスすると「Knowledge Note」「+ 新規メモを作成」「一覧」が表示される
  - （任意ページも作った場合）「新規メモを作成」を押すとダミーページが表示される

### Vitest（domainテスト）

```bash
cd /home/uenishi/dev/knowledge-note-app
npm test
```

- **期待結果**：
  - `shared/domain/__tests__/note.test.ts` が実行され、テストがパスする

## 7. ミニ課題（5〜15分で終わる）
- **課題A**：`Note.create` に「本文は2000文字まで」制約を追加し、テストも追加する
- **課題B**：`NoteService.search` に「クエリが1文字のときは空配列」ルールを入れて、テストを追加する（RepositoryはモックでOK）

## 8. 今日の振り返りテンプレ（箇条書き3つ）
- **今日できたこと**：
- **詰まったところ / 次回までに潰したい不安**：
- **設計で“守れた境界”と“怪しい境界”**：

## 明日やること（Day2の予告）
- **UIから「メモ作成（title/body）」できるようにする**（まずはインメモリでOK）
- **`NoteRepository` の in-memory 実装を `infrastructure` 側に置く**（domainはinterfaceのみを維持）
- **一覧表示をダミーデータから実データ（in-memory）に切り替える**


