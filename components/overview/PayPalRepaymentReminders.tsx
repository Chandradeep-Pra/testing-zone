"use client";
import { useEffect, useState } from "react";
import { CalendarClock, ExternalLink, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { readUrologicsJson } from "@/lib/client/urologicsQuery";
import { appPath } from "@/lib/app-path";
import { getStoredAuth, refreshStoredAuth } from "@/lib/urologics-auth";

type Reminder = { enabled: boolean; dates: string[]; timeZone: string; dismissedDates: string[] };
type Item = { purchaseId: string; planName: string; reminder: Reminder | null; upcoming: Array<{ date: string; days: number }> };
export default function PayPalRepaymentReminders() {
  const { user } = useAuth();
  const [account, setAccount] = useState<{ uid: string; items: Item[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [dates, setDates] = useState(["", ""]);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    async function load() {
      if (document.visibilityState === "hidden") return;
      try {
        const data = await readUrologicsJson<{ items: Item[] }>("/api/urologics/paypal/reminders", user, controller.signal);
        if (!controller.signal.aborted && user) { setAccount({ uid: user.uid, items: data.items }); setError(""); }
      } catch { if (!controller.signal.aborted) setError("Repayment reminders could not refresh. Check PayPal for current payment details."); }
    }
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    const focus = () => void load(); window.addEventListener("focus", focus);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [user]);
  const items = user && account?.uid === user.uid ? account.items : [];
  async function save(item: Item, reminder: Reminder) {
    if (!user) return;
    const uid = user.uid;
    setBusy(true); setError("");
    try {
      let current = getStoredAuth(); if (!current || current.uid !== uid) throw new Error();
      if (current.expiresAt <= Date.now() + 60000) current = await refreshStoredAuth(current);
      const request = () => fetch(appPath("/api/urologics/paypal/reminders"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${current!.idToken}` }, body: JSON.stringify({ purchaseId: item.purchaseId, ...reminder }) });
      let response = await request();
      if (response.status === 401) { current = await refreshStoredAuth(current); response = await request(); }
      const result = await response.json(); if (!response.ok) throw new Error();
      setAccount(previous => previous?.uid === uid ? { ...previous, items: previous.items.map(value => value.purchaseId === item.purchaseId ? { ...value, reminder: result.reminder, upcoming: result.upcoming } : value) } : previous);
      setEditing(null);
    } catch { setError("Your reminder change was not saved. Please try again. PayPal has your current repayment details."); }
    finally { setBusy(false); }
  }
  if (!items.length) return null;
  return <section className="overview-paypal" aria-label="PayPal repayment reminders">
    {items.flatMap(item => item.upcoming.map(due => <div className="overview-paypal-due" key={`${item.purchaseId}-${due.date}`}>
      <CalendarClock size={22} aria-hidden="true" /><div><h2>Your saved PayPal repayment date is {due.days === 0 ? "today" : `in ${due.days} ${due.days === 1 ? "day" : "days"}`}</h2><p>{item.planName} · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${due.date}T12:00:00Z`))}</p><p>Based on the date you saved. Check PayPal for the current amount and status.</p></div>
      <a href="https://www.paypal.com/myaccount/" target="_blank" rel="noopener noreferrer">View PayPal <ExternalLink size={14} aria-hidden="true" /></a>
      <button type="button" disabled={busy} aria-label="Dismiss this repayment reminder" onClick={() => item.reminder && void save(item, { ...item.reminder, dismissedDates: [...item.reminder.dismissedDates, due.date] })}><X size={18} /></button>
    </div>))}
    <details className="overview-paypal-settings"><summary><CalendarClock size={16} aria-hidden="true" /> Manage repayment reminders</summary>
      <p>If you used PayPal Pay in 3, copy your upcoming dates from PayPal. We cannot see your loan balance or repayment status. Update or disable reminders if you pay early or your schedule changes.</p>
      {items.map(item => <div className="overview-paypal-plan" key={item.purchaseId}><strong>{item.planName}</strong>
        {editing !== item.purchaseId ? <button type="button" onClick={() => { setEditing(item.purchaseId); setDates([item.reminder?.dates[0] || "", item.reminder?.dates[1] || ""]); }}>{item.reminder?.enabled ? "Edit dates" : "Set reminder dates"}</button> : <form onSubmit={event => { event.preventDefault(); void save(item, { enabled: true, dates: dates.filter(Boolean), timeZone: item.reminder?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, dismissedDates: [] }); }}>
          <div className="overview-paypal-dates">{dates.map((date, index) => <label key={index}>{index === 0 ? "Second repayment date" : "Third repayment date (optional)"}<input type="date" required={index === 0} value={date} onChange={event => setDates(previous => previous.map((value, i) => i === index ? event.target.value : value))} /></label>)}</div>
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save dates"}</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
        </form>}
        {item.reminder?.enabled && <button type="button" disabled={busy} onClick={() => void save(item, { ...item.reminder!, enabled: false })}>Turn off</button>}
      </div>)}
    </details>
    {error && <p className="overview-paypal-error" role="status">{error}</p>}
  </section>;
}
