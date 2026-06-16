import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailSection, SystemFont } from "@ai-builder/schemas";

interface SectionEditorProps {
  section: EmailSection;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
    </div>
  );
}

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }: TextareaFieldProps) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] font-medium">
        {label}
      </Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        rows={rows}
        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-1.5 text-xs shadow-sm outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value ?? "#ffffff"}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="h-7 w-7 cursor-pointer rounded border"
        title={label}
      />
      <Label htmlFor={id} className="text-[11px] font-medium">
        {label}
      </Label>
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
          }}
          className="text-muted-foreground hover:text-foreground text-[10px] underline"
        >
          clear
        </button>
      )}
      {value && <span className="text-muted-foreground font-mono text-[10px]">{value}</span>}
    </div>
  );
}

const SYSTEM_FONTS: SystemFont[] = [
  "Arial",
  "Georgia",
  "Helvetica",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

export function SectionEditor({ section, onUpdate }: SectionEditorProps) {
  const update = (updates: Record<string, unknown>) => {
    onUpdate(section.id, updates);
  };

  return (
    <div className="space-y-2.5 rounded-md border p-3">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
        Edit — {section.type}
      </p>

      {/* Common: background color */}
      <ColorField
        label="Section background"
        value={section.bgColor}
        onChange={(v) => {
          update({ bgColor: v });
        }}
      />

      {section.type === "header" && (
        <>
          <Field
            label="Brand title"
            value={section.title ?? ""}
            onChange={(v) => {
              update({ title: v || null });
            }}
            placeholder="MyBrand"
          />
          <Field
            label="Logo URL"
            value={section.logoUrl ?? ""}
            onChange={(v) => {
              update({ logoUrl: v || null });
            }}
            placeholder="https://..."
          />
          <Field
            label="Logo alt text"
            value={section.logoAlt ?? ""}
            onChange={(v) => {
              update({ logoAlt: v || null });
            }}
            placeholder="Company logo"
          />
        </>
      )}

      {section.type === "hero" && (
        <>
          <Field
            label="Heading"
            value={section.heading}
            onChange={(v) => {
              update({ heading: v });
            }}
            placeholder="Main headline"
          />
          <Field
            label="Subheading"
            value={section.subheading ?? ""}
            onChange={(v) => {
              update({ subheading: v || null });
            }}
            placeholder="Supporting text"
          />
          <Field
            label="Image URL"
            value={section.imageUrl ?? ""}
            onChange={(v) => {
              update({ imageUrl: v || null });
            }}
            placeholder="https://..."
          />
        </>
      )}

      {section.type === "text" && (
        <>
          <TextareaField
            label="Content"
            value={section.content}
            onChange={(v) => {
              update({ content: v });
            }}
            placeholder="Body copy…"
            rows={4}
          />
          <div className="space-y-1">
            <Label className="text-[11px] font-medium">Font family</Label>
            <select
              value={section.fontFamily ?? ""}
              onChange={(e) => {
                update({ fontFamily: e.target.value || null });
              }}
              className="border-input bg-background text-foreground focus-visible:ring-ring w-full rounded-md border px-2 py-1 text-xs shadow-sm outline-none focus-visible:ring-1"
            >
              <option value="">Default (Arial)</option>
              {SYSTEM_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {section.type === "cta" && (
        <>
          <Field
            label="Button label"
            value={section.cta.label}
            onChange={(v) => {
              update({ ctaLabel: v });
            }}
            placeholder="Get started"
          />
          <Field
            label="Button URL"
            value={section.cta.url}
            onChange={(v) => {
              update({ ctaUrl: v });
            }}
            placeholder="https://..."
          />
          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Button bg"
              value={section.cta.bgColor}
              onChange={(v) => {
                update({ ctaBgColor: v });
              }}
            />
            <ColorField
              label="Button text"
              value={section.cta.textColor}
              onChange={(v) => {
                update({ ctaTextColor: v });
              }}
            />
          </div>
          <Field
            label="Text above button"
            value={section.text ?? ""}
            onChange={(v) => {
              update({ ctaText: v || null });
            }}
            placeholder="Optional paragraph…"
          />
        </>
      )}

      {section.type === "footer" && (
        <>
          <Field
            label="Company name"
            value={section.companyName ?? ""}
            onChange={(v) => {
              update({ companyName: v || null });
            }}
            placeholder="MyBrand Inc."
          />
          <Field
            label="Address"
            value={section.address ?? ""}
            onChange={(v) => {
              update({ address: v || null });
            }}
            placeholder="123 Main St, City, ST 00000"
          />
          <Field
            label="Unsubscribe URL"
            value={section.unsubscribeUrl ?? ""}
            onChange={(v) => {
              update({ unsubscribeUrl: v || null });
            }}
            placeholder="https://..."
          />
        </>
      )}

      {section.type === "columns" && (
        <div className="space-y-3">
          {section.columns.map((col, i) => (
            <div key={i} className="space-y-1.5 rounded border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                Column {i + 1}
              </p>
              <Field
                label="Heading"
                value={col.heading ?? ""}
                onChange={(v) => {
                  const updated = section.columns.map((c, j) =>
                    j === i ? { ...c, heading: v || null } : c
                  );
                  update({ columns: updated });
                }}
                placeholder="Column heading"
              />
              <TextareaField
                label="Body"
                value={col.body ?? ""}
                onChange={(v) => {
                  const updated = section.columns.map((c, j) =>
                    j === i ? { ...c, body: v || null } : c
                  );
                  update({ columns: updated });
                }}
                placeholder="Column body text…"
                rows={2}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
