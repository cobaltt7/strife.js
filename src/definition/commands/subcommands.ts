import type { Awaitable, ChatInputCommandInteraction } from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { BaseChatCommandData, BaseCommandKeys } from "../commands.js";
import type { FlatCommandData, FlatCommandOptions } from "./flat.js";
import type { OptionsToType } from "./options.js";

import { ApplicationCommandType, PermissionsBitField } from "discord.js";

import { commands, transformSubcommands } from "../commands.js";

/**
 * Define subcommands.
 *
 * @param data Subcommands configuration data.
 * @param command The command handler.
 */
export function defineSubcommands<
	InGuild extends true,
	Options extends SubcommandOptions<InGuild> = Record<string, never>,
>(
	data: SubcommandData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
		options: {
			[S in keyof Options]: { subcommand: S; options: OptionsToType<InGuild, Options[S]> };
		}[keyof Options],
	) => Awaitable<unknown>,
): void;
export function defineSubcommands<
	InGuild extends false,
	Options extends SubcommandOptions<InGuild> = Record<string, never>,
>(
	data: SubcommandData<InGuild, Options>,
	command: (
		interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
		options: {
			[S in keyof Options]: { subcommand: S; options: OptionsToType<InGuild, Options[S]> };
		}[keyof Options],
	) => Awaitable<unknown>,
): void;
export function defineSubcommands(
	data: SubcommandData<boolean, SubcommandOptions<boolean>>,
	command: SubcommandHandler,
): void {
	const oldCommand = commands[data.name]?.[0];
	if (oldCommand && oldCommand.command !== command)
		throw new ReferenceError(`Command ${data.name} has already been defined`);

	commands[data.name] ??= [];
	commands[data.name]?.push({
		type: ApplicationCommandType.ChatInput,
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		...data,
		command,
		options: transformSubcommands(data.subcommands, { command: data.name }),
	});
}

/** Subcommand configuration data. */
export type SubcommandData<InGuild extends boolean, Options extends SubcommandOptions<InGuild>> = {
	options?: never;
	/**
	 * Key-value pair where the keys are subcommand names and the values are subcommand details. In order for the
	 * handler to be correctly typed, all subcommands must have {@link FlatCommandData.options} set, even if just to an
	 * empty object.
	 */
	subcommands: {
		[key in keyof Options]: Omit<FlatCommandData<InGuild, Options[key]>, BaseCommandKeys>;
	};
} & BaseChatCommandData<InGuild> &
	AugmentedSubcommandData<InGuild, Options>;
/** Options for subcommands. */
export type SubcommandOptions<InGuild extends boolean> = Record<
	string,
	FlatCommandOptions<InGuild>
>;
/** A subcommand handler. */
export type SubcommandHandler = (
	interaction: ChatInputCommandInteraction,
	options: { subcommand: string; options: OptionsToType<boolean, FlatCommandOptions<boolean>> },
) => Awaitable<unknown>;
/** Can be augmented to add custom subcommand properties (advanced usage) */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AugmentedSubcommandData<
	InGuild extends boolean,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_Options extends SubcommandOptions<InGuild>,
> {}
