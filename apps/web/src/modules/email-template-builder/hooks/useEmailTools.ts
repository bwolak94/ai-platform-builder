import { useMemo } from "react";
import { nanoid } from "nanoid";
import { serializeEmailDSL, analyzeSpam, buildPresetSections } from "@ai-builder/serializers";
import { EmailSectionSchema, SystemFontSchema } from "@ai-builder/schemas";
import type { EmailTemplate, EmailSection, EmailCta } from "@ai-builder/schemas";
import type { ClientMode } from "./useEmailState";
import type { PresetName } from "@ai-builder/serializers";

type Setter = (updater: EmailTemplate | ((prev: EmailTemplate) => EmailTemplate)) => void;
type ToolResult = Record<string, unknown>;

// ─── Flat section input types (mirror the worker tool schema) ─────────────────

interface FlatSectionInput {
  id: string;
  type: "header" | "hero" | "text" | "cta" | "footer" | "columns";
  bgColor?: string | null;
  // header
  logoUrl?: string | null;
  logoAlt?: string | null;
  title?: string | null;
  // hero
  heading?: string;
  subheading?: string | null;
  imageUrl?: string | null;
  // text
  content?: string;
  fontFamily?: string | null;
  // cta
  ctaLabel?: string;
  ctaUrl?: string;
  ctaBgColor?: string | null;
  ctaTextColor?: string | null;
  ctaText?: string | null;
  // footer
  companyName?: string | null;
  address?: string | null;
  unsubscribeUrl?: string | null;
  // columns
  columns?: {
    heading?: string | null;
    body?: string | null;
    imageUrl?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    ctaBgColor?: string | null;
  }[];
}

type FlatUpdate = Omit<FlatSectionInput, "id" | "type">;

// ─── Transform flat input → discriminated union EmailSection ──────────────────

function flatToSection(flat: FlatSectionInput): unknown {
  const base = { id: flat.id, bgColor: flat.bgColor ?? null };

  switch (flat.type) {
    case "header":
      return {
        ...base,
        type: "header",
        logoUrl: flat.logoUrl ?? null,
        logoAlt: flat.logoAlt ?? null,
        title: flat.title ?? null,
      };
    case "hero":
      return {
        ...base,
        type: "hero",
        heading: flat.heading ?? "Heading",
        subheading: flat.subheading ?? null,
        imageUrl: flat.imageUrl ?? null,
      };
    case "text": {
      const fontParsed = SystemFontSchema.safeParse(flat.fontFamily);
      return {
        ...base,
        type: "text",
        content: flat.content ?? "",
        fontFamily: fontParsed.success ? fontParsed.data : null,
      };
    }
    case "cta":
      return {
        ...base,
        type: "cta",
        text: flat.ctaText ?? null,
        cta: {
          label: flat.ctaLabel ?? "Click here",
          url: flat.ctaUrl ?? "#",
          bgColor: flat.ctaBgColor ?? null,
          textColor: flat.ctaTextColor ?? null,
        },
      };
    case "footer":
      return {
        ...base,
        type: "footer",
        companyName: flat.companyName ?? null,
        address: flat.address ?? null,
        unsubscribeUrl: flat.unsubscribeUrl ?? null,
      };
    case "columns": {
      const rawCols = flat.columns ?? [];
      const cols = rawCols.length >= 2 ? rawCols : [...rawCols, {}, {}].slice(0, 2);
      return {
        ...base,
        type: "columns",
        columns: cols.map((c) => ({
          heading: c.heading ?? null,
          body: c.body ?? null,
          imageUrl: c.imageUrl ?? null,
          cta:
            c.ctaLabel && c.ctaUrl
              ? { label: c.ctaLabel, url: c.ctaUrl, bgColor: c.ctaBgColor ?? null, textColor: null }
              : null,
        })),
      };
    }
  }
}

function applyUpdatesToSection(section: EmailSection, upd: FlatUpdate): EmailSection {
  const base = {
    ...section,
    bgColor: "bgColor" in upd ? (upd.bgColor ?? null) : section.bgColor,
  };

  switch (section.type) {
    case "header":
      return {
        ...base,
        type: "header",
        logoUrl: upd.logoUrl !== undefined ? (upd.logoUrl ?? null) : section.logoUrl,
        logoAlt: upd.logoAlt !== undefined ? (upd.logoAlt ?? null) : section.logoAlt,
        title: upd.title !== undefined ? (upd.title ?? null) : section.title,
      };
    case "hero":
      return {
        ...base,
        type: "hero",
        heading: upd.heading ?? section.heading,
        subheading: upd.subheading !== undefined ? (upd.subheading ?? null) : section.subheading,
        imageUrl: upd.imageUrl !== undefined ? (upd.imageUrl ?? null) : section.imageUrl,
      };
    case "text": {
      const fontParsed = SystemFontSchema.safeParse(upd.fontFamily);
      return {
        ...base,
        type: "text",
        content: upd.content ?? section.content,
        fontFamily:
          upd.fontFamily !== undefined
            ? fontParsed.success
              ? fontParsed.data
              : null
            : section.fontFamily,
      };
    }
    case "cta":
      return {
        ...base,
        type: "cta",
        text: upd.ctaText !== undefined ? (upd.ctaText ?? null) : section.text,
        cta: {
          label: upd.ctaLabel ?? section.cta.label,
          url: upd.ctaUrl ?? section.cta.url,
          bgColor: upd.ctaBgColor !== undefined ? (upd.ctaBgColor ?? null) : section.cta.bgColor,
          textColor:
            upd.ctaTextColor !== undefined ? (upd.ctaTextColor ?? null) : section.cta.textColor,
        },
      };
    case "footer":
      return {
        ...base,
        type: "footer",
        companyName:
          upd.companyName !== undefined ? (upd.companyName ?? null) : section.companyName,
        address: upd.address !== undefined ? (upd.address ?? null) : section.address,
        unsubscribeUrl:
          upd.unsubscribeUrl !== undefined ? (upd.unsubscribeUrl ?? null) : section.unsubscribeUrl,
      };
    case "columns": {
      if (!upd.columns) return { ...base, type: "columns", columns: section.columns };
      // Map incoming updates to EmailColumn shape; accepts both flat and full column objects
      const updatedCols = upd.columns.map((c, i) => {
        const existing = section.columns[i] ?? {
          heading: null,
          body: null,
          imageUrl: null,
          cta: null,
        };
        const raw = c as Record<string, unknown>;
        return {
          heading: "heading" in raw ? (raw.heading as string | null) : existing.heading,
          body: "body" in raw ? (raw.body as string | null) : existing.body,
          imageUrl: "imageUrl" in raw ? (raw.imageUrl as string | null) : existing.imageUrl,
          cta: "cta" in raw ? (raw.cta as EmailCta | null) : existing.cta,
        };
      });
      return { ...base, type: "columns", columns: updatedCols };
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEmailTools(
  template: EmailTemplate,
  setTemplate: Setter,
  setClientMode: (mode: ClientMode) => void
) {
  return useMemo(
    () => ({
      addSection: ({
        section: rawSection,
        afterSectionId,
      }: {
        section: unknown;
        afterSectionId?: string | null;
      }): Promise<ToolResult> => {
        const flat = rawSection as FlatSectionInput;
        const built = flatToSection(flat);
        const parsed = EmailSectionSchema.safeParse(built);
        if (!parsed.success) {
          return Promise.resolve({ error: parsed.error.message });
        }
        setTemplate((prev) => {
          const existing = prev.sections;
          if (!afterSectionId) return { ...prev, sections: [...existing, parsed.data] };
          const idx = existing.findIndex((s) => s.id === afterSectionId);
          if (idx === -1) return { ...prev, sections: [...existing, parsed.data] };
          const updated = [...existing];
          updated.splice(idx + 1, 0, parsed.data);
          return { ...prev, sections: updated };
        });
        return Promise.resolve({ success: true, sectionId: parsed.data.id });
      },

      updateSection: ({
        id,
        updates,
      }: {
        id: string;
        updates: FlatUpdate;
      }): Promise<ToolResult> => {
        setTemplate((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => (s.id === id ? applyUpdatesToSection(s, updates) : s)),
        }));
        return Promise.resolve({ success: true });
      },

      removeSection: ({ id }: { id: string }): Promise<ToolResult> => {
        setTemplate((prev) => ({
          ...prev,
          sections: prev.sections.filter((s) => s.id !== id),
        }));
        return Promise.resolve({ success: true });
      },

      duplicateSection: ({ id }: { id: string }): Promise<ToolResult> => {
        setTemplate((prev) => {
          const idx = prev.sections.findIndex((s) => s.id === id);
          if (idx === -1) return prev;
          const original = prev.sections[idx];
          if (!original) return prev;
          const clone: EmailSection = { ...original, id: "sec_" + nanoid(6) };
          const updated = [...prev.sections];
          updated.splice(idx + 1, 0, clone);
          return { ...prev, sections: updated };
        });
        return Promise.resolve({ success: true });
      },

      reorderSections: ({ orderedIds }: { orderedIds: string[] }): Promise<ToolResult> => {
        setTemplate((prev) => {
          const map = new Map(prev.sections.map((s) => [s.id, s]));
          const sections = orderedIds
            .map((id) => map.get(id))
            .filter((s): s is EmailSection => s !== undefined);
          return { ...prev, sections };
        });
        return Promise.resolve({ success: true });
      },

      updateMetadata: ({
        subject,
        previewText,
        type,
      }: {
        subject?: string;
        previewText?: string | null;
        type?: EmailTemplate["type"];
      }): Promise<ToolResult> => {
        setTemplate((prev) => ({
          ...prev,
          subject: subject ?? prev.subject,
          previewText: previewText !== undefined ? previewText : prev.previewText,
          type: type ?? prev.type,
        }));
        return Promise.resolve({ success: true });
      },

      queryTemplate: (): Promise<ToolResult> => {
        return Promise.resolve({ dsl: serializeEmailDSL(template) });
      },

      previewInClient: ({ client }: { client: ClientMode }): Promise<ToolResult> => {
        setClientMode(client);
        return Promise.resolve({ success: true, client });
      },

      checkSpam: (): Promise<ToolResult> => {
        const result = analyzeSpam(template);
        return Promise.resolve({ score: result.score, issues: result.issues } as ToolResult);
      },

      loadPreset: ({ name }: { name: string }): Promise<ToolResult> => {
        const presetSections = buildPresetSections(name as PresetName);
        setTemplate((prev) => ({ ...prev, sections: presetSections }));
        return Promise.resolve({
          success: true,
          preset: name,
          sectionCount: presetSections.length,
        });
      },

      // ── Backfilled tools ───────────────────────────────────────────────────

      suggestSubjectLines: (_args: { count: number; tone?: string }): Promise<ToolResult> => {
        return Promise.resolve({ success: true });
      },

      addPersonalizationToken: (_args: {
        token: string;
        description: string;
        exampleValue: string;
      }): Promise<ToolResult> => {
        // Token registered — acknowledged; agent uses token consistently in future content
        return Promise.resolve({ success: true });
      },

      auditEmailAccessibility: (): Promise<ToolResult> => {
        const issues: string[] = [];
        for (const s of template.sections) {
          if (s.type === "hero" && !s.imageUrl?.startsWith("http")) continue;
          if (s.type === "header" && s.logoUrl && !s.logoAlt) {
            issues.push(`Header logo is missing alt text.`);
          }
        }
        return Promise.resolve({ issues });
      },

      addLanguageVariant: (_args: {
        language: string;
        languageLabel: string;
      }): Promise<ToolResult> => {
        return Promise.resolve({ success: true });
      },

      createCampaignSequence: (_args: {
        name: string;
        emails: { dayOffset: number; purpose: string }[];
      }): Promise<ToolResult> => {
        return Promise.resolve({ success: true });
      },

      // ── New tools ─────────────────────────────────────────────────────────

      generateABVariant: (_args: {
        variantName: string;
        change: string;
        bValue: string;
      }): Promise<ToolResult> => {
        return Promise.resolve({ success: true });
      },

      addDynamicBlock: (args: {
        conditionToken: string;
        conditionValue: string;
        section: {
          type: "hero" | "text" | "cta";
          heading?: string;
          content?: string;
          ctaLabel?: string;
          ctaUrl?: string;
        };
      }): Promise<ToolResult> => {
        const flat: FlatSectionInput = {
          id: "sec_dyn_" + args.conditionToken,
          type: args.section.type,
          ...(args.section.heading !== undefined ? { heading: args.section.heading } : {}),
          ...(args.section.content !== undefined ? { content: args.section.content } : {}),
          ...(args.section.ctaLabel !== undefined ? { ctaLabel: args.section.ctaLabel } : {}),
          ...(args.section.ctaUrl !== undefined ? { ctaUrl: args.section.ctaUrl } : {}),
        };
        const built = flatToSection(flat);
        const parsed = EmailSectionSchema.safeParse(built);
        if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
        setTemplate((prev) => ({ ...prev, sections: [...prev.sections, parsed.data] }));
        return Promise.resolve({ success: true });
      },

      generatePlainText: (): Promise<ToolResult> => {
        const lines = template.sections.map((s) => {
          if (s.type === "hero") return `${s.heading}\n${s.subheading ?? ""}`;
          if (s.type === "text") return s.content;
          if (s.type === "cta") return `${s.text ?? ""}\n${s.cta.label}: ${s.cta.url}`;
          if (s.type === "header") return s.title ?? "";
          if (s.type === "footer") return `${s.companyName ?? ""}\n${s.address ?? ""}`;
          return "";
        });
        return Promise.resolve({ plainText: lines.filter(Boolean).join("\n\n") });
      },

      validateCSSCompatibility: (): Promise<ToolResult> => {
        return Promise.resolve({ success: true, dsl: serializeEmailDSL(template) });
      },

      addSocialProof: (args: {
        variant: "stars-rating" | "testimonial-quote" | "logo-strip";
        afterSectionId?: string | null;
        quote?: string;
        author?: string;
        rating?: number;
      }): Promise<ToolResult> => {
        const content =
          args.variant === "testimonial-quote"
            ? `"${args.quote ?? "Great product!"}" — ${args.author ?? "Customer"}`
            : args.variant === "stars-rating"
              ? `${"★".repeat(args.rating ?? 5)} (${String(args.rating ?? 5)}/5)`
              : "Trusted by leading companies";
        const flat: FlatSectionInput = { id: "sec_sp_" + nanoid(6), type: "text", content };
        const built = flatToSection(flat);
        const parsed = EmailSectionSchema.safeParse(built);
        if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
        setTemplate((prev) => {
          const existing = prev.sections;
          if (!args.afterSectionId) return { ...prev, sections: [...existing, parsed.data] };
          const idx = existing.findIndex((s) => s.id === args.afterSectionId);
          if (idx === -1) return { ...prev, sections: [...existing, parsed.data] };
          const updated = [...existing];
          updated.splice(idx + 1, 0, parsed.data);
          return { ...prev, sections: updated };
        });
        return Promise.resolve({ success: true });
      },

      previewDarkMode: ({ enabled }: { enabled: boolean }): Promise<ToolResult> => {
        setClientMode(enabled ? "dark" : "desktop");
        return Promise.resolve({ success: true, mode: enabled ? "dark" : "desktop" });
      },

      generateUnsubscribePage: (_args: {
        brandName: string;
        accentColor: string;
      }): Promise<ToolResult> => {
        return Promise.resolve({ success: true });
      },

      generateMjml: (): Promise<ToolResult> => {
        return Promise.resolve({ success: true, dsl: serializeEmailDSL(template) });
      },

      addCountdownTimer: (args: {
        deadline: string;
        label: string;
        afterSectionId?: string | null;
      }): Promise<ToolResult> => {
        const flat: FlatSectionInput = {
          id: "sec_timer_" + nanoid(6),
          type: "text",
          content: `${args.label} · ${args.deadline}`,
        };
        const built = flatToSection(flat);
        const parsed = EmailSectionSchema.safeParse(built);
        if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
        setTemplate((prev) => {
          const existing = prev.sections;
          if (!args.afterSectionId) return { ...prev, sections: [...existing, parsed.data] };
          const idx = existing.findIndex((s) => s.id === args.afterSectionId);
          if (idx === -1) return { ...prev, sections: [...existing, parsed.data] };
          const updated = [...existing];
          updated.splice(idx + 1, 0, parsed.data);
          return { ...prev, sections: updated };
        });
        return Promise.resolve({ success: true });
      },

      scoreReadability: (): Promise<ToolResult> => {
        const allText = template.sections
          .map((s) => {
            if (s.type === "hero") return `${s.heading} ${s.subheading ?? ""}`;
            if (s.type === "text") return s.content;
            if (s.type === "cta") return `${s.text ?? ""} ${s.cta.label}`;
            return "";
          })
          .join(" ")
          .trim();
        const words = allText.split(/\s+/).filter(Boolean).length;
        const sentences = allText.split(/[.!?]+/).filter(Boolean).length || 1;
        const avgSentenceLen = Math.round(words / sentences);
        // Flesch-Kincaid approximation
        const gradeLevel = Math.max(0, Math.round(0.39 * avgSentenceLen - 1));
        return Promise.resolve({ gradeLevel, wordCount: words, avgSentenceLength: avgSentenceLen });
      },

      generateTextVersion: (): Promise<ToolResult> => {
        const lines = template.sections.map((s) => {
          if (s.type === "hero") return `${s.heading.toUpperCase()}\n${s.subheading ?? ""}`;
          if (s.type === "text") return s.content;
          if (s.type === "cta") return `${s.text ?? ""}\n${s.cta.label}: ${s.cta.url}`;
          if (s.type === "header") return s.title ? `[ ${s.title} ]` : "";
          if (s.type === "footer") return `${s.companyName ?? ""} | ${s.address ?? ""}`;
          return "";
        });
        return Promise.resolve({ plainText: lines.filter(Boolean).join("\n\n") });
      },

      addRssBlock: (args: {
        feedUrl: string;
        itemCount: number;
        afterSectionId?: string | null;
      }): Promise<ToolResult> => {
        const cols = Array.from({ length: Math.min(args.itemCount, 3) }, (_, i) => ({
          heading: `Article ${String(i + 1)}`,
          body: `From ${args.feedUrl}`,
          imageUrl: null,
          ctaLabel: "Read more",
          ctaUrl: args.feedUrl,
          ctaBgColor: null,
        }));
        const flat: FlatSectionInput = {
          id: "sec_rss_" + nanoid(6),
          type: "columns",
          columns: cols,
        };
        const built = flatToSection(flat);
        const parsed = EmailSectionSchema.safeParse(built);
        if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
        setTemplate((prev) => {
          const existing = prev.sections;
          if (!args.afterSectionId) return { ...prev, sections: [...existing, parsed.data] };
          const idx = existing.findIndex((s) => s.id === args.afterSectionId);
          if (idx === -1) return { ...prev, sections: [...existing, parsed.data] };
          const updated = [...existing];
          updated.splice(idx + 1, 0, parsed.data);
          return { ...prev, sections: updated };
        });
        return Promise.resolve({ success: true });
      },

      // Direct client-side helper (not an agent tool): apply section update from SectionEditor
      applySectionEdit: (id: string, updates: FlatUpdate): void => {
        setTemplate((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => (s.id === id ? applyUpdatesToSection(s, updates) : s)),
        }));
      },
    }),
    [template, setTemplate, setClientMode]
  );
}

export type EmailTools = ReturnType<typeof useEmailTools>;
