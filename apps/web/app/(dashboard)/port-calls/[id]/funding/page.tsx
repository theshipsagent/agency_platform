// TODO Phase B: funding tab
export default function PortCallfundingPage({ params }: { params: { id: string } }) {
  return <div className="p-8"><h1 className="text-2xl font-bold">funding</h1><p className="text-muted-foreground mt-2">Port call {params.id} — funding coming in Phase B</p></div>
}
