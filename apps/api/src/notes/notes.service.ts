import { Injectable } from '@nestjs/common';
import { NoteService } from '../../../../shared/domain/NoteService';
import { InMemoryNoteRepository } from '../infrastructure/InMemoryNoteRepository';
import { CreateNoteParams } from '../../../../shared/domain/Note';
import { SearchQuery } from '../../../../shared/domain/SearchQuery';

/**
 * Nest.js側のService層
 * shared/domain/NoteService をラップして、Nest.jsのDIコンテナに登録する
 */
@Injectable()
export class NotesService {
  private readonly noteService: NoteService;

  constructor() {
    const repo = new InMemoryNoteRepository();
    this.noteService = new NoteService(repo);
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
