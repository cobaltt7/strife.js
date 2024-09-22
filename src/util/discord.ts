import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	Message,
	type APIEmbedField,
	type ActionRowData,
	type AnyThreadChannel,
	type Awaitable,
	type Channel,
	type InteractionReplyOptions,
	type MessageActionRowComponentData,
	type User,
} from "discord.js";
import { zeroWidthSpace, footerSeperator } from "../util.js";
import { disableComponents } from "./messages.js";

type PaginateOptions<Item, U extends User | false = User | false> = {
	title: string;
	singular: string;
	plural?: string;
	failMessage?: string;

	user: U;
	rawOffset?: number;
	highlightOffset?: boolean;
	totalCount?: number;
	pageLength?: number;
	columns?: 1 | 2 | 3;

	timeout: number;
	format?: GuildMember | User;
	color?: number;

	generateComponents?(items: Item[]): Awaitable<MessageActionRowComponentData[] | undefined>;
	customComponentLocation?: "above" | "below";
};
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Awaitable<void> | Promise<Message>,
	options: PaginateOptions<Item>,
): Promise<InteractionReplyOptions | undefined>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Awaitable<void>,
	options: PaginateOptions<Item, false>,
): Promise<InteractionReplyOptions>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Promise<Message>,
	options: PaginateOptions<Item, User>,
): Promise<undefined>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: InteractionReplyOptions) => Awaitable<void> | Promise<Message>,
	{
		title,
		singular,
		plural = `${singular}s`,
		failMessage = `No ${plural} found! Try changing any filters you may have used.`,

		user,
		rawOffset,
		highlightOffset = true,
		totalCount,
		pageLength = 20,
		columns = 1,

		timeout,
		format,
		color = format instanceof GuildMember ? format.displayColor : undefined,

		generateComponents,
		customComponentLocation = "above",
	}: PaginateOptions<Item>,
): Promise<InteractionReplyOptions | undefined> {
	if (!array.length) {
		await editReply({ content: failMessage });
		return user ? undefined : { content: failMessage };
	}

	const pageCount = Math.ceil(array.length / pageLength);
	let offset = Math.floor((rawOffset ?? 0) / pageLength) * pageLength;
	async function generateMessage(): Promise<InteractionReplyOptions> {
		const filtered = array.filter((_, index) => index >= offset && index < offset + pageLength);
		async function formatLine(current: Item, index: number): Promise<string> {
			const line = `${totalCount ? "-" : `${index + 1}.`} ${await stringify(
				current,
				index,
				filtered,
			)}`;
			return highlightOffset && rawOffset === index + offset ? `__${line}__` : line;
		}

		const components: ActionRowData<MessageActionRowComponentData>[] =
			pageCount > 1 && user ?
				[
					{
						type: ComponentType.ActionRow,

						components: [
							{
								type: ComponentType.Button,
								label: "<< Previous",
								style: ButtonStyle.Primary,
								disabled: offset < 1,
								customId: "previous",
							},
							{
								type: ComponentType.Button,
								label: "Next >>",
								style: ButtonStyle.Primary,
								disabled: offset + pageLength >= array.length,
								customId: "next",
							},
						],
					},
				]
			:	[];

		if (generateComponents) {
			const extraComponents = await generateComponents(filtered);
			if (extraComponents?.length)
				components[customComponentLocation === "above" ? "unshift" : "push"]({
					type: ComponentType.ActionRow,
					components: extraComponents,
				});
		}

		const lines = await Promise.all(filtered.map(formatLine));
		const itemCount = totalCount ?? array.length;

		return {
			components,
			embeds: [
				{
					title,
					description: columns === 1 ? lines.join("\n") : "",
					fields: columns === 1 ? [] : columnize(zeroWidthSpace, lines, columns),

					footer: {
						text: `Page ${offset / pageLength + 1}/${pageCount}${footerSeperator}${itemCount.toLocaleString()} ${itemCount === 1 ? singular : plural}`,
					},

					author:
						format ?
							{ icon_url: format.displayAvatarURL(), name: format.displayName }
						:	undefined,

					color,
				},
			],
		};
	}

	const firstReplyOptions = await generateMessage();
	const message = await editReply(firstReplyOptions);
	if (!user || !message) return firstReplyOptions;
	if (pageCount === 1) return;

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			buttonInteraction.message.id === message.id && buttonInteraction.user.id === user.id,

		idle: timeout === 0 ? undefined : timeout,
		time: message.flags.has("Ephemeral") ? (14 * 60 + 50) * 1000 : undefined,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === "next") offset += pageLength;
			else if (buttonInteraction.customId === "previous") offset -= pageLength;
			else return;

			await buttonInteraction.deferUpdate();
			await editReply(await generateMessage());
		})
		.on("end", async () => {
			const [pagination, ...rest] = message.components;
			await editReply({
				components: pagination ? [...disableComponents([pagination]), ...rest] : [],
			});
		});
}

export function getBaseChannel<TChannel extends Channel | null | undefined>(
	channel: TChannel,
): TChannel extends null ? undefined
: TChannel extends AnyThreadChannel ? NonNullable<TChannel["parent"]> | undefined
: TChannel {
	// @ts-expect-error TS2322
	return (channel && (channel.isThread() ? channel.parent : channel)) || undefined;
}

export function columnize(title: string, array: string[], count: 1 | 2 | 3 = 2): APIEmbedField[] {
	const size = Math.ceil(array.length / count);
	return Array.from({ length: count }, (_, index) => {
		const start = index * size;
		return {
			name: index === 0 ? title : zeroWidthSpace,
			value: array.slice(start, start + size).join("\n"),
			inline: true,
		};
	});
}
