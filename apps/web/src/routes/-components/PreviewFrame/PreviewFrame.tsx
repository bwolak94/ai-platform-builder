import { EmptyState } from "@/ui";
import { FormPreview } from "@/modules/form-builder/FormPreview";
import { useFormBuilderContext } from "@/context/formBuilder/FormBuilderContext";
import type { PreviewFrameProps } from "./PreviewFrame.types";

export function PreviewFrame({ mode }: PreviewFrameProps) {
  const { formSchema } = useFormBuilderContext();

  if (mode === "form") {
    return <FormPreview schema={formSchema} />;
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md border bg-white dark:bg-zinc-900">
      <EmptyState title="Preview" description={`${mode} preview coming soon`} />
    </div>
  );
}
