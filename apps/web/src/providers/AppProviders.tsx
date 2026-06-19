import { ModeProvider } from "@/context/mode";
import { ToolDispatchProvider } from "@/context/toolDispatch/ToolDispatchProvider";
import { FormBuilderProvider } from "@/context/formBuilder/FormBuilderContext";
import { LayoutBuilderProvider } from "@/context/layoutBuilder/LayoutBuilderContext";
import { EmailBuilderProvider } from "@/context/emailBuilder/EmailBuilderContext";
import { AgentActionsProvider } from "@/context/agentActions/AgentActionsProvider";
import type { AppProvidersProps } from "./AppProviders.types";

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ModeProvider>
      <ToolDispatchProvider>
        <AgentActionsProvider>
          <FormBuilderProvider>
            <LayoutBuilderProvider>
              <EmailBuilderProvider>{children}</EmailBuilderProvider>
            </LayoutBuilderProvider>
          </FormBuilderProvider>
        </AgentActionsProvider>
      </ToolDispatchProvider>
    </ModeProvider>
  );
}
