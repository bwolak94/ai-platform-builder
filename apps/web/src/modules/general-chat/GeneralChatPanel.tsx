import { useEffect } from "react";
import { useToolDispatch } from "@/context/toolDispatch";
import { useChatTools } from "./hooks/useChatTools";
import { ArtifactBoard } from "./ArtifactBoard";

export function GeneralChatPanel() {
  const { register } = useToolDispatch();
  const { dispatch } = useChatTools();

  useEffect(() => {
    register(dispatch);
  }, [register, dispatch]);

  return <ArtifactBoard />;
}
