// TODO Phase B: tasks tab
export default function PortCalltasksPage({ params }: { params: { id: string } }) {
  return <div className="p-8"><h1 className="text-2xl font-bold">tasks</h1><p className="text-muted-foreground mt-2">Port call {params.id} — tasks coming in Phase B</p></div>
}
