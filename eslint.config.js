import path from "node:path";
import { fileURLToPath } from "node:url";

import cobaltConfigs, { declareConfig, globals } from "eslint-config-cobaltt7";

export default declareConfig({ files: ["**/*.ts"] }, { ignores: ["dist"] }, ...cobaltConfigs, {
	languageOptions: {
		ecmaVersion: 2022,
		globals: globals.nodeBuiltin,
		parserOptions: {
			projectService: true,
			tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
		},
	},
});
