"use client";

import { useState } from "react";
import { ChevronDown, ReceiptText } from "lucide-react";
import AccountSectionError from "@/components/profile/AccountSectionError";
import GlobalLoading from "@/components/ui/GlobalLoading";

export type Purchase = {
  id: string;
  courseNameSnapshot?: string;
  planNameSnapshot?: string;
  paidAmount?: number;
  currency?: string;
  status?: string;
  paypalOrderId?: string;
  purchasedAt?: string | null;
  accessEndsAt?: string | null;
  createdAt?: string | null;
};

type Category = "paid" | "pending" | "cancelled" | "failed" | "refunded" | "reversed" | "unknown";
const FILTERS: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "All statuses" }, { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" }, { value: "refunded", label: "Refunded" },
  { value: "reversed", label: "Reversed" },
];

export function purchaseCategory(status?: string): Category {
  const normalized = (status || "CREATED").trim().toUpperCase();
  if (["COMPLETED", "SUCCEEDED", "SUCCESS", "PAID", "CAPTURED"].includes(normalized)) return "paid";
  if (["CANCELLED", "CANCELED", "VOIDED"].includes(normalized)) return "cancelled";
  if (["FAILED", "DENIED", "DECLINED"].includes(normalized)) return "failed";
  if (normalized === "REFUNDED") return "refunded";
  if (normalized === "REVERSED") return "reversed";
  if (["CREATED", "PENDING", "APPROVED", "PROCESSING", "SAVED", "PAYER_ACTION_REQUIRED"].includes(normalized)) return "pending";
  return "unknown";
}

function dateLabel(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function amountLabel(purchase: Purchase) {
  if (purchase.paidAmount === undefined || purchase.paidAmount === null || !Number.isFinite(Number(purchase.paidAmount))) return "Not available";
  const currency = purchase.currency || "GBP";
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(purchase.paidAmount)); }
  catch { return `${Number(purchase.paidAmount).toFixed(2)} ${currency}`; }
}

function Status({ purchase }: { purchase: Purchase }) {
  const category = purchaseCategory(purchase.status);
  const label = category === "unknown" ? (purchase.status || "Unknown").replace(/[_-]/g, " ").toLowerCase() : category;
  const tone = category === "paid" ? "account-status-success" : category === "failed" ? "account-status-danger" : category === "pending" ? "account-status-warning" : "";
  return <span className={`account-status ${tone}`}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>;
}

function PurchaseDetails({ purchase }: { purchase: Purchase }) {
  return (
    <details className="account-purchase-details">
      <summary aria-label={`Details for ${purchase.courseNameSnapshot || purchase.planNameSnapshot || "purchase"} on ${dateLabel(purchase.purchasedAt || purchase.createdAt)}`}>Details<ChevronDown size={13} aria-hidden="true" /></summary>
      <dl>
        <div><dt>Order reference</dt><dd>{purchase.paypalOrderId || purchase.id}</dd></div>
        <div><dt>Access ends</dt><dd>{dateLabel(purchase.accessEndsAt)}</dd></div>
      </dl>
    </details>
  );
}

export default function PurchaseHistory({ purchases, loading = false, error = "", onRetry, retrying = false }: {
  purchases: Purchase[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [expanded, setExpanded] = useState(false);
  const filtered = [...purchases].filter(purchase => filter === "all" || purchaseCategory(purchase.status) === filter)
    .sort((a, b) => (Date.parse(b.purchasedAt || b.createdAt || "") || 0) - (Date.parse(a.purchasedAt || a.createdAt || "") || 0));
  const visible = expanded ? filtered : filtered.slice(0, 3);

  return (
    <section className="account-panel" aria-labelledby="account-purchases-heading">
      <div className="account-section-heading"><ReceiptText size={19} aria-hidden="true" /><h2 id="account-purchases-heading">Purchase history</h2></div>
      {loading ? <div className="account-section-loading"><GlobalLoading compact label="Loading your purchases" /></div> : error ? (
        onRetry ? <AccountSectionError message={error} onRetry={onRetry} retrying={retrying} /> : <p role="alert" className="account-muted">{error}</p>
      ) : purchases.length === 0 ? (
        <div className="account-purchases-empty"><p>No purchases yet.</p><p>Your purchases will appear here after you choose a plan.</p></div>
      ) : (
        <>
          <div className="account-purchase-tools">
            <span className="account-purchase-count" role="status">{filtered.length} {filtered.length === 1 ? "purchase" : "purchases"}</span>
            <label htmlFor="purchase-status">Filter purchases<select id="purchase-status" value={filter} onChange={event => { setFilter(event.target.value as "all" | Category); setExpanded(false); }}>{FILTERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
          {filtered.length === 0 ? <p className="account-purchases-empty">No {filter} purchases.</p> : (
            <>
              <div className="account-purchases-desktop"><table className="account-purchase-table">
                <caption className="sr-only">Purchase history, newest first</caption>
                <thead><tr><th scope="col">Purchase</th><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>{visible.map(purchase => <tr key={purchase.id}>
                  <td><p className="account-purchase-name">{purchase.courseNameSnapshot || purchase.planNameSnapshot || "Course purchase"}</p>{purchase.courseNameSnapshot && purchase.planNameSnapshot && <p className="account-purchase-subtitle">{purchase.planNameSnapshot}</p>}<PurchaseDetails purchase={purchase} /></td>
                  <td className="account-purchase-date">{dateLabel(purchase.purchasedAt || purchase.createdAt)}</td><td className="account-purchase-amount">{amountLabel(purchase)}</td><td><Status purchase={purchase} /></td>
                </tr>)}</tbody>
              </table></div>
              <div className="account-purchases-mobile">{visible.map(purchase => <article key={purchase.id}>
                <div className="account-purchase-top"><div><p className="account-purchase-name">{purchase.courseNameSnapshot || purchase.planNameSnapshot || "Course purchase"}</p>{purchase.courseNameSnapshot && purchase.planNameSnapshot && <p className="account-purchase-subtitle">{purchase.planNameSnapshot}</p>}</div><p className="account-purchase-amount">{amountLabel(purchase)}</p></div>
                <div className="account-purchase-meta"><span className="account-purchase-date">{dateLabel(purchase.purchasedAt || purchase.createdAt)}</span><Status purchase={purchase} /></div>
                <PurchaseDetails purchase={purchase} />
              </article>)}</div>
            </>
          )}
          {filtered.length > 3 && <div className="account-purchases-more"><button type="button" className="account-text-link" aria-expanded={expanded} onClick={() => setExpanded(current => !current)}>{expanded ? "Show recent purchases" : `View all purchases (${filtered.length})`}</button></div>}
        </>
      )}
    </section>
  );
}
