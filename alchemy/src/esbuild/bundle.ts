import * as esbuild from "esbuild";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Context } from "../context";
import { Resource } from "../resource";

/**
 * Properties for creating or updating an esbuild bundle
 */
export interface BundleProps {
  /**
   * Entry point for the bundle
   * Path to the source file to bundle (e.g., "src/handler.ts")
   */
  entryPoint: string;

  /**
   * Output directory for the bundle
   * Directory where the bundled file will be written
   */
  outdir?: string;

  /**
   * Output filename for the bundle
   * Full path to the output file, overrides outdir if specified
   */
  outfile?: string;

  /**
   * Bundle format
   * iife: Immediately Invoked Function Expression
   * cjs: CommonJS
   * esm: ECMAScript Modules
   */
  format?: "iife" | "cjs" | "esm";

  /**
   * Target environment
   * Examples: 'node16', 'node18', 'es2020'
   */
  target?: string | string[];

  /**
   * Whether to minify the output
   */
  minify?: boolean;

  /**
   * Whether to generate sourcemaps
   * inline: Include sourcemap in bundle
   * external: Generate separate .map file
   * both: Generate both inline and external
   */
  sourcemap?: boolean | "inline" | "external" | "both";

  /**
   * External packages to exclude from bundle
   * Array of package names to mark as external
   */
  external?: string[];

  /**
   * Platform to target
   * browser: Browser environment
   * node: Node.js environment
   * neutral: Platform-agnostic
   */
  platform?: "browser" | "node" | "neutral";

  /**
   * Additional esbuild options
   * Any other valid esbuild BuildOptions
   */
  options?: Partial<esbuild.BuildOptions>;
}

/**
 * Output returned after bundle creation/update
 */
export interface Bundle extends Resource<"esbuild::Bundle"> {
  /**
   * Path to the bundled file
   * Absolute or relative path to the generated bundle
   */
  path: string;

  /**
   * SHA-256 hash of the bundle contents
   * Used for cache busting and content verification
   */
  hash: string;
}

/**
 * esbuild Bundle Resource
 *
 * Creates and manages bundled JavaScript/TypeScript files using esbuild.
 * Supports various output formats, sourcemaps, and platform targets.
 *
 * @example
 * // Bundle a TypeScript file for Node.js
 * const bundle = await Bundle("handler", {
 *   entryPoint: "src/handler.ts",
 *   outdir: ".alchemy/.out",
 *   format: "esm",
 *   platform: "node",
 *   target: "node18"
 * });
 */
export const Bundle = Resource(
  "esbuild::Bundle",
  {
    alwaysUpdate: true,
  },
  async function (
    this: Context<Bundle>,
    id: string,
    props: BundleProps
  ): Promise<Bundle> {
    // Determine output path
    const outDirPath = getOutDirPath(props);

    // Ensure output directory exists
    await fs.promises.mkdir(path.dirname(outDirPath), { recursive: true });
    if (this.phase === "delete") {
      await cleanDirectory(outDirPath);
      return this.destroy();
    }

    const result = await bundle(props);
    // Check that bundle created output an file for the given entrypoint
    // Use bundle metada data to retrieve its content
    let bundleOutputPath;
    for (const file in result.metafile.outputs) {
      if (result.metafile.outputs[file].entryPoint === props.entryPoint) {
        bundleOutputPath = file;
      }
    }
    if (!bundleOutputPath) {
      throw new Error(`Unable to find a compiled file`);
    }

    // Calculate hash of the output
    const bundleOutputContent = await fs.promises.readFile(bundleOutputPath);
    const hash = crypto
      .createHash("sha256")
      .update(bundleOutputContent)
      .digest("hex");

    // Store metadata in context
    await this.set("metafile", result.metafile);
    await this.set("hash", hash);

    // Return output info
    return this({
      path: bundleOutputPath,
      hash,
    });
  }
);

export async function bundle(props: BundleProps) {
  return await esbuild.build({
    ...props.options,
    entryPoints: [props.entryPoint],
    outdir: props.outdir,
    outfile: props.outfile,
    bundle: true,
    format: props.format,
    target: props.target,
    minify: props.minify,
    sourcemap: props.sourcemap,
    external: [
      "node:async_hooks",
      ...(props.external ?? []),
      ...(props.options?.external ?? []),
    ],
    platform: props.platform,
    metafile: true,
    write: true,
  });
}

function getOutDirPath(props: BundleProps) {
  if (props.outfile != null) return path.dirname(props.outfile);
  if (props.outdir != null) return props.outdir;

  throw new Error(
    `You need to specify either outfile or outdir in your bundle configuration ${JSON.stringify(props)}`
  );
}

async function cleanDirectory(dirPath: string) {
  try {
    const files = await fs.promises.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        await fs.promises.unlink(filePath);
      } else if (stats.isDirectory()) {
        await fs.promises.rmdir(filePath, { recursive: true });
      }
    }
  } catch (err) {
    console.error(`Error cleaning directory ${dirPath}:`, err);
    throw err;
  }
}
