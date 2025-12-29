import { describe, expect, it } from "vitest";
import { Note } from "../Note";

describe("Note.create", () => {
  it("タイトル/本文があれば生成でき、trimされ、createdAt/updateAtが揃う", () => {
    const fixedNow = new Date("2025-01-01T00:00:00.000Z");

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
});
