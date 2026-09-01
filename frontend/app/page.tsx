import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="text-lg font-semibold text-navy">Paref Cup</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">March 14, 2026 &middot; Rizal Memorial Football Stadium, Manila</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Paref Cup 2026
            </h1>
            <p className="mt-4 text-base leading-relaxed text-foreground/80 sm:text-lg">
              A one-day youth football event bringing together club teams from across the
              league for a full day of matches, food, and games. Register as a parent to add
              your players, order event shirts, and reserve meal and activity items ahead of
              time — pickup and payment verification happen on-site at the event.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Register as a Parent</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Log In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-5 text-center text-xs text-muted">
        <Link href="/admin/login" className="hover:text-foreground hover:underline">
          Admin &amp; Staff Login
        </Link>
      </footer>
    </div>
  );
}
