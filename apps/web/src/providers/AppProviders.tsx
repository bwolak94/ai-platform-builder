import { ModeProvider } from "@/context/mode";
import { ToolDispatchProvider } from "@/context/toolDispatch/ToolDispatchProvider";
import { FormBuilderProvider } from "@/context/formBuilder/FormBuilderContext";
import type { AppProvidersProps } from "./AppProviders.types";

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ModeProvider>
      <ToolDispatchProvider>
        <FormBuilderProvider>{children}</FormBuilderProvider>
      </ToolDispatchProvider>
    </ModeProvider>
  );
}
