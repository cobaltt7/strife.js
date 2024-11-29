import type {
	ActionRow,
	APIActionRowComponent,
	APIEmbed,
	APIMessageActionRowComponent,
	Attachment,
	BaseMessageOptions,
	Collection,
	EmojiIdentifierResolvable,
	MessageActionRowComponent,
	MessageMentionOptions,
	MessageReaction,
} from "discord.js";

import { ButtonStyle, ComponentType, Message } from "discord.js";

/**
 * Remove signatures from any Discord attachment URLs in a string.
 *
 * @param content The string to find Discord attachment URLs in.
 * @returns The string without any Discord attachment signatures.
 */
export function unsignFiles(content: string): string {
	return content.replace(
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

/**
 * Given a message, extract just enough information to resend it.
 *
 * @param message The message to get the JSON of.
 * @returns The message JSON.
 */
export async function getMessageJSON(message: Message): Promise<{
	content: string;
	embeds: readonly APIEmbed[];
	allowedMentions: MessageMentionOptions;
	files: readonly string[];
	components: readonly APIActionRowComponent<APIMessageActionRowComponent>[];
}> {
	return {
		content: message.content,
		embeds: message.embeds.map((embed) => embed.toJSON()),
		allowedMentions: {
			parse: message.mentions.everyone ? ["everyone"] : undefined,
			repliedUser: !!message.mentions.repliedUser,
			roles: [...message.mentions.roles.keys()],
			users: [...message.mentions.users.keys()],
		},
		files: (await getFilesFromMessage(message)).map((attachment) => attachment.url),
		components: message.components.map((component) => component.toJSON()),
	} satisfies Required<BaseMessageOptions>;
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
 * Disable all components in action rows, ignoring link buttons.
 *
 * @param rows The action rows to disable components in.
 * @returns The updated action rows with disabled components.
 */
export function disableComponents(
	rows: ActionRow<MessageActionRowComponent>[],
): APIActionRowComponent<APIMessageActionRowComponent>[] {
	return rows.map(({ components }) => ({
		components: components.map((component) => ({
			...component.data,

			disabled:
				component.type !== ComponentType.Button || component.style !== ButtonStyle.Link,
		})),

		type: ComponentType.ActionRow,
	}));
}
