import { useState } from "react";
import { nanoid } from "nanoid";
import type { DbSchema } from "@ai-builder/schemas";

export function makeEmptyDbSchema(): DbSchema {
  return {
    id: "db_" + nanoid(6),
    name: "my_database",
    dialect: "postgresql",
    tables: [],
    relations: null,
  };
}

export function useDbState() {
  const [schema, setSchema] = useState<DbSchema>(makeEmptyDbSchema);
  return { schema, setSchema };
}
