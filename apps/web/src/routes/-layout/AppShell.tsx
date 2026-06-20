import { useCallback, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useMode } from "@/hooks";
import { useBuilderAgent } from "@/hooks";
import { useToolDispatch } from "@/context/toolDispatch";
import { useFormBuilderContext } from "@/context/formBuilder/FormBuilderContext";
import { useLayoutBuilderContext } from "@/context/layoutBuilder/LayoutBuilderContext";
import { useEmailBuilderContext } from "@/context/emailBuilder/EmailBuilderContext";
import { useWordPressBuilderContext } from "@/context/wordpressBuilder/WordPressBuilderContext";
import { useBranch } from "@/context/branches/BranchContext";
import { usePinnedMessages } from "@/hooks/usePinnedMessages";
import { useGeneralChatContext } from "@/context/generalChat/GeneralChatContext";
import {
  serializeFormDSL,
  serializeLayoutDSL,
  serializeEmailDSL,
  serializeWordPressDSL,
  deserializeFormDSL,
  deserializeLayoutDSL,
  deserializeWordPressDSL,
} from "@ai-builder/serializers";
import { useRegisterAgentActions } from "@/context/agentActions/AgentActionsContext";
import { SnapshotProvider } from "@/context/snapshots/SnapshotContext";
import { SnapshotSidebar } from "@/components/snapshots";
import { ThemeToggle } from "@/ui";
import { ChatPanel } from "../-components/ChatPanel";
import { ModeSwitcher } from "../-components/ModeSwitcher";
import { PreviewFrame } from "../-components/PreviewFrame";
import type { BuilderMode } from "@/types";
import type { ToolCall } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { SnapshotContext as SnapshotContextData } from "@/lib/snapshots-api";

function AppShellInner() {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatchRef } = useToolDispatch();
  const { formSchema, setFormSchema } = useFormBuilderContext();
  const { layoutTree, setLayoutTree } = useLayoutBuilderContext();
  const { template: emailTemplate } = useEmailBuilderContext();
  const { project: wpProject, setProject: setWpProject } = useWordPressBuilderContext();

  // Feature 2 — Conversation branching
  const { getBranches, getActiveBranchId, getAgentRoomName, fork, switchBranch } = useBranch();
  const branches = getBranches(mode);
  const activeBranchId = getActiveBranchId(mode);
  const roomName = getAgentRoomName(mode);

  // Feature 3 — Memory pins
  const { modePins, pin, unpin } = usePinnedMessages(mode);
  const { addArtifact } = useGeneralChatContext();

  const pinnedIds = useMemo(() => new Set(modePins.map((p) => p.id)), [modePins]);

  const onToolCall = useCallback(
    (call: ToolCall) => {
      return dispatchRef.current(call);
    },
    [dispatchRef]
  );

  const {
    messages,
    input,
    isLoading,
    status,
    activeToolCall,
    setInput,
    handleSubmit,
    clearMessages,
    stop,
    sendContext,
  } = useBuilderAgent({
    mode,
    roomName,
    onToolCall,
  });

  // Register agent actions so deep components can fire targeted messages
  const submitMessage = useCallback(
    (text: string) => {
      // setInput updates inputRef.current synchronously, so handleSubmit reads it correctly
      setInput(text);
      handleSubmit();
    },
    [setInput, handleSubmit]
  );

  useRegisterAgentActions({ setInput, sendMessage: submitMessage });

  // Feature 3 — sync pinned messages into agent context (injected into system prompt)
  useEffect(() => {
    const memoryContents = modePins.map((p) => `[${p.role}] ${p.content}`);
    sendContext({ memories: JSON.stringify(memoryContents) });
  }, [modePins, sendContext]);

  // Feature 1 — request summary to compress context window
  const handleRequestSummary = useCallback(() => {
    submitMessage(
      "Please summarize our conversation so far into a compact, structured summary. " +
        "Highlight key decisions, constraints, and context needed to continue effectively. " +
        "Keep it under 300 words."
    );
  }, [submitMessage]);

  // Feature 2 — fork and switch helpers bound to current mode
  const handleFork = useCallback(() => {
    fork(mode);
  }, [fork, mode]);

  const handleSwitchBranch = useCallback(
    (id: string) => {
      switchBranch(mode, id);
    },
    [switchBranch, mode]
  );

  // Feature 5 — save artifact from any code block in the chat
  const handleSaveArtifact = useCallback(
    (content: string, lang: string, title: string) => {
      addArtifact({
        type: lang === "mermaid" ? "mermaid" : "code",
        title,
        content,
        language: lang || "text",
      });
    },
    [addArtifact]
  );

  // Sync form schema to agent context so system prompt stays accurate
  useEffect(() => {
    if (mode === "form") {
      sendContext({ formSchema: serializeFormDSL(formSchema) });
    }
  }, [formSchema, mode, sendContext]);

  // Sync layout tree DSL to agent context
  useEffect(() => {
    if (mode === "layout") {
      sendContext({ layoutTree: serializeLayoutDSL(layoutTree) });
    }
  }, [layoutTree, mode, sendContext]);

  // Sync email template DSL to agent context
  useEffect(() => {
    if (mode === "email") {
      sendContext({ emailTemplate: serializeEmailDSL(emailTemplate) });
    }
  }, [emailTemplate, mode, sendContext]);

  // Sync WordPress project DSL to agent context
  useEffect(() => {
    if (mode === "wordpress") {
      sendContext({ wordpressState: serializeWordPressDSL(wpProject) });
    }
  }, [wpProject, mode, sendContext]);

  function handleModeChange(newMode: BuilderMode) {
    setMode(newMode);
    void navigate({ to: `/${newMode}` });
  }

  // Snapshot: capture current serialized context
  const getCurrentContext = useCallback((): SnapshotContextData => {
    return {
      formSchema: serializeFormDSL(formSchema),
      layoutTree: serializeLayoutDSL(layoutTree),
      wordpressState: serializeWordPressDSL(wpProject),
    };
  }, [formSchema, layoutTree, wpProject]);

  // Snapshot: restore — parse DSL strings back into React state
  const handleRestoreSnapshot = useCallback(
    (context: SnapshotContextData) => {
      if (context.formSchema) {
        try {
          setFormSchema(deserializeFormDSL(context.formSchema));
        } catch {
          console.warn("[AppShell] failed to deserialize formSchema from snapshot");
        }
      }
      if (context.layoutTree) {
        try {
          setLayoutTree(deserializeLayoutDSL(context.layoutTree));
        } catch {
          console.warn("[AppShell] failed to deserialize layoutTree from snapshot");
        }
      }
      if (context.wordpressState) {
        try {
          const partial = deserializeWordPressDSL(context.wordpressState);
          setWpProject((prev) => ({ ...prev, ...partial }));
        } catch {
          console.warn("[AppShell] failed to deserialize wordpressState from snapshot");
        }
      }
      // Sync restored context back to the DO
      const restoredCtx: Record<string, string> = {};
      if (context.formSchema) restoredCtx.formSchema = context.formSchema;
      if (context.layoutTree) restoredCtx.layoutTree = context.layoutTree;
      if (context.wordpressState) restoredCtx.wordpressState = context.wordpressState;
      if (Object.keys(restoredCtx).length > 0) sendContext(restoredCtx);
    },
    [setFormSchema, setLayoutTree, setWpProject, sendContext]
  );

  const isPreviewVisible =
    location.pathname === "/form" ||
    location.pathname === "/layout" ||
    location.pathname === "/email";

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      <header className="border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold tracking-tight">AI Platform Builder</span>
          <div className="flex items-center gap-1">
            <SnapshotSidebar
              getCurrentContext={getCurrentContext}
              onRestore={handleRestoreSnapshot}
            />
            <ThemeToggle />
          </div>
        </div>
        <ModeSwitcher currentMode={mode} onModeChange={handleModeChange} />
      </header>

      <main className="flex min-h-0 flex-1">
        <PanelGroup direction="horizontal" autoSaveId="app-shell-panels">
          <Panel defaultSize={30} minSize={20} maxSize={50} id="chat">
            <ChatPanel
              messages={messages}
              input={input}
              isLoading={isLoading}
              status={status}
              activeToolCall={activeToolCall}
              mode={mode}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onClear={clearMessages}
              onStop={stop}
              onRequestSummary={handleRequestSummary}
              branches={branches}
              activeBranchId={activeBranchId}
              onFork={handleFork}
              onSwitchBranch={handleSwitchBranch}
              pinnedIds={pinnedIds}
              onPin={pin}
              onUnpin={unpin}
              onSaveArtifact={handleSaveArtifact}
            />
          </Panel>

          <PanelResizeHandle className="bg-border w-px transition-colors hover:bg-blue-400" />

          <Panel defaultSize={isPreviewVisible ? 40 : 70} minSize={20} id="builder">
            <div className="h-full overflow-auto p-4">
              <Outlet />
            </div>
          </Panel>

          {isPreviewVisible && (
            <>
              <PanelResizeHandle className="bg-border w-px transition-colors hover:bg-blue-400" />
              <Panel defaultSize={30} minSize={20} id="preview">
                <div className="h-full p-4">
                  <PreviewFrame mode={mode} />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </main>
    </div>
  );
}

export function AppShell() {
  const { mode } = useMode();

  return (
    <SnapshotProvider mode={mode}>
      <AppShellInner />
    </SnapshotProvider>
  );
}
