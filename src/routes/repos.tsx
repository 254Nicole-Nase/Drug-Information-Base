import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Star, GitFork, ExternalLink } from "lucide-react";

import { listGitHubRepos, type GitHubRepo } from "@/lib/github.functions";

const TITLE = "Connected GitHub repositories — Drug Info Center";
const DESCRIPTION =
  "The GitHub repositories connected to this workspace, listed by most recently updated.";

const reposQueryOptions = {
  queryKey: ["github", "repos"],
  queryFn: () => listGitHubRepos(),
};

export const Route = createFileRoute("/repos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(reposQueryOptions);
  },
  component: Repos,
});

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-card-foreground">{repo.name}</h2>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {repo.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{repo.description}</p>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground">No description</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {repo.language ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            {repo.language}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <Star className="h-4 w-4" />
          {repo.stargazers_count}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="h-4 w-4" />
          {repo.forks_count}
        </span>
        <span className="ml-auto text-xs">Updated {formatUpdatedAt(repo.updated_at)}</span>
      </div>
    </a>
  );
}

function Repos() {
  const { data: repos } = useSuspenseQuery(reposQueryOptions);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          My GitHub Repositories
        </h1>
        <p className="mt-2 text-muted-foreground">
          {repos.length} {repos.length === 1 ? "repository" : "repositories"} connected via
          GitHub.
        </p>
      </div>
      {repos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No repositories found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </main>
  );
}
