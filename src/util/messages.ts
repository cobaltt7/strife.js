import type {
	ActionRow,
	APIActionRowComponent,
	APIButtonComponent,
	APIEmbed,
	APIMessageComponent,
	APISelectMenuComponent,
	Attachment,
	Collection,
	EmojiIdentifierResolvable,
	Message,
	MessageActionRowComponent,
	MessageMentionOptions,
	MessageReaction,
	Partialize,
} from "discord.js";

import { ComponentType } from "discord.js";

/**
 * Remove signatures from any Discord attachment URLs in a string.
 *
 * @param content The string to find Discord attachment URLs in.
 * @returns The string without any Discord attachment signatures.
 */
export function unsignFiles(content: string): string {
	return content.replaceAll(
		/https:\/\/(?:cdn|media)\.discordapp\.(?:net|com)\/attachments\/(?:[\w!#$&'()*+,./:;=?@~-]|%\d\d)+/gis,
		(match) => {
			const url = new URL(match);
			return url.origin + url.pathname;
		},
	);
}

/**
 * Given a Discord file URL, check ts signature to see if it is expired.
 *
 * @param url The file URL to check.
 * @returns Whether it is expired.
 */
export function isFileExpired(url: string): boolean {
	const expirey = new URL(url).searchParams.get("ex");
	return !!expirey && Number.parseInt(expirey, 16) * 1000 < Date.now();
}

/**
 * Get all attachments from a Discord message, handling URL expirey.
 *
 * @param message The message to get attachments from.
 * @returns The retrieved attachments.
 */
export async function getFilesFromMessage(
	message: Message,
): Promise<Collection<string, Attachment>> {
	const expired = message.attachments.some((file) => isFileExpired(file.url));
	if (!expired) return message.attachments;

	const fetched = await message.fetch(true);
	return fetched.attachments;
}

type MessageSnapshot = Partialize<
	Message,
	null,
	Exclude<
		keyof Message,
		| "attachments"
		| "client"
		| "components"
		| "content"
		| "createdTimestamp"
		| "editedTimestamp"
		| "embeds"
		| "flags"
		| "mentions"
		| "stickers"
		| "type"
	>
>;
type MessageSnapshots = Collection<string, MessageSnapshot>;

/**
 * Given a message, extract just enough information to resend a representation of it. Note that
 * `content` is not transformed. Use {@link messageToText} to extract the displayed message text.
 *
 * @param message The message to get the JSON of.
 * @returns The message JSON.
 */
export async function getMessageJSON(
	message: Message,
): Promise<{
	content: string;
	embeds: readonly APIEmbed[];
	allowedMentions: MessageMentionOptions;
	files: readonly string[];
	components: readonly APIMessageComponent[];
}> {
	const snapshots =
		"messageSnapshots" in message ?
			(message.messageSnapshots as MessageSnapshots).values()
		:	[];
	return {
		content: [message, ...snapshots].map((snapshot) => snapshot.content).join("\n\n"),
		embeds: [message, ...snapshots].flatMap((snapshot) =>
			snapshot.embeds.map((embed) => embed.toJSON()),
		),
		allowedMentions: {
			parse: message.mentions.everyone ? ["everyone"] : undefined,
			repliedUser: !!message.mentions.repliedUser,
			roles: [...message.mentions.roles.keys()],
			users: [...message.mentions.users.keys()],
		},
		files: [
			...(await getFilesFromMessage(message)).values(),
			...message.stickers.values(),
			...("messageSnapshots" in message ?
				(message.messageSnapshots as MessageSnapshots).map(({ attachments, stickers }) => [
					...attachments.filter((file) => !isFileExpired(file.url)).values(),
					...stickers.values(),
				])
			:	([] as const)),
		]
			.flat()
			.slice(0, 10)
			.map((attachment) => attachment.url),
		components: message.components.map((component) => component.toJSON()),
	};
}
/**
 * React to a message with multiple emojis in order.
 *
 * @param message The message to react to.
 * @param reactions The reactions to add.
 * @returns The added reactions.
 */
export async function reactAll(
	message: Message,
	reactions: readonly EmojiIdentifierResolvable[],
): Promise<MessageReaction[]> {
	const messageReactions = [];
	for (const reaction of reactions) {
		const messageReaction = await message.react(reaction).catch(() => void 0);
		if (messageReaction) messageReactions.push(messageReaction);
		else break;
	}
	return messageReactions;
}

/**
 * Disable all components in message action rows, ignoring components that don't require manual
 * handling (link and premium buttons).
 *
 * @param rows The action rows to disable components in.
 * @returns The updated action rows with disabled components.
 */
export function disableComponents(
	rows: ActionRow<MessageActionRowComponent>[],
): APIActionRowComponent<APIButtonComponent | APISelectMenuComponent>[] {
	return rows.map(({ components }) => ({
		components: components.map((component) => ({
			...component.data,

			disabled: component.type !== ComponentType.Button || !!component.customId,
		})),

		type: ComponentType.ActionRow,
	}));
}
