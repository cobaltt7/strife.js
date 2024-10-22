import {
	ChatInputCommandInteraction,
	FormattingPatterns,
	Guild,
	MessageMentions,
	bold,
	chatInputApplicationCommandMention,
	escapeMarkdown,
	formatEmoji,
	lazy,
	type Snowflake,
} from "discord.js";
const getClient = lazy(async () => (await import("../client.js")).client);

/**
 * Escape all Markdown in a string. For backwards-compatability reasons, the default {@link escapeMarkdown} options don't
 * escape everything. This does, and will change as Discord updates.
 *
 * @param text The string to escape.
 * @returns The escaped string.
 */
export function escapeAllMarkdown(text: string): string {
	return escapeMarkdown(text, {
		heading: true,
		bulletedList: true,
		numberedList: true,
		maskedLink: true,
	});
}

/**
 * Strip all Markdown from a string.
 *
 * @param text The text to escape.
 * @returns The escaped text.
 */
export function stripMarkdown(text: string): string {
	return text.replace(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

/**
 * Formats an emoji, regardless of how much information about it is available.
 *
 * @param options The emoji to format.
 * @returns The formatted emoji.
 */
export function formatAnyEmoji(
	options:
		| string
		| { animated?: boolean | null; id: Snowflake; name?: string | null }
		| { animated?: boolean | null; id?: Snowflake | null; name: string },
): string;
export function formatAnyEmoji(
	options?:
		| string
		| { animated?: boolean | null; id?: Snowflake | null; name?: string | null }
		| null
		| undefined,
): string | undefined;
export function formatAnyEmoji(
	options?:
		| string
		| { animated?: boolean | null; id?: Snowflake | null; name?: string | null }
		| null
		| undefined,
): string | undefined {
	if (typeof options === "string") return options;
	if (typeof options?.id !== "string") return options?.name ?? undefined;
	return `<${options.animated ? "a" : ""}:emoji:${options.id}>`;
}

/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
export const GlobalUsersPattern = new RegExp(
	MessageMentions.UsersPattern,
	`g${MessageMentions.UsersPattern.flags}`,
);

/** An enhanced variant of {@link Invite.InvitesPattern}. */
export const InvitesPattern =
	/discord(?:(?:(?:app)?\.com|:\/(?:\/-?)?)\/invite|\.gg(?:\/invite)?)\/(?<code>[\w-]{2,255})/gi;

/** A global regular expression variant of {@link FormattingPatterns.AnimatedEmoji}. */
export const GlobalAnimatedEmoji = new RegExp(
	FormattingPatterns.AnimatedEmoji,
	`g${FormattingPatterns.AnimatedEmoji.flags}`,
);

/**
 * Given a chat input command interaction, returns the command mention of the origininating command.
 *
 * @param interaction The interaction.
 * @returns The command mention.
 */
export function commandInteractionToString(
	interaction: ChatInputCommandInteraction,
): `</${string}:${string}>` {
	const subcommandGroup = interaction.options.getSubcommandGroup(false);
	const subcommand = interaction.options.getSubcommand(false);

	if (subcommandGroup && subcommand)
		return chatInputApplicationCommandMention(
			interaction.commandName,
			subcommandGroup,
			subcommand,
			interaction.commandId,
		);

	if (subcommand)
		return chatInputApplicationCommandMention(
			interaction.commandName,
			subcommand,
			interaction.commandId,
		);

	return chatInputApplicationCommandMention(interaction.commandName, interaction.commandId);
}

/**
 * Create a chat command mention from its name.
 *
 * @param fullCommand The full name of the command to mention.
 * @param guild The guild the command may be from.
 * @returns The chat command mention.
 */
export async function mentionChatCommand(
	fullCommand: string,
	guild?: Guild,
): Promise<`**/${string}**` | `</${string}:${string}>`> {
	const [commandName] = fullCommand.split(" ");
	const id = (
		(await guild?.commands.fetch())?.find(({ name }) => name === commandName) ??
		(await (await getClient()).application.commands.fetch()).find(
			({ name }) => name === commandName,
		)
	)?.id;
	return id ? chatInputApplicationCommandMention(fullCommand, id) : bold(`/${fullCommand}`);
}
