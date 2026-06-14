import { useState } from "react";
import { nanoid } from "nanoid";
import type { StoryFile } from "@ai-builder/schemas";

function createDefaultStory(): StoryFile {
  return {
    id: "story_" + nanoid(6),
    componentName: "Button",
    componentPath: "src/components/Button.tsx",
    title: "Components/Button",
    layout: "centered",
    defaultArgs: { label: "Click me" },
    argTypes: null,
    variants: [
      {
        id: "var_" + nanoid(6),
        name: "Default",
        args: { label: "Click me" },
        viewport: null,
        docs: null,
      },
    ],
  };
}

export function useStoryState() {
  const [storyFile, setStoryFile] = useState<StoryFile>(createDefaultStory);
  return { storyFile, setStoryFile };
}
