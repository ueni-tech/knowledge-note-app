import type { Note, NoteId } from "./Note";

/**
 * 永続化の差し替え点
 * domain側は「どう保存するかを知らない」。
 */
export interface NoteRepository {
  save(note: Note): Promise<void>;
  findAll(): Promise<void>;
  findById(id: NoteId): Promise<Note | null>;
  searchByText(query: string): Promise<Note[]>;
}
