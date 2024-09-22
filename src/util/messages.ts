import {
	ButtonStyle,
	ComponentType,
	Message,
	type APIActionRowComponent,
	type APIEmbed,
	type APIMessageActionRowComponent,
	type ActionRow,
	type Attachment,
	type Collection,
	type EmojiIdentifierResolvable,
	type MessageActionRowComponent,
	type MessageEditOptions,
	type MessageReaction,
} from "discord.js";

export function unsignFiles(content: string): string {
	return content.replace(
		/https:\/\/(?:cdn|media)\.discordapp\.(?:net|com)\/attachments\/(?:[\w!#$&'()*+,./:;=?@~-]|%\d\d)+/gis,
		(match) => {
			const url = new URL(match);
			return url.origin + url.pathname;
		},
	);
}

export function isFileExpired(file: { url: string }): boolean {
	const expirey = new URL(file.url).searchParams.get("ex");
	return !!expirey && Number.parseInt(expirey, 16) * 1000 < Date.now();
}

export async function getFilesFromMessage(
	message: Message,
): Promise<Collection<string, Attachment>> {
	const expired = message.attachments.some(isFileExpired);
	if (!expired) return message.attachments;

	const fetched = await message.fetch(true);
	return fetched.attachments;
}

export async function getMessageJSON(message: Message): Promise<{
	components: APIActionRowComponent<APIMessageActionRowComponent>[];
	content: string;
	embeds: APIEmbed[];
	files: string[];
}> {
	return {
		components: message.components.map((component) => component.toJSON()),
		content: message.content,
		embeds: message.embeds.map((embed) => embed.toJSON()),
		files: (await getFilesFromMessage(message)).map((attachment) => attachment.url),
	} satisfies MessageEditOptions;
}

export async function reactAll(
	message: Message,
	reactions: Readonly<EmojiIdentifierResolvable[]>,
): Promise<MessageReaction[]> {
	const messageReactions = [];
	for (const reaction of reactions) {
		const messageReaction = await message.react(reaction).catch(() => void 0);
		if (messageReaction) messageReactions.push(messageReaction);
		else break;
	}
	return messageReactions;
}

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
