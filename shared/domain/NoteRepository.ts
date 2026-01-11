import type { Note, NoteId } from "./Note";
import { SearchQuery } from "./SearchQuery";

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
