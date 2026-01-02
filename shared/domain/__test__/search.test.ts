import { describe, expect, it, vi } from "vitest";
import { Note } from "../Note";
import { NoteRepository, SearchQuery } from "../NoteRepository";
import { NoteService } from "../NoteService";

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
  it("text/tag が両方空なら空配列を返し、repoを呼ばない", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    await expect(service.search({})).resolves.toEqual([]);
    await expect(service.search({ text: "", tag: "" })).resolves.toEqual([]);
    await expect(service.search({ text: " ", tag: " " })).resolves.toEqual([]);

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("textが2文字以上ならrepo.searchを呼ぶ", async () => {
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
});
