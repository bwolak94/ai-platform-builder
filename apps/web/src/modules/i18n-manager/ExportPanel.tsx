import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportLanguageJson, serializeI18nDSL } from "@ai-builder/serializers";
import type { TranslationStore } from "@ai-builder/schemas";

interface ExportPanelProps {
  store: TranslationStore;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convert flat dot-notation keys to a nested object for react-i18next / vue-i18n compatibility. */
function nestJson(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dotKey, value] of Object.entries(flat)) {
    const parts = dotKey.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) continue;
      if (typeof current[part] !== "object" || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined) current[lastPart] = value;
  }
  return result;
}

export function ExportPanel({ store }: ExportPanelProps) {
  const nonSourceLanguages = store.activeLanguages.filter((l) => l !== store.sourceLanguage);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        {/* Per-language nested JSON — compatible with react-i18next, vue-i18n, etc. */}
        {store.activeLanguages.map((lang) => (
          <Button
            key={lang}
            variant="outline"
            size="sm"
            onClick={() => {
              const json = nestJson(exportLanguageJson(store, lang));
              downloadFile(JSON.stringify(json, null, 2), `${lang}.json`, "application/json");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> {lang}.json
          </Button>
        ))}

        {/* All languages in a single nested JSON bundle */}
        {nonSourceLanguages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const all: Record<string, unknown> = {};
              for (const lang of store.activeLanguages) {
                all[lang] = nestJson(exportLanguageJson(store, lang));
              }
              downloadFile(JSON.stringify(all, null, 2), "translations.json", "application/json");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> All langs
          </Button>
        )}

        {/* Flat dot-notation JSON — for tools that require flat format */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const all: Record<string, Record<string, string>> = {};
            for (const lang of store.activeLanguages) {
              all[lang] = exportLanguageJson(store, lang);
            }
            downloadFile(
              JSON.stringify(all, null, 2),
              "translations.flat.json",
              "application/json"
            );
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Flat JSON
        </Button>

        {/* Raw DSL for re-import or version control */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(serializeI18nDSL(store), "translations.i18n.dsl", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> DSL
        </Button>
      </div>
    </div>
  );
}
