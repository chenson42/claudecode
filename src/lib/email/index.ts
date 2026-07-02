// Public API for @/lib/email. All existing import { ... } from "@/lib/email"
// call sites continue to resolve through this barrel without path changes.

// enqueueEmail is the canonical entry point for all outbound email.
// Do NOT call sendEmail() directly from server actions or pages — see DECISION-018.
export { enqueueEmail } from "./queue";
export type { EnqueueEmailInput, BatchResult } from "./queue";

// sendPasswordResetEmail is kept for fork backward compat.
// @deprecated — call enqueueEmail() directly with templateKey: 'password_reset'.
// The two starter call sites have been migrated to enqueueEmail(). This export
// exists so fork callers are not broken. Will be removed in a future version.
export { sendPasswordResetEmail } from "./send";
export type { SendEmailInput } from "./send";

// sendEmail is intentionally NOT re-exported here. It is the raw transport
// used only by queue.ts. Exposing it from the barrel would allow callers to
// bypass the queue — a violation of DECISION-018's invariant.
