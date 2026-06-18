import { Wand2 } from "lucide-react";
import { nanoid } from "nanoid";
import type { TestFile } from "@ai-builder/schemas";

interface E2ePreset {
  label: string;
  description: string;
  build: () => Pick<TestFile, "filename" | "description" | "testCases">;
}

const PRESETS: E2ePreset[] = [
  {
    label: "Auth Flow",
    description: "Login, logout, password reset",
    build: () => ({
      filename: "auth.spec.ts",
      description: "Authentication flows",
      testCases: [
        {
          id: "tc_" + nanoid(6),
          name: "User can log in with valid credentials",
          tags: ["smoke", "auth"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/login" },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Email", name: null },
              value: "user@example.com",
            },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Password", name: null },
              value: "password123",
            },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Sign in" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "url" as const,
              selector: null,
              value: "/dashboard",
              attribute: null,
            },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "User sees error with invalid credentials",
          tags: ["auth"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/login" },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Email", name: null },
              value: "wrong@example.com",
            },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Password", name: null },
              value: "wrongpass",
            },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Sign in" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: { strategy: "text" as const, value: "Invalid credentials", name: null },
              value: null,
              attribute: null,
            },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "User can log out",
          tags: ["auth"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/dashboard" },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "User menu" },
            },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "menuitem", name: "Sign out" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "url" as const,
              selector: null,
              value: "/login",
              attribute: null,
            },
          ],
        },
      ],
    }),
  },
  {
    label: "Form Submission",
    description: "Fill, validate, and submit a form",
    build: () => ({
      filename: "contact-form.spec.ts",
      description: "Contact form flows",
      testCases: [
        {
          id: "tc_" + nanoid(6),
          name: "User can submit contact form successfully",
          tags: ["smoke", "forms"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/contact" },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Your name", name: null },
              value: "John Doe",
            },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Email", name: null },
              value: "john@example.com",
            },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Message", name: null },
              value: "Hello from Playwright!",
            },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Send message" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: {
                strategy: "text" as const,
                value: "Message sent successfully",
                name: null,
              },
              value: null,
              attribute: null,
            },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "Form shows validation errors for empty required fields",
          tags: ["forms", "validation"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/contact" },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Send message" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: { strategy: "text" as const, value: "Name is required", name: null },
              value: null,
              attribute: null,
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: { strategy: "text" as const, value: "Email is required", name: null },
              value: null,
              attribute: null,
            },
          ],
        },
      ],
    }),
  },
  {
    label: "CRUD Table",
    description: "Create, read, update, delete items",
    build: () => ({
      filename: "items-crud.spec.ts",
      description: "Items CRUD operations",
      testCases: [
        {
          id: "tc_" + nanoid(6),
          name: "User can create a new item",
          tags: ["crud", "create"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/items" },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Add item" },
            },
            {
              action: "fill" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "label" as const, value: "Item name", name: null },
              value: "Test Item",
            },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Save" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: { strategy: "text" as const, value: "Test Item", name: null },
              value: null,
              attribute: null,
            },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "User can delete an item",
          tags: ["crud", "delete"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/items" },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: {
                strategy: "role" as const,
                value: "button",
                name: "Delete Test Item",
              },
            },
            {
              action: "click" as const,
              id: "step_" + nanoid(6),
              selector: { strategy: "role" as const, value: "button", name: "Confirm delete" },
            },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "hidden" as const,
              selector: { strategy: "text" as const, value: "Test Item", name: null },
              value: null,
              attribute: null,
            },
          ],
        },
      ],
    }),
  },
  {
    label: "Navigation Smoke Test",
    description: "Verify all main pages load",
    build: () => ({
      filename: "navigation.spec.ts",
      description: "Navigation smoke tests",
      testCases: [
        {
          id: "tc_" + nanoid(6),
          name: "Home page loads and shows hero",
          tags: ["smoke", "navigation"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/" },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: { strategy: "role" as const, value: "heading", name: null },
              value: null,
              attribute: null,
            },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "About page loads",
          tags: ["smoke", "navigation"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/about" },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "url" as const,
              selector: null,
              value: "/about",
              attribute: null,
            },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "404 page shows for unknown routes",
          tags: ["smoke"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/nonexistent" },
            {
              action: "expect" as const,
              id: "step_" + nanoid(6),
              type: "visible" as const,
              selector: { strategy: "text" as const, value: "Page not found", name: null },
              value: null,
              attribute: null,
            },
          ],
        },
      ],
    }),
  },
  {
    label: "Accessibility Check",
    description: "axe-playwright a11y scan on key pages",
    build: () => ({
      filename: "accessibility.spec.ts",
      description: "Accessibility checks using axe-playwright",
      testCases: [
        {
          id: "tc_" + nanoid(6),
          name: "Home page passes accessibility checks",
          tags: ["a11y"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/" },
            { action: "axe" as const, id: "step_" + nanoid(6), context: null },
          ],
        },
        {
          id: "tc_" + nanoid(6),
          name: "Login page passes accessibility checks",
          tags: ["a11y"],
          beforeEach: null,
          steps: [
            { action: "navigate" as const, id: "step_" + nanoid(6), path: "/login" },
            { action: "axe" as const, id: "step_" + nanoid(6), context: "main" },
          ],
        },
      ],
    }),
  },
];

interface PresetsPanelProps {
  onLoad: (partial: Pick<TestFile, "filename" | "description" | "testCases">) => void;
}

export function PresetsPanel({ onLoad }: PresetsPanelProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Wand2 className="h-3 w-3" />
        Start from preset
      </p>
      <div className="grid grid-cols-1 gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              onLoad(preset.build());
            }}
            className="border-border hover:border-primary hover:bg-muted/50 flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{preset.label}</p>
              <p className="text-muted-foreground text-[11px]">{preset.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
