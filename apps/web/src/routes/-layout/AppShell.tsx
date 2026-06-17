import { useCallback, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { useMode } from "@/hooks";
import { useBuilderAgent } from "@/hooks";
import { useToolDispatch } from "@/context/toolDispatch";
import { useFormBuilderContext } from "@/context/formBuilder/FormBuilderContext";
import { useLayoutBuilderContext } from "@/context/layoutBuilder/LayoutBuilderContext";
import { useEmailBuilderContext } from "@/context/emailBuilder/EmailBuilderContext";
import { serializeFormDSL, serializeLayoutDSL, serializeEmailDSL } from "@ai-builder/serializers";
import { ThemeToggle } from "@/ui";
import { ChatPanel } from "../-components/ChatPanel";
import { ModeSwitcher } from "../-components/ModeSwitcher";
import { PreviewFrame } from "../-components/PreviewFrame";
import type { BuilderMode } from "@/types";
import type { ToolCall } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function AppShell() {
  const { mode, setMode } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatchRef } = useToolDispatch();
  const { formSchema } = useFormBuilderContext();
  const { layoutTree } = useLayoutBuilderContext();
  const { template: emailTemplate } = useEmailBuilderContext();

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
    sendContext,
  } = useBuilderAgent({
    mode,
    onToolCall,
  });

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

  function handleModeChange(newMode: BuilderMode) {
    setMode(newMode);
    void navigate({ to: `/${newMode}` });
  }

  const isPreviewVisible =
    location.pathname === "/form" ||
    location.pathname === "/layout" ||
    location.pathname === "/email";

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      <header className="border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold tracking-tight">AI Platform Builder</span>
          <ThemeToggle />
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
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onClear={clearMessages}
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
