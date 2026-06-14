// DSL format:
// EMAIL: Welcome to our platform | type:transactional
// preview: "Confirm your account to get started"
//
// [HEADER]  logo:https://... | bg:#FFFFFF
// [HERO]    "Welcome, Jan!" | sub:"Please confirm your email"
// [CTA]     "Confirm Email" → https://... | bg:#4F46E5
// [FOOTER]  "Acme Inc." | unsubscribe:https://...

import { nanoid } from "nanoid";
import type { EmailTemplate, EmailSection } from "@ai-builder/schemas";

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeSection(s: EmailSection): string {
  const bg = s.bgColor ? " | bg:" + s.bgColor : "";
  switch (s.type) {
    case "header": {
      const logo = s.logoUrl ? "logo:" + s.logoUrl : "";
      const title = s.title ? "title:" + s.title : "";
      return "[HEADER]  " + [logo, title].filter(Boolean).join(" | ") + bg;
    }
    case "hero":
      return (
        '[HERO]    "' + s.heading + '"' + (s.subheading ? ' | sub:"' + s.subheading + '"' : "") + bg
      );
    case "text":
      return '[TEXT]    "' + s.content + '"' + bg;
    case "cta":
      return (
        '[CTA]     "' +
        s.cta.label +
        '" \u2192 ' +
        s.cta.url +
        (s.cta.bgColor ? " | bg:" + s.cta.bgColor : "") +
        bg
      );
    case "footer":
      return (
        '[FOOTER]  "' +
        (s.companyName ?? "") +
        '"' +
        (s.unsubscribeUrl ? " | unsubscribe:" + s.unsubscribeUrl : "") +
        bg
      );
  }
}

export function serializeEmailDSL(template: EmailTemplate): string {
  const header = "EMAIL: " + template.subject + " | type:" + template.type;
  const preview = template.previewText ? 'preview: "' + template.previewText + '"' : "";
  const sections = template.sections.map(serializeSection).join("\n");
  return [header, preview, "", sections].filter(Boolean).join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeEmailDSL(dsl: string): EmailTemplate {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const subjectMatch = /EMAIL:\s*(.+?)\s*\|/.exec(firstLine) ?? /EMAIL:\s*(.+)/.exec(firstLine);
  const typeMatch = /type:(transactional|marketing|notification)/.exec(firstLine);

  let previewText: string | null = null;
  const sections: EmailSection[] = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const previewMatch = /^preview:\s*"([^"]*)"/.exec(trimmed);
    if (previewMatch) {
      previewText = previewMatch[1] ?? null;
      continue;
    }

    const bgMatch = /\|?\s*bg:(#[0-9A-Fa-f]{6})/.exec(trimmed);
    const bgColor = bgMatch?.[1] ?? null;
    const id = "sec_" + nanoid(6);

    if (trimmed.startsWith("[HEADER]")) {
      const logoMatch = /logo:(\S+)/.exec(trimmed);
      const titleMatch = /title:(\S+)/.exec(trimmed);
      sections.push({
        id,
        type: "header",
        bgColor,
        logoUrl: logoMatch?.[1] ?? null,
        logoAlt: null,
        title: titleMatch?.[1] ?? null,
      });
    } else if (trimmed.startsWith("[HERO]")) {
      const headMatch = /"([^"]+)"/.exec(trimmed);
      const subMatch = /sub:"([^"]+)"/.exec(trimmed);
      sections.push({
        id,
        type: "hero",
        bgColor,
        heading: headMatch?.[1] ?? "",
        subheading: subMatch?.[1] ?? null,
        imageUrl: null,
      });
    } else if (trimmed.startsWith("[TEXT]")) {
      const contentMatch = /"([^"]+)"/.exec(trimmed);
      sections.push({
        id,
        type: "text",
        bgColor,
        content: contentMatch?.[1] ?? "",
        fontFamily: null,
      });
    } else if (trimmed.startsWith("[CTA]")) {
      const labelMatch = /"([^"]+)"/.exec(trimmed);
      const urlMatch = /\u2192\s*(\S+)/.exec(trimmed) ?? /→\s*(\S+)/.exec(trimmed);
      const ctaBgMatch = /bg:(#[0-9A-Fa-f]{6})/.exec(trimmed.replace(/\|.*$/, ""));
      sections.push({
        id,
        type: "cta",
        bgColor,
        text: null,
        cta: {
          label: labelMatch?.[1] ?? "Click here",
          url: urlMatch?.[1]?.split("|")[0]?.trim() ?? "#",
          bgColor: ctaBgMatch?.[1] ?? null,
          textColor: null,
        },
      });
    } else if (trimmed.startsWith("[FOOTER]")) {
      const nameMatch = /"([^"]*)"/.exec(trimmed);
      const unsubMatch = /unsubscribe:(\S+)/.exec(trimmed);
      sections.push({
        id,
        type: "footer",
        bgColor,
        companyName: nameMatch?.[1] ?? null,
        address: null,
        unsubscribeUrl: unsubMatch?.[1] ?? null,
      });
    }
  }

  return {
    id: "email_" + nanoid(6),
    subject: subjectMatch?.[1] ?? "Email",
    previewText,
    type: (typeMatch?.[1] ?? "transactional") as EmailTemplate["type"],
    sections,
  };
}

// ─── HTML generation ──────────────────────────────────────────────────────────

export function generateEmailHtml(template: EmailTemplate): string {
  const sectionHtml = template.sections
    .map((s) => {
      const bg = s.bgColor ? "background-color:" + s.bgColor + ";" : "background-color:#ffffff;";
      switch (s.type) {
        case "header":
          return (
            `<table width="100%" style="${bg}padding:20px;text-align:center"><tr><td>` +
            (s.logoUrl
              ? `<img src="${s.logoUrl}" alt="${s.logoAlt ?? "logo"}" style="max-height:50px">`
              : "") +
            (s.title ? `<h2 style="margin:0">${s.title}</h2>` : "") +
            `</td></tr></table>`
          );
        case "hero":
          return (
            `<table width="100%" style="${bg}padding:40px;text-align:center"><tr><td>` +
            `<h1 style="margin:0 0 12px">${s.heading}</h1>` +
            (s.subheading ? `<p style="color:#555">${s.subheading}</p>` : "") +
            `</td></tr></table>`
          );
        case "text":
          return (
            `<table width="100%" style="${bg}padding:24px"><tr><td>` +
            `<p style="margin:0;line-height:1.6">${s.content}</p>` +
            `</td></tr></table>`
          );
        case "cta": {
          const ctaBg = s.cta.bgColor ?? "#4F46E5";
          return (
            `<table width="100%" style="${bg}padding:24px;text-align:center"><tr><td>` +
            (s.text ? `<p>${s.text}</p>` : "") +
            `<a href="${s.cta.url}" style="display:inline-block;padding:12px 32px;background:${ctaBg};color:#fff;text-decoration:none;border-radius:4px">${s.cta.label}</a>` +
            `</td></tr></table>`
          );
        }
        case "footer":
          return (
            `<table width="100%" style="${bg}padding:20px;text-align:center"><tr><td>` +
            `<p style="color:#888;font-size:12px;margin:0">${s.companyName ?? ""}</p>` +
            (s.unsubscribeUrl
              ? `<p style="font-size:11px;margin:4px 0 0"><a href="${s.unsubscribeUrl}" style="color:#aaa">Unsubscribe</a></p>`
              : "") +
            `</td></tr></table>`
          );
      }
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<title>${template.subject}</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td>
<table width="600" align="center" cellpadding="0" cellspacing="0">
<tr><td>
${sectionHtml}
</td></tr></table>
</td></tr></table>
</body></html>`;
}
