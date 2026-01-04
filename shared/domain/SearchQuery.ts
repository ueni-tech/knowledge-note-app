/**
 * 検索クエリの型定義とバリデーション
 * domain層の責務として、検索条件の「有効性」を判定
 */
export type SearchQuery = {
  text?: string;
  tag?: string;
};

/**
 * SearchQueryのバリデーションを正規化
 */
export class SearchQueryValidator {
  /**
   * 検索クエリが有効かどうかを判定する
   * - text/tagが両方空なら無効
   * - textが1文字以下になら無効（2文字以上が必要）
   * - tagは空文字列でも有効（tag検索のみの場合）
   */
  static isValid(query: SearchQuery): boolean {
    const text = query.text?.trim() ?? "";
    const tag = query.tag?.trim() ?? "";

    if (text.length === 0 && tag.length === 0) return false;
    if (text.length > 0 && text.length < 2) return false;

    return true;
  }

  /**
   * SearchQueruを正規化する(trim処理)
   */
  static normalize(query: SearchQuery): SearchQuery {
    return {
      text: query.text?.trim() || undefined,
      tag: query.tag?.trim() || undefined,
    };
  }
}
