# Repository Guidelines

## Project Structure & Module Organization

This project is a Vue 3 + Vite frontend with a small Express API backed by Supabase.

- `src/`: frontend application code.
- `src/components/`: reusable Vue UI components.
- `src/composables/`: shared frontend state and workflow logic.
- `src/utils/`: API, import, and export helpers.
- `server/`: Express API and Supabase database helpers.
- `shared/`: logic reused by frontend and backend, such as report rules.
- `.env`: local Supabase connection settings. Do not commit real secrets.
- `dist/`: generated production build output. Do not edit by hand.
- `docs/`: planning and project documentation.

## Build, Test, and Development Commands

- `npm install`: install frontend and server dependencies.
- `npm run dev`: start the Nuxt app and BFF API together.
- `npm run build`: create the Nuxt production bundle.
- `npm start`: run the built Nuxt server from `.output/`.
- `npm run preview`: preview the Nuxt production build.

There is currently no test script. Add one before introducing test files.

## Coding Style & Naming Conventions

Use ES modules throughout. Prefer Vue `<script setup>` for components. Keep composables named with `use*`, for example `useRegistryImport.js`. Use clear domain names for modules: `reportRules.js`, `routeHelpers.js`, `SearchSelect.vue`.

Use 2-space indentation in Vue, JavaScript, JSON, and Markdown. Keep comments sparse and only add them where they clarify non-obvious logic.

## Testing Guidelines

Testing is not yet configured. When adding tests, prefer Vitest because the project already uses Vite. Prioritize pure business logic first:

- `shared/reportRules.js`
- `src/utils/importers.js`
- backend service logic used by `server/api/`

Use names like `reportRules.test.js` or `importers.test.js`.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit prefixes with Chinese descriptions, for example:

- `refactor: 抽取报备导入流程`
- `feat: 提交报备时，检查必需项是否填写`
- `chore: 报备时的报错信息改为弹窗显示`

Keep this pattern. Use concise, imperative summaries. For pull requests, include a short description, verification commands such as `npm run build`, linked issues if any, and screenshots for visible UI changes.

## Data & Configuration Notes

The API writes directly to Supabase. Keep service role keys only in local environment variables. Do not commit generated `dist/` changes unless the task specifically requires build artifacts.
