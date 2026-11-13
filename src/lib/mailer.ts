import "server-only";
import nodemailer from "nodemailer";
import { after } from "next/server";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { EmailJob } from "@/models/EmailJob";
import { formatINR } from "@/lib/money";

export type MailTemplate =
  | "welcome"
  | "login-alert"
  | "order-confirmation"
  | "password-reset"
  | "password-changed"
  | "stock-alert";

type MailPayload = Record<string, unknown>;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#fafafa;font-family:Roboto,Arial,sans-serif;color:#2a2a2a">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #eee;border-radius:10px;overflow:hidden">
    <div style="background:#a03037;padding:20px 28px">
      <span style="font-size:24px;color:#fff;font-weight:700;letter-spacing:-.5px">bookstore</span>
    </div>
    <div style="padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:28px;font-size:12px;color:#878787">Bookstore Private Limited · This is an automated message.</p>
    </div>
  </div>
</body></html>`;
}

function orderRows(items: Array<{ title: string; quantity: number; price: number }>): string {
  return items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0">${escapeHtml(item.title)} × ${item.quantity}</td><td style="text-align:right">${formatINR(
          item.price * item.quantity
        )}</td></tr>`
    )
    .join("");
}

function render(template: MailTemplate, payload: MailPayload): { subject: string; html: string } {
  const name = escapeHtml(payload.name ?? "Reader");
  switch (template) {
    case "welcome":
      return {
        subject: "Welcome to Bookstore",
        html: layout(
          "Welcome aboard!",
          `<p>Hi ${name},</p><p>Your Bookstore account is ready. Browse 1,000 Project Gutenberg classics and build your shelf.</p><p><a href="${env.appUrl}" style="display:inline-block;background:#a03037;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Start browsing</a></p>`
        ),
      };
    case "login-alert":
      return {
        subject: "New sign-in to your Bookstore account",
        html: layout(
          "New sign-in",
          `<p>Hi ${name},</p><p>A new sign-in to your account was recorded at ${escapeHtml(
            new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          )} IST.</p><p>If this was not you, reset your password immediately.</p>`
        ),
      };
    case "order-confirmation": {
      const items = (payload.items as Array<{ title: string; quantity: number; price: number }>) ?? [];
      return {
        subject: `Order ${escapeHtml(payload.orderNumber)} confirmed`,
        html: layout(
          "Your order is confirmed",
          `<p>Hi ${name},</p><p>Thanks for your order <strong>#${escapeHtml(
            payload.orderNumber
          )}</strong>.</p><table style="width:100%;border-top:1px solid #eee;border-bottom:1px solid #eee;margin:16px 0">${orderRows(
            items
          )}<tr><td style="padding:10px 0;font-weight:700">Total (COD)</td><td style="text-align:right;font-weight:700">${formatINR(
            Number(payload.total ?? 0)
          )}</td></tr></table><p>We will notify you when it ships. Payment is collected on delivery.</p>`
        ),
      };
    }
    case "password-reset":
      return {
        subject: "Reset your Bookstore password",
        html: layout(
          "Reset your password",
          `<p>Hi ${name},</p><p>Use the button below to choose a new password. This link expires in 60 minutes.</p><p><a href="${escapeHtml(
            payload.url
          )}" style="display:inline-block;background:#a03037;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Reset password</a></p><p style="font-size:12px;color:#878787">If you did not request this, you can ignore the email.</p>`
        ),
      };
    case "password-changed":
      return {
        subject: "Your Bookstore password was changed",
        html: layout(
          "Password changed",
          `<p>Hi ${name},</p><p>Your password was updated successfully. All other sessions have been signed out.</p>`
        ),
      };
    case "stock-alert":
      return {
        subject: `${escapeHtml(payload.title)} is back in stock`,
        html: layout(
          "Back in stock",
          `<p>Good news — <strong>${escapeHtml(payload.title)}</strong> is available again.</p><p><a href="${escapeHtml(
            payload.url
          )}" style="display:inline-block;background:#a03037;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View book</a></p>`
        ),
      };
  }
}

async function deliverEmail(jobId: string): Promise<void> {
  await connectDB();
  const job = await EmailJob.findById(jobId);
  if (!job || job.status !== "queued") return;

  const smtp = env.smtp;

  if (!smtp.configured) {
    logger.info("Email not sent because SMTP is not configured", {
      to: job.to,
      subject: job.subject,
      template: job.template,
      preview: job.payload,
    });
    job.status = "skipped";
    job.error = "SMTP is not configured";
    await job.save();
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: smtp.from,
      to: job.to,
      subject: job.subject,
      html: render(job.template as MailTemplate, (job.payload ?? {}) as MailPayload).html,
    });
    job.status = "sent";
    job.sentAt = new Date();
    job.attempts += 1;
    await job.save();
    logger.info("Email sent", { to: job.to, template: job.template });
  } catch (error) {
    job.status = "failed";
    job.attempts += 1;
    job.error = error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
    await job.save();
    logger.error("Email delivery failed", { to: job.to, template: job.template, error: job.error });
  }
}

/**
 * Queue, then deliver after the response is sent when running inside a request.
 * If called outside a request context (scripts/tests) it delivers inline.
 */
export async function queueEmail(
  to: string,
  template: MailTemplate,
  payload: MailPayload = {}
): Promise<string> {
  await connectDB();
  const { subject } = render(template, payload);
  const job = await EmailJob.create({
    to,
    subject,
    template,
    payload,
    status: "queued",
  });
  const jobId = String(job._id);
  try {
    after(() => deliverEmail(jobId));
  } catch {
    await deliverEmail(jobId);
  }
  return jobId;
}
