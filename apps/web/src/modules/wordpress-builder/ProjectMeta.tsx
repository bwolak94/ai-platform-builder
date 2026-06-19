import { Code2, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WordPressProject } from "@ai-builder/schemas";

interface ProjectMetaProps {
  project: WordPressProject;
}

export function ProjectMeta({ project }: ProjectMetaProps) {
  const isTheme = project.projectType === "theme";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
      <div className="flex items-center gap-1.5">
        {isTheme ? (
          <Palette className="h-3.5 w-3.5 text-purple-400" />
        ) : (
          <Code2 className="h-3.5 w-3.5 text-blue-400" />
        )}
        <span className="text-sm font-medium">{project.name || "Untitled"}</span>
      </div>

      <Badge
        variant="secondary"
        className={isTheme ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}
      >
        {isTheme ? "Theme" : "Plugin"}
      </Badge>

      <span className="text-muted-foreground font-mono text-[10px]">{project.slug}</span>

      <span className="text-muted-foreground text-[10px]">v{project.version}</span>

      <div className="text-muted-foreground ml-auto flex items-center gap-2 text-[10px]">
        <span>{project.files.length} files</span>
        {project.acfGroups.length > 0 && <span>{project.acfGroups.length} ACF groups</span>}
        {project.customPostTypes.length > 0 && <span>{project.customPostTypes.length} CPTs</span>}
      </div>
    </div>
  );
}
