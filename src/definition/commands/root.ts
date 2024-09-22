import {
	PermissionsBitField,
	type ChatInputCommandInteraction,
	ApplicationCommandType,
} from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import { commands, transformOptions } from "../commands.js";
import type { Option, OptionsToType } from "./options.js";
import type { BaseChatCommandData } from "../commands.js";

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

export type RootCommandHandler<
	InGuild extends boolean = boolean,
	Options extends RootCommandOptions<InGuild> = RootCommandOptions<InGuild>,
> = (
	interaction: ChatInputCommandInteraction<GuildCacheReducer<InGuild>>,
	options: OptionsToType<InGuild, Options>,
) => any;

export type RootCommandData<
	InGuild extends boolean,
	Options extends RootCommandOptions<InGuild> = {},
> = { options?: Options; subcommands?: never } & BaseChatCommandData<InGuild> &
	AugmentedRootCommandData<InGuild, Options>;
export interface AugmentedRootCommandData<
	InGuild extends boolean,
	_Options extends RootCommandOptions<InGuild>,
> {}
export interface RootCommandOptions<InGuild extends boolean> {
	[OptionName: string]: Option<InGuild>;
}
