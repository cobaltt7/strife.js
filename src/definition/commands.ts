import {
	ApplicationCommandType,
	PermissionsBitField,
	type ApplicationCommandOptionData,
	ChannelType,
	ApplicationCommandOptionType,
} from "discord.js";
import { type Snowflake } from "discord.js";
import { type RootCommandHandler } from "./commands/root.js";
import type { RootCommandData, RootCommandOptions } from "./commands/root.js";
import type { SubcommandHandler } from "./commands/subcommands.js";
import type { SubcommandData, SubcommandOptions } from "./commands/subcommands.js";
import type { SubGroupsHandler } from "./commands/subGroups.js";
import type { SubGroupsData, SubGroupsOptions } from "./commands/subGroups.js";
import type { MenuCommandHandler } from "./commands/menu.js";
import type { MenuCommandContext, MenuCommandData } from "./commands/menu.js";
import type { DEFAULT_GUILDS } from "../util.js";
import type { AutocompleteHandler, Option } from "./commands/options.js";

export const commands: Record<string, ApplicationCommandData[]> = {};
export const NoSubcommand = Symbol("no subcommand");
export const autocompleters: Record<
	string,
	{
		[key: string]: {
			[key: string]: { [key: string]: AutocompleteHandler<boolean> };
			[NoSubcommand]?: { [key: string]: AutocompleteHandler<boolean> };
		};
		[NoSubcommand]?: {
			[key: string]: { [key: string]: AutocompleteHandler<boolean> };
			[NoSubcommand]?: { [key: string]: AutocompleteHandler<boolean> };
		};
	}
> = {};
/**
 * Convert our custom options format to something the Discord API will accept.
 *
 * @param options - The options to convert.
 *
 * @returns The converted options.
 */
export function transformOptions(
	options: { [key: string]: Option<boolean> },
	metadata:
		| { command: string; subcommand?: string }
		| { command: string; subcommand: string; subGroup?: string },
) {
	return Object.entries(options)
		.map(([name, option]) => {
			const transformed = {
				name,
				description: option.description,
				type: option.type,
				required: option.required ?? false,
			} as any;

			if (option.autocomplete) {
				(((autocompleters[metadata.command] ??= {})[
					("subGroup" in metadata && metadata.subGroup) || NoSubcommand
				] ??= {})[metadata.subcommand || NoSubcommand] ??= {})[name] = option.autocomplete;

				transformed.autocomplete = true;
			}

			if (option.choices)
				transformed.choices = Object.entries(option.choices)
					.map(([choice, value]) => ({
						name: value,
						value: choice, // todo: oops
					}))
					.sort((one, two) => one.name.localeCompare(two.name));

			transformed.channelTypes = option.channelTypes ?? [
				ChannelType.GuildText,
				ChannelType.GuildVoice,
				ChannelType.GuildCategory,
				ChannelType.GuildAnnouncement,
				ChannelType.AnnouncementThread,
				ChannelType.PublicThread,
				ChannelType.PrivateThread,
				ChannelType.GuildStageVoice,
				ChannelType.GuildDirectory,
				ChannelType.GuildForum,
			];
			if (option.maxLength !== undefined) transformed.maxLength = option.maxLength;
			if (option.minLength !== undefined) transformed.minLength = option.minLength;

			if (option.maxValue !== undefined) transformed.maxValue = option.maxValue;
			if (option.minValue !== undefined) transformed.minValue = option.minValue;

			return transformed as Exclude<
				ApplicationCommandOptionData,
				{
					type:
						| ApplicationCommandOptionType.SubcommandGroup
						| ApplicationCommandOptionType.Subcommand;
				}
			>;
		})
		.sort((one, two) =>
			one.required === two.required
				? one.name.localeCompare(two.name)
				: one.required
				? -1
				: 1,
		);
}

export type ApplicationCommandData = {
	type: ApplicationCommandType;
	description: string;
	defaultMemberPermissions: PermissionsBitField | null;
	command: RootCommandHandler | SubcommandHandler | SubGroupsHandler | MenuCommandHandler;
	options?: ApplicationCommandOptionData[];
} & Omit<CommandData<boolean>, "description" | "type" | "options" | "defaultMemberPermissions">;

export type CommandData<InGuild extends boolean> =
	| MenuCommandData<InGuild, MenuCommandContext>
	| SubGroupsData<InGuild, SubGroupsOptions<InGuild>>
	| SubcommandData<InGuild, SubcommandOptions<InGuild>>
	| RootCommandData<InGuild, RootCommandOptions<InGuild>>;

export type BaseChatCommandData<InGuild extends boolean> = {
	description: string;
	type?: never;
} & BaseCommandData<InGuild> &
	AugmentedChatCommandData<InGuild>;
export interface AugmentedChatCommandData<_InGuild extends boolean> {}

export type BaseCommandData<InGuild extends boolean> = (InGuild extends true
	? BaseGuildCommandData
	: BaseGlobalCommandData) &
	AugmentedCommandData<InGuild>;
export interface AugmentedCommandData<_InGuild extends boolean> {}
export type BaseGuildCommandData = {
	name: string;
	restricted?: boolean;
} & (DefaultCommandAccess extends { inGuild: true }
	? { access?: false | Snowflake | (Snowflake | typeof DEFAULT_GUILDS)[] }
	: { access: false | Snowflake | (Snowflake | typeof DEFAULT_GUILDS)[] });
export type BaseGlobalCommandData = {
	name: string;
	restricted?: never;
} & (DefaultCommandAccess extends {
	inGuild: true;
}
	? { access: true }
	: { access?: true });
export type BaseCommandKeys = keyof BaseCommandData<boolean>;

export interface DefaultCommandAccess {}
