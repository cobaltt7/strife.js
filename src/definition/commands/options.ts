import type {
	ApplicationCommandOptionAllowedChannelTypes,
	ApplicationCommandOptionChoiceData,
	ApplicationCommandOptionData,
	Attachment,
	AutocompleteInteraction,
	GuildBasedChannel,
	GuildMember,
	Role,
	User,
} from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { FlatCommandOptions } from "./flat.js";

import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import * as discord from "discord.js";

/** An option. */
export type CommandOption<InGuild extends boolean> =
	| BasicOption
	| NumericalOption
	| ChannelOption
	| StringOption<InGuild>
	| StringChoicesOption;

/** A base option. */
export type BaseOption = { description: string; required?: boolean };

/**
 * A basic option that doesn't allow for further configuration.
 *
 * - {@link ApplicationCommandOptionType.Attachment}
 * - {@link ApplicationCommandOptionType.Boolean}
 * - {@link ApplicationCommandOptionType.Mentionable}
 * - {@link ApplicationCommandOptionType.Role}
 * - {@link ApplicationCommandOptionType.User}
 */
export type BasicOption = {
	type:
		| ApplicationCommandOptionType.Attachment
		| ApplicationCommandOptionType.Boolean
		| ApplicationCommandOptionType.Mentionable
		| ApplicationCommandOptionType.Role
		| ApplicationCommandOptionType.User;
	choices?: never;
	channelTypes?: never;
	minValue?: never;
	maxValue?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
} & BaseOption;

/**
 * A numerical option.
 *
 * - {@link ApplicationCommandOptionType.Integer}
 * - {@link ApplicationCommandOptionType.Number}
 */
export type NumericalOption = {
	type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;
	/** Define a lower bound for this option. Defaults to the Discord default of `-2 ** 53`. */
	minValue?: number;
	/** Define a upper bound for this option. Defaults to the Discord default of `2 ** 53`. */
	maxValue?: number;
	choices?: never;
	channelTypes?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
} & BaseOption;

/** A {@link ApplicationCommandOptionType.Channel channel} option. */
export type ChannelOption = {
	type: ApplicationCommandOptionType.Channel;
	/** Define allowed channel types for this option. Defaults to all supported guild channel types. */
	channelTypes?: ApplicationCommandOptionAllowedChannelTypes[];
	choices?: never;
	minValue?: never;
	maxValue?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
} & BaseOption;

/** A base {@link ApplicationCommandOptionType.String string} option. */
export type BaseStringOption = {
	type: ApplicationCommandOptionType.String;
	channelTypes?: never;
	minValue?: never;
	maxValue?: never;
} & BaseOption;
/** A {@link ApplicationCommandOptionType.String string} option. */
export type StringOption<InGuild extends boolean> = {
	/** Define a lower bound for this option's length. Defaults to the Discord default of `0`. */
	minLength?: number;
	/** Define a upper bound for this option's length. Defaults to the Discord default of `6_000`. */
	maxLength?: number;
	/**
	 * Define a callback to give users dynamic choices.
	 *
	 * In the callback, use {@link CommandInteractionOptionResolver.getFocused()} to get the value of
	 * the option so far. You can also use
	 * {@link CommandInteractionOptionResolver.getBoolean() .getBoolean()},
	 * {@link CommandInteractionOptionResolver.getInteger() .getInteger()},
	 * {@link CommandInteractionOptionResolver.getNumber() .getNumber()}, and
	 * {@link CommandInteractionOptionResolver.getString() .getString()}. Other option-getters will
	 * not work, use {@link CommandInteractionOptionResolver.get() .get()} instead. Return an array
	 * of choice objects. It will be truncated to fit the 25-item limit automatically.
	 *
	 * Note that Discord does not require users to select values from the options, so handle values
	 * appropriately.
	 */
	autocomplete?: AutocompleteHandler<InGuild>;
	choices?: never;
} & BaseStringOption;
/** A {@link ApplicationCommandOptionType.String string} option with specified preset choices. */
export type StringChoicesOption = {
	/**
	 * Require users to pick values from a predefined list. The keys are the values passed to your
	 * bot and the values are the descriptions displayed to the users.
	 */
	choices: Record<string, string>;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
} & BaseStringOption;

/** An autocomplete handler. */
export type AutocompleteHandler<InGuild extends boolean> = (
	interaction: AutocompleteInteraction<GuildCacheReducer<InGuild>>,
) => ApplicationCommandOptionChoiceData<string>[];
/**
 * An object containing all registered autocomplete handlers, indexed by the command, subgroup,
 * subcommand, and option. If there is no subgroup or subcommand, {@link NoSubcommand} is used as a
 * placeholder.
 */
export const autocompleters: Record<
	string,
	Partial<
		Record<
			string | typeof NoSubcommand,
			Partial<
				Record<string | typeof NoSubcommand, Record<string, AutocompleteHandler<boolean>>>
			>
		>
	>
> = {};
/** Placeholder used in {@link autocompleters} when there is no subgroup or subcommand to index by. */
export const NoSubcommand = Symbol("no subcommand");

/** Converts option configuration data to a type representing the chosen options. */
export type OptionsToType<InGuild extends boolean, Options extends FlatCommandOptions<InGuild>> = {
	[OptionName in keyof Options]: Options[OptionName]["required"] extends true ?
		OptionToType<InGuild, Options[OptionName]>
	:	OptionToType<InGuild, Options[OptionName]> | undefined;
};
/** Converts an option's configuration to the type the option will ouput. */
export type OptionToType<InGuild extends boolean, Option extends CommandOption<InGuild>> = {
	[ApplicationCommandOptionType.Attachment]: Attachment;
	[ApplicationCommandOptionType.Mentionable]: GuildMember | Role | User;
	[ApplicationCommandOptionType.Role]: Role | (InGuild extends true ? never : undefined);
	[ApplicationCommandOptionType.Boolean]: boolean;
	[ApplicationCommandOptionType.User]: GuildMember | User;
	[ApplicationCommandOptionType.Channel]:
		| Extract<GuildBasedChannel, { type: OptionChannelTypes<Option["channelTypes"]> }>
		| (InGuild extends true ? never : undefined);
	[ApplicationCommandOptionType.Integer]: number;
	[ApplicationCommandOptionType.Number]: number;
	[ApplicationCommandOptionType.String]: Option extends StringOption<InGuild> ? string
	:	keyof Option["choices"];
}[Option["type"]];

export type OptionChannelTypes<Types> =
	Types extends ChannelType[] ? Types[number] : ApplicationCommandOptionAllowedChannelTypes;

/** @internal */
export function transformOptions(
	options: Record<string, CommandOption<boolean>>,
	metadata:
		| { command: string; subcommand?: string }
		| { command: string; subcommand: string; subGroup?: string },
): Exclude<
	ApplicationCommandOptionData,
	{ type: ApplicationCommandOptionType.SubcommandGroup | ApplicationCommandOptionType.Subcommand }
>[] {
	return Object.entries(options)
		.map(([name, option]) => {
			const transformed = {
				name,
				description: option.description,
				type: option.type,
				required: option.required ?? false,
			} as Exclude<
				ApplicationCommandOptionData,
				{
					type:
						| ApplicationCommandOptionType.SubcommandGroup
						| ApplicationCommandOptionType.Subcommand;
				}
			>;

			if (option.autocomplete) {
				(((autocompleters[metadata.command] ??= {})[
					("subGroup" in metadata && metadata.subGroup) || NoSubcommand
				] ??= {})[metadata.subcommand || NoSubcommand] ??= {})[name] = option.autocomplete;

				transformed.autocomplete = true;
			}

			if (transformed.type === ApplicationCommandOptionType.Channel)
				transformed.channelTypes =
					option.channelTypes
					?? ([
						ChannelType.GuildText,
						ChannelType.GuildVoice,
						ChannelType.GuildCategory,
						ChannelType.GuildAnnouncement,
						ChannelType.AnnouncementThread,
						ChannelType.PublicThread,
						ChannelType.PrivateThread,
						ChannelType.GuildStageVoice,
						ChannelType.GuildForum,
						...("MediaChannel" in discord && "GuildMedia" in ChannelType ?
							([ChannelType.GuildMedia] as const)
						:	[]),
					] as const);

			if (transformed.type === ApplicationCommandOptionType.String) {
				if (option.choices && !transformed.autocomplete)
					transformed.choices = Object.entries(option.choices)
						.map(([value, label]) => ({ value, name: label }))
						.sort((one, two) => one.name.localeCompare(two.name));
				if (option.maxLength !== undefined) transformed.maxLength = option.maxLength;
				if (option.minLength !== undefined) transformed.minLength = option.minLength;
			}

			if (
				transformed.type === ApplicationCommandOptionType.Number
				|| transformed.type === ApplicationCommandOptionType.Integer
			) {
				if (option.maxValue !== undefined) transformed.maxValue = option.maxValue;
				if (option.minValue !== undefined) transformed.minValue = option.minValue;
			}

			return transformed;
		})
		.sort((one, two) =>
			one.required === two.required ? one.name.localeCompare(two.name)
			: one.required ? -1
			: 1,
		);
}
