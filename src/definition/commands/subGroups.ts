import {
	PermissionsBitField,
	type ChatInputCommandInteraction,
	ApplicationCommandType,
	ApplicationCommandOptionType,
} from "discord.js";
import type { CacheReducer } from "../../util.js";
import type { OptionsToType } from "./options.js";
import { commands } from "../commands.js";
import {
	transformSubcommands,
	type SubcommandData,
	type SubcommandOptions,
} from "./subcommands.js";
import type { BaseChatCommandData, BaseCommandKeys } from "../commands.js";
import type { RootCommandOptions } from "./root.js";

export function defineSubGroups<
	InGuild extends true,
	Options extends SubGroupsOptions<InGuild> = {},
>(
	data: SubGroupsData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<CacheReducer<InGuild>>,
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
		interaction: ChatInputCommandInteraction<CacheReducer<InGuild>>,
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
	if (commands[data.name])
		throw new ReferenceError("Command " + data.name + " has already been defined");

	commands[data.name] = {
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
	};
}

export type SubGroupsHandler = (
	interaction: ChatInputCommandInteraction,
	options: {
		subcommand: string;
		subGroup: string;
		options: OptionsToType<boolean, RootCommandOptions<boolean>>;
	},
) => any;

export type SubGroupsData<InGuild extends boolean, Options extends SubGroupsOptions<boolean>> = {
	options?: never;
	subcommands: {
		[key in keyof Options]: Omit<SubcommandData<InGuild, Options[key]>, BaseCommandKeys>;
	};
} & BaseChatCommandData<InGuild> &
	AugmentedSubGroupsData<InGuild, Options>;
export interface AugmentedSubGroupsData<
	InGuild extends boolean,
	_Options extends SubGroupsOptions<InGuild>,
> {}
export interface SubGroupsOptions<InGuild extends boolean> {
	[GroupName: string]: SubcommandOptions<InGuild>;
}
