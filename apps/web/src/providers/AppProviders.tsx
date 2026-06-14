import { ModeProvider } from "@/context/mode";
import type { AppProvidersProps } from "./AppProviders.types";

export function AppProviders({ children }: AppProvidersProps) {
  return <ModeProvider>{children}</ModeProvider>;
}
