import {
	ChatInputCommandInteraction,
	FormattingPatterns,
	Guild,
	MessageMentions,
	bold,
	chatInputApplicationCommandMention,
	escapeMarkdown,
	formatEmoji,
	type Snowflake,
} from "discord.js";
import { client } from "../client.js";

export function escapeAllMarkdown(text: string): string {
	return escapeMarkdown(text, {
		heading: true,
		bulletedList: true,
		numberedList: true,
		maskedLink: true,
	});
}

export function stripMarkdown(text: string): string {
	return text.replace(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

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
	return formatEmoji(options.id, options.animated ?? false);
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
export async function mentionChatCommand(
	fullCommand: string,
	guild?: Guild,
): Promise<`**/${string}**` | `</${string}:${string}>`> {
	const [commandName] = fullCommand.split(" ");
	const id = (
		(await guild?.commands.fetch())?.find(({ name }) => name === commandName) ??
		(await client.application.commands.fetch()).find(({ name }) => name === commandName)
	)?.id;
	return id ? chatInputApplicationCommandMention(fullCommand, id) : bold(`/${fullCommand}`);
}
