import type {
	ActionRowData,
	AnyThreadChannel,
	APIEmbedField,
	Awaitable,
	BaseMessageOptions,
	Channel,
	Message,
	MessageActionRowComponentData,
	User,
} from "discord.js";

import { ActionRow, ButtonStyle, ComponentType, GuildMember } from "discord.js";

import { footerSeperator, zeroWidthSpace } from "../util.js";
import { disableComponents } from "./messages.js";

export type PaginateOptions<Item, Mode extends User | false = User | false> = {
	/** The title of the embed. */
	title: string;
	/** The name of one item in the array. */
	singular: string;
	/** The name of multiple items in the array. Defaults to `singular + "s"`. */
	plural?: string;
	/** An error message to send if the array is empty. Defaults to `"No " + plural + " found!"`. */
	failMessage?: string;

	/**
	 * The user who instantiated the pagination menu, and the only person with control over its
	 * buttons. Omit to only show a single static page.
	 */
	user: Mode;
	/** The index of an item in the input array to jump to. */
	rawOffset?: number;
	/**
	 * Whether to underscore the item indicated by {@link PaginateOptions.rawOffset}. Defaults to
	 * `true`.
	 */
	highlightOffset?: boolean;
	/**
	 * Override the total count of items in the array and replace the numbered list with a bulleted
	 * list.
	 */
	totalCount?: number;
	/** The number of items to show on a page. Defaults to 20. */
	pageLength?: number;
	/** The number of columns to split the menu into. Defaults to 1 (no columns). */
	columns?: 1 | 2 | 3;

	/** The number of milliseconds the menu can be idle for before ending. */
	timeout: Mode extends false ? undefined : number;
	/** A member or user to format the embed around by setting the embed author field to them. */
	format?: GuildMember | User;
	/**
	 * The color to set the embed border to. Defaults to `format instanceof GuildMember ?
	 * format.displayColor : undefined`
	 */
	color?: number;

	/**
	 * An optional function to generate custom components given a page of items. Note that
	 * {@link paginate} does not offer any API to handle them, and it is recommended to use
	 * {@link defineButton}/{@link defineSelect}.
	 */
	generateComponents?(items: Item[]): Awaitable<MessageActionRowComponentData[] | undefined>;
	/**
	 * Where to place any generated custom components relative to the pagination arrows: above,
	 * below, or between. Note that when using `"between"`, there is a maximum of 3 buttons and no
	 * select menus, since the pagination buttons take up 2 slots. Defaults to `"above"`.
	 */
	customComponentLocation?: "above" | "below" | "between";
};
/**
 * Generate an incredibly customizable pagination menu for an array using embeds and buttons.
 *
 * @param array The array to paginate.
 * @param stringify A function to stringify each item in the array.
 * @param editReply A function to end the pagination message, and to update it as needed.
 * @param options Options to customize the pagination menu.
 * @returns A promise that resolves with the message data of the first page as soon as it is sent.
 *   Listeners are added to handle button clicks, but the promise resolves before they do anything,
 *   and they work in the background.
 */
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: BaseMessageOptions) => Awaitable<void> | Promise<Message>,
	options: PaginateOptions<Item>,
): Promise<BaseMessageOptions>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: BaseMessageOptions) => Awaitable<void>,
	options: PaginateOptions<Item, false>,
): Promise<BaseMessageOptions>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: BaseMessageOptions) => Promise<Message>,
	options: PaginateOptions<Item, User>,
): Promise<BaseMessageOptions>;
export async function paginate<Item>(
	array: Item[],
	stringify: (value: Item, index: number, array: Item[]) => Awaitable<string>,
	editReply: (options: BaseMessageOptions) => Awaitable<void> | Promise<Message>,
	{
		title,
		singular,
		plural = `${singular}s`,
		failMessage = `No ${plural} found!`,

		user,
		rawOffset,
		highlightOffset = true,
		totalCount,
		pageLength = 20,
		columns = 1,

		timeout = 0,
		format,
		color = format instanceof GuildMember ? format.displayColor : undefined,

		// eslint-disable-next-line @typescript-eslint/unbound-method
		generateComponents,
		customComponentLocation = "above",
	}: PaginateOptions<Item>,
): Promise<BaseMessageOptions> {
	if (!array.length) {
		await editReply({ content: failMessage });
		return { content: failMessage };
	}

	const pageCount = Math.ceil(array.length / pageLength);
	let offset = Math.floor((rawOffset ?? 0) / pageLength) * pageLength;
	async function generateMessage(): Promise<BaseMessageOptions> {
		const filtered = array.filter((_, index) => index >= offset && index < offset + pageLength);
		async function formatLine(current: Item, index: number): Promise<string> {
			const line = `${totalCount ? "-" : `${index + offset + 1}.`} ${await stringify(
				current,
				index,
				filtered,
			)}`;
			return highlightOffset && rawOffset === index + offset ? `__${line}__` : line;
		}

		const extraComponents = (generateComponents && (await generateComponents(filtered))) || [];
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
							...(customComponentLocation === "between" ? extraComponents : []),
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
			: extraComponents.length && customComponentLocation === "between" ?
				[{ type: ComponentType.ActionRow, components: extraComponents }]
			:	[];

		if (extraComponents.length && customComponentLocation !== "between")
			components[customComponentLocation === "above" ? "unshift" : "push"]({
				type: ComponentType.ActionRow,
				components: extraComponents,
			});

		const lines = await Promise.all(filtered.map(formatLine));
		const itemCount = totalCount ?? array.length;

		return {
			components,
			embeds: [
				{
					title,
					description: columns === 1 ? lines.join("\n") : "",
					fields: columns === 1 ? [] : columnize(lines, zeroWidthSpace, columns),

					footer: {
						text: `Page ${offset / pageLength + 1}/${pageCount}${
							footerSeperator
						}${itemCount.toLocaleString()} ${itemCount === 1 ? singular : plural}`,
					},

					author:
						format ?
							{
								icon_url: format.displayAvatarURL(),
								name:
									"displayName" in format ?
										format.displayName
									:	(format as User).username,
							}
						:	undefined,

					color,
				},
			],
		};
	}

	const firstReplyOptions = await generateMessage();
	const message = await editReply(firstReplyOptions);
	if (!user || !message || pageCount === 1) return firstReplyOptions;

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			buttonInteraction.message.id === message.id && buttonInteraction.user.id === user.id,
		idle: timeout,
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
				components:
					pagination instanceof ActionRow ?
						[...disableComponents([pagination]), ...rest]
					:	[],
			});
		});

	return firstReplyOptions;
}

/**
 * Return the parent channel of a possible thread channel, or the channel itself otherwise.
 *
 * @param channel The channel to get the base channel of.
 * @returns The base channel.
 */
export function getBaseChannel<Child extends Channel | null | undefined>(
	channel: Child,
): Child extends null ? undefined
: Child extends AnyThreadChannel ? NonNullable<Child["parent"]> | undefined
: Child {
	// @ts-expect-error TS2322
	return (channel && (channel.isThread() ? channel.parent : channel)) || undefined;
}

/**
 * Convert an array into columns using embed fields.
 *
 * @param array The data to columnize.
 * @param title The title of the columns.
 * @param count The number of columns to create.
 * @returns The columnized data in embed fields.
 */
export function columnize(
	array: string[],
	title: string = zeroWidthSpace,
	count: 1 | 2 | 3 = 2,
): APIEmbedField[] {
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
