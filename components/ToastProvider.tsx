"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: "text-white [&_*]:text-white", // 🔥 KEY FIX
        style: {
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          backdropFilter: "blur(12px)",
          borderRadius: "14px",
          padding: "14px 16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        },
      }}
    />
  );
}