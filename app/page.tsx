"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="
      min-h-screen
      flex gap-4
      bg-[color:var(--color-background)] p-4
    ">
      <div
        onClick={() => router.push("/beat-analyzer")}
        className="
          w-56 h-56
          rounded-3xl
          bg-[color:var(--color-surface)]
          border border-[color:var(--color-border)]
          flex flex-col items-center justify-center
          cursor-pointer
          transition-all duration-300 ease-out
          hover:scale-[1.02]
          hover:border-[color:var(--color-accent)]
          hover:shadow-lg
        "
      >
        {/* Icon */}
        <div className="
          w-14 h-14
          rounded-2xl
          bg-[color:var(--color-accent-soft)]
          flex items-center justify-center
          mb-4
        ">
          <span className="text-[color:var(--color-accent)] text-2xl">
            🎵
          </span>
        </div>

        

        {/* Title */}
        <h1 className="text-lg font-semibold">
          Beat Analyzer
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Analyze rhythm & counts
        </p>
      </div>

      <div
        onClick={() => router.push("/ai-viva")}
        className="
          w-56 h-56
          rounded-3xl
          bg-[color:var(--color-surface)]
          border border-[color:var(--color-border)]
          flex flex-col items-center justify-center
          cursor-pointer
          transition-all duration-300 ease-out
          hover:scale-[1.02]
          hover:border-[color:var(--color-accent)]
          hover:shadow-lg
        "
      >
        {/* Icon */}
        <div className="
          w-14 h-14
          rounded-2xl
          bg-[color:var(--color-accent-soft)]
          flex items-center justify-center
          mb-4
        ">
          <span className="text-[color:var(--color-accent)] text-2xl">
            🎓
          </span>
        </div>

        

        {/* Title */}
        <h1 className="text-lg font-semibold">
          AI Viva
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Take my viva
        </p>
      </div>
      {/* <div className="w-full h-56
          rounded-3xl
          bg-[color:var(--color-surface)]
          border border-[color:var(--color-border)]
          flex flex-col items-center justify-center
          cursor-pointer
          transition-all duration-300 ease-out
          hover:scale-[1.02]
          hover:border-[color:var(--color-accent)]
          hover:shadow-lg"
          onClick={() => router.push("/udemy")}
          >
        <span className="text-2xl text-white">Component Based Patter</span>
      </div> */}
    </main>
  );
}
