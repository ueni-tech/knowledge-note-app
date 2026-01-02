import { Note, NoteId } from "../domain/Note";
import { NoteRepository, SearchQuery } from "../domain/NoteRepository";

/**
 * インメモリ実装（サーバ再起動で消える）
 * - domainはinterface のみ維持し、infrastructure に実装を置く
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
        tag.length === 0 || n.tags.some((t) => t.toLowerCase() === tag);

      return matchesText && matchesTags;
    });
  }
}
