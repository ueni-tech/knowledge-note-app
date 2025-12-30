import { Note, NoteId } from "../domain/Note";
import { NoteRepository } from "../domain/NoteRepository";

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
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findById(id: NoteId): Promise<Note | null> {
    return this.notes.find((n) => n.id === id) ?? null;
  }

  async searchByText(query: string): Promise<Note[]> {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    return (await this.findAll()).filter((n) => {
      const title = n.title.toLowerCase();
      const body = n.body.toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }
}
