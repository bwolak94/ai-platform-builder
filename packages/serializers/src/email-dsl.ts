// DSL format:
// EMAIL: Welcome to our platform | type:transactional
// preview: "Confirm your account to get started"
//
// [HEADER]  logo:https://... | logoAlt:Logo | title:MyBrand | bg:#FFFFFF
// [HERO]    "Welcome, Jan!" | sub:"Please confirm your email" | img:https://...
// [CTA]     "Confirm Email" → https://... | ctaBg:#4F46E5 | textColor:#FFFFFF
// [TEXT]    "Body copy here" | font:Arial | bg:#F9F9F9
// [FOOTER]  "Acme Inc." | addr:"123 Main St" | unsubscribe:https://...
// [COLUMNS] 2 | col1:h:Heading,b:Body | col2:h:Heading2,b:Body2

import { nanoid } from "nanoid";
import type { EmailTemplate, EmailSection, EmailColumn, SystemFont } from "@ai-builder/schemas";
import { SystemFontSchema } from "@ai-builder/schemas";

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeSection(s: EmailSection): string {
  const bg = s.bgColor ? " | bg:" + s.bgColor : "";

  switch (s.type) {
    case "header": {
      const parts: string[] = [];
      if (s.logoUrl) parts.push("logo:" + s.logoUrl);
      if (s.logoAlt) parts.push("logoAlt:" + s.logoAlt);
      if (s.title) parts.push("title:" + s.title);
      return "[HEADER]  " + (parts.length ? parts.join(" | ") : "") + bg;
    }
    case "hero": {
      let line = '[HERO]    "' + s.heading + '"';
      if (s.subheading) line += ' | sub:"' + s.subheading + '"';
      if (s.imageUrl) line += " | img:" + s.imageUrl;
      return line + bg;
    }
    case "text":
      return '[TEXT]    "' + s.content + '"' + (s.fontFamily ? " | font:" + s.fontFamily : "") + bg;
    case "cta": {
      let line = '[CTA]     "' + s.cta.label + '" \u2192 ' + s.cta.url;
      if (s.cta.bgColor) line += " | ctaBg:" + s.cta.bgColor;
      if (s.cta.textColor) line += " | textColor:" + s.cta.textColor;
      if (s.text) line += ' | ctaText:"' + s.text + '"';
      return line + bg;
    }
    case "footer": {
      let line = '[FOOTER]  "' + (s.companyName ?? "") + '"';
      if (s.address) line += ' | addr:"' + s.address + '"';
      if (s.unsubscribeUrl) line += " | unsubscribe:" + s.unsubscribeUrl;
      return line + bg;
    }
    case "columns": {
      const colParts = s.columns
        .map((c, i) => {
          const parts: string[] = [];
          if (c.heading) parts.push("h:" + c.heading);
          if (c.body) parts.push("b:" + c.body);
          return `col${String(i + 1)}:${parts.join(",")}`;
        })
        .join(" | ");
      return "[COLUMNS] " + String(s.columns.length) + " | " + colParts + bg;
    }
  }
}

export function serializeEmailDSL(template: EmailTemplate): string {
  const header = "EMAIL: " + template.subject + " | type:" + template.type;
  const preview = template.previewText ? 'preview: "' + template.previewText + '"' : "";
  const sections = template.sections.map(serializeSection).join("\n");
  return [header, preview, "", sections].filter(Boolean).join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

function extractBg(line: string): string | null {
  const m = /\|\s*bg:(#[0-9A-Fa-f]{6})/.exec(line);
  return m?.[1] ?? null;
}

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

    const bgColor = extractBg(trimmed);
    const id = "sec_" + nanoid(6);

    if (trimmed.startsWith("[HEADER]")) {
      const logoMatch = /logo:(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      const logoAltMatch = /logoAlt:(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      const titleMatch = /title:(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      sections.push({
        id,
        type: "header",
        bgColor,
        logoUrl: logoMatch?.[1] ?? null,
        logoAlt: logoAltMatch?.[1] ?? null,
        title: titleMatch?.[1] ?? null,
      });
    } else if (trimmed.startsWith("[HERO]")) {
      const headMatch = /"([^"]+)"/.exec(trimmed);
      const subMatch = /sub:"([^"]+)"/.exec(trimmed);
      const imgMatch = /img:(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      sections.push({
        id,
        type: "hero",
        bgColor,
        heading: headMatch?.[1] ?? "Heading",
        subheading: subMatch?.[1] ?? null,
        imageUrl: imgMatch?.[1] ?? null,
      });
    } else if (trimmed.startsWith("[TEXT]")) {
      const contentMatch = /"([^"]+)"/.exec(trimmed);
      const fontMatch = /font:(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      const fontParsed = SystemFontSchema.safeParse(fontMatch?.[1]);
      sections.push({
        id,
        type: "text",
        bgColor,
        content: contentMatch?.[1] ?? "",
        fontFamily: fontParsed.success ? fontParsed.data : null,
      });
    } else if (trimmed.startsWith("[CTA]")) {
      const labelMatch = /"([^"]+)"/.exec(trimmed);
      const urlMatch = /\u2192\s*(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      const ctaBgMatch = /ctaBg:(#[0-9A-Fa-f]{6})/.exec(trimmed);
      const textColorMatch = /textColor:(#[0-9A-Fa-f]{6})/.exec(trimmed);
      const ctaTextMatch = /ctaText:"([^"]*)"/.exec(trimmed);
      sections.push({
        id,
        type: "cta",
        bgColor,
        text: ctaTextMatch?.[1] ?? null,
        cta: {
          label: labelMatch?.[1] ?? "Click here",
          url: urlMatch?.[1] ?? "#",
          bgColor: ctaBgMatch?.[1] ?? null,
          textColor: textColorMatch?.[1] ?? null,
        },
      });
    } else if (trimmed.startsWith("[FOOTER]")) {
      const nameMatch = /"([^"]*)"/.exec(trimmed);
      const addrMatch = /addr:"([^"]*)"/.exec(trimmed);
      const unsubMatch = /unsubscribe:(\S+?)(?:\s*\||\s*$)/.exec(trimmed);
      sections.push({
        id,
        type: "footer",
        bgColor,
        companyName: nameMatch?.[1] ?? null,
        address: addrMatch?.[1] ?? null,
        unsubscribeUrl: unsubMatch?.[1] ?? null,
      });
    } else if (trimmed.startsWith("[COLUMNS]")) {
      const countMatch = /\[COLUMNS\]\s+(\d)/.exec(trimmed);
      const count = Math.min(3, Math.max(2, parseInt(countMatch?.[1] ?? "2", 10)));
      const columns: EmailColumn[] = [];
      for (let i = 1; i <= count; i++) {
        const colMatch = new RegExp(`col${String(i)}:([^|]+)`).exec(trimmed);
        const colStr = colMatch?.[1]?.trim() ?? "";
        const headMatch = /h:([^,]+)/.exec(colStr);
        const bodyMatch = /b:([^,]+)/.exec(colStr);
        columns.push({
          heading: headMatch?.[1]?.trim() ?? null,
          body: bodyMatch?.[1]?.trim() ?? null,
          imageUrl: null,
          cta: null,
        });
      }
      // Ensure minimum 2 columns
      while (columns.length < 2) {
        columns.push({ heading: null, body: null, imageUrl: null, cta: null });
      }
      sections.push({ id, type: "columns", bgColor, columns });
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
              ? `<img src="${s.logoUrl}" alt="${s.logoAlt ?? "logo"}" style="max-height:50px;display:inline-block">`
              : "") +
            (s.title
              ? `<h2 style="margin:${s.logoUrl ? "8px" : "0"} 0 0;font-family:Arial,sans-serif">${s.title}</h2>`
              : "") +
            `</td></tr></table>`
          );

        case "hero":
          return (
            `<table width="100%" style="${bg}padding:40px;text-align:center"><tr><td>` +
            (s.imageUrl
              ? `<img src="${s.imageUrl}" alt="${s.heading}" style="max-width:100%;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto">`
              : "") +
            `<h1 style="margin:0 0 12px;font-family:Arial,sans-serif">${s.heading}</h1>` +
            (s.subheading
              ? `<p style="color:#555;margin:0;font-family:Arial,sans-serif">${s.subheading}</p>`
              : "") +
            `</td></tr></table>`
          );

        case "text": {
          const fontStyle = s.fontFamily
            ? `font-family:${s.fontFamily},sans-serif;`
            : "font-family:Arial,sans-serif;";
          return (
            `<table width="100%" style="${bg}padding:24px"><tr><td>` +
            `<p style="margin:0;line-height:1.7;${fontStyle}">${s.content}</p>` +
            `</td></tr></table>`
          );
        }

        case "cta": {
          const ctaBg = s.cta.bgColor ?? "#4F46E5";
          const ctaColor = s.cta.textColor ?? "#ffffff";
          return (
            `<table width="100%" style="${bg}padding:24px;text-align:center"><tr><td>` +
            (s.text
              ? `<p style="margin:0 0 16px;font-family:Arial,sans-serif">${s.text}</p>`
              : "") +
            `<a href="${s.cta.url}" style="display:inline-block;padding:12px 32px;background:${ctaBg};color:${ctaColor};text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;font-weight:600">${s.cta.label}</a>` +
            `</td></tr></table>`
          );
        }

        case "footer":
          return (
            `<table width="100%" style="${bg}padding:20px;text-align:center"><tr><td>` +
            (s.companyName
              ? `<p style="color:#888;font-size:12px;margin:0;font-family:Arial,sans-serif">${s.companyName}</p>`
              : "") +
            (s.address
              ? `<p style="color:#aaa;font-size:11px;margin:4px 0 0;font-family:Arial,sans-serif">${s.address}</p>`
              : "") +
            (s.unsubscribeUrl
              ? `<p style="font-size:11px;margin:4px 0 0"><a href="${s.unsubscribeUrl}" style="color:#aaa;font-family:Arial,sans-serif">Unsubscribe</a></p>`
              : "") +
            `</td></tr></table>`
          );

        case "columns": {
          const colWidth = Math.floor(100 / s.columns.length);
          const colHtml = s.columns
            .map(
              (col) =>
                `<td style="width:${String(colWidth)}%;padding:16px;vertical-align:top">` +
                (col.imageUrl
                  ? `<img src="${col.imageUrl}" alt="${col.heading ?? ""}" style="max-width:100%;margin-bottom:12px;display:block">`
                  : "") +
                (col.heading
                  ? `<h3 style="margin:0 0 8px;font-family:Arial,sans-serif">${col.heading}</h3>`
                  : "") +
                (col.body
                  ? `<p style="margin:0;line-height:1.6;font-size:14px;font-family:Arial,sans-serif">${col.body}</p>`
                  : "") +
                (col.cta
                  ? `<a href="${col.cta.url}" style="display:inline-block;margin-top:12px;padding:8px 20px;background:${col.cta.bgColor ?? "#4F46E5"};color:${col.cta.textColor ?? "#fff"};text-decoration:none;border-radius:4px;font-size:14px;font-family:Arial,sans-serif">${col.cta.label}</a>`
                  : "") +
                `</td>`
            )
            .join("");
          return (
            `<table width="100%" style="${bg}"><tr><td style="padding:8px">` +
            `<table width="100%" cellpadding="0" cellspacing="0"><tr>${colHtml}</tr></table>` +
            `</td></tr></table>`
          );
        }
      }
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${template.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4"><tr><td align="center" style="padding:20px 0">
<table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden">
<tr><td>
${sectionHtml}
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

// ─── Spam analysis ─────────────────────────────────────────────────────────────

export interface SpamResult {
  score: number; // 0–100 (higher = more spammy)
  issues: string[];
}

const SPAM_WORDS = [
  "free",
  "winner",
  "congratulations",
  "click now",
  "act now",
  "limited time",
  "urgent",
  "exclusive deal",
  "special promotion",
  "you won",
  "cash prize",
  "no cost",
  "order now",
  "save big",
  "guaranteed",
  "risk free",
  "100% free",
];

export function analyzeSpam(template: EmailTemplate): SpamResult {
  const issues: string[] = [];
  let score = 0;
  const subject = template.subject;

  // Subject line checks
  if (subject.length > 60) {
    issues.push(`Subject too long (${String(subject.length)}/60 chars)`);
    score += 5;
  }
  if (subject.trim() === subject.trim().toUpperCase() && subject.trim().length > 3) {
    issues.push("Subject line is ALL CAPS");
    score += 20;
  }
  const exclamations = (subject.match(/!/g) ?? []).length;
  if (exclamations > 1) {
    issues.push(`Subject has ${String(exclamations)} exclamation marks (max 1)`);
    score += exclamations * 5;
  }
  const subjectLower = subject.toLowerCase();
  for (const word of SPAM_WORDS) {
    if (subjectLower.includes(word)) {
      issues.push(`Subject contains spam trigger word: "${word}"`);
      score += 10;
      break; // count once
    }
  }

  // Body checks
  const textContent = template.sections
    .flatMap((s) => {
      if (s.type === "text") return [s.content];
      if (s.type === "hero") return [s.heading, s.subheading ?? ""];
      if (s.type === "cta") return [s.cta.label, s.text ?? ""];
      return [];
    })
    .join(" ");

  const allWords = textContent.split(/\s+/).filter((w) => w.length > 3);
  const capsWords = allWords.filter((w) => w === w.toUpperCase() && /[A-Z]{2,}/.test(w));
  if (capsWords.length > 3) {
    issues.push(`${String(capsWords.length)} ALL CAPS words in body (max 3)`);
    score += Math.min(15, capsWords.length * 2);
  }

  const bodyLower = textContent.toLowerCase();
  for (const word of SPAM_WORDS) {
    if (bodyLower.includes(word)) {
      issues.push(`Body contains spam trigger word: "${word}"`);
      score += 8;
      break;
    }
  }

  // Structure checks
  const hasHeader = template.sections.some((s) => s.type === "header");
  const hasFooter = template.sections.some((s) => s.type === "footer");
  const hasUnsubscribe = template.sections.some((s) => s.type === "footer" && s.unsubscribeUrl);

  if (!hasHeader) {
    issues.push("Missing header section");
    score += 5;
  }
  if (!hasFooter) {
    issues.push("Missing footer section");
    score += 10;
  }
  if (template.type === "marketing" && !hasUnsubscribe) {
    issues.push("Marketing email must have an unsubscribe link (CAN-SPAM)");
    score += 20;
  }
  if (!template.previewText) {
    issues.push("Missing preview text (affects open rates)");
    score += 3;
  }

  return { score: Math.min(100, score), issues };
}

// ─── Preset templates ─────────────────────────────────────────────────────────

export type PresetName =
  | "welcome"
  | "password-reset"
  | "order-confirmation"
  | "newsletter"
  | "promotional";

export function buildPresetSections(name: PresetName): EmailSection[] {
  const id = () => "sec_" + nanoid(6);

  switch (name) {
    case "welcome":
      return [
        {
          id: id(),
          type: "header",
          bgColor: "#4F46E5",
          logoUrl: null,
          logoAlt: null,
          title: "MyBrand",
        },
        {
          id: id(),
          type: "hero",
          bgColor: "#EEF2FF",
          heading: "Welcome aboard!",
          subheading: "Thanks for joining. Let's get you started.",
          imageUrl: null,
        },
        {
          id: id(),
          type: "text",
          bgColor: null,
          content:
            "We're thrilled to have you with us. Your account is ready and you can start exploring right away.",
          fontFamily: "Arial" as SystemFont,
        },
        {
          id: id(),
          type: "cta",
          bgColor: null,
          text: "Ready to dive in?",
          cta: { label: "Get started", url: "#", bgColor: "#4F46E5", textColor: "#ffffff" },
        },
        {
          id: id(),
          type: "footer",
          bgColor: "#F9FAFB",
          companyName: "MyBrand Inc.",
          address: null,
          unsubscribeUrl: "#",
        },
      ];

    case "password-reset":
      return [
        {
          id: id(),
          type: "header",
          bgColor: "#ffffff",
          logoUrl: null,
          logoAlt: null,
          title: "MyBrand",
        },
        {
          id: id(),
          type: "hero",
          bgColor: "#FEF2F2",
          heading: "Reset your password",
          subheading: "We received a request to reset your password.",
          imageUrl: null,
        },
        {
          id: id(),
          type: "text",
          bgColor: null,
          content:
            "Click the button below to reset your password. This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.",
          fontFamily: "Arial" as SystemFont,
        },
        {
          id: id(),
          type: "cta",
          bgColor: null,
          text: null,
          cta: { label: "Reset password", url: "#", bgColor: "#DC2626", textColor: "#ffffff" },
        },
        {
          id: id(),
          type: "footer",
          bgColor: "#F9FAFB",
          companyName: "MyBrand Inc.",
          address: null,
          unsubscribeUrl: null,
        },
      ];

    case "order-confirmation":
      return [
        {
          id: id(),
          type: "header",
          bgColor: "#ffffff",
          logoUrl: null,
          logoAlt: null,
          title: "MyBrand",
        },
        {
          id: id(),
          type: "hero",
          bgColor: "#F0FDF4",
          heading: "Order confirmed!",
          subheading: "Thank you for your purchase. Your order #12345 is being processed.",
          imageUrl: null,
        },
        {
          id: id(),
          type: "text",
          bgColor: null,
          content:
            "We'll send you another email when your order ships. In the meantime, you can track your order status in your account dashboard.",
          fontFamily: "Arial" as SystemFont,
        },
        {
          id: id(),
          type: "cta",
          bgColor: null,
          text: null,
          cta: { label: "Track your order", url: "#", bgColor: "#16A34A", textColor: "#ffffff" },
        },
        {
          id: id(),
          type: "footer",
          bgColor: "#F9FAFB",
          companyName: "MyBrand Inc.",
          address: "123 Commerce St, City, ST 00000",
          unsubscribeUrl: null,
        },
      ];

    case "newsletter":
      return [
        {
          id: id(),
          type: "header",
          bgColor: "#1E293B",
          logoUrl: null,
          logoAlt: null,
          title: "MyBrand Weekly",
        },
        {
          id: id(),
          type: "hero",
          bgColor: "#F8FAFC",
          heading: "This week in MyBrand",
          subheading: "Your curated digest of what matters most.",
          imageUrl: null,
        },
        {
          id: id(),
          type: "columns",
          bgColor: null,
          columns: [
            {
              heading: "Feature update",
              body: "We shipped a major new feature that saves you hours every week.",
              imageUrl: null,
              cta: { label: "Read more", url: "#", bgColor: "#4F46E5", textColor: "#ffffff" },
            },
            {
              heading: "Community spotlight",
              body: "See how our users are building amazing things with the platform.",
              imageUrl: null,
              cta: { label: "Read more", url: "#", bgColor: "#4F46E5", textColor: "#ffffff" },
            },
          ],
        },
        {
          id: id(),
          type: "text",
          bgColor: null,
          content:
            "Have feedback or a story to share? Reply to this email — we read every message.",
          fontFamily: "Arial" as SystemFont,
        },
        {
          id: id(),
          type: "footer",
          bgColor: "#1E293B",
          companyName: "MyBrand Inc.",
          address: null,
          unsubscribeUrl: "#",
        },
      ];

    case "promotional":
      return [
        {
          id: id(),
          type: "header",
          bgColor: "#7C3AED",
          logoUrl: null,
          logoAlt: null,
          title: "MyBrand",
        },
        {
          id: id(),
          type: "hero",
          bgColor: "#7C3AED",
          heading: "50% off — this weekend only",
          subheading: "Upgrade your plan and save big before the offer expires.",
          imageUrl: null,
        },
        {
          id: id(),
          type: "text",
          bgColor: null,
          content:
            "Use code SAVE50 at checkout. Valid through Sunday midnight. No catch — just our biggest discount of the year.",
          fontFamily: "Arial" as SystemFont,
        },
        {
          id: id(),
          type: "cta",
          bgColor: null,
          text: "Offer ends Sunday at midnight.",
          cta: { label: "Claim your 50% off", url: "#", bgColor: "#7C3AED", textColor: "#ffffff" },
        },
        {
          id: id(),
          type: "footer",
          bgColor: "#F9FAFB",
          companyName: "MyBrand Inc.",
          address: null,
          unsubscribeUrl: "#",
        },
      ];
  }
}
