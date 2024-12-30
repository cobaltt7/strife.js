import type { Awaitable, ChatInputCommandInteraction } from "discord.js";
import type { AugmentedRootCommandData } from "../../deprecated.js";
import type { GuildCacheReducer } from "../../util.js";
import type { BaseChatCommandData } from "../commands.js";
import type { CommandOption, OptionsToType } from "./options.js";

import { ApplicationCommandType, PermissionsBitField } from "discord.js";

import { commands } from "../commands.js";
import { transformOptions } from "./options.js";

/**
 * Define a single-level chat command.
 *
 * @param data Chat command configuration data.
 * @param handler The command handler.
 */
export function defineChatCommand<
	InGuild extends true,
	Options extends FlatCommandOptions<InGuild> = Record<string, never>,
>(data: FlatCommandData<InGuild, Options>, handler: FlatCommandHandler<InGuild, Options>): void;
export function defineChatCommand<
	InGuild extends false,
	Options extends FlatCommandOptions<InGuild> = Record<string, never>,
>(data: FlatCommandData<InGuild, Options>, handler: FlatCommandHandler<InGuild, Options>): void;
export function defineChatCommand(
	data: FlatCommandData<boolean, FlatCommandOptions<boolean>>,
	handler: FlatCommandHandler,
): void {
	const oldCommand = commands[data.name]?.[0];
	if (oldCommand && oldCommand.command !== handler)
		throw new ReferenceError(`Command ${data.name} has already been defined`);

	commands[data.name] ??= [];
	commands[data.name]?.push({
		type: ApplicationCommandType.ChatInput,
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		...data,
		command: handler,
		options: data.options && transformOptions(data.options, { command: data.name }),
	});
}

/** Single-level chat command configuration data. */
export type FlatCommandData<
	InGuild extends boolean,
	Options extends FlatCommandOptions<InGuild> = Record<string, never>,
> = {
	subcommands?: never;
	/** Key-value pair where the keys are option names and the values are option details. */
	options?: Options;
} & BaseChatCommandData<InGuild> &
	AugmentedFlatCommandData<InGuild, Options> &
	AugmentedRootCommandData<InGuild, Options>;
/** Options for a single-level chat command. */
export type FlatCommandOptions<InGuild extends boolean> = Record<string, CommandOption<InGuild>>;

/** A single-level chat command handler. */
export type FlatCommandHandler<
	InGuild extends boolean = boolean,
	Options extends FlatCommandOptions<InGuild> = FlatCommandOptions<InGuild>,
> = (
	interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
	options: OptionsToType<InGuild, Options>,
) => Awaitable<unknown>;

/** Can be augmented to add custom single-level chat command properties (advanced usage) */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AugmentedFlatCommandData<
	InGuild extends boolean,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_Options extends FlatCommandOptions<InGuild>,
> {}
