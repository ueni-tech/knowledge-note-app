# Day6：永続化をインメモリからJSONファイル保存に差し替え

## 1. 今日のゴール（3行）
- `InMemoryNoteRepository` を `FileNoteRepository`（JSONファイル保存）に差し替える
- Nest.jsのDIコンテナを使って実装を切り替え、domain層のinterfaceは変更しないことを体感する
- サーバ再起動後もデータが残ることを確認し、永続化の価値を実感する

## 2. 今日やることチェックリスト（チェックボックス）
- [ ] `shared/domain/Note.ts` に復元用の静的メソッド `Note.from()` を追加する
- [ ] `apps/api/src/infrastructure/FileNoteRepository.ts` を作成し、JSONファイル保存を実装する
- [ ] `apps/api/src/notes/notes.service.ts` を修正し、コンストラクタでDIを受け取るようにする
- [ ] `apps/api/src/notes/notes.module.ts` を修正し、`FileNoteRepository` をDIで注入する
- [ ] データ保存用のディレクトリ（`apps/api/data`）を作成する
- [ ] 動作確認で「再起動してもデータが残る」を確認する
- [ ] 同時書き込みの注意点を理解する

## 3. ディレクトリ構成（ツリー）

```text
knowledge-note-app/
  apps/
    api/
      data/                        # Day6追加：JSONファイル保存先
        notes.json                 # 自動生成（空配列で初期化）
      src/
        infrastructure/
          InMemoryNoteRepository.ts  # Day5で作成（残すが使わない）
          FileNoteRepository.ts      # Day6追加：JSONファイル保存実装
        notes/
          notes.controller.ts        # 変更なし
          notes.module.ts            # Day6変更：DI設定を追加
          notes.service.ts           # Day6変更：DIで注入を受け取る
        main.ts                      # 変更なし
  doc/
    day6.md                         # 本資料（新規）
  shared/                           # 変更なし
    domain/
      Note.ts
      NoteRepository.ts
      NoteService.ts
      SearchQuery.ts
```

## 4. 実装手順（Step1, Step2...）

### Step1: データ保存用ディレクトリを作成する

`apps/api/data` ディレクトリを作成し、初期データファイル `notes.json` を空配列 `[]` で作成します。

**詰まりポイント**：
- ディレクトリが存在しない場合は、コード内で自動作成するか、手動で作成する
- JSONファイルが存在しない場合は、空配列で初期化する

### Step2: Noteクラスに復元用メソッドを追加する

`shared/domain/Note.ts` に、既存データを復元するための静的メソッド `from()` を追加します。`Note` のコンストラクタは `private` のため、外部から直接 `new Note(...)` を呼ぶことはできません。

**実装のポイント**：
- `Note.create()` は新規作成用（バリデーションあり、新しいID生成）
- `Note.from()` は復元用（既存データをそのまま復元、バリデーションなし）

### Step3: FileNoteRepositoryを実装する

`apps/api/src/infrastructure/FileNoteRepository.ts` を作成し、`NoteRepository` interfaceを実装します。JSONファイルの読み書きにはNode.jsの `fs/promises` を使用します。

**実装のポイント**：
- `save()`: 全件を読み込んで、該当IDがあれば更新、なければ追加して保存
- `findAll()`: JSONファイルを読み込んで、`Note.from()` を使って `Note` オブジェクトに復元（`Date` オブジェクトの復元に注意）
- `findById()`: `findAll()` の結果から該当IDを検索
- `search()`: `findAll()` の結果をフィルタリング（`InMemoryNoteRepository` と同じロジック）

**詰まりポイント**：
- JSONに保存する際、`Date` オブジェクトは文字列（ISO形式）に変換する必要がある
- JSONから読み込む際、`Note.from()` を使って `Note` インスタンスに復元する
- `Note` のコンストラクタは `private` なので、`new Note(...)` は使えない。`Note.from()` を使う
- ファイルが存在しない場合は空配列で初期化する

### Step4: NotesServiceをDI対応にする

`apps/api/src/notes/notes.service.ts` を修正し、コンストラクタで `NoteRepository` を受け取るようにします。`@Inject()` デコレータを使って、DIコンテナから注入を受け取ります。

### Step5: NotesModuleでDIを設定する

`apps/api/src/notes/notes.module.ts` を修正し、`FileNoteRepository` を `providers` に追加します。`NotesService` のコンストラクタに `FileNoteRepository` を注入するように設定します。

**詰まりポイント**：
- `NoteRepository` interfaceをトークンとして使うには、`@Inject()` と `provide` を使う必要がある
- または、`FileNoteRepository` を直接注入する方法もある（今回はこちらを採用）

### Step6: 動作確認（再起動してもデータが残る）

サーバを再起動して、作成したメモが残っていることを確認します。

## 5. 写経用コード（ファイルパスごとにコードブロック）

### `shared/domain/Note.ts`（変更：復元用メソッドを追加）

```ts
export type NoteId = string;

export type CreateNoteParams = {
  title: string;
  body: string;
  tags?: string[];
  now?: Date;
  idFactory?: () => NoteId;
};

export class Note {
  private constructor(
    public readonly id: NoteId,
    public readonly title: string,
    public readonly body: string,
    public readonly tags: string[],
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

    const rawTags = params.tags ?? [];
    const tags = rawTags.map((t) => t.trim()).filter((t) => t.length > 0);
    tags.forEach((t) => {
      if (t.length > 50) throw new Error("タグは50文字以内です");
    });

    const now = params.now ?? new Date();
    const idFactory = params.idFactory ?? defaultIdFactory;

    return new Note(idFactory(), title, body, tags, now, now);
  }

  /**
   * Day6追加: 既存データを復元するための静的メソッド
   * 永続化層（FileNoteRepository）から呼ばれる
   * バリデーションは行わない（既存データなので）
   */
  static from(data: {
    id: NoteId;
    title: string;
    body: string;
    tags: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
  }): Note {
    return new Note(
      data.id,
      data.title,
      data.body,
      data.tags,
      data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt)
    );
  }
}

function defaultIdFactory(): NoteId {
  return `note_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
```

### `apps/api/data/notes.json`（新規作成：空配列で初期化）

```json
[]
```

> 注意：このファイルは手動で作成するか、`FileNoteRepository` の初回読み込み時に自動作成されるように実装する

### `apps/api/src/infrastructure/FileNoteRepository.ts`（新規作成）

```ts
import { promises as fs } from "fs";
import { join } from "path";
import { Note, NoteId } from "../../../../shared/domain/Note";
import { NoteRepository } from "../../../../shared/domain/NoteRepository";
import { SearchQuery } from "../../../../shared/domain/SearchQuery";

/**
 * JSONファイル保存実装（再起動後も残る）
 * - domainはinterface のみ維持し、infrastructure に実装を置く
 * - Day6: InMemoryNoteRepository から差し替え
 */
export class FileNoteRepository implements NoteRepository {
  private readonly filePath: string;

  constructor(filePath?: string) {
    // デフォルトは apps/api/data/notes.json
    this.filePath = filePath ?? join(process.cwd(), "data", "notes.json");
  }

  /**
   * JSONファイルを読み込んで Note[] に復元
   * ファイルが存在しない場合は空配列を返す
   */
  private async loadNotes(): Promise<Note[]> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const data = JSON.parse(content) as Array<{
        id: string;
        title: string;
        body: string;
        tags: string[];
        createdAt: string;
        updatedAt: string;
      }>;

      // Note.from() を使って Date オブジェクトに復元
      return data.map((d) =>
        Note.from({
          id: d.id,
          title: d.title,
          body: d.body,
          tags: d.tags,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })
      );
    } catch (error: unknown) {
      // ファイルが存在しない場合は空配列を返す
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        // ディレクトリが存在しない場合は作成
        const dir = join(this.filePath, "..");
        await fs.mkdir(dir, { recursive: true });
        // 空配列で初期化
        await fs.writeFile(this.filePath, "[]", "utf-8");
        return [];
      }
      throw error;
    }
  }

  /**
   * Note[] をJSONファイルに保存
   */
  private async saveNotes(notes: Note[]): Promise<void> {
    // Date オブジェクトをISO文字列に変換
    const data = notes.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      tags: n.tags,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, content, "utf-8");
  }

  async save(note: Note): Promise<void> {
    const notes = await this.loadNotes();
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = note;
    } else {
      notes.push(note);
    }
    await this.saveNotes(notes);
  }

  async findAll(): Promise<Note[]> {
    const notes = await this.loadNotes();
    return notes.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async findById(id: NoteId): Promise<Note | null> {
    const notes = await this.loadNotes();
    return notes.find((n) => n.id === id) ?? null;
  }

  async search(query: SearchQuery): Promise<Note[]> {
    const text = query.text?.trim().toLowerCase() ?? "";
    const tag = query.tag?.trim().toLowerCase() ?? "";

    if (text.length === 0 && tag.length === 0) return [];

    const notes = await this.findAll();
    return notes.filter((n) => {
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

> **注意：同時書き込みについて**
> 
> この実装は「全件読み込み → 変更 → 全件書き込み」の方式です。複数のリクエストが同時に来た場合、最後に書き込んだ内容が上書きされる可能性があります（競合状態）。
> 
> **本番環境では以下の対策が必要**：
> - ファイルロック（`fs.open()` の `exclusive` フラグ）
> - データベース（SQLite/PostgreSQLなど）への移行
> - トランザクション管理
> 
> **今回は学習目的のため、簡単な実装を採用**します。実際のプロダクトでは、SQLite/Prisma などの適切な永続化手段を使用してください。

### `apps/api/src/notes/notes.service.ts`（変更：DIで注入を受け取る）

```ts
import { Injectable } from "@nestjs/common";
import { NoteService } from "../../../../shared/domain/NoteService";
import { CreateNoteParams } from "../../../../shared/domain/Note";
import { SearchQuery } from "../../../../shared/domain/SearchQuery";
import { FileNoteRepository } from "../infrastructure/FileNoteRepository";
import { NoteRepository } from "../../../../shared/domain/NoteRepository";

/**
 * Nest.js側のService層
 * shared/domain/NoteService をラップして、Nest.jsのDIコンテナに登録する
 * Day6: FileNoteRepository をDIで注入
 */
@Injectable()
export class NotesService {
  private readonly noteService: NoteService;

  constructor(repository: FileNoteRepository) {
    // Day6: DIで注入された FileNoteRepository を使用
    this.noteService = new NoteService(repository);
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

### `apps/api/src/notes/notes.module.ts`（変更：DI設定を追加）

```ts
import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";
import { FileNoteRepository } from "../infrastructure/FileNoteRepository";

@Module({
  controllers: [NotesController],
  providers: [
    // FileNoteRepository を provider に追加
    FileNoteRepository,
    // NotesService のコンストラクタに FileNoteRepository を注入
    {
      provide: NotesService,
      useFactory: (repository: FileNoteRepository) => {
        return new NotesService(repository);
      },
      inject: [FileNoteRepository],
    },
  ],
})
export class NotesModule {}
```

> **別の書き方（より簡潔）**：
> 
> Nest.jsでは、コンストラクタの型を自動的に解決してくれるため、以下のように書くこともできます：
> 
> ```ts
> @Module({
>   controllers: [NotesController],
>   providers: [FileNoteRepository, NotesService],
> })
> export class NotesModule {}
> ```
> 
> この場合、`NotesService` のコンストラクタで `FileNoteRepository` を要求すると、自動的に注入されます。

## 6. 動作確認（コマンドと期待結果）

### Step1: データ保存用ディレクトリを作成

```bash
cd /home/uenishi/dev/knowledge-note-app/apps/api
mkdir -p data
echo "[]" > data/notes.json
```

- **期待結果**：
  - `apps/api/data/notes.json` が作成され、空配列 `[]` が書き込まれている

### Step2: Nest.jsサーバを起動

```bash
cd /home/uenishi/dev/knowledge-note-app/apps/api
npm run dev
```

- **期待結果**：
  - `Nest.js API server is running on http://localhost:3001` が表示される
  - エラーが出ない

**詰まりポイント**：
- `FileNoteRepository` の `loadNotes()` でファイルが存在しない場合は自動作成されるが、ディレクトリが存在しない場合はエラーになる可能性がある
- その場合は、`mkdir -p data` でディレクトリを作成する

### Step3: メモを作成して確認

1. ブラウザで `http://localhost:3000` を開く
2. 「+ 新規メモを作成」からメモを作成する
3. `apps/api/data/notes.json` を確認する

- **期待結果**：
  - `notes.json` に作成したメモがJSON形式で保存されている
  - `createdAt` と `updatedAt` がISO文字列形式で保存されている

### Step4: サーバを再起動してデータが残ることを確認

1. Nest.jsサーバを停止（Ctrl+C）
2. `apps/api/data/notes.json` の内容を確認
3. Nest.jsサーバを再起動
4. ブラウザで一覧ページを開く

- **期待結果**：
  - 再起動前と同じメモが表示される
  - データが永続化されていることを確認できる

### DevToolsでの調査（必須：Network / Console / Elements / Breakpoints）

#### Network（POSTリクエストの確認）
- **操作**：
  - ブラウザで `http://localhost:3000` を開く
  - DevToolsを開き、**Network** タブを開く
  - `/new` ページでメモを作成する
- **見る観点**（対象リクエスト：`POST http://localhost:3001/notes`）：
  - URL：`http://localhost:3001/notes`
  - Method：POST
  - Status：201 Created
  - Request Payload：`{"title":"...","body":"...","tags":[...]}`
  - Response：作成されたメモのJSON（`id/title/body/tags/createdAt/updatedAt` を含む）
- **期待結果**：
  - POSTリクエストが成功し、201が返る
  - レスポンスに作成されたメモの情報が含まれている

#### Console（エラーの確認）
- **操作**：DevToolsの **Console** タブを開く
- **見る観点**：
  - 赤いエラーが出ていないか確認
  - 特にファイル読み書き関連のエラー（`ENOENT` など）が出ていないか
- **期待結果**：
  - エラーが0件（もし出たら、`FileNoteRepository` の実装を確認）

#### Elements（JSONファイルの確認）
- **操作**：
  - メモを作成した後、`apps/api/data/notes.json` をエディタで開く
  - または、ターミナルで `cat apps/api/data/notes.json | jq .` を実行
- **見る観点**：
  - JSONファイルに作成したメモが正しく保存されているか
  - `createdAt` と `updatedAt` がISO文字列形式（例：`"2024-01-12T10:30:00.000Z"`）になっているか
  - `tags` が配列形式で保存されているか
- **期待結果**：
  - JSONファイルにメモが正しく保存されている
  - 日付がISO文字列形式で保存されている

#### Breakpoints（FileNoteRepositoryの処理を追う）
- **操作**：
  - IDEで `apps/api/src/infrastructure/FileNoteRepository.ts` の `save()` メソッドにブレークポイントを置く
  - ブラウザでメモを作成する
- **見る観点**：
  - `loadNotes()` が呼ばれ、既存のメモが読み込まれている
  - `saveNotes()` が呼ばれ、新しいメモが追加されている
  - `filePath` が正しいパス（`.../apps/api/data/notes.json`）になっている
- **期待結果**：
  - `FileNoteRepository` の処理が正しく動作している
  - JSONファイルへの読み書きが正常に実行されている

### `curl` で動作確認

#### POST（作成）

```bash
curl -s -X POST "http://localhost:3001/notes" \
  -H "Content-Type: application/json" \
  -d '{"title":"永続化テスト","body":"再起動後も残るか確認","tags":["テスト","永続化"]}' | jq .
```

- **期待結果**：
  - 作成されたメモのJSONが返る
  - `apps/api/data/notes.json` に保存されている

#### GET（一覧：再起動後も残ることを確認）

```bash
# サーバを再起動した後
curl -s "http://localhost:3001/notes" | jq .
```

- **期待結果**：
  - 再起動前に作成したメモが返る
  - データが永続化されていることを確認できる

#### JSONファイルの直接確認

```bash
cat apps/api/data/notes.json | jq .
```

- **期待結果**：
  - 作成したメモがJSON形式で保存されている
  - 日付がISO文字列形式で保存されている

## 7. ミニ課題（5〜15分で終わる）

- **課題A**：`FileNoteRepository` の `save()` メソッドに、既存のメモを更新する機能を追加する（現在は実装済みだが、動作確認する）
- **課題B**：`apps/api/data/notes.json` を手動で編集して、メモを追加し、サーバを再起動して反映されることを確認する
- **課題C**：`notes.module.ts` で `InMemoryNoteRepository` と `FileNoteRepository` を切り替えられるようにする（環境変数で制御）
- **課題D（DevTools復習）**：Networkで `POST http://localhost:3001/notes` を実際に発生させ、Responseを確認した後、`apps/api/data/notes.json` を開いて、同じ内容が保存されていることを確認する。さらに、サーバを再起動して、`GET http://localhost:3001/notes` で同じメモが返ることを確認する

## 8. 発展課題（余力があれば）

### SQLite/Prisma案

JSONファイル保存の代わりに、SQLite + Prisma を使った実装も可能です。

**メリット**：
- トランザクション管理ができる
- 同時書き込みの問題を回避できる
- クエリが高速（インデックスが使える）

**デメリット**：
- セットアップが複雑（Prismaのスキーマ定義が必要）
- 依存関係が増える

**実装の流れ**：
1. Prismaをインストール：`npm install prisma @prisma/client`
2. Prismaスキーマを作成：`prisma/schema.prisma`
3. `PrismaNoteRepository` を実装
4. `notes.module.ts` で `PrismaNoteRepository` に切り替え

**参考コード（発展）**：

```ts
// apps/api/src/infrastructure/PrismaNoteRepository.ts（発展）
import { PrismaClient } from "@prisma/client";
import { Note, NoteId } from "../../../../shared/domain/Note";
import { NoteRepository } from "../../../../shared/domain/NoteRepository";
import { SearchQuery } from "../../../../shared/domain/SearchQuery";

export class PrismaNoteRepository implements NoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(note: Note): Promise<void> {
    await this.prisma.note.upsert({
      where: { id: note.id },
      update: {
        title: note.title,
        body: note.body,
        tags: note.tags,
        updatedAt: note.updatedAt,
      },
      create: {
        id: note.id,
        title: note.title,
        body: note.body,
        tags: note.tags,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  }

  async findAll(): Promise<Note[]> {
    const records = await this.prisma.note.findMany({
      orderBy: { createdAt: "asc" },
    });
    return records.map((r) => this.toNote(r));
  }

  async findById(id: NoteId): Promise<Note | null> {
    const record = await this.prisma.note.findUnique({ where: { id } });
    return record ? this.toNote(record) : null;
  }

  async search(query: SearchQuery): Promise<Note[]> {
    // Prismaのクエリビルダーで検索
    // （実装は省略）
  }

  private toNote(record: any): Note {
    return new Note(
      record.id,
      record.title,
      record.body,
      record.tags,
      record.createdAt,
      record.updatedAt
    );
  }
}
```

## 9. 今日の振り返りテンプレ（箇条書き3つ）

- **今日できたこと**：
- **詰まったところ / 次回までに潰したい不安**：
- **設計で"守れた境界"（infrastructure層の差し替え）**：
  - （例：`NoteRepository` interfaceを変更せずに、`InMemoryNoteRepository` から `FileNoteRepository` に差し替えられた。domain層が永続化の実装詳細を知らないことを確認できた）
  - （例：Nest.jsのDIコンテナを使って、実装を切り替えられた。`notes.module.ts` で `FileNoteRepository` を注入することで、`NotesService` が実装の詳細を知らないことを実感した）
  - （例：サーバ再起動後もデータが残ることを確認できた。永続化の価値を体感した）
