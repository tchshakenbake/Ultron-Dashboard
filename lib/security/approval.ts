import { createHash, randomUUID } from "node:crypto";

export const ALLOWED_ACTION_KINDS = ["mission.create", "mission.update", "provider.configure", "provider.disable", "memory.delete", "data.export"] as const;
export type ActionKind = (typeof ALLOWED_ACTION_KINDS)[number];
export type ProposedAction = {
  kind: ActionKind;
  summary: string;
  payload: Record<string, unknown>;
};
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "consumed";
export type ApprovalRecord = {
  id: string;
  status: ApprovalStatus;
  createdAt: string;
  expiresAt: string;
  action: ProposedAction;
  actionDigest: string;
};

const MAX_SUMMARY_LENGTH = 240;
const MAX_TTL_MS = 15 * 60 * 1000;

function stableJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Action payload contains a non-finite number.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error("Action payload must contain only plain JSON objects.");
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  throw new Error("Action payload contains a value that cannot be safely serialized.");
}

function digest(action: ProposedAction): string {
  return createHash("sha256").update(stableJson(action)).digest("hex");
}

export function createApprovalRecord(action: ProposedAction, now = new Date(), ttlMs = MAX_TTL_MS): ApprovalRecord {
  if (!ALLOWED_ACTION_KINDS.includes(action.kind)) throw new Error("Action kind is not allowed.");
  if (!action.summary.trim() || action.summary.length > MAX_SUMMARY_LENGTH) throw new Error("Action summary is invalid.");
  if (!Number.isFinite(ttlMs) || ttlMs < 1_000 || ttlMs > MAX_TTL_MS) throw new Error("Approval lifetime must be between 1 second and 15 minutes.");
  // Validate JSON-safe shape before cloning so undefined/functions cannot silently disappear.
  stableJson(action);
  const createdAt = now.toISOString();
  const immutableAction = JSON.parse(JSON.stringify(action)) as ProposedAction;
  return {
    id: randomUUID(),
    status: "pending",
    createdAt,
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    action: immutableAction,
    actionDigest: digest(immutableAction),
  };
}

/** Execution must compare this digest with the server-side stored action immediately before execution. */
export function verifyApprovalBinding(record: ApprovalRecord, currentAction: ProposedAction, now = new Date()): boolean {
  return record.status === "approved" &&
    new Date(record.expiresAt).getTime() > now.getTime() &&
    record.actionDigest === digest(record.action) &&
    record.actionDigest === digest(currentAction);
}

export function approvalDigestForAudit(action: ProposedAction): string {
  return digest(action);
}
