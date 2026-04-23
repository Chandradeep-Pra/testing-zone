"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConversationEntry = {
  role: string;
  text: string;
};

type CandidateReport = {
  overallScore: number;
};

interface CandidateInfo {
  name: string;
  email: string;
  conversation?: ConversationEntry[];
  report?: CandidateReport;
}

interface EmailSenderProps {
  candidate: CandidateInfo;
  onSent?: () => void;
}

export default function EmailSender({ candidate, onSent }: EmailSenderProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendEmail = async () => {
    if (!candidate.email || !candidate.report) return;

    setSending(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: candidate.email,
          name: candidate.name,
          report: candidate.report,
          conversation: candidate.conversation || [],
        }),
      });

      if (response.ok) {
        setSent(true);
        onSent?.();
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      console.error("Email send error:", error);
      alert("Error sending email");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md border-green-700 bg-green-900">
        <CardContent className="pt-6">
          <p className="text-center text-green-100">
            Email sent successfully to {candidate.email}!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-slate-700 bg-slate-900">
      <CardHeader>
        <CardTitle className="text-center text-slate-100">Send Report via Email</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-slate-300">
          Send the complete viva report and conversation history to {candidate.email}
        </p>
        <Button
          onClick={handleSendEmail}
          disabled={sending || !candidate.report}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {sending ? "Sending..." : "Send Email"}
        </Button>
      </CardContent>
    </Card>
  );
}
