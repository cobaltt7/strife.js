import { PermissionsBitField, type Interaction, ApplicationCommandType } from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import { commands } from "../commands.js";
import type { BaseCommandData } from "../commands.js";

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
	command: (interaction: Extract<Interaction, { commandType: MenuCommandContext }>) => any,
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

export type MenuCommandHandler = (
	interaction: Extract<Interaction, { commandType: MenuCommandContext }>,
) => any;

export type MenuCommandData<InGuild extends boolean, Context extends MenuCommandContext> = {
	description?: never;
	type: Context;
	options?: never;
	subcommands?: never;
} & BaseCommandData<InGuild> &
	AugmentedMenuCommandData<InGuild, Context>;

export interface AugmentedMenuCommandData<
	_InGuild extends boolean,
	_Context extends MenuCommandContext,
> {}
export type MenuCommandContext = (typeof ApplicationCommandType)["Message" | "User"];
