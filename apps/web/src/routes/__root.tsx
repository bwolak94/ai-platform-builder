import { Suspense } from "react";
import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "./-layout/AppShell";
import { ErrorBoundary } from "@/ui";

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="text-muted-foreground flex h-screen items-center justify-center text-sm">
            Loading...
          </div>
        }
      >
        <AppShell />
      </Suspense>
    </ErrorBoundary>
  ),
});
