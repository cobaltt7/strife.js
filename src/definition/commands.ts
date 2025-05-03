import type {
	ApplicationCommandOptionData,
	ApplicationCommandSubCommandData,
	ApplicationCommandType,
	PermissionsBitField,
	Snowflake,
} from "discord.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { LoginOptions } from "../client.js";
import type { DEFAULT_GUILDS } from "../util.js";
import type { FlatCommandData, FlatCommandHandler, FlatCommandOptions } from "./commands/flat.js";
import type { MenuCommandContext, MenuCommandData, MenuCommandHandler } from "./commands/menu.js";
import type { SubGroupsData, SubGroupsHandler, SubGroupsOptions } from "./commands/sub-groups.js";
import type {
	SubcommandData,
	SubcommandHandler,
	SubcommandOptions,
} from "./commands/subcommands.js";

import { ApplicationCommandOptionType } from "discord.js";

import { transformOptions } from "./commands/options.js";

/** An object containing all registered commands. */
export const commands: Record<string, ApplicationCommandData[]> = {};
/** The application command data stored internally. */
export type ApplicationCommandData = {
	type:
		| ApplicationCommandType.ChatInput
		| ApplicationCommandType.Message
		| ApplicationCommandType.User;
	description: string;
	defaultMemberPermissions: PermissionsBitField | null;
	command: FlatCommandHandler | SubcommandHandler | SubGroupsHandler | MenuCommandHandler;
	options?: ApplicationCommandOptionData[];
} & Omit<CommandData<boolean>, "description" | "type" | "options" | "defaultMemberPermissions">;

/** Any command configuration data that can be passed to a `defineXYZ()` function. */
export type CommandData<InGuild extends boolean> =
	| MenuCommandData<InGuild, MenuCommandContext>
	| SubGroupsData<InGuild, SubGroupsOptions<InGuild>>
	| SubcommandData<InGuild, SubcommandOptions<InGuild>>
	| FlatCommandData<InGuild, FlatCommandOptions<InGuild>>;

/** Base command configuration data. */
export type BaseCommandData<InGuild extends boolean> = (InGuild extends true ? BaseGuildCommandData
:	BaseGlobalCommandData)
	& AugmentedCommandData<InGuild>;
/** Can be augmented to add custom command properties (advanced usage) */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
export interface AugmentedCommandData<_InGuild extends boolean> {}

/** Properties allowed in any command confuguration data. */
export type BaseCommandKeys = keyof BaseCommandData<boolean>;

/** Base guild command configuration data. */
export type BaseGuildCommandData = {
	name: string;
	/**
	 * Whether to deny members permission to use the command, and require guild admins to explicitly
	 * set permissions via `Server Settings` -> `Integrations`.
	 */
	restricted?: boolean;
} & (DefaultCommandAccess extends { inGuild: true } ?
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	{ access?: false | Snowflake | (Snowflake | typeof DEFAULT_GUILDS)[] }
:	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	{ access: false | Snowflake | (Snowflake | typeof DEFAULT_GUILDS)[] });
/** Base global command configuration data. */
export type BaseGlobalCommandData = {
	name: string;
	restricted?: never;
} & (DefaultCommandAccess extends { inGuild: true } ? { access: true } : { access?: true });
/**
 * By default, commands are allowed in all guilds plus DMs.
 *
 * To change this behavior, you can set {@link LoginOptions.defaultCommandAccess} when logging in.
 * When using TypeScript, it is necessary to augment the `DefaultCommandAccess` interface when
 * changing this.
 *
 * @property {boolean} inGuild Whether or not commands are restricted to guilds-only by default.
 *   Defaults to `false`.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface DefaultCommandAccess {}

/** Base chat command configuration data. */
export type BaseChatCommandData<InGuild extends boolean> = {
	description: string;
	type?: never;
} & BaseCommandData<InGuild>
	& AugmentedChatCommandData<InGuild>;
/** Can be augmented to add custom chat command properties (advanced usage) */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
export interface AugmentedChatCommandData<_InGuild extends boolean> {}

/** @internal */
export function transformSubcommands(
	subcommands: Record<
		string,
		Omit<FlatCommandData<boolean, SubcommandOptions<boolean>[string]>, BaseCommandKeys>
	>,
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
