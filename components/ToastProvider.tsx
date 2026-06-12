"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: "text-[#071014] [&_*]:text-[#071014]",
        style: {
          background: "rgba(255, 255, 255, 0.96)",
          border: "1px solid rgba(15, 120, 150, 0.14)",
          backdropFilter: "blur(12px)",
          borderRadius: "14px",
          padding: "14px 16px",
          boxShadow: "0 16px 40px rgba(15, 120, 150, 0.14)",
        },
      }}
    />
  );
}
