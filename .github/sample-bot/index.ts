import { fileURLToPath } from "node:url";

import { GatewayIntentBits } from "discord.js";
import { login } from "strife.js";

await login({
	modulesDirectory: fileURLToPath(new URL("./modules", import.meta.url)),
	clientOptions: { intents: GatewayIntentBits.Guilds },
});
