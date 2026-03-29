//@ts-nocheck

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import puppeteer from "puppeteer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidateInfo } = body;

    if (!candidateInfo) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const { name, email, conversation, report } = candidateInfo;

    /* -----------------------------
       1. Generate PDF using Puppeteer
    ----------------------------- */

    const browser = await puppeteer.launch({
      headless: "new",
    });

    const page = await browser.newPage();

    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #111;
            }
            h1 {
              text-align: center;
            }
            h2 {
              margin-top: 30px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .score {
              font-size: 20px;
              margin: 10px 0;
            }
            .qa {
              margin: 10px 0;
            }
            .domain {
              margin: 10px 0;
            }
          </style>
        </head>

        <body>
          <h1>Viva Examination Report</h1>

          <p><b>Candidate:</b> ${name}</p>
          <p class="score"><b>Overall Score:</b> ${report.overallScore}/10</p>

          <h2>Q&A</h2>
          ${conversation
            .map(
              (m: any) => `
              <div class="qa">
                <b>${m.role === "ai" ? "Q" : "A"}:</b>
                ${m.text || "No response"}
              </div>
            `
            )
            .join("")}

          <h2>Detailed Evaluation</h2>
          ${report.domains
            .map(
              (d: any) => `
              <div class="domain">
                <b>${d.name} (${d.score}/10)</b>
                <p>${d.summary}</p>
              </div>
            `
            )
            .join("")}

        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

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

        <h3>📊 Overall Score: ${report.overallScore}/10</h3>

        <p>Please find your detailed report attached as a PDF.</p>

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
          content: pdfBuffer,
        },
      ],
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}