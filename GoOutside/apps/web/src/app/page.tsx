export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
        Go Outside
      </p>
      <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-foreground sm:text-6xl">
        Find your next reason to step outside.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
        Discover outdoor events and communities around you.
      </p>
    </main>
  );
}