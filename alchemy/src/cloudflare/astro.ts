import path from "node:path";
import type { Assets } from "./assets.ts";
import type { Bindings } from "./bindings.ts";
import type { WebsiteProps } from "./website.ts";
import { Website } from "./website.ts";
import type { Worker } from "./worker.ts";

/**
 * Properties for creating an Astro resource.
 * Extends WebsiteProps, allowing customization of the underlying Website.
 */
export interface AstroProps<B extends Bindings> extends WebsiteProps<B> {}

/**
 * Represents the output of an Astro resource deployment.
 * It resolves to the underlying Cloudflare Worker type, ensuring type safety.
 * Prevents overriding the internal ASSETS binding.
 */
export type Astro<B extends Bindings> = B extends { ASSETS: any }
  ? never
  : Worker<B & { ASSETS: Assets }>;

/**
 * Creates and deploys an Astro application using the Cloudflare adapter.
 *
 * This resource simplifies deploying Astro applications by providing sensible
 * defaults for the build command, main entrypoint, and assets directory
 * based on the `@astrojs/cloudflare` adapter output.
 *
 * It wraps the underlying `Website` resource.
 *
 * @param id A unique identifier for the resource.
 * @param props Configuration options for the Astro deployment, overriding defaults.
 * @returns A promise that resolves to the deployed Cloudflare Worker details.
 *
 * @example
 * ## Deploy a basic Astro site with default settings
 *
 * Deploy an Astro application with minimal configuration using default build settings.
 *
 * ```ts
 * import { Astro } from "alchemy/cloudflare";
 *
 * const astroSite = await Astro("my-astro-app");
 * ```
 *
 * @example
 * ## Deploy with custom bindings and build command
 *
 * Deploy an Astro application with custom Cloudflare bindings and build configuration.
 *
 * ```ts
 * import { Astro, D1Database } from "alchemy/cloudflare";
 *
 * const db = await D1Database("my-db");
 * const astroSiteWithDb = await Astro("my-astro-app-with-db", {
 *   command: "npm run build", // Specify a custom build command
 *   bindings: {
 *     DB: db, // Add custom bindings
 *   },
 * });
 * ```
 */
export async function Astro<B extends Bindings>(
  id: string,
  props: AstroProps<B>,
): Promise<Astro<B>> {
  if (props?.bindings?.ASSETS) {
    throw new Error("ASSETS binding is reserved for internal use");
  }
  const wrangler = props?.wrangler ?? true;
  const main = props?.main ?? path.join("dist", "_worker.js/index.js");
  const assetsDir =
    typeof props?.assets === "string"
      ? props?.assets
      : (props?.assets?.dist ?? "dist");

  return Website(id, {
    ...props,
    noBundle: props.noBundle ?? true,
    main,
    assets: {
      dist: assetsDir,
      not_found_handling: "none",
      run_worker_first: false,
    },
    wrangler,
  });
}
