"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type UserItem = {
  name: string;
  arn?: string;
  groups: string[];
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
};

const GROUPS = ["Admins", "Developers", "Viewers"] as const;

export default function IamPracticePage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("Viewers");
  const [simulateUser, setSimulateUser] = useState("");
  const [simulateAction, setSimulateAction] = useState("s3:CreateBucket");
  const [simulateResource, setSimulateResource] = useState("arn:aws:s3:::practice-bucket");
  const [roleName, setRoleName] = useState("PracticeS3ReadRole");
  const [activity, setActivity] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setApiState = (result: ApiResult) => {
    setActivity(result);
    setError(typeof result.error === "string" ? result.error : null);
  };

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);

    try {
      const res = await fetch("/api/iam/users");
      const body = (await res.json()) as { users?: UserItem[]; error?: string };

      if (!res.ok) {
        throw new Error(body.error ?? "Could not load IAM users.");
      }

      const nextUsers = body.users ?? [];
      setUsers(nextUsers);

      if (nextUsers.length > 0 && !simulateUser) {
        setSimulateUser(nextUsers[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [simulateUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const userOptions = useMemo(() => users.map((user) => user.name), [users]);

  const callApi = async (url: string, method: "GET" | "POST" | "DELETE", body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await res.json()) as ApiResult;

    if (!res.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : `Request failed with status ${res.status}`,
      );
    }

    setApiState(payload);
    return payload;
  };

  const onSetup = async () => {
    try {
      const result = await callApi("/api/iam/setup", "POST");
      setApiState(result);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set up IAM tiers.");
    }
  };

  const onCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userName = name.trim();

    if (!userName) {
      setError("User name is required.");
      return;
    }

    try {
      await callApi("/api/iam/users", "POST", { name: userName, group });
      setName("");
      await loadUsers();
      if (!simulateUser) {
        setSimulateUser(userName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user.");
    }
  };

  const onDeleteUser = async (userName: string) => {
    try {
      await callApi("/api/iam/users", "DELETE", { name: userName });
      await loadUsers();
      if (simulateUser === userName) {
        setSimulateUser("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user.");
    }
  };

  const onSimulate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!simulateUser.trim()) {
      setError("Choose a user for simulation.");
      return;
    }

    try {
      await callApi("/api/iam/simulate", "POST", {
        userName: simulateUser,
        action: simulateAction,
        resourceArn: simulateResource,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run simulation.");
    }
  };

  const onCreateRole = async () => {
    try {
      await callApi("/api/iam/roles", "POST", { roleName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create role.");
    }
  };

  const onAssumeRole = async () => {
    try {
      await callApi("/api/iam/assume-role", "POST", { roleName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assume role.");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-sky-700">
              LocalStack IAM Lab
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              Practice users, groups, policies, and roles
            </h1>
          </div>
          <Link
            href="/"
            className="min-h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-100"
          >
            Back to S3 page
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">1) Setup IAM tiers</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Creates groups and attaches policies for Admins, Developers, and Viewers.
            </p>
            <button
              type="button"
              onClick={() => void onSetup()}
              className="mt-4 min-h-11 rounded-md bg-sky-700 px-4 text-base font-medium text-white transition hover:bg-sky-800"
            >
              Setup groups and policies
            </button>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">2) Create user + assign group</h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={onCreateUser}>
              <input
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="practice-user-01"
              />
              <select
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                value={group}
                onChange={(event) => setGroup(event.target.value as (typeof GROUPS)[number])}
              >
                {GROUPS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-11 rounded-md bg-emerald-700 px-4 text-base font-medium text-white transition hover:bg-emerald-800"
              >
                Save user
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Current IAM users</h2>
            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={isLoadingUsers}
              className="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {isLoadingUsers ? "Loading..." : "Refresh users"}
            </button>
          </div>

          <ul className="mt-4 divide-y divide-zinc-200">
            {users.map((user) => (
              <li key={user.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-mono text-sm">{user.name}</p>
                  <p className="text-sm text-zinc-600">
                    Groups: {user.groups.length > 0 ? user.groups.join(", ") : "none"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteUser(user.name)}
                  className="min-h-9 rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>

          {!isLoadingUsers && users.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No IAM users yet.</p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">3) Simulate policy decision</h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={onSimulate}>
              <select
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                value={simulateUser}
                onChange={(event) => setSimulateUser(event.target.value)}
              >
                <option value="">Select user</option>
                {userOptions.map((userName) => (
                  <option key={userName} value={userName}>
                    {userName}
                  </option>
                ))}
              </select>
              <input
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                value={simulateAction}
                onChange={(event) => setSimulateAction(event.target.value)}
                placeholder="s3:CreateBucket"
              />
              <input
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                value={simulateResource}
                onChange={(event) => setSimulateResource(event.target.value)}
                placeholder="arn:aws:s3:::practice-bucket"
              />
              <button
                type="submit"
                className="min-h-11 rounded-md bg-amber-600 px-4 text-base font-medium text-white transition hover:bg-amber-700"
              >
                Run simulation
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">4) Role and assume-role</h2>
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="min-h-11 rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="PracticeS3ReadRole"
              />
              <button
                type="button"
                onClick={() => void onCreateRole()}
                className="min-h-11 rounded-md bg-indigo-700 px-4 text-base font-medium text-white transition hover:bg-indigo-800"
              >
                Create role
              </button>
              <button
                type="button"
                onClick={() => void onAssumeRole()}
                className="min-h-11 rounded-md border border-indigo-300 px-4 text-base font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                Assume role
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-zinc-950 p-5 text-zinc-50">
          <h2 className="text-lg font-semibold">Activity output</h2>
          <pre className="mt-4 overflow-auto rounded-md bg-black/40 p-4 text-xs sm:text-sm">
            {JSON.stringify(activity, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
