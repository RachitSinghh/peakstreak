import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden="true"
        className="bg-primary/25 pointer-events-none absolute -top-40 -left-40 size-[32rem] rounded-full blur-[160px]"
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-lg font-semibold tracking-tight">
          Peak<span className="text-primary">Streak</span>
        </Link>
        <div className="bg-card border-border rounded-xl border p-6">{children}</div>
      </div>
    </div>
  )
}
