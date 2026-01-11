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
}

function defaultIdFactory(): NoteId {
  return `note_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
