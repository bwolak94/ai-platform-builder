import { createContext, useContext } from "react";
import { useEmailState } from "@/modules/email-template-builder/hooks/useEmailState";
import type { EmailStateReturn } from "@/modules/email-template-builder/hooks/useEmailState";

const EmailBuilderContext = createContext<EmailStateReturn | null>(null);

export function EmailBuilderProvider({ children }: { children: React.ReactNode }) {
  const state = useEmailState();
  return <EmailBuilderContext.Provider value={state}>{children}</EmailBuilderContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEmailBuilderContext(): EmailStateReturn {
  const ctx = useContext(EmailBuilderContext);
  if (!ctx) throw new Error("useEmailBuilderContext must be used inside EmailBuilderProvider");
  return ctx;
}
