import type { Interaction } from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { BaseCommandData } from "../commands.js";

import { ApplicationCommandType, PermissionsBitField } from "discord.js";

import { commands } from "../commands.js";

/**
 * Define a menu command.
 *
 * @param data Menu command configuration data.
 * @param command The command handler.
 */
export function defineMenuCommand<
	InGuild extends true,
	Context extends MenuCommandContext = MenuCommandContext,
>(
	data: MenuCommandData<InGuild, Context>,
	command: (
		interaction: Extract<Interaction<GuildCacheReducer<InGuild>>, { commandType: Context }>,
	) => any,
): void;
export function defineMenuCommand<
	InGuild extends false,
	Context extends MenuCommandContext = MenuCommandContext,
>(
	data: MenuCommandData<InGuild, Context>,
	command: (
		interaction: Extract<Interaction<GuildCacheReducer<InGuild>>, { commandType: Context }>,
	) => any,
): void;
export function defineMenuCommand(
	data: MenuCommandData<boolean, MenuCommandContext>,
	command: MenuCommandHandler,
): void {
	const oldCommand = commands[data.name]?.[0];
	if (oldCommand && oldCommand.command !== command)
		throw new ReferenceError("Command " + data.name + " has already been defined");

	commands[data.name] ??= [];
	commands[data.name]?.push({
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		description: "",
		...data,
		command,
	});
}

/** A menu command handler. */
export type MenuCommandHandler = (
	interaction: Extract<Interaction, { commandType: MenuCommandContext }>,
) => any;

/** Menu command configuration data. */
export type MenuCommandData<InGuild extends boolean, Context extends MenuCommandContext> = {
	description?: never;
	type: Context;
	options?: never;
	subcommands?: never;
} & BaseCommandData<InGuild> &
	AugmentedMenuCommandData<InGuild, Context>;
/** Can be augmented to add custom menu command properties (advanced usage) */
export interface AugmentedMenuCommandData<
	_InGuild extends boolean,
	_Context extends MenuCommandContext,
> {}

/** The possible types of menu commands. */
export type MenuCommandContext = ApplicationCommandType.Message | ApplicationCommandType.User;
