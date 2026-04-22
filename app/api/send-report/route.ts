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

    const { name, email, conversation, report, qaHistory } = candidateInfo;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    /* -----------------------------
       2. Format Q&A
    ----------------------------- */

    const normalizedConversation =
      Array.isArray(conversation) && conversation.length > 0
        ? conversation
        : Array.isArray(qaHistory)
        ? qaHistory.flatMap((item: any) => {
            const entries = [];

            if (item?.question) {
              entries.push({ role: "ai", text: item.question });
            }

            if (item?.answer) {
              entries.push({ role: "candidate", text: item.answer });
            }

            return entries;
          })
        : [];

    const qaHtml = normalizedConversation
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
  <div style="background:#f1f5f9; padding:30px 0; font-family:Arial, sans-serif;">
    
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">

          <!-- CARD -->
          <table width="600" style="background:#ffffff; border-radius:12px; padding:24px;">

            <!-- HEADER -->
            <tr>
              <td>
                <h2 style="margin:0; font-size:20px; color:#0f172a;">
                  Viva Examination Report
                </h2>
                <p style="margin:6px 0 0; color:#64748b; font-size:13px;">
                  ${report.caseTitle}
                </p>
              </td>
            </tr>

            <!-- SCORE -->
            <tr>
              <td style="padding-top:20px;">
                <div style="
                  background:#ecfdf5;
                  border:1px solid #a7f3d0;
                  border-radius:10px;
                  padding:16px;
                  text-align:center;
                ">
                  <div style="font-size:28px; font-weight:bold; color:#059669;">
                    ${report.overallScore}/10
                  </div>
                  <div style="font-size:12px; color:#065f46;">
                    Overall Score
                  </div>
                </div>
              </td>
            </tr>

            <!-- GREETING -->
            <tr>
              <td style="padding-top:20px; font-size:14px; color:#111;">
                Dear <b>${name}</b>,<br/><br/>
                Thank you for completing your viva examination. Below is your performance summary.
              </td>
            </tr>

            <!-- Q&A -->
            <tr>
              <td style="padding-top:24px;">
                <h3 style="margin:0 0 10px; font-size:16px; color:#0f172a;">
                  Q&A
                </h3>

                ${normalizedConversation.map((m: any) => `
                  <div style="
                    margin-bottom:10px;
                    padding:10px;
                    background:#f8fafc;
                    border-radius:8px;
                    font-size:13px;
                  ">
                    <b style="color:#334155;">
                      ${m.role === "ai" ? "Q:" : "A:"}
                    </b>
                    <span style="color:#0f172a;">
                      ${m.text || "No response"}
                    </span>
                  </div>
                `).join("")}
              </td>
            </tr>

            <!-- DOMAINS -->
            <tr>
              <td style="padding-top:24px;">
                <h3 style="margin:0 0 10px; font-size:16px; color:#0f172a;">
                  Detailed Evaluation
                </h3>

                ${report.domains.map((d: any) => `
                  <div style="
                    margin-bottom:14px;
                    padding:12px;
                    border:1px solid #e2e8f0;
                    border-radius:8px;
                  ">
                    <div style="font-weight:600; font-size:14px; color:#0f172a;">
                      ${d.name} (${d.score}/10)
                    </div>
                    <div style="font-size:13px; color:#475569; margin-top:4px;">
                      ${d.summary}
                    </div>
                  </div>
                `).join("")}
              </td>
            </tr>

            <!-- IMPROVEMENT -->
            ${
              report.improvementPlan?.length
                ? `
              <tr>
                <td style="padding-top:24px;">
                  <h3 style="margin:0 0 10px; font-size:16px; color:#0f172a;">
                    Next Focus Areas
                  </h3>

                  ${report.improvementPlan.map((item: string) => `
                    <div style="
                      display:inline-block;
                      background:#e2e8f0;
                      color:#0f172a;
                      padding:6px 10px;
                      border-radius:999px;
                      font-size:12px;
                      margin:4px 6px 0 0;
                    ">
                      ${item}
                    </div>
                  `).join("")}
                </td>
              </tr>
            `
                : ""
            }

            <!-- FOOTER -->
            <tr>
              <td style="padding-top:30px; font-size:13px; color:#64748b;">
                Best regards,<br/>
                <b style="color:#0f172a;">Urologics AI Examiner</b>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
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
