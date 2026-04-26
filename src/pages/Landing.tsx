import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, Boxes, Check, ChevronLeft, ChevronRight, Mail, ScanBarcode, ShieldCheck, Smartphone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const testimonials = [
  { quote: "HomeStock finally made our pantry and garage searchable. We stopped buying duplicates within a week.", name: "Maya R.", role: "Busy parent" },
  { quote: "The warranty reminders paid for themselves the first time an appliance failed before coverage ended.", name: "Jon B.", role: "Homeowner" },
  { quote: "Receipt import is the difference between good intentions and actually keeping inventory current.", name: "Priya S.", role: "Small business owner" },
];

const faqs = [
  ["Can I use HomeStock with my family?", "Yes. You can share household inventory, invite members, and choose who can edit or view shared spaces."],
  ["Does it work on mobile?", "HomeStock is built as a mobile-ready web app and can be installed on supported phones for quick access."],
  ["Can I track warranties and expiry dates?", "Yes. Add expiry or warranty dates and receive reminders before food, supplies, or coverage runs out."],
  ["Is my inventory private?", "Your inventory is tied to your account and protected by sign-in. Shared homes only show items to invited members."],
];

const plans = [
  { name: "Starter", monthly: "$0", yearly: "$0", monthlyAmount: 0, yearlyAmount: 0, text: "For organizing one personal inventory.", features: ["Unlimited manual items", "Categories and locations", "Mobile install"] },
  { name: "Household", monthly: "$6", yearly: "$60", monthlyAmount: 6, yearlyAmount: 60, text: "Per home, rental, or shared property.", features: ["Shared property access", "Receipt and barcode capture", "Expiry and warranty alerts"], featured: true },
  { name: "Business", monthly: "$14", yearly: "$140", monthlyAmount: 14, yearlyAmount: 140, text: "Per location for small teams tracking stock.", features: ["Business locations", "CSV exports", "Visitor and notification history"] },
];

const comparisonRows = [
  ["Manual inventory items", "Unlimited", "Unlimited", "Unlimited"],
  ["Included locations/properties", "1", "1", "1"],
  ["Shared access", "—", "Household members", "Team members"],
  ["Barcode and receipt capture", "—", "Included", "Included"],
  ["Expiry and warranty reminders", "Basic", "Advanced", "Advanced"],
  ["Business locations", "—", "—", "Included"],
  ["Exports and visitor history", "—", "—", "Included"],
];

const getDevice = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
};

const getAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || null;
  const referrerHost = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : null;
  return {
    source: params.get("utm_source") || referrerHost || "direct",
    medium: params.get("utm_medium") || (referrerHost ? "referral" : "none"),
    campaign: params.get("utm_campaign") || null,
    referrer,
    landing_page: `${window.location.pathname}${window.location.search}`,
    session_id: sessionStorage.getItem("homestock_landing_session_id") || crypto.randomUUID(),
  };
};

const getSavedBillingCycle = (): "monthly" | "yearly" => {
  const saved = localStorage.getItem("homestock_billing_cycle");
  return saved === "yearly" ? "yearly" : "monthly";
};

export default function Landing() {
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(getSavedBillingCycle);
  const [locationCount, setLocationCount] = useState(1);
  const [lead, setLead] = useState({ name: "", email: "", householdType: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const testimonial = testimonials[testimonialIndex];
  const attribution = useMemo(getAttribution, []);

  useEffect(() => {
    localStorage.setItem("homestock_billing_cycle", billingCycle);
  }, [billingCycle]);

  useEffect(() => {
    sessionStorage.setItem("homestock_landing_session_id", attribution.session_id);
    void supabase.from("landing_page_events" as any).insert({
      event_name: "pageview",
      page: attribution.landing_page,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      referrer: attribution.referrer,
      session_id: attribution.session_id,
      device: getDevice(),
    } as any);
  }, [attribution]);

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const leadId = crypto.randomUUID();

    const { error } = await supabase.from("landing_leads" as any).insert({
      id: leadId,
      name: lead.name.trim() || null,
      email: lead.email.trim(),
      household_type: lead.householdType.trim() || null,
      message: lead.message.trim() || null,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      referrer: attribution.referrer,
      landing_page: attribution.landing_page,
      session_id: attribution.session_id,
    } as any);

    setSubmitting(false);

    if (error) {
      toast.error("Could not save your request");
      return;
    }

    toast.success("Thanks — we’ll be in touch soon");
    void supabase.from("landing_page_events" as any).insert({
      event_name: "lead_submit",
      page: attribution.landing_page,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      referrer: attribution.referrer,
      session_id: attribution.session_id,
      device: getDevice(),
      lead_id: leadId,
    } as any);
    setLead({ name: "", email: "", householdType: "", message: "" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-semibold" aria-label="HomeStock home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </span>
          HomeStock
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/auth">Start free</Link></Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-8 md:grid-cols-[1fr_0.9fr] md:pb-20 md:pt-14">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> Private home inventory, ready on mobile
          </div>
          <div className="space-y-5">
            <h1 className="font-heading text-5xl font-bold leading-tight md:text-7xl">Home inventory app for every cabinet, receipt, and reminder.</h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              HomeStock turns scattered cabinets, receipts, warranties, and shared household supplies into one fast inventory your family can actually keep current.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2"><Link to="/auth">Create your inventory <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="gap-2"><Link to="/install"><Smartphone className="h-4 w-4" /> Install app</Link></Button>
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-2xl border bg-card p-4 shadow-xl" aria-label="HomeStock inventory app preview">
          <div className="absolute inset-x-0 top-0 h-20 bg-primary/10" />
          <div className="relative mx-auto h-full max-w-sm rounded-[2rem] border bg-background p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b pb-4">
              <div><p className="text-sm text-muted-foreground">Today at home</p><p className="font-heading text-2xl font-semibold">142 items</p></div>
              <span className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">Synced</span>
            </div>
            <div className="space-y-3">
              {shelves.map(([name, qty, place]) => (
                <div key={name} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border bg-card p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary"><Boxes className="h-5 w-5" /></div>
                  <div><div className="flex items-center justify-between gap-2"><p className="font-medium">{name}</p><span className="text-xs text-muted-foreground">{qty}</span></div><p className="text-sm text-muted-foreground">{place}</p></div>
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
        <div className="mt-10 overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-[1.2fr_repeat(3,1fr)] border-b bg-muted/60 px-4 py-3 text-sm font-medium">
            <span>Feature</span><span>Starter</span><span>Household</span><span>Business</span>
          </div>
          <div className="divide-y">
            <div className="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-3 bg-primary/5 px-4 py-3 text-sm">
              <span className="font-medium">Active billing cycle</span>
              {plans.map((plan) => <span key={plan.name} className="font-medium text-primary">{billingCycle === "monthly" ? "Monthly" : "Yearly"}</span>)}
            </div>
            <div className="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-3 bg-primary/5 px-4 py-3 text-sm">
              <span className="font-medium">Price per location/property</span>
              {plans.map((plan) => <span key={plan.name} className="font-medium text-foreground">{plan[billingCycle]}/{billingCycle === "monthly" ? "mo" : "yr"}</span>)}
            </div>
            {comparisonRows.map(([feature, starter, household, business]) => (
              <div key={feature} className="grid grid-cols-[1.2fr_repeat(3,1fr)] gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{feature}</span><span className="text-muted-foreground">{starter}</span><span className="text-muted-foreground">{household}</span><span className="text-muted-foreground">{business}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl"><h2 className="font-heading text-4xl font-bold">Simple pricing for every location.</h2><p className="mt-3 text-muted-foreground">Plans are priced per home, rental, property, or business location so each space has its own inventory.</p></div>
          <div className="inline-flex rounded-lg border bg-card p-1" aria-label="Billing cycle">
            <Button type="button" variant={billingCycle === "monthly" ? "default" : "ghost"} size="sm" onClick={() => setBillingCycle("monthly")}>Monthly</Button>
            <Button type="button" variant={billingCycle === "yearly" ? "default" : "ghost"} size="sm" onClick={() => setBillingCycle("yearly")}>Yearly <span className="ml-1 text-xs opacity-80">Save 17%</span></Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`rounded-lg border p-6 ${plan.featured ? "bg-primary text-primary-foreground shadow-xl" : "bg-card"}`}>
              <h3 className="font-heading text-2xl font-semibold">{plan.name}</h3>
              <p className={`mt-2 text-sm ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{plan.text}</p>
              <div className="mt-5 flex items-end gap-1"><span className="font-heading text-4xl font-bold">{plan[billingCycle]}</span><span className={plan.featured ? "text-primary-foreground/75" : "text-muted-foreground"}>/{billingCycle === "monthly" ? "mo" : "yr"}</span></div>
              <p className={`mt-1 text-xs ${plan.featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>per location/property</p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="h-4 w-4 shrink-0" /> {feature}</li>)}
              </ul>
              <Button asChild variant={plan.featured ? "secondary" : "default"} className="mt-6 w-full">
                <Link to={`/auth?plan=${plan.name.toLowerCase()}&billing=${billingCycle}&locations=${locationCount}`}>Choose {plan.name}</Link>
              </Button>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-lg border bg-card p-5">
          <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <h3 className="font-heading text-2xl font-semibold">Pricing estimator</h3>
              <p className="mt-2 text-sm text-muted-foreground">Enter your number of locations/properties to estimate totals for the active billing cycle.</p>
              <div className="mt-4 max-w-xs space-y-2">
                <Label htmlFor="location-count">Locations/properties</Label>
                <Input id="location-count" type="number" min="1" value={locationCount} onChange={(event) => setLocationCount(Math.max(1, Number(event.target.value) || 1))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {plans.map((plan) => {
                const amount = billingCycle === "monthly" ? plan.monthlyAmount : plan.yearlyAmount;
                const total = amount * locationCount;
                return (
                  <article key={plan.name} className="rounded-lg border bg-background p-4">
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="mt-2 font-heading text-3xl font-bold">${total}</p>
                    <p className="text-xs text-muted-foreground">{locationCount} × {plan[billingCycle]}/{billingCycle === "monthly" ? "mo" : "yr"}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-10 overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[1.2fr_repeat(3,1fr)] border-b bg-muted/60 px-4 py-3 text-sm font-medium md:grid">
            <span>Feature</span><span>Starter</span><span>Household</span><span>Business</span>
          </div>
          <div className="divide-y">
            {comparisonRows.map(([feature, starter, household, business]) => (
              <div key={feature} className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.2fr_repeat(3,1fr)] md:py-3">
                <span className="font-medium">{feature}</span>
                <div className="grid grid-cols-3 gap-2 md:contents">
                  {[["Starter", starter], ["Household", household], ["Business", business]].map(([planName, value]) => (
                    <span key={planName} className="rounded-md border bg-background p-2 text-muted-foreground md:border-0 md:bg-transparent md:p-0">
                      <span className="mb-1 block text-xs font-medium text-foreground md:hidden">{planName}</span>{value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-card/50 px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div><h2 className="font-heading text-4xl font-bold">Loved by organized households.</h2><p className="mt-3 text-muted-foreground">Real workflows for the things people actually forget: filters, food, documents, and warranties.</p></div>
          <article className="rounded-lg border bg-background p-6 shadow-sm">
            <div className="mb-4 flex gap-1 text-primary">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div>
            <blockquote className="text-xl leading-8">“{testimonial.quote}”</blockquote>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div><p className="font-semibold">{testimonial.name}</p><p className="text-sm text-muted-foreground">{testimonial.role}</p></div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={() => setTestimonialIndex((testimonialIndex + testimonials.length - 1) % testimonials.length)} aria-label="Previous testimonial"><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => setTestimonialIndex((testimonialIndex + 1) % testimonials.length)} aria-label="Next testimonial"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1fr_0.9fr]">
        <div><h2 className="font-heading text-4xl font-bold">Questions before you start?</h2><div className="mt-6 space-y-4">{faqs.map(([question, answer]) => <article key={question} className="rounded-lg border bg-card p-5"><h3 className="font-semibold">{question}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p></article>)}</div></div>
        <form onSubmit={submitLead} className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-3xl font-bold">Get HomeStock updates</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tell us what you want to organize and we’ll help you get started.</p>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label htmlFor="lead-name">Name</Label><Input id="lead-name" value={lead.name} onChange={(event) => setLead({ ...lead, name: event.target.value })} placeholder="Your name" /></div>
            <div className="space-y-2"><Label htmlFor="lead-email">Email</Label><Input id="lead-email" type="email" required value={lead.email} onChange={(event) => setLead({ ...lead, email: event.target.value })} placeholder="you@example.com" /></div>
            <div className="space-y-2"><Label htmlFor="lead-type">Inventory type</Label><Input id="lead-type" value={lead.householdType} onChange={(event) => setLead({ ...lead, householdType: event.target.value })} placeholder="Home, rental, small business..." /></div>
            <div className="space-y-2"><Label htmlFor="lead-message">What do you want to track?</Label><Textarea id="lead-message" value={lead.message} onChange={(event) => setLead({ ...lead, message: event.target.value })} placeholder="Pantry, warranties, supplies, equipment..." /></div>
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Saving..." : "Join the list"}</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
