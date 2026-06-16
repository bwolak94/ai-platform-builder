import { EmptyState } from "@/ui";
import { FormPreview } from "@/modules/form-builder/FormPreview";
import { LayoutPreview } from "@/modules/layout-builder/LayoutPreview";
import { useFormBuilderContext } from "@/context/formBuilder/FormBuilderContext";
import { useLayoutBuilderContext } from "@/context/layoutBuilder/LayoutBuilderContext";
import type { PreviewFrameProps } from "./PreviewFrame.types";

export function PreviewFrame({ mode }: PreviewFrameProps) {
  const { formSchema } = useFormBuilderContext();
  const { layoutTree } = useLayoutBuilderContext();

  if (mode === "form") {
    return <FormPreview schema={formSchema} />;
  }

  if (mode === "layout") {
    return <LayoutPreview tree={layoutTree} />;
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md border bg-white dark:bg-zinc-900">
      <EmptyState title="Preview" description={`${mode} preview coming soon`} />
    </div>
  );
}
