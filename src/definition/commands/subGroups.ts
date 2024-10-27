import type { ChatInputCommandInteraction } from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { BaseChatCommandData, BaseCommandKeys } from "../commands.js";
import type { OptionsToType } from "./options.js";
import type { RootCommandOptions } from "./root.js";
import type { SubcommandData, SubcommandOptions } from "./subcommands.js";

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionsBitField,
} from "discord.js";

import { commands } from "../commands.js";
import { transformSubcommands } from "./subcommands.js";

/**
 * Define commands in sub groups.
 *
 * @param data Sub group configuration data.
 * @param command The command handler.
 */
export function defineSubGroups<
	InGuild extends true,
	Options extends SubGroupsOptions<InGuild> = {},
>(
	data: SubGroupsData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
		options: {
			[G in keyof Options]: {
				[S in keyof Options[G]]: {
					subcommand: S;
					subGroup: G;
					options: OptionsToType<InGuild, Options[G][S]>;
				};
			}[keyof Options[G]];
		}[keyof Options],
	) => any,
): void;
export function defineSubGroups<
	InGuild extends false,
	Options extends SubGroupsOptions<InGuild> = {},
>(
	data: SubGroupsData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
		options: {
			[G in keyof Options]: {
				[S in keyof Options[G]]: {
					subcommand: S;
					subGroup: G;
					options: OptionsToType<InGuild, Options[G][S]>;
				};
			}[keyof Options[G]];
		}[keyof Options],
	) => any,
): void;
export function defineSubGroups(
	data: SubGroupsData<boolean, SubGroupsOptions<boolean>>,
	command: SubGroupsHandler,
): void {
	const oldCommand = commands[data.name]?.[0];
	if (oldCommand && oldCommand.command !== command)
		throw new ReferenceError("Command " + data.name + " has already been defined");

	commands[data.name] ??= [];
	commands[data.name]?.push({
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		...data,
		type: ApplicationCommandType.ChatInput,
		command,
		options: Object.entries(data.subcommands).map(
			([subcommand, command]: [
				string,
				Omit<SubcommandData<boolean, SubGroupsOptions<boolean>[string]>, BaseCommandKeys>,
			]) => ({
				name: subcommand,
				description: command.description,
				type: ApplicationCommandOptionType.SubcommandGroup,
				options: transformSubcommands(command.subcommands, {
					command: data.name,
					subGroup: subcommand,
				}),
			}),
		),
	});
}

/** A subgroup command handler. */
export type SubGroupsHandler = (
	interaction: ChatInputCommandInteraction,
	options: {
		subcommand: string;
		subGroup: string;
		options: OptionsToType<boolean, RootCommandOptions<boolean>>;
	},
) => any;

/** Subgroup command configuration data. */
export type SubGroupsData<InGuild extends boolean, Options extends SubGroupsOptions<InGuild>> = {
	options?: never;
	/**
	 * Key-value pair where the keys are subgroup names and the values are subgroup details. Subgroups must have
	 * `name`s, `description`s, and `subcommands`.
	 */
	subcommands: {
		[key in keyof Options]: Omit<SubcommandData<InGuild, Options[key]>, BaseCommandKeys>;
	};
} & BaseChatCommandData<InGuild> &
	AugmentedSubGroupsData<InGuild, Options>;
/** Can be augmented to add custom subgroup command properties (advanced usage) */
export interface AugmentedSubGroupsData<
	InGuild extends boolean,
	_Options extends SubGroupsOptions<InGuild>,
> {}

/** Options for a subgroup command. */
export interface SubGroupsOptions<InGuild extends boolean> {
	[GroupName: string]: SubcommandOptions<InGuild>;
}
