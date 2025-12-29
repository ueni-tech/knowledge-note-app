import Link from "next/link";

type ViewNote = {
  id: string;
  title: string;
}

const dummyNotes: ViewNote[] = [
  { id: "note_1", title: "はじめてのノート" },
  { id: "note_2", title: "RAG構成メモ" }
];

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Knowledge Note</h1>

      <div style={{ margin: "12px 0" }}>
        <Link href="/notes/new">新規メモを作成</Link>
      </div>

      <h2>一覧</h2>
      {dummyNotes.length === 0 ? (
        <p>まだメモがありません</p>
      ) : (
        <ul>
          {dummyNotes.map((n) => (
            <li key={n.id}>{n.title}</li>
          ))}
        </ul>
      )}
    </main>
  )
}