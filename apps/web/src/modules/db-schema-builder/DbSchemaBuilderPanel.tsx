import { useCallback, useState } from "react";
import { Database, RotateCcw, Undo2, Redo2, Link2, Camera, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDbState } from "./hooks/useDbState";
import { useDbTools } from "./hooks/useDbTools";
import { useDbSnapshots } from "./hooks/useDbSnapshots";
import { TableList } from "./TableList";
import { RelationsPanel } from "./RelationsPanel";
import { LintPanel } from "./LintPanel";
import { SnapshotsPanel } from "./SnapshotsPanel";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { DbSchema } from "@ai-builder/schemas";

export function DbSchemaBuilderPanel() {
  const { schema, setSchema, undo, redo, resetSchema, canUndo, canRedo } = useDbState();
  const tools = useDbTools(schema, setSchema);
  const { snapshots, saveSnapshot, deleteSnapshot } = useDbSnapshots(schema);
  const [migrationSql, setMigrationSql] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("tables");

  const handleToolCall = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      const toolName = call.toolName as keyof typeof tools;
      const handler = tools[toolName];
      if (typeof handler !== "function") {
        return { error: `Unknown tool: ${call.toolName}` };
      }
      const fn = handler as (args: unknown) => Promise<Record<string, unknown>>;
      const result = await fn(call.args);
      // Surface migration SQL in ExportPanel when agent generates it
      if (call.toolName === "generateMigration") {
        const sql = result.sql;
        if (typeof sql === "string") setMigrationSql(sql);
      }
      return result;
    },
    [tools]
  );

  useRegisterToolDispatch(handleToolCall);

  const totalColumns = schema.tables.reduce((acc, t) => acc + t.columns.length, 0);
  const relationCount = (schema.relations ?? []).length;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{schema.name}</h2>
          <p className="text-muted-foreground text-xs">
            {schema.tables.length}T · {totalColumns}C · {relationCount}R ·{" "}
            <span className="font-mono">{schema.dialect}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canUndo}
            onClick={undo}
            aria-label="Undo"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canRedo}
            onClick={redo}
            aria-label="Redo"
          >
            <Redo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={resetSchema}
            aria-label="Reset schema"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Dialect switcher */}
      <Select
        value={schema.dialect}
        onValueChange={(value) => {
          setSchema((prev) => ({ ...prev, dialect: value as DbSchema["dialect"] }));
        }}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="postgresql" className="text-xs">
            PostgreSQL
          </SelectItem>
          <SelectItem value="mysql" className="text-xs">
            MySQL
          </SelectItem>
          <SelectItem value="sqlite" className="text-xs">
            SQLite
          </SelectItem>
        </SelectContent>
      </Select>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-7 w-full">
          <TabsTrigger value="tables" className="flex-1 text-[11px]">
            Tables
          </TabsTrigger>
          <TabsTrigger value="relations" className="flex-1 gap-1 text-[11px]">
            <Link2 className="h-3 w-3" />
            {relationCount > 0 && <span>{relationCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="lint" className="flex-1 gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3" />
            Lint
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="flex-1 gap-1 text-[11px]">
            <Camera className="h-3 w-3" />
            {snapshots.length > 0 && <span>{snapshots.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-2 min-h-0 flex-1 overflow-hidden">
          <TableList
            schema={schema}
            onDeleteTable={(name) => {
              setSchema((prev) => ({
                ...prev,
                tables: prev.tables.filter((t) => t.name !== name),
              }));
            }}
          />
        </TabsContent>

        <TabsContent value="relations" className="mt-2 min-h-0 flex-1 overflow-hidden">
          <RelationsPanel
            schema={schema}
            onRemove={(from, to) => {
              setSchema((prev) => ({
                ...prev,
                relations: (prev.relations ?? []).filter((r) => !(r.from === from && r.to === to)),
              }));
            }}
          />
        </TabsContent>

        <TabsContent value="lint" className="mt-2">
          <LintPanel schema={schema} />
        </TabsContent>

        <TabsContent value="snapshots" className="mt-2">
          <SnapshotsPanel
            snapshots={snapshots}
            onSave={saveSnapshot}
            onRestore={(s) => {
              setSchema(s);
            }}
            onDelete={deleteSnapshot}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="shrink-0">
        <ExportPanel schema={schema} {...(migrationSql !== undefined ? { migrationSql } : {})} />
      </div>
    </div>
  );
}
