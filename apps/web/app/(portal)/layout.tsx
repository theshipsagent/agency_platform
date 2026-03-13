// TODO Phase B: Principal portal layout with separate Clerk org scope
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main>{children}</main>
    </div>
  )
}
