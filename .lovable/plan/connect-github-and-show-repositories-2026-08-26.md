# Connect GitHub and show repositories

## Goal

Link the workspace GitHub App connector to this project and build a page that lists the connected account's repositories.

## Steps

1. **Connect GitHub**
   - Call `standard_connectors--list_app_connectors` to confirm the GitHub connector ID.
   - Call `standard_connectors--connect` with `connector_id: "github"` to link the builder/workspace GitHub account.
   - Note whether the linked connection uses the Lovable connector gateway.

2. **Verify the connection**
   - Use `standard_connectors--list_connections` to confirm the connection is linked and accessible.
   - Optionally make a one-off gateway call to `/user/repos?per_page=10&sort=updated` to verify credentials.

3. **Create a server function to fetch repos**
   - Add `src/lib/github.functions.ts` with a `createServerFn` that calls the GitHub REST API through the Lovable connector gateway.
   - Read `LOVABLE_API_KEY` and `GITHUB_API_KEY` from `process.env` inside the handler.
   - Call `https://connector-gateway.lovable.dev/github/user/repos?per_page=50&sort=updated` with headers `Accept: application/vnd.github+json`, `Authorization: Bearer ${LOVABLE_API_KEY}`, and `X-Connection-Api-Key: ${GITHUB_API_KEY}`.
   - Validate the response and surface provider errors.

4. **Build the repositories page**
   - Replace the placeholder `src/routes/index.tsx` with a route that loads and displays the repository list.
   - Use a route loader with `context.queryClient.ensureQueryData` and `useSuspenseQuery` in the component.
   - Render each repo's name, description, language, star count, and a link to the repo on GitHub.
   - Add a unique `head()` with title, description, and Open Graph/Twitter metadata.
   - Handle empty states and loading/error boundaries.

5. **Polish and verify**
   - Ensure no hardcoded colors; use the project's Tailwind v4 semantic tokens.
   - Check the build log after edits and confirm the preview shows the repository list.

## Technical details

- Stack: TanStack Start v1, React 19, Tailwind CSS v4, shadcn/ui tokens.
- Server boundary: `createServerFn` from `@tanstack/react-start`; gateway call from server-side only.
- No database or Lovable Cloud required for this read-only GitHub integration.
