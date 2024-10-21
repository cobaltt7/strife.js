import {
	PermissionsBitField,
	type ChatInputCommandInteraction,
	ApplicationCommandType,
	type ApplicationCommandSubCommandData,
	ApplicationCommandOptionType,
} from "discord.js";
import { type GuildCacheReducer } from "../../util.js";
import type { OptionsToType } from "./options.js";
import { commands, transformOptions } from "../commands.js";
import type { RootCommandData, RootCommandOptions } from "./root.js";
import type { BaseChatCommandData, BaseCommandKeys } from "../commands.js";

/**
 * Define subcommands.
 *
 * @param data Subcommands configuration data.
 * @param command The command handler.
 */
export function defineSubcommands<
	InGuild extends true,
	Options extends SubcommandOptions<InGuild> = {},
>(
	data: SubcommandData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
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
		interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
		options: {
			[S in keyof Options]: { subcommand: S; options: OptionsToType<InGuild, Options[S]> };
		}[keyof Options],
	) => any,
): void;
export function defineSubcommands(
	data: SubcommandData<boolean, SubcommandOptions<boolean>>,
	command: SubcommandHandler,
): void {
	const oldCommand = commands[data.name]?.[0];
	if (oldCommand && oldCommand.command !== command)
		throw new ReferenceError("Command " + data.name + " has already been defined");

	commands[data.name] ??= [];
	commands[data.name]?.push({
		type: ApplicationCommandType.ChatInput,
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		...data,
		command,
		options: transformSubcommands(data.subcommands, { command: data.name }),
	});
}

/** @internal */
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
		([subcommand, command]: [string, (typeof subcommands)[string]]) => ({
			name: subcommand,
			description: command.description,
			type: ApplicationCommandOptionType.Subcommand,
			options:
				command.options && transformOptions(command.options, { ...metadata, subcommand }),
		}),
	);
}

/** A subcommand handler. */
export type SubcommandHandler = (
	interaction: ChatInputCommandInteraction,
	options: { subcommand: string; options: OptionsToType<boolean, RootCommandOptions<boolean>> },
) => any;

/** Subcommand configuration data. */
export type SubcommandData<InGuild extends boolean, Options extends SubcommandOptions<InGuild>> = {
	options?: never;
	/**
	 * Key-value pair where the keys are subcommand names and the values are subcommand details. Subcommands must have
	 * `name`s and `description`s and may have `options`.
	 */
	subcommands: {
		[key in keyof Options]: Omit<RootCommandData<InGuild, Options[key]>, BaseCommandKeys>;
	};
} & BaseChatCommandData<InGuild> &
	AugmentedSubcommandData<InGuild, Options>;
/** Can be augmented to add custom subcommand properties (advanced usage) */
export interface AugmentedSubcommandData<
	InGuild extends boolean,
	_Options extends SubcommandOptions<InGuild>,
> {}
/** Options for subcommands. */
export interface SubcommandOptions<InGuild extends boolean> {
	[SubcommandName: string]: RootCommandOptions<InGuild>;
}
