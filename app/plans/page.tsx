"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Clock3, Layers3, RefreshCw, ShieldCheck } from "lucide-react";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import type { PricingPlan, PricingPlanVersion, PricingResponse } from "@/components/pricing/types";
import { appPath } from "@/lib/app-path";

const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);

function fallback(plan: PricingPlan): PricingPlanVersion {
  return { id: plan.id, months: plan.expiryMonths, price: plan.price, originalPrice: plan.originalPrice, discountedPrice: plan.discountedPrice, couponId: plan.couponId, couponCode: plan.couponCode, embeddedLink: plan.embeddedLink, durationLabel: plan.durationLabel, billingLabel: plan.billingLabel };
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const versions = useMemo(() => (plan.versions?.length ? [...plan.versions] : [fallback(plan)]).sort((a, b) => a.months - b.months), [plan]);
  const [activeId, setActiveId] = useState(versions[0].id);
  const active = versions.find((version) => version.id === activeId) || versions[0];
  const basePrice = active.price;
  const originalPrice = active.price;
  const checkoutUrl = active.embeddedLink || plan.embeddedLink;

  function checkout() {
    if (!checkoutUrl) return;
    window.location.assign(appPath(`/checkout?planId=${encodeURIComponent(plan.id)}&versionId=${encodeURIComponent(active.id)}`));
  }

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white p-5 shadow-[0_16px_44px_rgba(15,120,150,0.08)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0f7896]" />
      <div className="flex h-full flex-col gap-7">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                
                {plan.tag ? <span className="rounded-full bg-[#0f7896]/10 px-3 py-1 text-xs font-semibold text-[#0f7896]">{plan.tag}</span> : null}
                {!plan.isActive ? <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600">Coming soon</span> : null}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#071014]">{plan.name}</h3>
            </div>
            {plan.availabilityNote ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{plan.availabilityNote}</span> : null}
          </div>
          <p className="mt-4 text-sm leading-7 text-[#071014]/60">{plan.description || "A focused Urologics learning plan built for your exam preparation."}</p>
          <div className="mt-6 space-y-3">
            {plan.featureBullets.map((feature) => <div key={feature} className="flex items-start gap-3 border-b border-[#0f7896]/8 pb-3 text-sm leading-6 text-[#071014]/72"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><span>{feature}</span></div>)}
            {!plan.featureBullets.length ? <p className="rounded-2xl border border-dashed border-[#0f7896]/15 bg-cyan-50 p-4 text-sm text-[#071014]/55">Custom access bundle</p> : null}
          </div>
        </div>

        <aside className="mt-auto border-t border-[#0f7896]/10 pt-6">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">Choose duration</p><p className="text-xs text-[#071014]/50">{versions.length} option{versions.length === 1 ? "" : "s"}</p></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {versions.map((version) => <button key={version.id} type="button" disabled={!plan.isActive} onClick={() => setActiveId(version.id)} className={`min-h-10 border px-3 py-2 text-sm font-medium transition ${version.id === active.id ? "border-[#0f7896] bg-[#0f7896] text-white" : "border-[#0f7896]/15 bg-[#f8fdff] text-[#0f7896] hover:border-[#0f7896]/40"}`}>{version.durationLabel || `${version.months} months`}</button>)}
          </div>
          <div className="mt-4 border-l-2 border-[#0f7896] bg-cyan-50 px-4 py-3 text-sm text-[#071014]/62">
            <p className="flex items-center gap-2 font-medium text-[#0f7896]"><Clock3 className="h-4 w-4" />{active.durationLabel || `Valid for ${active.months} months`}</p>
            {(active.billingLabel || plan.billingLabel) ? <p className="mt-2">{active.billingLabel || plan.billingLabel}</p> : null}
            {plan.vivaMinutes ? <p className="mt-2">Includes {plan.vivaMinutes} AI viva minutes</p> : null}
          </div>
          <div className="mt-5 border-t border-[#0f7896]/10 pt-5">
            {basePrice < originalPrice ? <p className="text-sm text-[#071014]/45 line-through decoration-2 decoration-orange-500">{money(originalPrice)}</p> : null}
            <div className="mt-1 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">{money(basePrice)}</p>{originalPrice > basePrice ? <span className="text-xs font-semibold text-emerald-700">Save {money(originalPrice - basePrice)}</span> : null}</div>
            <button type="button" onClick={checkout} disabled={!plan.isActive || !checkoutUrl} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0f7896] px-5 text-sm font-semibold text-white hover:bg-[#0b647d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{plan.isActive ? "Continue to payment" : "Coming soon"}{plan.isActive ? <ArrowRight className="h-4 w-4" /> : null}</button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#071014]/45"><ShieldCheck className="h-3.5 w-3.5" />Secure checkout · Access starts after payment</p>
          </div>
        </aside>
      </div>
    </article>
  );
}

export default function PlansPage() {
  const [data, setData] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  async function loadPlans() {
    setLoading(true); setError("");
    try {
      const response = await fetch(appPath("/api/pricing-plans"), { cache: "no-store" });
      const payload = await response.json() as PricingResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load plans.");
      setData(payload);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Unable to load plans."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadPlans(); }, []);
  const groups = useMemo(() => {
    const map = new Map<string, PricingPlan[]>();
    for (const plan of [...(data?.plans || [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const category = plan.category?.trim() || "Programs";
      map.set(category, [...(map.get(category) || []), plan]);
    }
    return [...map.entries()];
  }, [data]);
  useEffect(() => { if (!openCategory && groups.length) setOpenCategory(groups[0][0]); }, [groups, openCategory]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-cyan-50 text-[#071014]">
      <div className="mx-auto w-full max-w-[1400px] px-3 pb-16 sm:px-6 lg:px-8">
        <UrologicsHeader current="Plans" product="Plans" tag="Membership & access" />
        <header className="mb-10 mt-10 max-w-4xl sm:mb-14"><p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f7896]">Plans & payment</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#071014] sm:text-6xl">Simple plans for serious FRCS preparation.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#071014]/60">Choose the access that fits your preparation, apply an eligible offer, and continue to secure payment.</p></header>
        {loading ? <div className="space-y-5" aria-label="Loading pricing plans">{[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-[28px] border border-[#0f7896]/10 bg-white" />)}</div>
        : error ? <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center"><p className="font-semibold text-rose-700">Plans could not be loaded</p><p className="mt-2 text-sm text-rose-600">{error}</p><button type="button" onClick={() => void loadPlans()} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f7896] px-5 py-3 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Try again</button></div>
        : groups.length === 0 ? <div className="rounded-[28px] border border-[#0f7896]/12 bg-white p-10 text-center text-[#071014]/60">No plans are available right now. Please check back soon.</div>
        : <div className="space-y-6">{groups.map(([category, plans]) => { const open = openCategory === category; return <section key={category} className="overflow-hidden rounded-[32px] border border-[#0f7896]/12 bg-white shadow-[0_18px_50px_rgba(15,120,150,0.08)]"><button type="button" onClick={() => setOpenCategory(open ? null : category)} className="flex w-full items-center justify-between gap-5 bg-gradient-to-r from-white via-cyan-50/70 to-white px-5 py-6 text-left hover:bg-cyan-50 sm:px-7"><div className="flex min-w-0 items-center gap-4"><span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#0f7896] text-white shadow-[0_10px_24px_rgba(15,120,150,.22)]"><Layers3 className="h-6 w-6" /></span><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#0f7896]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0f7896]">Category</span><span className="text-xs text-[#071014]/50">{plans.length} plan{plans.length === 1 ? "" : "s"}</span></div><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">{category}</h2></div></div><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#0f7896]/12 bg-white text-[#0f7896]">{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</span></button>{open ? <div className="grid items-stretch gap-5 border-t border-[#0f7896]/10 bg-[#fbfeff] p-4 md:grid-cols-2 sm:p-6 xl:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div> : null}</section>; })}</div>}
      </div>
    </main>
  );
}
