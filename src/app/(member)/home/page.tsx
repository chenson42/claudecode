import Link from "next/link";
import { auth } from "@/auth";
import { FEATURES } from "@/lib/permissions";

// auth() is memoized via React cache() — calling it here after the layout
// already called it costs nothing (same request, same cached result).
export default async function HomePage() {
  const session = await auth();
  const user = session!.user;

  const name = user.name ?? user.email ?? "there";
  const roles = user.roles ?? [];
  const featuresList = user.features ?? [];
  const isAdmin = featuresList.includes(FEATURES.ADMIN_DASHBOARD);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, {name}.
      </h1>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your roles
        </h2>
        {roles.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {roles.map((role) => (
              <li key={role} className="text-sm">
                {role}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is set up, but you haven&apos;t been granted any roles
            yet. Contact an administrator to get access.
          </p>
        )}
      </section>

      {featuresList.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your features
          </h2>
          <ul className="mt-2 space-y-1">
            {featuresList.map((feat) => (
              <li key={feat} className="text-sm">
                {feat}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick links
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/account"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Account settings
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Admin dashboard
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
