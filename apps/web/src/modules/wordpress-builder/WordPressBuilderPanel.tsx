import { useCallback } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useWordPressBuilderContext } from "@/context/wordpressBuilder/WordPressBuilderContext";
import { useToolDispatch } from "@/context/toolDispatch";
import { useWordPressTools } from "./hooks/useWordPressTools";
import { FileTree } from "./FileTree";
import { FileEditor } from "./FileEditor";
import { ProjectMeta } from "./ProjectMeta";
import type { WordPressFile } from "@ai-builder/schemas";
import type { ToolCall } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function WordPressBuilderPanel() {
  const { project, setProject, activeFileId, setActiveFileId } = useWordPressBuilderContext();
  const { register } = useToolDispatch();

  const tools = useWordPressTools(project, setProject, setActiveFileId);

  // Register tool dispatcher with the global dispatch context
  const dispatch = useCallback(
    async (call: ToolCall): Promise<unknown> => {
      const handler = (tools as Record<string, (args: unknown) => Promise<unknown>>)[call.toolName];
      if (!handler) return { error: `Unknown tool: ${call.toolName}` };
      return handler(call.args);
    },
    [tools]
  );

  // Register on every render so the ref stays fresh
  register(dispatch);

  const activeFile = project.files.find((f) => f.id === activeFileId) ?? null;

  function handleSelectFile(file: WordPressFile) {
    setActiveFileId(file.id);
  }

  return (
    <div className="flex h-full flex-col">
      <ProjectMeta project={project} />

      <div className="min-h-0 flex-1">
        <PanelGroup direction="horizontal" autoSaveId="wp-builder-panels">
          {/* File tree */}
          <Panel defaultSize={28} minSize={18} maxSize={45} id="wp-tree">
            <div className="bg-muted/20 h-full border-r">
              <FileTree
                files={project.files}
                activeFileId={activeFileId}
                projectSlug={project.slug || "my-project"}
                onSelectFile={handleSelectFile}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="bg-border w-px transition-colors hover:bg-blue-400" />

          {/* Code viewer */}
          <Panel defaultSize={72} minSize={40} id="wp-editor">
            <div className="bg-background h-full">
              <FileEditor file={activeFile} />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
