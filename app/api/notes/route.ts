import { NoteService } from "../../../shared/domain/NoteService";
import { InMemoryNoteRepository } from "../../../shared/infrastructure/InMemoryNoteRepository";
import type { Note } from "../../../shared/domain/Note";
import { NextResponse } from "next/server";

type NoteDto = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

function toDto(note: Note): NoteDto {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    tags: note.tags,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

// 同一プロセス内だけで保持する（サーバ再起動で消える）
const repo = new InMemoryNoteRepository();
const service = new NoteService(repo);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const tag = url.searchParams.get("tag") ?? "";

  const rawTarget = url.searchParams.get("target") ?? "all";
  const target =
    rawTarget === "title" || rawTarget === "body" || rawTarget === "all"
      ? rawTarget
      : "all";

  const searchQuery: { text?: string; tag?: string } = {};
  if (q.trim().length > 0) {
    searchQuery.text = q;
  }
  if (tag.trim().length > 0) {
    searchQuery.tag = tag;
  }

  if (Object.keys(searchQuery).length === 0) {
    const notes = await service.list();
    return NextResponse.json(notes.map(toDto));
  }

  let notes = await service.search(searchQuery);

  if (q.trim().length > 0 && target !== "all") {
    const qLower = q.trim().toLowerCase();
    notes = notes.filter((n) => {
      if (target === "title") {
        return n.title.toLowerCase().includes(qLower);
      } else if (target === "body") {
        return n.body.toLowerCase().includes(qLower);
      }
      return true;
    });
  }

  return NextResponse.json(notes.map(toDto));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        {
          error: "リクエストボディが不正です",
        },
        {
          status: 400,
        }
      );
    }

    const {
      title,
      body: noteBody,
      tags,
    } = body as {
      title?: unknown;
      body?: unknown;
      tags?: unknown;
    };

    if (typeof title !== "string" || typeof noteBody !== "string") {
      return NextResponse.json(
        {
          error: "title/body は文字列で指定してください",
        },
        {
          status: 400,
        }
      );
    }

    let tagsArray: string[] = [];
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          {
            error: "tags は配列で指定してください",
          },
          {
            status: 400,
          }
        );
      }
      if (!tags.every((t) => typeof t === "string")) {
        return NextResponse.json(
          {
            error: "tags の各要素は文字列で指定してください",
          },
          {
            status: 400,
          }
        );
      }
      tagsArray = tags;
    }

    const note = await service.create({
      title,
      body: noteBody,
      tags: tagsArray,
    });
    return NextResponse.json(toDto(note), {
      status: 201,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}
