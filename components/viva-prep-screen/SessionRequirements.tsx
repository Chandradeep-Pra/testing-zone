import {
  CheckCircle2,
  Headphones,
  OctagonAlert,
  Stethoscope,
  Volume2,
  Wifi,
  type LucideIcon,
} from "lucide-react";

const REQUIREMENTS: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Wifi, text: "I have a stable internet connection (Wi-Fi or strong 4G/5G)." },
  { icon: Volume2, text: "I am in a quiet environment with no background noise or talking." },
  { icon: Headphones, text: "I am using headphones/earphones if possible to reduce echo and improve audio quality." },
  { icon: Volume2, text: "I will speak clearly and pause after each answer to allow the Examiner to respond." },
  { icon: OctagonAlert, text: 'If the Examiner pauses or mishears me, I will say "please proceed" to move on.' },
  { icon: CheckCircle2, text: "I understand refreshing the page will end the session." },
  { icon: Stethoscope, text: "I am ready to treat this like a real examination." },
];

export default function SessionRequirements() {
  return (
    <section className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <h2 className="text-[22px] font-semibold leading-7 tracking-tight text-[var(--text-primary)]">
        Session Requirements
      </h2>
      <ul className="mt-4 space-y-3.5">
        {REQUIREMENTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <Icon size={20} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
            <span className="text-[15px] leading-5 text-[var(--text-primary)]">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
