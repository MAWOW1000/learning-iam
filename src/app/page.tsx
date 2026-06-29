"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

type Bucket = {
  Name?: string;
  CreationDate?: string;
};

type CallerIdentity = {
  Account?: string;
  Arn?: string;
  UserId?: string;
};

export default function Home() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState<CallerIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [bucketsRes, identityRes] = await Promise.all([
        fetch("/api/buckets"),
        fetch("/api/whoami"),
      ]);

      if (!bucketsRes.ok || !identityRes.ok) {
        throw new Error("Could not load LocalStack data.");
      }

      const [bucketData, identityData] = (await Promise.all([
        bucketsRes.json(),
        identityRes.json(),
      ])) as [Bucket[], CallerIdentity];

      setBuckets(bucketData);
      setIdentity(identityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const bucketName = name.trim();
    if (!bucketName) {
      setError("Enter a bucket name first.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bucketName }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not create the bucket.");
      }

      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">
            LocalStack AWS practice
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            S3 buckets from a typed Next.js app
          </h1>
          <Link
            href="/iam"
            className="mt-4 inline-flex min-h-10 items-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-100"
          >
            Open IAM practice lab
          </Link>
        </div>

        <section className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Caller identity</h2>
            <pre className="mt-4 overflow-auto rounded-md bg-zinc-950 p-4 text-sm text-zinc-50">
              {JSON.stringify(identity, null, 2)}
            </pre>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Create bucket</h2>
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={create}
            >
              <input
                className="min-h-11 flex-1 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="my-bucket"
              />
              <button
                className="min-h-11 rounded-md bg-emerald-700 px-4 text-base font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? "Creating..." : "Create bucket"}
              </button>
            </form>

            {error ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Buckets</h2>
            <button
              className="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
              disabled={isLoading}
              onClick={() => void load()}
              type="button"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <ul className="mt-4 divide-y divide-zinc-200">
            {buckets.map((bucket, index) => (
              <li className="py-3 font-mono text-sm" key={bucket.Name ?? index}>
                {bucket.Name}
              </li>
            ))}
          </ul>

          {!isLoading && buckets.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No buckets yet.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
