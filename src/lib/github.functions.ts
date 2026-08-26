import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const repoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string().url(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  updated_at: z.string(),
  private: z.boolean(),
});

export type GitHubRepo = z.infer<typeof repoSchema>;

export const listGitHubRepos = createServerFn({ method: "GET" }).handler(
  async () => {
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const githubApiKey = process.env["GITHUB_API_KEY"];

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!githubApiKey) {
      throw new Error("GITHUB_API_KEY is not configured");
    }

    const response = await fetch(
      "https://connector-gateway.lovable.dev/github/user/repos?per_page=50&sort=updated",
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": githubApiKey,
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`GitHub gateway request failed [${response.status}]: ${errorBody}`);
      throw new Error(`GitHub request failed [${response.status}]: ${errorBody}`);
    }

    const raw = await response.json();
    const repos = z.array(repoSchema).parse(raw);
    return repos;
  },
);
