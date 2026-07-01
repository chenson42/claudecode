import Link from "next/link";

export default function AccessPending() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold">Access pending</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Your account exists, but doesn&apos;t yet have permission for this area.
        Ask an administrator to grant you the right role.
      </p>
      <Link
        href="/home"
        className="mt-6 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to home
      </Link>
    </main>
  );
}
