/**
 * role-boundaries.spec.ts — Proxy-gate enforcement using injected storageState.
 *
 * Scope: navigation-and-redirect assertions only. These tests probe proxy.ts
 * gate behavior (redirect on access denial). They do NOT probe server-action
 * permission checks — server actions are not accessible via page.request.post()
 * to a static URL in the starter's architecture, and their authorization is
 * covered by unit tests (api-developer domain). Future spec authors must not
 * attempt to POST to server action URLs here.
 *
 * storageState for each role is produced by e2e/support/global-setup.ts.
 * The mfa-admin storageState is intentionally NOT TOTP-verified
 * (twoFactorRequired=true, twoFactorVerified=false). Use it ONLY to assert
 * the /totp redirect fires. Do not use it to test /admin page content.
 *
 * Delete e2e/support/.auth/ after changing any SEED_*_EMAIL env var.
 */

import { test, expect } from "@playwright/test";
import path from "node:path";

function storageStatePath(role: "admin" | "member" | "mfa-admin"): string {
  return path.resolve(__dirname, "support", ".auth", `${role}.json`);
}

const HAVE_ADMIN = !!(
  process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
);
const HAVE_MEMBER = !!(
  process.env.SEED_MEMBER_EMAIL && process.env.SEED_MEMBER_PASSWORD
);
const HAVE_MFA_ADMIN = !!(
  process.env.SEED_MFA_ADMIN_EMAIL && process.env.SEED_MFA_ADMIN_PASSWORD
);

// Test 1 — Unauthenticated: /home redirects to /signin
test("unauthenticated visit to /home redirects to /signin with callbackUrl", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/signin/);
  const url = new URL(page.url());
  expect(url.searchParams.get("callbackUrl")).toBe("/home");
});

// Test 2 — Member: /admin is blocked → /access-pending
test.describe("Member — /admin blocked", () => {
  test.use({ storageState: storageStatePath("member") });

  test("member navigating to /admin is redirected to /access-pending", async ({
    page,
  }) => {
    test.skip(!HAVE_MEMBER, "SEED_MEMBER_EMAIL/PASSWORD not set");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/access-pending/);
  });
});

// Test 3 — MFA-admin: /admin triggers /totp gate
test.describe("MFA-admin — /totp gate", () => {
  // Session is intentionally NOT TOTP-verified (twoFactorRequired=true,
  // twoFactorVerified=false). Use only to assert the /totp redirect fires.
  test.use({ storageState: storageStatePath("mfa-admin") });

  test("mfa-admin navigating to /admin is redirected to /totp with callbackUrl", async ({
    page,
  }) => {
    test.skip(!HAVE_MFA_ADMIN, "SEED_MFA_ADMIN_EMAIL/PASSWORD not set");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/totp/);
    const url = new URL(page.url());
    expect(url.searchParams.get("callbackUrl")).toBe("/admin");
  });
});

// Test 4 — Admin: /admin is reachable (positive gate)
test.describe("Admin — positive gate", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("admin navigating to /admin reaches the admin dashboard", async ({
    page,
  }) => {
    test.skip(!HAVE_ADMIN, "SEED_ADMIN_EMAIL/PASSWORD not set");
    await page.goto("/admin");
    expect(page.url()).toMatch(/\/admin/);
  });
});
