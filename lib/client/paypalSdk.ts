"use client";
export type PayPalButtonOptions = {
  fundingSource?: string;
  style?: { layout?: "vertical"; shape?: "pill" | "rect"; label?: "paypal" | "pay"; height?: number };
  createOrder: (data: { fundingSource?: string }) => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
};
type PayPalButton = { render: (element: HTMLElement) => Promise<void>; isEligible: () => boolean; close?: () => Promise<void> };
export type PayPalSdk = {
  Buttons: (options: PayPalButtonOptions) => PayPalButton;
  FUNDING: { PAYPAL: string; PAYLATER: string };
  Messages?: (options: { amount: string; placement: string; style: { layout: string; logo: { type: string }; text: { color: string; size: number } } }) => { render: (element: HTMLElement) => Promise<void> };
};
declare global { interface Window { paypal?: PayPalSdk } }
let loading: Promise<PayPalSdk> | null = null;
let loadedKey = "";
export function loadPayPalSdk(clientId: string, currency: string, sandbox: boolean) {
  const key = `${clientId}:${currency}:${sandbox}`;
  if (loading && loadedKey === key) return loading;
  if (loading && loadedKey !== key) return Promise.reject(new Error("Payment settings changed. Refresh this page before continuing."));
  loadedKey = key;
  loading = new Promise<PayPalSdk>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({ "client-id": clientId, currency, intent: "capture", components: "buttons,messages", "enable-funding": "paylater" });
    if (sandbox) params.set("buyer-country", "GB");
    script.src = `https://www.paypal.com/sdk/js?${params}`;
    script.dataset.paypalSdk = "true";
    const timeout = window.setTimeout(() => { script.remove(); loading = null; reject(new Error("Unable to load PayPal checkout.")); }, 20000);
    script.addEventListener("load", () => { window.clearTimeout(timeout); if (window.paypal) resolve(window.paypal); else { loading = null; reject(new Error("Unable to load PayPal checkout.")); } }, { once: true });
    script.addEventListener("error", () => { window.clearTimeout(timeout); script.remove(); loading = null; reject(new Error("Unable to load PayPal checkout.")); }, { once: true });
    document.head.appendChild(script);
  });
  return loading;
}
