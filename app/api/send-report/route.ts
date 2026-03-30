//@ts-nocheck

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    /* -----------------------------
       1. Parse JSON from frontend
    ----------------------------- */

    const body = await req.json();
    const { candidateInfo } = body;

    if (!candidateInfo) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const { name, email, conversation, report } = candidateInfo;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    /* -----------------------------
       2. Format Q&A
    ----------------------------- */

    const qaHtml = (conversation || [])
      .map(
        (m: any) => `
          <div style="margin-bottom:10px;">
            <span style="font-weight:600;">
              ${m.role === "ai" ? "Q:" : "A:"}
            </span>
            ${m.text || "No response"}
          </div>
        `
      )
      .join("");

    /* -----------------------------
       3. Format Domain Evaluation
    ----------------------------- */

    const domainsHtml = (report?.domains || [])
      .map(
        (d: any) => `
          <div style="margin-bottom:14px;">
            <div style="font-weight:600;">
              ${d.name} (${d.score}/10)
            </div>
            <div style="font-size:13px; color:#444;">
              ${d.summary}
            </div>
          </div>
        `
      )
      .join("");

    /* -----------------------------
       4. Email HTML (clean + structured)
    ----------------------------- */

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color:#111; max-width:600px; margin:auto;">
        
        <h2 style="margin-bottom:16px;">Viva Examination Report</h2>

        <p>Dear <b>${name}</b>,</p>

        <p>
          Thank you for completing your viva examination.
        </p>

        <div style="margin:16px 0; padding:12px; background:#f3f4f6; border-radius:8px;">
          <b>Overall Score:</b> ${report?.overallScore}/10
        </div>

        <h3 style="margin-top:20px;">Q&A</h3>
        ${qaHtml || "<p>No responses recorded.</p>"}

        <h3 style="margin-top:20px;">Detailed Evaluation</h3>
        ${domainsHtml || "<p>No evaluation available.</p>"}

        ${
          report?.improvementPlan?.length
            ? `
          <h3 style="margin-top:20px;">Next Focus Areas</h3>
          <ul>
            ${report.improvementPlan.map((i: string) => `<li>${i}</li>`).join("")}
          </ul>
        `
            : ""
        }

        <br/>

        <p>
          Best regards,<br/>
          <b>Urologics AI Examiner</b>
        </p>

      </div>
    `;

    /* -----------------------------
       5. Send Email
    ----------------------------- */

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Urologics AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Viva Report",
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("EMAIL ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}