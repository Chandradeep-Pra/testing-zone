import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type ReportDomain = {
  name: string;
  score: number;
  summary: string;
};

type CandidateReport = {
  caseTitle: string;
  overallScore: number;
  domains: ReportDomain[];
  improvementPlan?: string[];
};

type CandidateInfo = {
  name: string;
  email: string;
  report: CandidateReport;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidateInfo } = body as { candidateInfo?: CandidateInfo };

    if (!candidateInfo) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const { name, email, report } = candidateInfo;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const emailHtml = `
      <div style="background:#f1f5f9; padding:30px 0; font-family:Arial, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table width="600" style="background:#ffffff; border-radius:16px; padding:28px;">
                <tr>
                  <td>
                    <h2 style="margin:0; font-size:22px; color:#0f172a;">Viva Examination Report</h2>
                    <p style="margin:8px 0 0; color:#64748b; font-size:13px;">${report.caseTitle}</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:22px;">
                    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:14px; padding:18px; text-align:center;">
                      <div style="font-size:30px; font-weight:bold; color:#059669;">${report.overallScore}/8</div>
                      <div style="font-size:12px; color:#065f46;">Overall Score</div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:20px; font-size:14px; color:#111827; line-height:1.7;">
                    Dear <b>${name}</b>,<br/><br/>
                    Thank you for completing your viva examination. Below is your performance summary.
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:24px;">
                    <h3 style="margin:0 0 12px; font-size:16px; color:#0f172a;">Detailed Evaluation</h3>
                    ${report.domains
                      .map(
                        (d: ReportDomain) => `
                      <div style="margin-bottom:14px; padding:12px; border:1px solid #e2e8f0; border-radius:10px;">
                        <div style="font-weight:600; font-size:14px; color:#0f172a;">${d.name} (${d.score}/8)</div>
                        <div style="font-size:13px; color:#475569; margin-top:4px;">${d.summary}</div>
                      </div>
                    `
                      )
                      .join("")}
                  </td>
                </tr>

                ${
                  report.improvementPlan?.length
                    ? `
                  <tr>
                    <td style="padding-top:24px;">
                      <h3 style="margin:0 0 10px; font-size:16px; color:#0f172a;">Next Focus Areas</h3>
                      ${report.improvementPlan
                        .map(
                          (item: string) => `
                        <div style="display:inline-block; background:#e2e8f0; color:#0f172a; padding:6px 10px; border-radius:999px; font-size:12px; margin:4px 6px 0 0;">
                          ${item}
                        </div>
                      `
                        )
                        .join("")}
                    </td>
                  </tr>
                `
                    : ""
                }

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
  } catch (err: unknown) {
    console.error("EMAIL ERROR:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
