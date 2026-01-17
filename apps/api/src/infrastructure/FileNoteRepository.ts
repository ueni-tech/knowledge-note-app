import { promises as fs } from 'fs';
import { join } from 'path';
import { Note, NoteId } from '../../../../shared/domain/Note';
import { NoteRepository } from '../../../../shared/domain/NoteRepository';
import { SearchQuery } from '../../../../shared/domain/SearchQuery';

/**
 * JSONファイル保存実装
 * - domainはinterfaceのみ維持し、infrastructure に実装を置く
 */
export class FileNoteRepository implements NoteRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath ?? join(process.cwd(), 'data', 'notes.json');
  }

  private async loadNotes(): Promise<Note[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content) as Array<{
        id: string;
        title: string;
        body: string;
        tags: string[];
        createdAt: string;
        updatedAt: string;
      }>;

      return data.map((d) =>
        Note.from({
          id: d.id,
          title: d.title,
          body: d.body,
          tags: d.tags,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        const dir = join(this.filePath, '..');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.filePath, '[]', 'utf-8');
        return [];
      }
      throw error;
    }
  }

  private async saveNotes(notes: Note[]): Promise<void> {
    const data = notes.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      tags: n.tags,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, content, 'utf-8');
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
    return notes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findById(id: NoteId): Promise<Note | null> {
    const notes = await this.loadNotes();
    return notes.find((n) => n.id === id) ?? null;
  }

  async search(query: SearchQuery): Promise<Note[]> {
    const text = query.text?.trim().toLowerCase() ?? '';
    const tag = query.tag?.trim().toLowerCase() ?? '';

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
