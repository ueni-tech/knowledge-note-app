import { describe, expect, it, vi } from "vitest";
import { Note } from "../Note";
import { NoteRepository } from "../NoteRepository";
import { NoteService } from "../NoteService";
import type { SearchQuery } from "../SearchQuery";

const fixedNow = new Date("2025-01-01T00:00:00.000Z");

function createRepoMock(): NoteRepository {
  return {
    save: vi.fn(async () => {}),
    findAll: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    search: vi.fn(async () => []),
  };
}

describe("NoteService.search", () => {
  it("無効なクエリ（空/空白/1文字）なら空配列を返し、repoを呼ばない", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    const invalidQueries: SearchQuery[] = [
      {},
      { text: "", tag: "" },
      { text: " ", tag: " " },
      { text: "a", tag: "" },
      { text: " a ", tag: "" },
    ];

    for (const query of invalidQueries) {
      await expect(service.search(query)).resolves.toEqual([]);
    }

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("有効なクエリ（textが2文字以上）ならrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    const service = new NoteService(repo);

    await expect(service.search({ text: "ab" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ text: "ab" });
  });

  it("有効なクエリ（tagのみ）ならrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    const service = new NoteService(repo);

    await expect(service.search({ tag: "typescript" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ tag: "typescript" });
  });
});
