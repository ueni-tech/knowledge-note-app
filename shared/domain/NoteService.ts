import { Note, type CreateNoteParams } from "./Note";
import type { NoteRepository } from "./NoteRepository";

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

  async search(query: string): Promise<Note[]> {
    const q = query.trim();
    if (q.length === 0) return [];
    return await this.repo.searchByText(q);
  }
}
