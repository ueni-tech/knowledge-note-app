import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { SearchQuery } from '../../../../shared/domain/SearchQuery';
import { CreateNoteParams } from '../../../../shared/domain/Note';

/**
 * DTO型定義（最小限：型だけ）
 */
type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type CreateNoteDto = {
  title: string;
  body: string;
  tags?: string[];
};

/**
 * NoteエンティティをDTOに変換
 */
function toDto(note: any): NoteDto {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async getNotes(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
  ): Promise<NoteDto[]> {
    if (!q && !tag) {
      const notes = await this.notesService.list();
      return notes.map(toDto);
    }

    const searchQuery: SearchQuery = {};
    if (q && q.trim().length > 0) {
      searchQuery.text = q;
    }
    if (tag && tag.trim().length > 0) {
      searchQuery.tag = tag;
    }

    const notes = await this.notesService.search(searchQuery);
    return notes.map(toDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNote(@Body() body: CreateNoteDto): Promise<NoteDto> {
    if (typeof body.title !== 'string' || typeof body.body !== 'string') {
      throw new BadRequestException('title/body は文字列で指定してください');
    }

    const params: CreateNoteParams = {
      title: body.title,
      body: body.body,
      tags: body.tags ?? [],
    };

    const note = await this.notesService.create(params);
    return toDto(note);
  }
}
