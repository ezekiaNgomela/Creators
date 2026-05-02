# Profile services

Each profile service lives in its own folder with a small `index.ts` metadata file and a `Page.tsx` page.

To add or remove a service:

1. Create or delete the service folder in `services/`.
2. Export a `ProfileService` object with `id`, `label`, `helper`, `icon`, and `action`.
3. Create a page component that receives `ProfileServicePageProps`.
4. Add or remove that export in `catalog.ts` and `ProfileServicePage.tsx`.

Available actions are `create`, `settings`, and `share`. The profile page maps those actions to Studio, Settings, or profile-link sharing.
