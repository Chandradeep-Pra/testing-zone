"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CreditCard,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import UrologicsHeader from "@/components/brand/UrologicsHeader";
import type {
  PricingPlan,
  PricingPlanVersion,
  PricingResponse,
} from "@/components/pricing/types";
import { appPath } from "@/lib/app-path";

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function currentPrice(version: PricingPlanVersion) {
  return version.discountedPrice || version.price;
}

function fallbackVersion(plan: PricingPlan): PricingPlanVersion {
  return {
    id: plan.id,
    months: plan.expiryMonths,
    price: plan.price,
    originalPrice: plan.originalPrice,
    discountedPrice: plan.discountedPrice,
    couponId: plan.couponId,
    couponCode: plan.couponCode,
    embeddedLink: plan.embeddedLink,
    durationLabel: plan.durationLabel,
    billingLabel: plan.billingLabel,
  };
}

function PlanCard({ plan, featured }: { plan: PricingPlan; featured: boolean }) {
  const options = plan.versions?.length ? plan.versions : [fallbackVersion(plan)];
  const [selectedId, setSelectedId] = useState(options[0].id);
  const selected = options.find((version) => version.id === selectedId) || options[0];
  const price = currentPrice(selected);
  const original = selected.originalPrice || selected.price;
  const saving = Math.max(0, original - price);
  const checkoutUrl = selected.embeddedLink || plan.embeddedLink;

  function beginCheckout() {
    if (!checkoutUrl) return;
    window.location.assign(checkoutUrl);
  }

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[30px] border p-5 transition duration-300 sm:p-7 ${
        featured
          ? "border-[var(--accent)] bg-[radial-gradient(circle_at_top_right,var(--accent-muted),transparent_38%),var(--surface-raised)] shadow-[0_24px_60px_var(--shadow-brand)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)] hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]"
      }`}
    >
      <div className="flex min-h-7 items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {plan.category && (
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {plan.category}
            </span>
          )}
          {plan.tag && (
            <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              {plan.tag}
            </span>
          )}
        </div>
        {featured && <Sparkles className="h-5 w-5 shrink-0 text-[var(--accent)]" />}
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
        {plan.name}
      </h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--text-secondary)]">
        {plan.description}
      </p>

      {options.length > 1 && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-muted)] p-1.5" aria-label="Choose plan duration">
          {options.map((version) => (
            <button
              key={version.id}
              type="button"
              onClick={() => setSelectedId(version.id)}
              className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                version.id === selected.id
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[0_5px_18px_var(--shadow-soft)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {version.durationLabel || `${version.months} months`}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-end gap-2">
        <span className="text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
          {money(price)}
        </span>
        {original > price && (
          <span className="pb-1 text-sm text-[var(--text-tertiary)] line-through">
            {money(original)}
          </span>
        )}
      </div>
      <div className="mt-1 flex min-h-6 flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>{selected.billingLabel || plan.billingLabel}</span>
        {saving > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
            Save {money(saving)}
          </span>
        )}
      </div>

      <div className="my-6 h-px bg-[var(--border)]" />
      <ul className="flex-1 space-y-3.5">
        {plan.featureBullets.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-5 text-[var(--text-secondary)]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {plan.availabilityNote && (
        <p className="mt-5 text-xs leading-5 text-[var(--text-tertiary)]">{plan.availabilityNote}</p>
      )}
      {selected.couponCode && (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-xs text-[var(--accent-strong)]">
          Coupon <strong>{selected.couponCode}</strong> is included in this price.
        </div>
      )}

      <button
        type="button"
        onClick={beginCheckout}
        disabled={!plan.isActive || !checkoutUrl}
        className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
          plan.isActive && checkoutUrl
            ? "bg-[var(--accent)] text-white shadow-[0_14px_30px_var(--shadow-brand)] hover:-translate-y-0.5 hover:bg-[var(--accent-hover)]"
            : "cursor-not-allowed bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
        }`}
      >
        {plan.isActive ? "Choose this plan" : "Currently unavailable"}
        {plan.isActive && <ArrowRight className="h-4 w-4" />}
      </button>
    </article>
  );
}

export default function PlansPage() {
  const [data, setData] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPlans() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(appPath("/api/pricing-plans"), { cache: "no-store" });
      const payload = (await response.json()) as PricingResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load plans.");
      setData(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load plans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  const plans = useMemo(
    () => [...(data?.plans || [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  );

  return (
    <main className="urologics-shell min-h-screen overflow-x-hidden">
      <div className="mx-auto min-h-screen w-full max-w-[1400px] px-3 pb-14 sm:px-6 lg:px-8">
        <UrologicsHeader current="Plans" product="Plans" tag="Membership & access" />

        <section className="relative overflow-hidden rounded-[34px] border border-[var(--border)] bg-[radial-gradient(circle_at_18%_8%,var(--accent-muted),transparent_30%),var(--surface-raised)] px-5 py-10 text-center shadow-[0_18px_48px_var(--shadow-soft)] sm:px-10 sm:py-14">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--accent-strong)]">
            <Sparkles className="h-4 w-4" />
            Invest in confident exam preparation
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl">
            Pick the plan that fits your next milestone.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Focused learning, realistic practice, and AI-powered feedback. Choose your access period and continue to secure checkout.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-medium text-[var(--text-secondary)] sm:text-sm">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--accent)]" /> Secure checkout</span>
            <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-[var(--accent)]" /> GBP payments</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[var(--accent)]" /> Instant access</span>
          </div>
        </section>

        <section className="mt-7">
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-3" aria-label="Loading pricing plans">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-[560px] animate-pulse rounded-[30px] border border-[var(--border)] bg-[var(--surface-raised)] p-7">
                  <div className="h-5 w-20 rounded-full bg-[var(--surface-muted)]" />
                  <div className="mt-7 h-8 w-2/3 rounded bg-[var(--surface-muted)]" />
                  <div className="mt-4 h-4 w-full rounded bg-[var(--surface-muted)]" />
                  <div className="mt-2 h-4 w-4/5 rounded bg-[var(--surface-muted)]" />
                  <div className="mt-10 h-12 w-1/2 rounded bg-[var(--surface-muted)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl rounded-[28px] border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
              <p className="font-semibold text-red-700 dark:text-red-300">Plans could not be loaded</p>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              <button type="button" onClick={() => void loadPlans()} className="urologics-button-secondary mt-5 gap-2">
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-10 text-center text-[var(--text-secondary)]">
              No plans are available right now. Please check back soon.
            </div>
          ) : (
            <div className={`grid items-stretch gap-5 ${plans.length === 1 ? "mx-auto max-w-md" : plans.length === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
              {plans.map((plan, index) => (
                <PlanCard key={plan.id} plan={plan} featured={Boolean(plan.tag) || (plans.length === 3 && index === 1)} />
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-xs leading-5 text-[var(--text-tertiary)]">
          Payments are completed on our secure checkout. Access begins after successful payment.
        </footer>
      </div>
    </main>
  );
}
