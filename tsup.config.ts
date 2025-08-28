import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  bundle: true,
  minify: true,
  dts: true,
  keepNames: true,
  noExternal: [/^(?!@serenityjs\/)/],
  external: [/^@serenityjs\//],
  esbuildPlugins: [
    {
      name: "bun-externals",
      setup(build) {
        build.onResolve({ filter: /^bun:/ }, (args) => {
          return {
            path: args.path,
            external: true,
          };
        });
      },
    },
  ],
});
