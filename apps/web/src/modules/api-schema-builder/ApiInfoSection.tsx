import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OpenApiSpec, SecurityScheme } from "@ai-builder/schemas";

interface ApiInfoSectionProps {
  spec: OpenApiSpec;
  onUpdate: (
    updates: Partial<
      Pick<OpenApiSpec, "title" | "version" | "baseUrl" | "description" | "securityScheme">
    >
  ) => void;
}

const SECURITY_SCHEMES: { value: SecurityScheme; label: string }[] = [
  { value: "None", label: "None" },
  { value: "BearerJWT", label: "Bearer JWT" },
  { value: "ApiKey", label: "API Key" },
  { value: "OAuth2", label: "OAuth 2.0" },
  { value: "BasicAuth", label: "Basic Auth" },
];

export function ApiInfoSection({ spec, onUpdate }: ApiInfoSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(spec.title);
  const [version, setVersion] = useState(spec.version);
  const [baseUrl, setBaseUrl] = useState(spec.baseUrl ?? "");
  const [description, setDescription] = useState(spec.description ?? "");

  function handleSave() {
    onUpdate({
      title: title.trim() || spec.title,
      version: version.trim() || spec.version,
      baseUrl: baseUrl.trim() || null,
      description: description.trim() || null,
    });
    setIsOpen(false);
  }

  function handleOpen() {
    // Sync fields with current spec when opening
    setTitle(spec.title);
    setVersion(spec.version);
    setBaseUrl(spec.baseUrl ?? "");
    setDescription(spec.description ?? "");
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            handleOpen();
          }
        }}
      >
        <Settings2 className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs font-medium">API Info</span>
        {isOpen ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Title</Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                }}
                className="h-7 text-xs"
                placeholder="My API"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Version</Label>
              <Input
                value={version}
                onChange={(e) => {
                  setVersion(e.target.value);
                }}
                className="h-7 text-xs"
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
              }}
              className="h-7 text-xs"
              placeholder="https://api.example.com"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Description</Label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              className="h-7 text-xs"
              placeholder="Describe your API…"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Security Scheme</Label>
            <Select
              value={spec.securityScheme ?? "None"}
              onValueChange={(v) => {
                onUpdate({ securityScheme: v === "None" ? null : (v as SecurityScheme) });
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECURITY_SCHEMES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
