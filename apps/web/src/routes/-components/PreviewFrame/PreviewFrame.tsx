import { EmptyState } from "@/ui";
import { FormPreview } from "@/modules/form-builder/FormPreview";
import { LayoutPreview } from "@/modules/layout-builder/LayoutPreview";
import { EmailPreview } from "@/modules/email-template-builder/EmailPreview";
import { useFormBuilderContext } from "@/context/formBuilder/FormBuilderContext";
import { useLayoutBuilderContext } from "@/context/layoutBuilder/LayoutBuilderContext";
import { useEmailBuilderContext } from "@/context/emailBuilder/EmailBuilderContext";
import type { PreviewFrameProps } from "./PreviewFrame.types";

export function PreviewFrame({ mode }: PreviewFrameProps) {
  const { formSchema } = useFormBuilderContext();
  const { layoutTree } = useLayoutBuilderContext();
  const { template, clientMode, setClientMode } = useEmailBuilderContext();

  if (mode === "form") {
    return <FormPreview schema={formSchema} />;
  }

  if (mode === "layout") {
    return <LayoutPreview tree={layoutTree} />;
  }

  if (mode === "email") {
    return (
      <div className="h-full w-full overflow-hidden rounded-md border">
        <EmailPreview
          template={template}
          clientMode={clientMode}
          onClientModeChange={setClientMode}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-md border bg-white dark:bg-zinc-900">
      <EmptyState title="Preview" description={`${mode} preview coming soon`} />
    </div>
  );
}
