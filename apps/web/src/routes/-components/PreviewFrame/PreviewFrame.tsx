import { EmptyState } from "@/ui";
import type { PreviewFrameProps } from "./PreviewFrame.types";

export function PreviewFrame({ mode }: PreviewFrameProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-md border bg-white dark:bg-zinc-900">
      <EmptyState
        title="Preview"
        description={`${mode} preview will render here after TASK-003/004`}
      />
    </div>
  );
}
