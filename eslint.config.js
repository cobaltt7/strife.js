import path from "node:path";
import { fileURLToPath } from "node:url";

import cobaltConfigs, { globals } from "eslint-config-cobaltt7";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig({ files: ["**/*.ts"] }, globalIgnores(["dist"]), ...cobaltConfigs, {
	languageOptions: {
		ecmaVersion: 2022,
		globals: globals.nodeBuiltin,
		parserOptions: {
			projectService: true,
			tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
		},
	},
	rules: {
		// Until we drop Node 18
		"unicorn/no-array-reverse": "off",
		"unicorn/no-array-sort": "off",
	},
});
