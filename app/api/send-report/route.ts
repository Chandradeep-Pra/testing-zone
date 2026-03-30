 //@ts-nocheck

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    /* -----------------------------
       1. Get FormData (from frontend)
    ----------------------------- */

    const formData = await req.formData();

    const file = formData.get("file") as File;
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;

    if (!file || !email) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /* -----------------------------
       2. Send Email
    ----------------------------- */

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Viva Examination Report</h2>
        <p>Dear <b>${name}</b>,</p>

        <p>Thank you for completing your viva examination.</p>

        <p>Your detailed report is attached as a PDF.</p>

        <br/>
        <p>Best regards,<br/>Urologics AI Examiner</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Urologics AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Viva Report",
      html: emailHtml,
      attachments: [
        {
          filename: "viva-report.pdf",
          content: buffer,
        },
      ],
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