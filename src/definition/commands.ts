import type { ApplicationCommandOptionData, Snowflake } from "discord.js";
import type { LoginOptions } from "../client.ts";
import type { DEFAULT_GUILDS } from "../util.ts";
import type { MenuCommandContext, MenuCommandData, MenuCommandHandler } from "./commands/menu.ts";
import type { AutocompleteHandler, Option } from "./commands/options.ts";
import type { RootCommandData, RootCommandOptions } from "./commands/root.ts";
import type {
	SubcommandData,
	SubcommandHandler,
	SubcommandOptions,
} from "./commands/subcommands.ts";
import type { SubGroupsData, SubGroupsHandler, SubGroupsOptions } from "./commands/subGroups.ts";

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	PermissionsBitField,
} from "discord.js";

import { type RootCommandHandler } from "./commands/root.ts";

/** An object containing all registered commands. */
export const commands: Record<string, ApplicationCommandData[]> = {};

/** Placeholder used in {@link autocompleters} when there is no subgroup or subcommand to index by. */
export const NoSubcommand = Symbol("no subcommand");
/**
 * An object containing all registered autocomplete handlers, indexed by the command, subgroup, subcommand, and option.
 * If there is no subgroup or subcommand, {@link NoSubcommand} is used as a placeholder.
 */
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

/** @internal */
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
					.map(([value, name]) => ({ value, name }))
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
			one.required === two.required ? one.name.localeCompare(two.name)
			: one.required ? -1
			: 1,
		);
}

/** The application command data stored internally. */
export type ApplicationCommandData = {
	type:
		| ApplicationCommandType.ChatInput
		| ApplicationCommandType.Message
		| ApplicationCommandType.User;
	description: string;
	defaultMemberPermissions: PermissionsBitField | null;
	command: RootCommandHandler | SubcommandHandler | SubGroupsHandler | MenuCommandHandler;
	options?: ApplicationCommandOptionData[];
} & Omit<CommandData<boolean>, "description" | "type" | "options" | "defaultMemberPermissions">;

/** Any command configuration data that can be passed to a `defineXYZ()` function. */
export type CommandData<InGuild extends boolean> =
	| MenuCommandData<InGuild, MenuCommandContext>
	| SubGroupsData<InGuild, SubGroupsOptions<InGuild>>
	| SubcommandData<InGuild, SubcommandOptions<InGuild>>
	| RootCommandData<InGuild, RootCommandOptions<InGuild>>;

/** Base chat command configuration data. */
export type BaseChatCommandData<InGuild extends boolean> = {
	description: string;
	type?: never;
} & BaseCommandData<InGuild> &
	AugmentedChatCommandData<InGuild>;
/** Can be augmented to add custom chat command properties (advanced usage) */
export interface AugmentedChatCommandData<_InGuild extends boolean> {}

/** Base command configuration data. */
export type BaseCommandData<InGuild extends boolean> = (InGuild extends true ? BaseGuildCommandData
:	BaseGlobalCommandData) &
	AugmentedCommandData<InGuild>;
/** Can be augmented to add custom command properties (advanced usage) */
export interface AugmentedCommandData<_InGuild extends boolean> {}
/** Properties allowed in any command confuguration data. */
export type BaseCommandKeys = keyof BaseCommandData<boolean>;

/** Base guild command configuration data. */
export type BaseGuildCommandData = {
	name: string;
	/**
	 * Whether to deny members permission to use the command, and require guild admins to explicitly set permissions via
	 * `Server Settings` -> `Integrations`.
	 */
	restricted?: boolean;
} & (DefaultCommandAccess extends { inGuild: true } ?
	{ access?: false | Snowflake | (Snowflake | typeof DEFAULT_GUILDS)[] }
:	{ access: false | Snowflake | (Snowflake | typeof DEFAULT_GUILDS)[] });
/** Base global command configuration data. */
export type BaseGlobalCommandData = {
	name: string;
	restricted?: never;
} & (DefaultCommandAccess extends { inGuild: true } ? { access: true } : { access?: true });
/**
 * Augment this interface when changing {@link LoginOptions.defaultCommandAccess}.
 *
 * @property {boolean} inGuild Whether or not commands are restricted to guilds-only by default. Defaults to `false`.
 */
export interface DefaultCommandAccess {}
