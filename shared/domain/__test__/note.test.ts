import { describe, expect, it, vi } from "vitest";
import { Note } from "../Note";
import { NoteRepository, SearchQuery } from "../NoteRepository";
import { NoteService } from "../NoteService";

const fixedNow = new Date("2025-01-01T00:00:00.000Z");

describe("Note.create", () => {
  it("タイトル/本文があれば生成でき、trimされ、createdAt/updateAtが揃う", () => {
    const note = Note.create({
      title: " hello ",
      body: " world ",
      now: fixedNow,
      idFactory: () => "note_1",
    });

    expect(note.id).toBe("note_1");
    expect(note.title).toBe("hello");
    expect(note.body).toBe("world");
    expect(note.createdAt.toISOString()).toBe(fixedNow.toISOString());
    expect(note.updatedAt.toISOString()).toBe(fixedNow.toISOString());
  });

  it("空のタイトル/空の本文はエラー", () => {
    expect(() => Note.create({ title: " ", body: "x" })).toThrow();
    expect(() => Note.create({ title: "x", body: " " })).toThrow();
  });

  it("2000文字以上の本文はエラー", () => {
    const texts = "a".repeat(2001);
    expect(() => Note.create({ title: "hello", body: texts })).toThrow();
  });
});

function createRepoMock(): NoteRepository {
  return {
    save: vi.fn(async () => {}),
    findAll: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    search: vi.fn(async () => []),
  };
}

describe("NoteService.search", () => {
  it("クエリが空/空白/1文字なら空配列を返し、repoを呼ばない", async () => {
    const repo = createRepoMock();
    const service = new NoteService(repo);

    await expect(service.search({ text: "", tag: "" })).resolves.toEqual([]);
    await expect(service.search({ text: " ", tag: "" })).resolves.toEqual([]);
    await expect(service.search({ text: "a", tag: "" })).resolves.toEqual([]);
    await expect(service.search({ text: " a ", tag: "" })).resolves.toEqual([]);

    expect(repo.search).not.toHaveBeenCalled();
  });

  it("クエリが2文字以上ならrepo.searchを呼ぶ", async () => {
    const dummy: Note[] = [];
    const search = vi.fn(async (_q: SearchQuery) => dummy);
    const repo: NoteRepository = {
      save: vi.fn(async () => {}),
      findAll: vi.fn(async () => []),
      findById: vi.fn(async () => null),
      search,
    };
    search.mockResolvedValue(dummy);
    const service = new NoteService(repo);

    await expect(service.search({ text: "ab", tag: "" })).resolves.toBe(dummy);
    expect(repo.search).toHaveBeenCalledTimes(1);
    expect(repo.search).toHaveBeenCalledWith({ text: "ab", tag: "" });
  });
});
