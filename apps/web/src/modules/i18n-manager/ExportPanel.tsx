import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportLanguageJson, serializeI18nDSL } from "@ai-builder/serializers";
import type { TranslationStore, SupportedLanguage } from "@ai-builder/schemas";

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

export function ExportPanel({ store }: ExportPanelProps) {
  const nonSourceLanguages = store.activeLanguages.filter((l) => l !== store.sourceLanguage);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        {store.activeLanguages.map((lang: SupportedLanguage) => (
          <Button
            key={lang}
            variant="outline"
            size="sm"
            onClick={() => {
              const json = exportLanguageJson(store, lang);
              downloadFile(JSON.stringify(json, null, 2), lang + ".json", "application/json");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> {lang}.json
          </Button>
        ))}
        {nonSourceLanguages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const all: Record<string, Record<string, string>> = {};
              for (const lang of store.activeLanguages) {
                all[lang] = exportLanguageJson(store, lang);
              }
              downloadFile(JSON.stringify(all, null, 2), "translations.json", "application/json");
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> All langs
          </Button>
        )}
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
