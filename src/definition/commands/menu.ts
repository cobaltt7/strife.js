import type { ApplicationCommandType, Awaitable, Interaction } from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { BaseCommandData } from "../commands.js";

import { PermissionsBitField } from "discord.js";

import { commands } from "../commands.js";

/**
 * Define a menu command.
 *
 * @param data Menu command configuration data.
 * @param handler The command handler.
 */
export function defineMenuCommand<
	InGuild extends true,
	Context extends MenuCommandContext = MenuCommandContext,
>(
	data: MenuCommandData<InGuild, Context>,
	handler: (
		interaction: Extract<Interaction<GuildCacheReducer<InGuild>>, { commandType: Context }>,
	) => Awaitable<unknown>,
): void;
export function defineMenuCommand<
	InGuild extends false,
	Context extends MenuCommandContext = MenuCommandContext,
>(
	data: MenuCommandData<InGuild, Context>,
	handler: (
		interaction: Extract<Interaction<GuildCacheReducer<InGuild>>, { commandType: Context }>,
	) => Awaitable<unknown>,
): void;
export function defineMenuCommand(
	data: MenuCommandData<boolean, MenuCommandContext>,
	handler: MenuCommandHandler,
): void {
	const oldCommand = commands[data.name]?.[0];
	if (oldCommand && oldCommand.command !== handler)
		throw new ReferenceError(`Command ${data.name} has already been defined`);

	commands[data.name] ??= [];
	commands[data.name]?.push({
		defaultMemberPermissions: data.restricted ? new PermissionsBitField() : null,
		description: "",
		...data,
		command: handler,
	});
}

/** Menu command configuration data. */
export type MenuCommandData<InGuild extends boolean, Context extends MenuCommandContext> = {
	description?: never;
	type: Context;
	options?: never;
	subcommands?: never;
} & BaseCommandData<InGuild> &
	AugmentedMenuCommandData<InGuild, Context>;
/** The possible types of menu commands. */
export type MenuCommandContext = ApplicationCommandType.Message | ApplicationCommandType.User;
/** A menu command handler. */
export type MenuCommandHandler = (
	interaction: Extract<Interaction, { commandType: MenuCommandContext }>,
) => Awaitable<unknown>;
/** Can be augmented to add custom menu command properties (advanced usage) */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AugmentedMenuCommandData<
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_InGuild extends boolean,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_Context extends MenuCommandContext,
> {}
