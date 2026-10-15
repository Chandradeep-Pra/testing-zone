"use client";
import { useState } from "react";
import { ReceiptText } from "lucide-react";
export type Purchase = { id: string; courseNameSnapshot?: string; planNameSnapshot?: string; paidAmount?: number; currency?: string; status?: string; paypalOrderId?: string; purchasedAt?: string | null; accessEndsAt?: string | null; createdAt?: string | null };
export function purchaseCategory(status?: string): "succeeded" | "pending" | "cancelled" {
  const normalized = (status || "CREATED").toUpperCase();
  if (["COMPLETED", "SUCCEEDED", "SUCCESS", "PAID", "CAPTURED"].includes(normalized)) return "succeeded";
  if (["CANCELLED", "CANCELED", "VOIDED", "FAILED", "DENIED", "DECLINED", "REFUNDED", "REVERSED"].includes(normalized)) return "cancelled";
  return "pending";
}
export default function PurchaseHistory({ purchases }: { purchases: Purchase[] }) {
  const [tab, setTab] = useState<"succeeded" | "pending" | "cancelled">("succeeded");
  const filtered = purchases.filter(purchase => purchaseCategory(purchase.status) === tab);
  return <section className="urologics-panel p-5 sm:p-6">
    <div className="flex items-center gap-3"><ReceiptText size={20} className="text-[var(--accent-strong)]" /><h2 className="text-xl font-semibold text-[var(--text-primary)]">Purchase history</h2></div>
    <div role="tablist" aria-label="Purchase status" className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-muted)] p-1">{(["succeeded", "pending", "cancelled"] as const).map(status => <button type="button" role="tab" key={status} id={`purchase-tab-${status}`} aria-controls="purchase-list" aria-selected={tab === status} onClick={() => setTab(status)} className={`rounded-lg px-2 py-2.5 text-xs font-semibold capitalize transition ${tab === status ? "bg-[var(--accent)] text-[var(--accent-text)]" : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"}`}>{status} ({purchases.filter(purchase => purchaseCategory(purchase.status) === status).length})</button>)}</div>
    <div role="tabpanel" id="purchase-list" aria-labelledby={`purchase-tab-${tab}`} tabIndex={0} className="urologics-thin-scrollbar mt-4 h-80 space-y-3 overflow-y-auto pr-1">
      {filtered.length ? filtered.map(purchase => <article key={purchase.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold text-[var(--text-primary)]">{purchase.courseNameSnapshot || "Course purchase"}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{purchase.planNameSnapshot || "Plan"}</p></div><span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">{purchase.status || "CREATED"}</span></div><div className="mt-3 grid gap-2 break-words text-xs text-[var(--text-secondary)] sm:grid-cols-2"><p>{new Intl.NumberFormat("en-GB", { style: "currency", currency: purchase.currency || "GBP" }).format(Number(purchase.paidAmount || 0))}</p><p>Order: {purchase.paypalOrderId || "Pending"}</p><p>Purchased: {purchase.purchasedAt ? new Date(purchase.purchasedAt).toLocaleDateString("en-GB") : "Pending"}</p><p>Access expires: {purchase.accessEndsAt ? new Date(purchase.accessEndsAt).toLocaleDateString("en-GB") : "Pending"}</p></div></article>) : <p className="py-12 text-center text-sm text-[var(--text-secondary)]">No {tab} payments.</p>}
    </div>
  </section>;
}
