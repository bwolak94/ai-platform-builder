import { Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DecoratorPreset {
  label: string;
  description: string;
  code: string;
}

const DECORATOR_PRESETS: DecoratorPreset[] = [
  {
    label: "ThemeProvider",
    description: "Wrap with custom theme context",
    code: "(Story) => <ThemeProvider><Story /></ThemeProvider>",
  },
  {
    label: "BrowserRouter",
    description: "Enable React Router hooks inside stories",
    code: "(Story) => <BrowserRouter><Story /></BrowserRouter>",
  },
  {
    label: "QueryClient",
    description: "Provide TanStack Query context",
    code: "(Story) => <QueryClientProvider client={new QueryClient()}><Story /></QueryClientProvider>",
  },
  {
    label: "RTL Layout",
    description: "Right-to-left text direction",
    code: '(Story) => <div dir="rtl"><Story /></div>',
  },
  {
    label: "Dark Background",
    description: "Force dark background for light components",
    code: "(Story) => <div style={{ background: '#1a1a1a', padding: '2rem' }}><Story /></div>",
  },
  {
    label: "i18n Provider",
    description: "Wrap with internationalisation context",
    code: '(Story) => <I18nProvider locale="en"><Story /></I18nProvider>',
  },
  {
    label: "Redux Store",
    description: "Provide Redux store context",
    code: "(Story) => <Provider store={store}><Story /></Provider>",
  },
  {
    label: "Padding Container",
    description: "Add consistent padding around the story",
    code: "(Story) => <div style={{ padding: '2rem' }}><Story /></div>",
  },
];

interface DecoratorsPanelProps {
  decorators: string[] | null;
  onAdd: (decorator: string) => void;
  onRemove: (decorator: string) => void;
}

export function DecoratorsPanel({ decorators, onAdd, onRemove }: DecoratorsPanelProps) {
  const activeDecorators = decorators ?? [];

  return (
    <div className="space-y-2">
      {/* Active decorators */}
      {activeDecorators.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Active ({activeDecorators.length})
          </p>
          <ScrollArea className="max-h-28">
            <div className="space-y-1">
              {activeDecorators.map((d) => (
                <div
                  key={d}
                  className="flex items-center gap-1.5 rounded-md border bg-purple-50 px-2 py-1.5 dark:bg-purple-950/20"
                >
                  <code className="min-w-0 flex-1 truncate font-mono text-[10px] text-purple-700 dark:text-purple-400">
                    {d}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive h-4 w-4 shrink-0"
                    onClick={() => {
                      onRemove(d);
                    }}
                    aria-label="Remove decorator"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Preset list */}
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Layers className="h-3 w-3" />
        Add decorator
      </p>
      <ScrollArea className="max-h-52">
        <div className="space-y-1">
          {DECORATOR_PRESETS.map((preset) => {
            const isActive = activeDecorators.includes(preset.code);
            return (
              <button
                key={preset.label}
                type="button"
                disabled={isActive}
                onClick={() => {
                  if (!isActive) onAdd(preset.code);
                }}
                className={[
                  "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                  isActive
                    ? "border-purple-200 bg-purple-50 opacity-60 dark:bg-purple-950/20"
                    : "border-border hover:border-primary hover:bg-muted/50",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{preset.label}</p>
                  <p className="text-muted-foreground text-[11px]">{preset.description}</p>
                </div>
                {!isActive && <Plus className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
