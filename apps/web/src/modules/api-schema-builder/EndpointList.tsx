import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApiEndpoint, HttpMethod } from "@ai-builder/schemas";

interface EndpointListProps {
  endpoints: ApiEndpoint[];
  onDelete: (id: string) => void;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-orange-100 text-orange-700",
  PATCH: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  HEAD: "bg-gray-100 text-gray-700",
  OPTIONS: "bg-gray-100 text-gray-700",
};

export function EndpointList({ endpoints, onDelete }: EndpointListProps) {
  if (endpoints.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No endpoints yet. Ask the agent to add some.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {endpoints.map((ep) => (
          <div key={ep.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <span
              className={
                "shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold " +
                METHOD_COLORS[ep.method]
              }
            >
              {ep.method}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{ep.path}</span>
            <div className="flex shrink-0 gap-1">
              {ep.responses.slice(0, 2).map((r) => (
                <Badge
                  key={r.status}
                  variant={r.status < 300 ? "secondary" : "destructive"}
                  className="h-4 px-1 text-[10px]"
                >
                  {r.status}
                </Badge>
              ))}
            </div>
            {ep.deprecated && (
              <Badge variant="outline" className="text-muted-foreground h-4 px-1 text-[10px]">
                deprecated
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
              onClick={() => {
                onDelete(ep.id);
              }}
              aria-label={"Delete " + ep.method + " " + ep.path}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
