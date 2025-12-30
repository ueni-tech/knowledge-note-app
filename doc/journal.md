## 12/30

- **今日できたこと**：
  - 制約とルールの追加とそのテストの実装
- **詰まったところ / 次回までに潰したい不安**：
  - テストで「repoをモック」する仕方が分からなかった。
  - repoの動きを模した関数を作ることだった。
- **設計で“守れた境界”と“怪しい境界”**：
  - Note(domain)は保存方法を知らない
  - Note(domain)にNoteを生成するルールが明記されている
  - NoteServiceのcreateの内部ではNoteで定義された静的メソッドcreateが実行される
  - NoteServiceは窓口かつ前処理係。NoteRepositoryは作業係。NoteServiceはどこに作業を依頼できるかを知っていればよい
  - 依存の向き
    - OK: app/ → `NoteService` → `NoteRepository` → 実装
    - NG: domain → app/ (ドメインがapp/に依存してはいけない)