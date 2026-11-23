"use client";
import { useState } from "react";
import { CalendarClock, Check, ExternalLink } from "lucide-react";

export type ReminderSettings = { enabled: boolean; dates: string[]; timeZone: string; dismissedDates: string[] };
export function PayPalReminderSettings({ purchaseId, initial, save }: {
  purchaseId: string; initial?: ReminderSettings | null;
  save: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState(Boolean(initial?.enabled));
  const [dates, setDates] = useState([initial?.dates[0] || "", initial?.dates[1] || ""]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failed, setFailed] = useState(false);
  async function submit(enabled: boolean) {
    setBusy(true); setMessage(""); setFailed(false);
    try {
      await save({ purchaseId, enabled, dates: dates.filter(Boolean), timeZone: initial?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        dismissedDates: initial?.dismissedDates || [] });
      setMessage(enabled ? "Your reminder dates are saved." : "Reminders are turned off.");
      if (!enabled) setOpen(false);
    } catch { setMessage("We could not save your reminders. Please try again."); setFailed(true); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5 text-left">
    <div className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-800" aria-hidden="true" />
      <div><p className="font-semibold text-slate-900">Repayment reminders</p><p className="mt-1 text-sm leading-relaxed text-slate-600">Used PayPal Pay in 3? Save the two upcoming dates shown in your PayPal account for a reminder on your Overview.</p></div></div>
    <a href="https://www.paypal.com/myaccount/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-cyan-800 underline underline-offset-4">Check your PayPal account <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>
    {!open ? <button type="button" onClick={() => setOpen(true)} className="mt-2 block min-h-11 rounded-full border border-cyan-800 px-4 text-sm font-semibold text-cyan-900">Set my reminder dates</button> : <form onSubmit={event => { event.preventDefault(); void submit(true); }} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">{dates.map((date, index) => <label key={index} className="block text-sm font-medium text-slate-700">{index === 0 ? "Second repayment date" : "Third repayment date (optional)"}<input type="date" required={index === 0} value={date} onChange={event => setDates(current => current.map((value, i) => i === index ? event.target.value : value))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900" /></label>)}</div>
      <p className="text-xs leading-relaxed text-slate-600">These are dates you provide. We cannot see your PayPal loan balance, payments, or changes to your schedule. Check PayPal for the current details, and update or turn off these reminders if you pay early.</p>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="min-h-11 rounded-full bg-cyan-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save reminder dates"}</button><button type="button" disabled={busy} onClick={() => void submit(false)} className="min-h-11 rounded-full px-4 text-sm font-medium text-slate-600">Turn off reminders</button></div>
    </form>}
    {message && <p role="status" className={`mt-3 flex items-center gap-2 text-sm ${failed ? "text-rose-700" : "text-cyan-900"}`}>{!failed && <Check className="h-4 w-4" aria-hidden="true" />}{message}</p>}
  </section>;
}
