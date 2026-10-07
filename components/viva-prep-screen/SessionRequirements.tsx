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
  { icon: Wifi, text: "Please ensure a stable internet connection." },
  { icon: Headphones, text: "Please use Headphones or Earphones if possible." },
  { icon: OctagonAlert, text: 'If the AI Examiner pauses, please say "please continue" to move on.' },
];

export default function SessionRequirements() {
  return (
    <section className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <h2 className="text-[22px] font-semibold leading-7 tracking-tight text-[var(--text-primary)]">
        Candidates Instructions
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
