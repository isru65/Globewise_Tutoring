import { createGetDb } from "@agent-native/core/db";

import * as schema from "../drizzle/schema";

export const getDb = createGetDb(schema);
export { schema };

export function expectRow(): never {
  throw new Error("Expected a database row to be returned");
}
