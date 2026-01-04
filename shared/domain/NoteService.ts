import { Note, type CreateNoteParams } from "./Note";
import type { NoteRepository } from "./NoteRepository";
import { SearchQuery, SearchQueryValidator } from "./SearchQuery";

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
    if (!SearchQueryValidator.isValid(query)) {
      return [];
    }

    const normalize = SearchQueryValidator.normalize(query);
    return await this.repo.search(normalize);
  }
}
