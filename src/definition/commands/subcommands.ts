import {
	PermissionsBitField,
	type ChatInputCommandInteraction,
	ApplicationCommandType,
	type ApplicationCommandSubCommandData,
	ApplicationCommandOptionType,
} from "discord.js";
import { type CacheReducer } from "../../util.js";
import type { OptionsToType } from "./options.js";
import { commands, transformOptions } from "../commands.js";
import type { RootCommandData, RootCommandOptions } from "./root.js";
import type { BaseChatCommandData, BaseCommandKeys } from "../commands.js";

export function defineSubcommands<
	InGuild extends true,
	Options extends SubcommandOptions<InGuild> = {},
>(
	data: SubcommandData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<CacheReducer<InGuild>>,
		options: {
			[S in keyof Options]: { subcommand: S; options: OptionsToType<InGuild, Options[S]> };
		}[keyof Options],
	) => any,
): void;
export function defineSubcommands<
	InGuild extends false,
	Options extends SubcommandOptions<InGuild> = {},
>(
	data: SubcommandData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<CacheReducer<InGuild>>,
		options: {
			[S in keyof Options]: { subcommand: S; options: OptionsToType<InGuild, Options[S]> };
		}[keyof Options],
	) => any,
): void;
export function defineSubcommands(
	data: SubcommandData<boolean, SubcommandOptions<boolean>>,
	command: SubcommandHandler,
): void {
	if (commands[data.name])
		throw new ReferenceError("Command " + data.name + " has already been defined");

	commands[data.name] = {
		type: ApplicationCommandType.ChatInput,
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		...data,
		command,
		options: transformSubcommands(data.subcommands, { command: data.name }),
	};
}

export function transformSubcommands(
	subcommands: {
		[key: string]: Omit<
			RootCommandData<boolean, SubcommandOptions<boolean>[string]>,
			BaseCommandKeys
		>;
	},
	metadata: { command: string; subGroup?: string },
): ApplicationCommandSubCommandData[] {
	return Object.entries(subcommands).map(
		([subcommand, command]: [string, typeof subcommands[string]]) => ({
			name: subcommand,
			description: command.description,
			type: ApplicationCommandOptionType.Subcommand,
			options:
				command.options && transformOptions(command.options, { ...metadata, subcommand }),
		}),
	);
}

export type SubcommandHandler = (
	interaction: ChatInputCommandInteraction,
	options: { subcommand: string; options: OptionsToType<boolean, RootCommandOptions<boolean>> },
) => any;

export type SubcommandData<InGuild extends boolean, Options extends SubcommandOptions<boolean>> = {
	options?: never;
	subcommands: {
		[key in keyof Options]: Omit<RootCommandData<InGuild, Options[key]>, BaseCommandKeys>;
	};
} & BaseChatCommandData<InGuild> &
	AugmentedSubcommandData<InGuild, Options>;
export interface AugmentedSubcommandData<
	InGuild extends boolean,
	_Options extends SubcommandOptions<InGuild>,
> {}
export interface SubcommandOptions<InGuild extends boolean> {
	[SubcommandName: string]: RootCommandOptions<InGuild>;
}
