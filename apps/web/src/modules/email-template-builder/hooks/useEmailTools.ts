import { serializeEmailDSL } from "@ai-builder/serializers";
import { EmailSectionSchema } from "@ai-builder/schemas";
import type { EmailTemplate, EmailSection } from "@ai-builder/schemas";
import type React from "react";

type Setter = React.Dispatch<React.SetStateAction<EmailTemplate>>;
type ToolResult = Record<string, unknown>;

interface SimpleResult {
  success: true;
}

export function useEmailTools(template: EmailTemplate, setTemplate: Setter) {
  return {
    addSection: ({
      section,
      afterSectionId,
    }: {
      section: unknown;
      afterSectionId?: string | null;
    }): Promise<ToolResult> => {
      const parsed = EmailSectionSchema.safeParse(section);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
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
      sectionId,
      updates,
    }: {
      sectionId: string;
      updates: Partial<EmailSection>;
    }): Promise<SimpleResult> => {
      setTemplate((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? ({ ...s, ...updates } as EmailSection) : s
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeSection: ({ sectionId }: { sectionId: string }): Promise<SimpleResult> => {
      setTemplate((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }));
      return Promise.resolve({ success: true });
    },

    reorderSections: ({ orderedIds }: { orderedIds: string[] }): Promise<SimpleResult> => {
      setTemplate((prev) => {
        const map = Object.fromEntries(prev.sections.map((s) => [s.id, s]));
        const sections = orderedIds
          .map((id) => map[id])
          .filter((s): s is EmailSection => s !== undefined);
        return { ...prev, sections };
      });
      return Promise.resolve({ success: true });
    },

    queryTemplate: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeEmailDSL(template) });
    },

    previewInClient: ({
      client,
    }: {
      client: "gmail" | "outlook" | "apple";
    }): Promise<{ success: true; client: string }> => {
      // In a full impl, this would switch the preview mode
      return Promise.resolve({ success: true, client });
    },
  };
}

export type EmailTools = ReturnType<typeof useEmailTools>;
