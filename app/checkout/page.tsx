"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CircleHelp, Loader2, ReceiptText, ShieldCheck, Tag } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { appPath } from "@/lib/app-path";

import { loadPayPalSdk, type PayPalButtonOptions } from "@/lib/client/paypalSdk";
import { PayPalReminderSettings } from "@/components/payments/PayPalReminderSettings";
import { getStoredAuth, refreshStoredAuth } from "@/lib/urologics-auth";
type PaymentQuote = { total: number; taxAmount: number; originalAmount: number; discountAmount: number; amountMinor: number; currency: string; payLaterEligible: boolean };
async function paymentToken(uid: string) {
  let current = getStoredAuth();
  if (!current || current.uid !== uid) throw new Error("Please sign in again.");
  if (current.expiresAt <= Date.now() + 60000) current = await refreshStoredAuth(current);
  return current.idToken;
}

type AvailableCheckoutDetails = {
  purchaseAvailable: true;
  plan: { id: string; courseId: string; name: string; description: string };
  version: { id: string; months: number; durationLabel: string; currency: string; originalPrice: number };
  coupons: Array<{ id: string; code: string; description: string; discountType: "percent" | "amount"; discountValue: number; isMarketing: boolean; expiresAt: string | null }>;
  checkoutUrl: string;
  taxPercent: number;
  paypalClientId: string;
  paypal: { enabled: boolean; environment: "sandbox" | "live"; payLaterEnabled: boolean };
  user: { uid: string; email: string | null; name: string | null };
};
type UnavailableCheckoutDetails = { purchaseAvailable: false; message: string; plan: { id: string; name: string; description: string }; user: { uid: string; email: string | null; name: string | null } };
type CheckoutDetails = AvailableCheckoutDetails | UnavailableCheckoutDetails;
type AppliedPricing = { couponCode: string; discountAmount: number; discountedPrice: number; expiresAt: string | null };
function PurchaseSuccess() {
  const colors = ["#0f7896", "#1294ba", "#f59e0b", "#10b981", "#ec4899"];
  return <div className="relative overflow-hidden py-8 text-center">{Array.from({ length: 36 }, (_, index) => <span key={index} className="pointer-events-none absolute top-[-20px] h-3 w-2 animate-[confetti-fall_3s_ease-in_infinite]" style={{ left: `${(index * 29) % 100}%`, backgroundColor: colors[index % colors.length], animationDelay: `${(index % 12) * 0.16}s`, animationDuration: `${2.4 + (index % 7) * 0.2}s` }} />)}<div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-10 w-10" /></div><p className="relative mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#0f7896]">Payment confirmed</p><h1 className="relative mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">Thank you for your purchase!</h1><p className="relative mx-auto mt-4 max-w-md text-base leading-7 text-slate-600">Your payment was verified successfully and your course access is now active.</p><a href="https://urologics.co.uk" className="relative mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0f7896] px-8 font-bold text-white shadow-lg transition hover:bg-[#0b647d]">Login to Urologics</a><p className="relative mt-4 text-xs text-slate-500">Your purchase confirmation will be emailed to you.</p><style jsx>{`@keyframes confetti-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(620px) rotate(720deg); opacity: 0; } }`}</style></div>;
}

function CheckoutContent() {
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.uid;
  const auth = useMemo(() => ({ currentUser: userId ? { uid: userId, getIdToken: () => paymentToken(userId) } : null }), [userId]);
  const [quoteState, setQuote] = useState<(PaymentQuote & { key: string }) | null>(null);
  const [successfulPurchaseId, setSuccessfulPurchaseId] = useState<string | null>(null);
  const [payLaterVisible, setPayLaterVisible] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const activePayment = useRef(false);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState<string | null>(null);

  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applied, setApplied] = useState<AppliedPricing | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentState, setPaymentState] = useState<"idle" | "creating" | "approving" | "processing" | "success" | "cancelled" | "failed" | "pending">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [materialRequest, setMaterialRequest] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestReference, setRequestReference] = useState("");
  const [requestError, setRequestError] = useState("");
  const [concernOpen, setConcernOpen] = useState(false);
  const [paymentQuery, setPaymentQuery] = useState("");
  const [concernSaving, setConcernSaving] = useState(false);
  const [concernReference, setConcernReference] = useState("");
  const [concernEmailSent, setConcernEmailSent] = useState(false);
  const [concernError, setConcernError] = useState("");
  const paymentComplete = paymentState === "success";

  const verifyCoupon = useCallback(async (checkout: AvailableCheckoutDetails, code: string) => {
    if (!userId) throw new Error("Please sign in to apply a coupon.");
    const response = await fetch(appPath("/api/verify-coupon"), { method: "POST", headers: { Authorization: `Bearer ${await paymentToken(userId!)}`, "Content-Type": "application/json" }, body: JSON.stringify({ planId: checkout.plan.id, versionId: checkout.version.id, couponCode: code }) });
    const data = await response.json();
    if (!response.ok || !data.applied) throw new Error(data.error || "Coupon cannot be applied");
    return { couponCode: String(data.coupon?.code || code), discountAmount: Number(data.pricing?.discountAmount || 0), discountedPrice: Number(data.pricing?.discountedPrice ?? checkout.version.originalPrice), expiresAt: checkout.coupons.find((coupon) => coupon.code.toUpperCase() === String(data.coupon?.code || code).toUpperCase())?.expiresAt ?? null };
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      const returnTo = `${appPath("/checkout")}?${params.toString()}`;
      window.location.assign(`https://urologics.co.uk/login?mode=login&redirect=${encodeURIComponent(returnTo)}`);
      return;
    }
    let active = true;
    async function load() {
      try {
        const response = await fetch(`${appPath("/api/checkout")}?planId=${encodeURIComponent(params.get("planId") || "")}&versionId=${encodeURIComponent(params.get("versionId") || "")}`, { headers: { Authorization: `Bearer ${await paymentToken(userId!)}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to open checkout");
        if (active) setDetails(data as CheckoutDetails);
      } catch (nextError) { if (active) setError(nextError instanceof Error ? nextError.message : "Unable to open checkout"); }
    }
    void load();
    return () => { active = false; };
  }, [authLoading, params, userId]);

  const quoteKey = details?.purchaseAvailable ? `${details.plan.id}:${details.plan.courseId}:${details.version.id}:${applied?.couponCode || ""}` : "";
  const quote = quoteState?.key === quoteKey ? quoteState : null;

  useEffect(() => {
    if (!details?.purchaseAvailable || paymentComplete) return;
    const controller = new AbortController();
    async function loadQuote() {
      try {
        const current = auth.currentUser; if (!current || !details?.purchaseAvailable) return;
        const response = await fetch(appPath("/api/paypal/quote"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await current.getIdToken()}` },
          body: JSON.stringify({ planId: details.plan.id, versionId: details.version.id, courseId: details.plan.courseId, couponCode: applied?.couponCode || undefined }), signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to confirm this price.");
        if (!controller.signal.aborted) { setQuote({ ...data, key: quoteKey }); setQuoteError(""); }
      } catch (error) { if (!controller.signal.aborted) setQuoteError(error instanceof Error ? error.message : "Unable to confirm this price."); }
    }
    void loadQuote(); return () => controller.abort();
  }, [auth, details, applied?.couponCode, paymentComplete, quoteKey]);

  useEffect(() => {
    if (!details?.purchaseAvailable || !details.paypal.enabled || !quote || paymentComplete) return;
    const available = details;
    let disposed = false;
    const controls: Array<{ close?: () => Promise<void> }> = [];
    async function render() {
      try {
        const sdk = await loadPayPalSdk(available.paypalClientId, quote!.currency, available.paypal.environment === "sandbox");
        if (disposed) return;
        setPayLaterVisible(false);
        const currentUid = auth.currentUser?.uid;
        const storageKey = `paypal-attempt:${currentUid}:${available.paypal.environment}:${available.plan.id}:${available.plan.courseId}:${available.version.id}:${quote!.amountMinor}:${applied?.couponCode || ""}`;
        const savedOrder = sessionStorage.getItem(`paypal-order:${storageKey}`);
        setPendingOrder(savedOrder || null);
        const options = (intent: "paypal" | "paylater"): PayPalButtonOptions => ({
          fundingSource: intent === "paylater" ? sdk.FUNDING.PAYLATER : sdk.FUNDING.PAYPAL,
          style: { layout: "vertical", shape: "pill", height: 48 },
          createOrder: async () => {
            if (activePayment.current) throw new Error("A payment is already being processed.");
            activePayment.current = true; setPaymentState("creating"); setPaymentMessage("");
            try {
              const user = auth.currentUser; if (!user) throw new Error("Please sign in again.");
              const key = `paypal-attempt:${user.uid}:${available.paypal.environment}:${available.plan.id}:${available.plan.courseId}:${available.version.id}:${quote!.amountMinor}:${applied?.couponCode || ""}`;
              let attemptId = sessionStorage.getItem(key); if (!attemptId) { attemptId = crypto.randomUUID(); sessionStorage.setItem(key, attemptId); }
              const response = await fetch(appPath("/api/paypal/create-order"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
                body: JSON.stringify({ courseId: available.plan.courseId, planId: available.plan.id, versionId: available.version.id, couponCode: applied?.couponCode || undefined, attemptId, checkoutIntent: intent }) });
              const data = await response.json();
              if (!response.ok && data.code === "START_NEW_CHECKOUT") setRestartKey(key);
              if (!response.ok) throw new Error(data.error || "Unable to start payment.");
              setPendingOrder(String(data.orderId)); sessionStorage.setItem(`paypal-order:${key}`, String(data.orderId)); setPaymentState("approving"); return String(data.orderId);
            } catch (error) { activePayment.current = false; throw error; }
          },
          onApprove: async ({ orderID }) => {
            setPaymentState("processing"); setPaymentMessage("");
            try {
              const user = auth.currentUser; if (!user) throw new Error("Please sign in again.");
              setPendingOrder(orderID);
              const response = await fetch(appPath("/api/paypal/capture-order"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ orderId: orderID }) });
              const data = await response.json();
              if (!response.ok) { setPaymentState(data.pending ? "pending" : "failed"); throw new Error(data.error || "Payment verification is pending."); }
              sessionStorage.removeItem(storageKey); sessionStorage.removeItem(`paypal-order:${storageKey}`); setSuccessfulPurchaseId(data.purchaseId); setPaymentState("success");
            } catch (error) { setPaymentMessage(error instanceof Error ? error.message : "Payment verification is pending."); setPaymentState(state => state === "pending" ? state : "failed"); }
            finally { activePayment.current = false; }
          },
          onCancel: () => { activePayment.current = false; setPaymentState("cancelled"); setPaymentMessage("Checkout was closed. Check the payment status before trying again."); },
          onError: () => { activePayment.current = false; setPaymentState("failed"); setPaymentMessage("PayPal checkout could not finish. Check the same payment before trying again."); },
        });
        const normalContainer = document.getElementById("paypal-button-container");
        if (normalContainer) { normalContainer.replaceChildren(); const button = sdk.Buttons(options("paypal")); controls.push(button); await button.render(normalContainer); }
        if (disposed) return;
        const cardContainer = document.getElementById("paypal-card-button-container");
        if (cardContainer) {
          cardContainer.replaceChildren();
          // Cards use the same server-verified PayPal order and capture flow.
          const card = sdk.Buttons({ ...options("paypal"), fundingSource: sdk.FUNDING.CARD });
          controls.push(card);
          if (card.isEligible()) await card.render(cardContainer);
        }
        if (disposed) return;
        if (quote!.payLaterEligible && available.paypal.payLaterEnabled) {
          const later = sdk.Buttons(options("paylater")); controls.push(later);
          if (later.isEligible()) {
            setPayLaterVisible(true);
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            if (disposed) return;
            const container = document.getElementById("paypal-paylater-button"); if (container) { container.replaceChildren(); await later.render(container); }
            const message = document.getElementById("paypal-paylater-message");
            if (message && sdk.Messages) { message.replaceChildren(); await sdk.Messages({ amount: quote!.total.toFixed(2), placement: "payment", style: { layout: "text", logo: { type: "inline" }, text: { color: "black", size: 14 } } }).render(message); }
          }
        }
      } catch (error) { if (!disposed) { setPaymentState("failed"); setPaymentMessage(error instanceof Error ? error.message : "Unable to load checkout."); } }
    }
    void render();
    return () => { disposed = true; for (const control of controls) void control.close?.().catch(() => {}); };
  }, [auth, details, quote, applied?.couponCode, paymentComplete]);

  async function retryPayment() {
    const user = auth.currentUser; if (!user || !pendingOrder || activePayment.current) return;
    activePayment.current = true; setPaymentState("processing"); setPaymentMessage("");
    try {
      const response = await fetch(appPath("/api/paypal/capture-order"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ orderId: pendingOrder }) });
      const data = await response.json();
      if (!response.ok && data.code === "CHECKOUT_APPROVAL_REQUIRED") { setPaymentState("idle"); setPaymentMessage("Please finish approval using the PayPal button."); return; }
      if (!response.ok && data.code === "PAYMENT_NOT_COMPLETED" && details?.purchaseAvailable && quote) {
        setRestartKey(`paypal-attempt:${user.uid}:${details.paypal.environment}:${details.plan.id}:${details.plan.courseId}:${details.version.id}:${quote.amountMinor}:${applied?.couponCode || ""}`);
      }
      if (!response.ok) throw new Error(data.error || "Payment verification is pending.");
      if (details?.purchaseAvailable && quote) {
        const key = `paypal-attempt:${user.uid}:${details.paypal.environment}:${details.plan.id}:${details.plan.courseId}:${details.version.id}:${quote.amountMinor}:${applied?.couponCode || ""}`;
        sessionStorage.removeItem(key); sessionStorage.removeItem(`paypal-order:${key}`);
      }
      setSuccessfulPurchaseId(data.purchaseId); setPaymentState("success");
    } catch (error) { setPaymentState("pending"); setPaymentMessage(error instanceof Error ? error.message : "Payment verification is pending."); }
    finally { activePayment.current = false; }
  }

  async function applyCoupon(code = couponCode) {
    if (!details?.purchaseAvailable || !code.trim()) return;
    try { setVerifying(true); setCouponError(""); const normalized = code.trim().toUpperCase(); setCouponCode(normalized); setApplied(await verifyCoupon(details, normalized)); }
    catch (nextError) { setApplied(null); setCouponError(nextError instanceof Error ? nextError.message : "Coupon cannot be applied"); }
    finally { setVerifying(false); }
  }

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div>;
  if (!details) return <div className="flex items-center justify-center gap-3 py-16 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Continuing to checkout...</div>;

  if (!details.purchaseAvailable) {
    const unavailable = details;
    async function submitRequest(event: FormEvent<HTMLFormElement>) {
      event.preventDefault(); if (!user) return;
      try { setRequestSaving(true); setRequestError(""); const response = await fetch(appPath("/api/plan-waitlist"), { method: "POST", headers: { Authorization: `Bearer ${user.idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ requestType: "course-material", planId: unavailable.plan.id, requestedCourseMaterial: materialRequest }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to submit request"); setRequestReference(String(data.id || "submitted")); }
      catch (error) { setRequestError(error instanceof Error ? error.message : "Unable to submit request"); } finally { setRequestSaving(false); }
    }
    return <div className="space-y-6"><a href={appPath("/plans")} className="inline-flex items-center gap-2 text-sm font-medium text-[#0f7896]"><ArrowLeft className="h-4 w-4" />Back to plans</a><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Plan availability</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{details.plan.name}</h1><p className="mt-3 text-slate-600">Purchase for this plan isn&apos;t available right now.</p></div>{requestReference ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><p className="font-semibold">Your request has been received</p><p className="mt-2 text-sm">A confirmation has been sent to {details.user.email}. We will contact you when suitable material is available.</p></div> : <form onSubmit={submitRequest} className="space-y-4 rounded-2xl border border-cyan-900/10 bg-cyan-50/40 p-5"><p className="text-sm text-slate-600">Tell us what course material you need.</p><label className="block text-sm font-medium">Name<input readOnly value={details.user.name || "Member"} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label><label className="block text-sm font-medium">Email<input readOnly value={details.user.email || ""} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label><label className="block text-sm font-medium">What course material do you need?<textarea required minLength={10} value={materialRequest} onChange={(event) => setMaterialRequest(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl border border-slate-200 bg-white p-3" placeholder="Topics, videos, question banks, mock exams..." /></label>{requestError ? <p className="text-sm text-rose-600">{requestError}</p> : null}<button disabled={requestSaving || materialRequest.trim().length < 10} className="min-h-12 w-full rounded-full bg-[#0f7896] font-semibold text-white disabled:opacity-50">{requestSaving ? "Sending..." : "Join priority list"}</button></form>}</div>;
  }

  const checkout = details;
  if (paymentComplete) return <div className="space-y-5"><PurchaseSuccess />{successfulPurchaseId && <PayPalReminderSettings purchaseId={successfulPurchaseId} save={async body => {
    const user = auth.currentUser; if (!user) throw new Error("Please sign in again.");
    const response = await fetch(appPath("/api/paypal/reminders"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error("Unable to save reminders.");
  }} />}</div>;

  const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: details.version.currency }).format(value);
  const wholeMoney = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: details.version.currency, minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value);
  const subtotal = applied?.discountedPrice ?? details.version.originalPrice;
  const platformFee = quote?.taxAmount ?? Math.round(subtotal * details.taxPercent) / 100;
  const total = quote?.total ?? Math.round((subtotal + platformFee) * 100) / 100;
  const canRaiseConcern = paymentState === "failed" || paymentState === "cancelled" || paymentState === "pending";

  async function submitConcern(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { setConcernSaving(true); setConcernError(""); const response = await fetch(appPath("/api/payment-queries"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: checkout.user.name || user?.name || "Member", email: checkout.user.email || user?.email || "", query: paymentQuery, planId: checkout.plan.id, versionId: checkout.version.id, couponCode: applied?.couponCode || couponCode.trim(), platform: "web" }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to raise concern"); setConcernReference(String(data.queryId || "")); setConcernEmailSent(data.emailSent === true); }
    catch (error) { setConcernError(error instanceof Error ? error.message : "Unable to raise concern"); } finally { setConcernSaving(false); }
  }

  return <div className={`relative space-y-6 ${paymentState === "creating" ? "min-h-40 [&>*:not(.payment-loading)]:invisible" : ""}`}>
    {paymentState === "creating" ? <div className="payment-loading absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center"><div className="grid h-12 w-12 place-items-center rounded-full bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"><Loader2 className="h-6 w-6 animate-spin" /></div><p className="text-sm font-semibold text-slate-700">Proceeding to checkout...</p></div> : null}
    <a href={appPath("/plans")} className="inline-flex items-center gap-2 text-sm font-medium text-[#0f7896]"><ArrowLeft className="h-4 w-4" />Back to plans</a>
    <div className="flex items-center gap-3 text-emerald-700"><ShieldCheck className="h-6 w-6" /><span className="font-semibold">Signed in and ready for secure checkout</span></div>
    {params.get("queryId") ? <div className="flex items-start gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-cyan-900"><CircleHelp className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Your payment query is linked</p><p className="mt-1 text-sm">Support reference: {params.get("queryId")}</p></div></div> : null}
    <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Course checkout</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{details.plan.name}</h1>{details.plan.description ? <p className="mt-3 text-slate-600">{details.plan.description}</p> : null}</div>
    <div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-end justify-between gap-4"><div><p className="font-medium text-slate-900">{details.version.durationLabel || `${details.version.months} months`}</p><p className="mt-2 text-sm text-slate-500">One-time course plan purchase</p></div><div className="text-right">{applied ? <p className="text-sm text-slate-400 line-through decoration-2 decoration-orange-500">{money(details.version.originalPrice)}</p> : null}<p className={`text-2xl font-bold ${applied ? "text-emerald-700" : "text-slate-950"}`}>{money(applied?.discountedPrice ?? details.version.originalPrice)}</p></div></div></div>
    <section className="space-y-3"><div className="flex items-center gap-2"><Tag className="h-5 w-5 text-cyan-700" /><h2 className="font-semibold text-slate-950">Available coupons</h2></div>
      {details.coupons.length ? <div className="grid gap-2 sm:grid-cols-2">{details.coupons.map((coupon) => <button key={coupon.id} type="button" onClick={() => void applyCoupon(coupon.code)} disabled={verifying || ["creating", "approving", "processing", "pending"].includes(paymentState)} className={`rounded-2xl border p-3 text-left transition ${applied?.couponCode === coupon.code ? "border-cyan-600 bg-cyan-50 shadow-lg" : "border-slate-200 hover:border-cyan-300"}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-950">{coupon.code}</span>{coupon.isMarketing ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Featured</span> : null}</div><p className="mt-1 text-sm font-medium text-cyan-800">{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `${money(coupon.discountValue)} off`}</p>{coupon.description ? <p className="mt-1 text-xs text-slate-500">{coupon.description}</p> : null}</button>)}</div> : <p className="text-sm text-slate-500">No coupons are currently available for this plan.</p>}
      <div className="flex gap-2"><input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setApplied(null); setCouponError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void applyCoupon(); }} placeholder="Enter coupon code" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15" /><button type="button" onClick={() => void applyCoupon()} disabled={!couponCode.trim() || verifying || ["creating", "approving", "processing", "pending"].includes(paymentState)} className="rounded-lg border border-slate-200 px-5 font-semibold text-slate-700 disabled:opacity-50">{verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}</button></div>
      {applied ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-emerald-700"><p className="flex items-center gap-2"><Check className="h-4 w-4" />Coupon {applied.couponCode} applied</p>{applied.expiresAt ? <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs">Offer ends {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(applied.expiresAt))}</p> : null}</div> : couponError ? <p className="text-sm text-rose-600">{couponError}</p> : null}
    </section>
    <section className="rounded-2xl border border-slate-200 p-5"><div className="mb-4 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-cyan-700" /><h2 className="font-semibold text-slate-950">Bill details</h2></div><div className="space-y-3 text-sm"><div className="flex justify-between gap-4 text-slate-600"><span>{details.plan.name} · {details.version.durationLabel || `${details.version.months} months`}</span><span>{money(details.version.originalPrice)}</span></div>{applied ? <div className="flex justify-between gap-4 text-emerald-700"><span>Coupon discount ({applied.couponCode})</span><span>−{money(applied.discountAmount)}</span></div> : null}<div className="flex justify-between gap-4 text-slate-500"><span>Taxes + platform fee</span><span>+{money(platformFee)}</span></div><div className="border-t border-slate-200 pt-3"><div className="flex items-end justify-between"><span className="font-semibold text-slate-950">Total</span><div className="text-right">{applied ? <p className="text-sm text-slate-400 line-through">{money(details.version.originalPrice)}</p> : null}<span className="block text-2xl font-bold text-slate-950">{wholeMoney(total)}</span></div></div><p className="mt-1 text-right text-xs text-slate-500">Currency: {details.version.currency}</p></div></div></section>
    {paymentMessage ? <p className={`rounded-2xl p-4 text-center text-sm ${paymentState === "pending" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-600"}`}>{paymentMessage}</p> : null}
    {paymentState === "approving" && <p role="status" className="rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-900">Finish approval in PayPal to continue.</p>}
    {paymentState === "processing" ? <p className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-50 p-4 text-sm text-cyan-800"><Loader2 className="h-4 w-4 animate-spin" />Processing and verifying payment...</p> : null}
    {canRaiseConcern ? <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">{!concernOpen ? <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-950">Need help with this payment?</p><p className="mt-1 text-sm text-slate-600">Send the details to Urologics support.</p></div><button type="button" onClick={() => setConcernOpen(true)} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold">Raise concern</button></div> : concernReference ? <div className="text-emerald-800"><p className="font-semibold">Your payment concern has been raised</p><p className="mt-2 text-sm">Reference: {concernReference}. {concernEmailSent ? `A confirmation email was sent to ${details.user.email}.` : "Your concern was saved successfully."}</p></div> : <form onSubmit={submitConcern} className="space-y-4"><div><p className="font-semibold">Raise a payment concern</p><p className="mt-1 text-sm text-slate-600">Account and plan details are filled automatically.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Name<input readOnly value={details.user.name || user?.name || "Member"} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label><label className="text-sm font-medium">Email<input readOnly value={details.user.email || user?.email || ""} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3" /></label></div><div className="rounded-xl bg-white p-3 text-sm text-slate-600"><p><strong>Plan:</strong> {details.plan.name}</p><p><strong>Duration:</strong> {details.version.durationLabel || `${details.version.months} months`}</p><p><strong>Coupon:</strong> {applied?.couponCode || couponCode.trim() || "Not provided"}</p></div><label className="block text-sm font-medium">Describe the payment problem<textarea required maxLength={2000} value={paymentQuery} onChange={(event) => setPaymentQuery(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3" placeholder="Tell us what happened during payment..." /></label>{concernError ? <p className="text-sm text-rose-600">{concernError}</p> : null}<div className="flex gap-2"><button disabled={concernSaving || !paymentQuery.trim()} className="rounded-full bg-[#0f7896] px-5 py-2 font-semibold text-white disabled:opacity-50">{concernSaving ? "Sending..." : "Submit concern"}</button><button type="button" onClick={() => setConcernOpen(false)} className="px-4 text-sm font-semibold">Cancel</button></div></form>}</section> : null}
      {quoteError && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{quoteError}</p>}
      {!details.paypal.enabled ? <p role="status" className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Online payments are being prepared. Please contact us if you need help purchasing this plan.</p> : <div className={`space-y-4 ${paymentState === "approving" || paymentState === "processing" || paymentState === "pending" ? "pointer-events-none opacity-50" : ""}`}>
        {details.paypal.environment === "sandbox" && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Sandbox checkout - test payments only</p>}
        <div id="paypal-button-container" />
        <div id="paypal-card-button-container" className="empty:hidden" />
        <section hidden={!payLaterVisible || !quote?.payLaterEligible || !details.paypal.payLaterEnabled} className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/70 to-white p-5">
          <p className="mb-3 text-sm font-semibold text-slate-900">More ways to pay</p>
          <div id="paypal-paylater-message" className="mb-4" />
          <div id="paypal-paylater-button" />
        </section>
        {!quote && !quoteError && <p role="status" className="text-center text-sm text-slate-500">Confirming your price...</p>}
      </div>}
      {pendingOrder && ["idle", "pending", "failed", "cancelled"].includes(paymentState) && <button type="button" onClick={() => void retryPayment()} className="w-full rounded-full">Check this payment</button>}
      {restartKey && <button type="button" className="w-full rounded-full" onClick={() => {
        sessionStorage.removeItem(restartKey); sessionStorage.removeItem(`paypal-order:${restartKey}`);
        setRestartKey(null); setPendingOrder(null); setPaymentMessage(""); setPaymentState("idle");
      }}>Start a new checkout</button>}
  </div>;
}

export default function CheckoutPage() {
  return <main className="pricing-experience min-h-screen bg-gradient-to-b from-cyan-50 to-white px-4 py-12 sm:py-16"><div className="checkout-surface mx-auto max-w-xl rounded-[30px] border border-cyan-900/10 bg-white p-6 shadow-xl sm:p-10"><Suspense fallback={<p className="py-16 text-center text-slate-500">Loading checkout...</p>}><CheckoutContent /></Suspense></div></main>;
}
