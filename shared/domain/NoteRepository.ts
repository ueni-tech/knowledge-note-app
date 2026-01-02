import type { Note, NoteId } from "./Note";

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
  search(query: SearchQuery): Promise<Note[]>;
}
