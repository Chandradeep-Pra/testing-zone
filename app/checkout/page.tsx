"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Loader2, ReceiptText, ShieldCheck, Tag } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { appPath } from "@/lib/app-path";

type CheckoutDetails = {
  plan: { id: string; name: string; description: string };
  version: { id: string; months: number; durationLabel: string; currency: string; originalPrice: number };
  coupons: Array<{ id: string; code: string; description: string; discountType: "percent" | "amount"; discountValue: number; isMarketing: boolean; expiresAt: string | null }>;
  checkoutUrl: string;
  taxPercent: number;
};
type AppliedPricing = { couponCode: string; discountAmount: number; discountedPrice: number; expiresAt: string | null };

function CheckoutContent() {
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applied, setApplied] = useState<AppliedPricing | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "checking" | "success" | "failed">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");

  const verifyCoupon = useCallback(async (checkout: CheckoutDetails, code: string) => {
    if (!user) throw new Error("Please sign in to apply a coupon.");
    const response = await fetch(appPath("/api/verify-coupon"), { method: "POST", headers: { Authorization: `Bearer ${user.idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ planId: checkout.plan.id, versionId: checkout.version.id, couponCode: code }) });
    const data = await response.json();
    if (!response.ok || !data.applied) throw new Error(data.error || "Coupon cannot be applied");
    return { couponCode: String(data.coupon?.code || code), discountAmount: Number(data.pricing?.discountAmount || 0), discountedPrice: Number(data.pricing?.discountedPrice ?? checkout.version.originalPrice), expiresAt: checkout.coupons.find((coupon) => coupon.code.toUpperCase() === String(data.coupon?.code || code).toUpperCase())?.expiresAt ?? null };
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const returnTo = `${appPath("/checkout")}?${params.toString()}`;
      window.location.assign(`${appPath("/login")}?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }
    let active = true;
    async function load() {
      try {
        if (params.get("paypalCancelled")) { setPaymentState("failed"); setPaymentMessage("Payment was cancelled. You can try again."); return; }
        if (params.get("paypalReturn") && params.get("purchaseId")) {
          setPaymentState("checking");
          const response = await fetch(appPath("/api/payment/capture-order"), { method: "POST", headers: { Authorization: `Bearer ${user!.idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ purchaseId: params.get("purchaseId") }) });
          const data = await response.json();
          if (!active) return;
          if (data.status === "COMPLETED") { setPaymentState("success"); setPaymentMessage("Payment successful. Your course access is active."); }
          else { setPaymentState(data.status === "PENDING_VERIFICATION" ? "checking" : "failed"); setPaymentMessage(data.error || "Payment is still being verified."); }
          return;
        }
        const response = await fetch(`${appPath("/api/checkout")}?planId=${encodeURIComponent(params.get("planId") || "")}&versionId=${encodeURIComponent(params.get("versionId") || "")}`, { headers: { Authorization: `Bearer ${user!.idToken}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to open checkout");
        if (active) setDetails(data as CheckoutDetails);
      } catch (nextError) { if (active) setError(nextError instanceof Error ? nextError.message : "Unable to open checkout"); }
    }
    void load();
    return () => { active = false; };
  }, [authLoading, params, user]);

  async function applyCoupon(code = couponCode) {
    if (!details || !code.trim()) return;
    try { setVerifying(true); setCouponError(""); const normalized = code.trim().toUpperCase(); setCouponCode(normalized); setApplied(await verifyCoupon(details, normalized)); }
    catch (nextError) { setApplied(null); setCouponError(nextError instanceof Error ? nextError.message : "Coupon cannot be applied"); }
    finally { setVerifying(false); }
  }

  async function startPayment() {
    if (!details || !user) return;
    try {
      setPaymentState("processing"); setPaymentMessage("");
      const response = await fetch(appPath("/api/payment/create-order"), { method: "POST", headers: { Authorization: `Bearer ${user.idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ courseId: details.plan.id, ...(applied?.couponCode ? { couponCode: applied.couponCode } : {}) }) });
      const data = await response.json();
      if (!response.ok || !data.approvalUrl) throw new Error(data.error || "Unable to start payment");
      window.location.assign(data.approvalUrl);
    } catch (nextError) { setPaymentState("failed"); setPaymentMessage(nextError instanceof Error ? nextError.message : "Payment failed"); }
  }

  if (paymentState === "success" || (paymentState === "checking" && !details)) return <div className="py-12 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" /><h1 className="mt-5 text-2xl font-semibold text-slate-950">{paymentState === "success" ? "Payment successful" : "Checking payment..."}</h1><p className="mt-3 text-slate-600">{paymentMessage}</p>{paymentState === "success" ? <a href={appPath("/user")} className="mt-6 inline-flex rounded-full bg-[#0f7896] px-6 py-3 font-semibold text-white">View your account</a> : null}</div>;
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div>;
  if (!details) return <div className="flex items-center justify-center gap-3 py-16 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Checking your account and plan...</div>;

  const money = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: details.version.currency }).format(value);
  const wholeMoney = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: details.version.currency, maximumFractionDigits: 0 }).format(value);
  const subtotal = applied?.discountedPrice ?? details.version.originalPrice;
  const platformFee = Math.round(subtotal * details.taxPercent) / 100;
  const total = Math.round(subtotal + platformFee);

  return <div className="space-y-6">
    <a href={appPath("/plans")} className="inline-flex items-center gap-2 text-sm font-medium text-[#0f7896]"><ArrowLeft className="h-4 w-4" />Back to plans</a>
    <div className="flex items-center gap-3 text-emerald-700"><ShieldCheck className="h-6 w-6" /><span className="font-semibold">Signed in and ready for secure checkout</span></div>
    {params.get("queryId") ? <div className="flex items-start gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-cyan-900"><CircleHelp className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Your payment query is linked</p><p className="mt-1 text-sm">Support reference: {params.get("queryId")}</p></div></div> : null}
    <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Course checkout</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{details.plan.name}</h1>{details.plan.description ? <p className="mt-3 text-slate-600">{details.plan.description}</p> : null}</div>
    <div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-end justify-between gap-4"><div><p className="font-medium text-slate-900">{details.version.durationLabel || `${details.version.months} months`}</p><p className="mt-2 text-sm text-slate-500">One-time course plan purchase</p></div><div className="text-right">{applied ? <p className="text-sm text-slate-400 line-through decoration-2 decoration-orange-500">{money(details.version.originalPrice)}</p> : null}<p className={`text-2xl font-bold ${applied ? "text-emerald-700" : "text-slate-950"}`}>{money(applied?.discountedPrice ?? details.version.originalPrice)}</p></div></div></div>
    <section className="space-y-3"><div className="flex items-center gap-2"><Tag className="h-5 w-5 text-cyan-700" /><h2 className="font-semibold text-slate-950">Available coupons</h2></div>
      {details.coupons.length ? <div className="grid gap-2 sm:grid-cols-2">{details.coupons.map((coupon) => <button key={coupon.id} type="button" onClick={() => void applyCoupon(coupon.code)} disabled={verifying} className={`rounded-2xl border p-3 text-left transition ${applied?.couponCode === coupon.code ? "border-cyan-600 bg-cyan-50 shadow-lg" : "border-slate-200 hover:border-cyan-300"}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-950">{coupon.code}</span>{coupon.isMarketing ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Featured</span> : null}</div><p className="mt-1 text-sm font-medium text-cyan-800">{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `${money(coupon.discountValue)} off`}</p>{coupon.description ? <p className="mt-1 text-xs text-slate-500">{coupon.description}</p> : null}</button>)}</div> : <p className="text-sm text-slate-500">No coupons are currently available for this plan.</p>}
      <div className="flex gap-2"><input value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setApplied(null); setCouponError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void applyCoupon(); }} placeholder="Enter coupon code" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15" /><button type="button" onClick={() => void applyCoupon()} disabled={!couponCode.trim() || verifying} className="rounded-lg border border-slate-200 px-5 font-semibold text-slate-700 disabled:opacity-50">{verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}</button></div>
      {applied ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-emerald-700"><p className="flex items-center gap-2"><Check className="h-4 w-4" />Coupon {applied.couponCode} applied</p>{applied.expiresAt ? <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs">Offer ends {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(applied.expiresAt))}</p> : null}</div> : couponError ? <p className="text-sm text-rose-600">{couponError}</p> : null}
    </section>
    <section className="rounded-2xl border border-slate-200 p-5"><div className="mb-4 flex items-center gap-2"><ReceiptText className="h-5 w-5 text-cyan-700" /><h2 className="font-semibold text-slate-950">Bill details</h2></div><div className="space-y-3 text-sm"><div className="flex justify-between gap-4 text-slate-600"><span>{details.plan.name} · {details.version.durationLabel || `${details.version.months} months`}</span><span>{money(details.version.originalPrice)}</span></div>{applied ? <div className="flex justify-between gap-4 text-emerald-700"><span>Coupon discount ({applied.couponCode})</span><span>−{money(applied.discountAmount)}</span></div> : null}<div className="flex justify-between gap-4 text-slate-500"><span>Taxes + platform fee</span><span>+{money(platformFee)}</span></div><div className="border-t border-slate-200 pt-3"><div className="flex items-end justify-between"><span className="font-semibold text-slate-950">Total</span><div className="text-right">{applied ? <p className="text-sm text-slate-400 line-through">{money(details.version.originalPrice)}</p> : null}<span className="block text-2xl font-bold text-slate-950">{wholeMoney(total)}</span></div></div><p className="mt-1 text-right text-xs text-slate-500">Currency: {details.version.currency}</p></div></div></section>
    {paymentMessage ? <p className="text-center text-sm text-rose-600">{paymentMessage}</p> : null}
    <button type="button" onClick={() => void startPayment()} disabled={paymentState === "processing"} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0f7896] px-6 text-base font-semibold text-white hover:bg-[#0b647d] disabled:opacity-60">{paymentState === "processing" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing payment...</> : <>{paymentState === "failed" ? "Try again" : "Pay securely with PayPal"}<ArrowRight className="ml-2 h-4 w-4" /></>}</button>
  </div>;
}

export default function CheckoutPage() {
  return <main className="pricing-experience min-h-screen bg-gradient-to-b from-cyan-50 to-white px-4 py-12 sm:py-16"><div className="checkout-surface mx-auto max-w-xl rounded-[30px] border border-cyan-900/10 bg-white p-6 shadow-xl sm:p-10"><Suspense fallback={<p className="py-16 text-center text-slate-500">Loading checkout...</p>}><CheckoutContent /></Suspense></div></main>;
}
