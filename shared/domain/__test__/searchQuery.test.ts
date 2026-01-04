import { describe, expect, it, vi } from "vitest";
import { SearchQueryValidator, type SearchQuery } from "../SearchQuery";

describe("searchQueryValidator.isValid", () => {
  it("空クエリであればfalseを返す", () => {
    const query: SearchQuery = { text: "", tag: "" };
    expect(SearchQueryValidator.isValid(query)).toBe(false);
  });

  it("1文字であればfalseを返す", () => {
    const query: SearchQuery = { text: " a ", tag: "" };
    expect(SearchQueryValidator.isValid(query)).toBe(false);
  });

  it("2文字であればtrueを返す", () => {
    const query: SearchQuery = { text: " ab ", tag: "" };
    expect(SearchQueryValidator.isValid(query)).toBe(true);
  });

  it("tagのみであればtrueを返す", () => {
    const query: SearchQuery = { text: "", tag: " typescript " };
    expect(SearchQueryValidator.isValid(query)).toBe(true);
  });
});

describe("searchQueryValidator.normalize", () => {
  it("前後の空白をtrimする", () => {
    const query: SearchQuery = { text: " hello ", tag: " world " };
    const result = SearchQueryValidator.normalize(query);
    expect(result.text).toBe("hello");
    expect(result.tag).toBe("world");
  });

  it("空文字列をundefinedに変換する", () => {
    const query: SearchQuery = { text: "   ", tag: "" };
    const result = SearchQueryValidator.normalize(query);
    expect(result.text).toBeUndefined();
    expect(result.tag).toBeUndefined();
  });

  it("undefinedのフィールドはそのままundefinedを返す", () => {
    const query: SearchQuery = { text: "test" };
    const result = SearchQueryValidator.normalize(query);
    expect(result.text).toBe("test");
    expect(result.tag).toBeUndefined();
  });

  it("空オブジェクトでもエラーにならない", () => {
    const query: SearchQuery = {};
    const result = SearchQueryValidator.normalize(query);
    expect(result.text).toBeUndefined();
    expect(result.tag).toBeUndefined();
  });
});
