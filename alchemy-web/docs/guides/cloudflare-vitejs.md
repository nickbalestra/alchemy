---
order: 1.5
title: Vite.js
description: Quick guide to initializing and deploying a Vite.js React application to Cloudflare Workers using Alchemy.
---

# Vite

This guide shows how to initialize and deploy a Vite.js React TypeScript application to Cloudflare using Alchemy.

## Init

Start by creating a new Vite.js project with Alchemy:

::: code-group

```sh [bun]
bunx alchemy create my-react-app --template=vite
cd my-react-app
```

```sh [npm]
npx alchemy create my-react-app --template=vite
cd my-react-app
```

```sh [pnpm]
pnpm dlx alchemy create my-react-app --template=vite
cd my-react-app
```

```sh [yarn]
yarn dlx alchemy create my-react-app --template=vite
cd my-react-app
```

:::

## Log in to Cloudflare

Authenticate once with your Cloudflare account:

::: code-group

```sh [bun]
bun wrangler login
```

```sh [npm]
npx wrangler login
```

```sh [pnpm]
pnpm wrangler login
```

```sh [yarn]
yarn wrangler login
```

:::

> [!TIP]
> Alchemy automatically re-uses your Wrangler OAuth tokens. See the [Cloudflare Auth](../guides/cloudflare-auth.md) guide for other options.

## Deploy

Run the deploy script generated by the template:

::: code-group

```sh [bun]
bun run deploy
```

```sh [npm]
npm run deploy
```

```sh [pnpm]
pnpm run deploy
```

```sh [yarn]
yarn run deploy
```

:::

You'll get the live URL of your Vite.js site:

```sh
{
  url: "https://website.<your-account>.workers.dev",
}
```

## Local Development

Work locally using the dev script:

::: code-group

```sh [bun]
bun run dev
```

```sh [npm]
npm run dev
```

```sh [pnpm]
pnpm run dev
```

```sh [yarn]
yarn run dev
```

:::

## Destroy

Clean up all Cloudflare resources created by this stack:

::: code-group

```sh [bun]
bun run destroy
```

```sh [npm]
npm run destroy
```

```sh [pnpm]
pnpm run destroy
```

```sh [yarn]
yarn run destroy
```

:::

## Explore

### `.env`

Alchemy requires a locally set password to encrypt Secrets that are stored in state. Be sure to change this.

> [!NOTE]
> See the [Secret](../concepts/secret.md) documentation to learn more.

```
ALCHEMY_PASSWORD=change-me
```

### `alchemy.run.ts`

```typescript
/// <reference types="@types/node" />

import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";

const app = await alchemy("my-react-app");

export const worker = await Vite("website", {
  main: "./worker/index.ts",
  command: "bun run build",
});

console.log({
  url: worker.url,
});

await app.finalize();
```

### `types/env.d.ts`

```typescript
// Auto-generated Cloudflare binding types.
// @see https://alchemy.run/docs/concepts/bindings.html#type-safe-bindings

import type { worker } from "../alchemy.run.ts";

export type CloudflareEnv = typeof worker.Env;

declare global {
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}
```

### `tsconfig.json`

The CLI updated the `tsconfig.json` to include `alchemy.run.ts` and register `@cloudflare/workers-types` + `types/env.d.ts` globally

> [!TIP]
> The `alchemy.run.ts` script will be run by `node` but still needs to infer the [Binding](../concepts/bindings.md) types which depends on `@cloudflare/workers-types`:

```json
{
  "exclude": ["test"],
  "include": ["types/**/*.ts", "src/**/*.ts", "alchemy.run.ts"],
  "compilerOptions": {
    "target": "es2021",
    "lib": ["es2021"],
    "jsx": "react-jsx",
    "module": "es2022",
    "moduleResolution": "Bundler",
    // ... (omitted for brevity)
    "types": ["@cloudflare/workers-types", "./types/env.d.ts"]
  }
}
```
