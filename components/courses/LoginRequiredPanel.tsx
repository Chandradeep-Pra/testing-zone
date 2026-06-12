import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function LoginRequiredPanel() {
  return (
    <div className="grid flex-1 place-items-center py-6">
      <div className="urologics-panel max-w-lg p-7 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-cyan-50 text-[#0f7896]">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-[#071014]">Login required</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#071014]/65">
          Sign in to load your course videos.
        </p>
        <Link href="/login" className="urologics-button-primary mt-6 inline-flex">
          Login to continue
        </Link>
      </div>
    </div>
  );
}
