import { defineChatCommand } from "strife.js";

defineChatCommand({ name: "ping", description: "Ping!" }, async (interaction) => {
	await interaction.reply("Pong!");
});
