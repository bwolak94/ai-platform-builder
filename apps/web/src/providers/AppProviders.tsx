import { ModeProvider } from "@/context/mode";
import { ToolDispatchProvider } from "@/context/toolDispatch/ToolDispatchProvider";
import type { AppProvidersProps } from "./AppProviders.types";

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ModeProvider>
      <ToolDispatchProvider>{children}</ToolDispatchProvider>
    </ModeProvider>
  );
}
