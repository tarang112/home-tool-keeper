import { Link } from "react-router-dom";
import { ArrowRight, Bell, Boxes, Mail, ScanBarcode, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  { icon: ScanBarcode, label: "Scan", text: "Add items from barcodes, receipts, and order emails." },
  { icon: Bell, label: "Remind", text: "Get expiry, warranty, and restock alerts before things slip." },
  { icon: Boxes, label: "Share", text: "Manage homes, rooms, and shared inventory with your household." },
];

const shelves = [
  ["Olive Oil", "2 bottles", "Pantry"],
  ["Air Filters", "4 pack", "Garage"],
  ["Coffee", "Low stock", "Kitchen"],
  ["Passport", "1 item", "Safe"],
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </span>
          HomeStock
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Start free</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-8 md:grid-cols-[1fr_0.9fr] md:pb-20 md:pt-14">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> Private home inventory, ready on mobile
          </div>
          <div className="space-y-5">
            <h1 className="font-heading text-5xl font-bold leading-tight md:text-7xl">
              Know exactly what you own, where it is, and when it expires.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              HomeStock turns scattered cabinets, receipts, warranties, and shared household supplies into one fast inventory your family can actually keep current.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">Create your inventory <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/install"><Smartphone className="h-4 w-4" /> Install app</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xl">
          <div className="absolute inset-x-0 top-0 h-20 bg-primary/10" />
          <div className="relative mx-auto h-full max-w-sm rounded-[2rem] border bg-background p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Today at home</p>
                <p className="font-heading text-2xl font-semibold">142 items</p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">Synced</span>
            </div>
            <div className="space-y-3">
              {shelves.map(([name, qty, place]) => (
                <div key={name} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border bg-card p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{name}</p>
                      <span className="text-xs text-muted-foreground">{qty}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{place}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-primary p-4 text-primary-foreground">
              <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> Order imported</div>
              <p className="mt-1 text-sm opacity-90">6 pantry items added from your latest receipt.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-card/50 px-5 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {highlights.map(({ icon: Icon, label, text }) => (
            <article key={label} className="rounded-lg border bg-background p-5">
              <Icon className="mb-4 h-6 w-6 text-primary" />
              <h2 className="font-heading text-xl font-semibold">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}