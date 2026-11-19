import { getDb, schema } from "../db.js";

export async function recordAudit(
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  await getDb()
    .insert(schema.auditLogs)
    .values({
      id: crypto.randomUUID(),
      actorEmail,
      action,
      targetType,
      targetId,
      before,
      after,
    });
}

export async function notify(recipientEmail: string, title: string, body = "") {
  await getDb()
    .insert(schema.notifications)
    .values({ id: crypto.randomUUID(), recipientEmail, title, body });
}

export async function awardPoints(
  studentId: string,
  pointsDelta: number,
  reason: string,
  idempotencyKey: string,
) {
  await getDb()
    .insert(schema.pointsLedger)
    .values({
      id: crypto.randomUUID(),
      studentId,
      pointsDelta,
      reason,
      idempotencyKey,
    })
    .onConflictDoNothing({ target: schema.pointsLedger.idempotencyKey });
}
