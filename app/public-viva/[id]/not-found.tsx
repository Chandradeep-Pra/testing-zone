import Link from "next/link";

import { Button } from "@/components/ui/button";
import { appPath } from "@/lib/app-path";

export default function PublicVivaNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4 text-[#071014]">
      <section className="w-full max-w-md text-center">
        <img
          src={appPath("/logo.png")}
          alt="Urologics"
          className="mx-auto mb-5 h-16 w-16 object-contain"
        />
        <h1 className="text-2xl font-semibold">This viva case is not publicly available.</h1>
        <p className="mt-3 text-sm text-[#071014]/65">
          Please check the viva link or ask the organizer to enable public access.
        </p>
        <Button asChild className="mt-6 rounded-full bg-[#0f7896] text-white hover:bg-[#0b6078]">
          <Link href="/">Go Home</Link>
        </Button>
      </section>
    </main>
  );
}
