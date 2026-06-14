import { useState } from "react";
import { nanoid } from "nanoid";
import type { EmailTemplate } from "@ai-builder/schemas";

export function makeEmptyTemplate(): EmailTemplate {
  return {
    id: "email_" + nanoid(6),
    subject: "Welcome to our platform",
    previewText: null,
    type: "transactional",
    sections: [],
  };
}

export function useEmailState() {
  const [template, setTemplate] = useState<EmailTemplate>(makeEmptyTemplate);
  return { template, setTemplate };
}
