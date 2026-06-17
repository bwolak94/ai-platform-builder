import { useState } from "react";
import { Trash2, ChevronDown, ChevronRight, Lock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApiEndpoint, HttpMethod } from "@ai-builder/schemas";

interface EndpointListProps {
  endpoints: ApiEndpoint[];
  onDelete: (id: string) => void;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  PATCH: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HEAD: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  OPTIONS: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function ResponseBadge({ status }: { status: number }) {
  const isSuccess = status >= 200 && status < 300;
  const isClientError = status >= 400 && status < 500;
  const variant = isSuccess ? "secondary" : isClientError ? "destructive" : "outline";
  return (
    <Badge variant={variant} className="h-4 px-1 font-mono text-[10px]">
      {status}
    </Badge>
  );
}

function EndpointDetail({ ep }: { ep: ApiEndpoint }) {
  return (
    <div className="space-y-2 border-t px-3 py-2 text-xs">
      {ep.description && <p className="text-muted-foreground">{ep.description}</p>}

      {(ep.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(ep.tags ?? []).map((tag) => (
            <Badge key={tag} variant="outline" className="h-4 px-1 text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {(ep.parameters ?? []).length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 font-medium">Parameters</p>
          <div className="space-y-0.5">
            {(ep.parameters ?? []).map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-muted-foreground w-12 shrink-0 font-mono text-[10px]">
                  {p.in}
                </span>
                <span className="font-mono font-medium">{p.name}</span>
                {p.schema && (
                  <span className="text-muted-foreground font-mono text-[10px]">{p.schema}</span>
                )}
                {p.required && <span className="text-[10px] text-red-500">*</span>}
                {p.description && (
                  <span className="text-muted-foreground truncate">{p.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ep.requestBody && (
        <div>
          <p className="text-muted-foreground mb-0.5 font-medium">Request Body</p>
          <span className="font-mono text-[11px]">
            {ep.requestBody.schemaRef}
            <span className="text-muted-foreground ml-1">({ep.requestBody.contentType})</span>
          </span>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-1 font-medium">Responses</p>
        <div className="space-y-0.5">
          {ep.responses.map((r) => (
            <div key={r.status} className="flex items-center gap-2">
              <ResponseBadge status={r.status} />
              <span className="text-muted-foreground truncate">{r.description}</span>
              {r.schema && r.schema !== r.description && (
                <span className="shrink-0 font-mono text-[10px]">{r.schema}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EndpointList({ endpoints, onDelete }: EndpointListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (endpoints.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No endpoints yet. Ask the agent to add some.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1">
        {endpoints.map((ep) => {
          const isExpanded = expandedId === ep.id;
          return (
            <div key={ep.id} className="overflow-hidden rounded-md border">
              {/* Header row */}
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                onClick={() => {
                  setExpandedId((prev) => (prev === ep.id ? null : ep.id));
                }}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                )}

                <span
                  className={
                    "shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold " +
                    METHOD_COLORS[ep.method]
                  }
                >
                  {ep.method}
                </span>

                <span className="min-w-0 flex-1 truncate font-mono text-xs">{ep.path}</span>

                {ep.summary && (
                  <span className="text-muted-foreground hidden max-w-[140px] truncate text-[11px] sm:block">
                    {ep.summary}
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-1">
                  {ep.requiresAuth && (
                    <Lock className="h-3 w-3 text-amber-500" aria-label="Requires auth" />
                  )}
                  {ep.deprecated && (
                    <AlertTriangle
                      className="text-muted-foreground h-3 w-3"
                      aria-label="Deprecated"
                    />
                  )}
                  {ep.responses.map((r) => (
                    <ResponseBadge key={r.status} status={r.status} />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ep.id);
                  }}
                  aria-label={`Delete ${ep.method} ${ep.path}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </button>

              {/* Expanded detail */}
              {isExpanded && <EndpointDetail ep={ep} />}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
