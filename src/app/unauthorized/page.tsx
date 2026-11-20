import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1>Access restricted</h1>
      <p className="page-lede text-center">Your role does not have permission to view this section.</p>
      <Link className="btn" href="/">
        Back to dashboard
      </Link>
    </main>
  );
}
