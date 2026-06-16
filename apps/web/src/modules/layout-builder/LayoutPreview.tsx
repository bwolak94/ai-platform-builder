import { useEffect, useRef, useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { generatePreviewHTML, renderNodeToHTML } from "@ai-builder/serializers";
import type { LayoutTree } from "@ai-builder/schemas";

type Breakpoint = "mobile" | "tablet" | "desktop";

const BREAKPOINT_WIDTHS: Record<Breakpoint, string> = {
  mobile: "375px",
  tablet: "768px",
  desktop: "100%",
};

interface LayoutPreviewProps {
  tree: LayoutTree;
}

export function LayoutPreview({ tree }: LayoutPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isLoadedRef = useRef(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");

  function sendUpdate(t: LayoutTree) {
    const html = renderNodeToHTML(t.root, 0);
    iframeRef.current?.contentWindow?.postMessage({ type: "UPDATE_LAYOUT", html }, "*");
  }

  useEffect(() => {
    if (isLoadedRef.current) {
      sendUpdate(tree);
    }
  }, [tree]);

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Breakpoint toolbar */}
      <div className="flex items-center justify-center gap-1">
        <Button
          variant={breakpoint === "mobile" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setBreakpoint("mobile");
          }}
          title="Mobile (375px)"
          aria-pressed={breakpoint === "mobile"}
        >
          <Smartphone className="h-4 w-4" />
        </Button>
        <Button
          variant={breakpoint === "tablet" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setBreakpoint("tablet");
          }}
          title="Tablet (768px)"
          aria-pressed={breakpoint === "tablet"}
        >
          <Tablet className="h-4 w-4" />
        </Button>
        <Button
          variant={breakpoint === "desktop" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setBreakpoint("desktop");
          }}
          title="Desktop (100%)"
          aria-pressed={breakpoint === "desktop"}
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground ml-2 text-xs">
          {breakpoint === "desktop" ? "Full" : BREAKPOINT_WIDTHS[breakpoint]}
        </span>
      </div>

      {/* Preview iframe */}
      <div
        className={cn(
          "relative flex-1 overflow-auto",
          breakpoint !== "desktop" && "flex justify-center"
        )}
      >
        <iframe
          ref={iframeRef}
          title="Layout preview"
          srcDoc={generatePreviewHTML(tree)}
          sandbox="allow-scripts"
          className="h-full border-0"
          style={{ width: BREAKPOINT_WIDTHS[breakpoint] }}
          aria-label="Live layout preview"
          onLoad={() => {
            isLoadedRef.current = true;
            sendUpdate(tree);
          }}
        />
      </div>
    </div>
  );
}
