import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "./-layout/AppShell";
import { ErrorBoundary } from "@/ui";

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  ),
});
