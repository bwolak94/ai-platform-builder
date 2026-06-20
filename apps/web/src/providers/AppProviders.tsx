import { ModeProvider } from "@/context/mode";
import { ToolDispatchProvider } from "@/context/toolDispatch/ToolDispatchProvider";
import { FormBuilderProvider } from "@/context/formBuilder/FormBuilderContext";
import { LayoutBuilderProvider } from "@/context/layoutBuilder/LayoutBuilderContext";
import { EmailBuilderProvider } from "@/context/emailBuilder/EmailBuilderContext";
import { WordPressBuilderProvider } from "@/context/wordpressBuilder/WordPressBuilderContext";
import { GeneralChatProvider } from "@/context/generalChat/GeneralChatContext";
import { AgentActionsProvider } from "@/context/agentActions/AgentActionsProvider";
import { BranchProvider } from "@/context/branches/BranchContext";
import type { AppProvidersProps } from "./AppProviders.types";

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ModeProvider>
      <ToolDispatchProvider>
        <AgentActionsProvider>
          <BranchProvider>
            <FormBuilderProvider>
              <LayoutBuilderProvider>
                <EmailBuilderProvider>
                  <WordPressBuilderProvider>
                    <GeneralChatProvider>{children}</GeneralChatProvider>
                  </WordPressBuilderProvider>
                </EmailBuilderProvider>
              </LayoutBuilderProvider>
            </FormBuilderProvider>
          </BranchProvider>
        </AgentActionsProvider>
      </ToolDispatchProvider>
    </ModeProvider>
  );
}
