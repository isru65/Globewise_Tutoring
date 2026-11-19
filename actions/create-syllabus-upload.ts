import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertIsParentOfStudent,
  getCurrentUser,
  loadStudent,
  requireRole,
} from "../server/lib/access.js";
import { notify, recordAudit } from "../server/lib/platform.js";

const FILE_EXTENSIONS: Record<"pdf" | "docx" | "jpg" | "png", string[]> = {
  pdf: ["pdf"],
  docx: ["docx"],
  jpg: ["jpg", "jpeg"],
  png: ["png"],
};

export default defineAction({
  description:
    "Register a parent's weekly school syllabus upload for one child (PDF, DOCX, JPG, or PNG). The upload waits for tutor review.",
  schema: z.object({
    studentId: z.string(),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    fileName: z.string().min(1).max(255),
    fileType: z.enum(["pdf", "docx", "jpg", "png"]),
  }),
  run: async ({ studentId, weekStart, fileName, fileType }) => {
    const user = await getCurrentUser();
    requireRole(user, ["parent", "admin"]);
    const student = await loadStudent(studentId);
    assertIsParentOfStudent(user, student);
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!FILE_EXTENSIONS[fileType].includes(extension)) {
      fail(`File name must end in .${fileType}`, { statusCode: 400 });
    }
    const [upload = expectRow()] = await getDb()
      .insert(schema.syllabusUploads)
      .values({
        id: crypto.randomUUID(),
        studentId,
        weekStart,
        fileName: fileName.trim(),
        fileType,
        status: "pending_review",
        uploadedByEmail: user.email,
      })
      .returning();
    if (student.tutorEmail) {
      await notify(student.tutorEmail, "New syllabus to review", `${student.firstName} ${student.lastName}: week of ${weekStart}`);
    }
    await recordAudit(user.email, "syllabus.upload", "syllabus_upload", upload.id, null, upload);
    return upload;
  },
});
