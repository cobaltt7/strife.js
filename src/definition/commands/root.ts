import type { ChatInputCommandInteraction } from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { BaseChatCommandData } from "../commands.js";
import type { Option, OptionsToType } from "./options.js";

import { ApplicationCommandType, PermissionsBitField } from "discord.js";

import { commands, transformOptions } from "../commands.js";

/**
 * Define a single-level chat command.
 *
 * @param data Chat command configuration data.
 * @param command The command handler.
 */
export function defineChatCommand<
	InGuild extends true,
	Options extends RootCommandOptions<InGuild> = {},
>(data: RootCommandData<InGuild, Options>, command: RootCommandHandler<InGuild, Options>): void;
export function defineChatCommand<
	InGuild extends false,
	Options extends RootCommandOptions<InGuild> = {},
>(data: RootCommandData<InGuild, Options>, command: RootCommandHandler<InGuild, Options>): void;
export function defineChatCommand(
	data: RootCommandData<boolean, RootCommandOptions<boolean>>,
	command: RootCommandHandler,
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
		options: data.options && transformOptions(data.options, { command: data.name }),
	});
}

/** A single-level chat command handler. */
export type RootCommandHandler<
	InGuild extends boolean = boolean,
	Options extends RootCommandOptions<InGuild> = RootCommandOptions<InGuild>,
> = (
	interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
	options: OptionsToType<InGuild, Options>,
) => any;

/** Single-level chat command configuration data. */
export type RootCommandData<
	InGuild extends boolean,
	Options extends RootCommandOptions<InGuild> = {},
> = {
	subcommands?: never;
	/** Key-value pair where the keys are option names and the values are option details. */
	options?: Options;
} & BaseChatCommandData<InGuild> &
	AugmentedRootCommandData<InGuild, Options>;
/** Can be augmented to add custom single-level chat command properties (advanced usage) */
export interface AugmentedRootCommandData<
	InGuild extends boolean,
	_Options extends RootCommandOptions<InGuild>,
> {}

/** Options for a single-level chat command. */
export interface RootCommandOptions<InGuild extends boolean> {
	[OptionName: string]: Option<InGuild>;
}
