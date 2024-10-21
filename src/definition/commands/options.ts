import {
	ChannelType,
	type ApplicationCommandOptionChoiceData,
	type ApplicationCommandOptionType,
	type AutocompleteInteraction,
	Attachment,
	type GuildBasedChannel,
	GuildMember,
	Role,
	User,
} from "discord.js";
import type { GuildCacheReducer } from "../../util.js";
import type { RootCommandOptions } from "./root.js";

/** An option. */
export type Option<InGuild extends boolean> =
	| BasicOption
	| NumericalOption
	| ChannelOption
	| StringOption<InGuild>
	| StringChoicesOption;

/**
 * A basic option that doesn't allow for further configuration.
 *
 * - {@link ApplicationCommandOptionType.Attachment}
 * - {@link ApplicationCommandOptionType.Boolean}
 * - {@link ApplicationCommandOptionType.Mentionable}
 * - {@link ApplicationCommandOptionType.Role}
 * - {@link ApplicationCommandOptionType.User}
 */
export interface BasicOption extends BaseOption {
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
}

/**
 * A numerical option.
 *
 * - {@link ApplicationCommandOptionType.Integer}
 * - {@link ApplicationCommandOptionType.Number}
 */
export interface NumericalOption extends BaseOption {
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
}

/** A {@link ApplicationCommandOptionType.Channel channel} option. */
export interface ChannelOption extends BaseOption {
	type: ApplicationCommandOptionType.Channel;
	/** Define allowed channel types for this option. Defaults to all supported guild channel types. */
	channelTypes?: ChannelType[];
	choices?: never;
	minValue?: never;
	maxValue?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
}

/** A {@link ApplicationCommandOptionType.String string} option. */
export interface StringOption<InGuild extends boolean> extends BaseStringOption {
	/** Define a lower bound for this option's length. Defaults to the Discord default of `0`. */
	minLength?: number;
	/** Define a upper bound for this option's length. Defaults to the Discord default of `6_000`. */
	maxLength?: number;
	/**
	 * Give users dynamic choices.
	 *
	 * In the callback, use `interaction.options.getFocused()` to get the value of the option so far. You can also use
	 * `interaction.options.getBoolean()`, `.getInteger()`, `.getNumber()`, and `.getString()`. Other option-getters
	 * will not work, use `interaction.options.get()` instead. Return an array of choice objects. It will be truncated
	 * to fit the 25-item limit automatically.
	 *
	 * Note that Discord does not require users to select values from the options, so handle values appropriately.
	 *
	 * Also note that TypeScript cannot automatically infer the type of the `interaction` parameter, however, it will
	 * error if you set it incorrectly, so make sure you manually specify it as `AutocompleteInteraction`.
	 */
	autocomplete?: AutocompleteHandler<InGuild>;
	choices?: never;
}
/** A {@link ApplicationCommandOptionType.String string} option with specified preset choices. */
export interface StringChoicesOption extends BaseStringOption {
	/**
	 * Require users to pick values from this predefined list. The keys are the values passed to your bot and the values
	 * are the descriptions displayed to the users.
	 */
	choices: Record<string, string>;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
}
/** A base {@link ApplicationCommandOptionType.String string} option. */
export interface BaseStringOption extends BaseOption {
	type: ApplicationCommandOptionType.String;
	channelTypes?: never;
	minValue?: never;
	maxValue?: never;
}

/** @deprecated Use {@link StringOption}. */
export interface StringAutocompleteOption<InGuild extends boolean> extends StringOption<InGuild> {}
/** An autocomplete handler. */
export type AutocompleteHandler<InGuild extends boolean> = (
	interaction: AutocompleteInteraction<GuildCacheReducer<InGuild>>,
) => ApplicationCommandOptionChoiceData<string>[];

/** A base option. */
export interface BaseOption {
	description: string;
	required?: boolean;
}

/** Converts option configuration data to a type representing the chosen options. */
export type OptionsToType<InGuild extends boolean, Options extends RootCommandOptions<InGuild>> = {
	[OptionName in keyof Options]: Options[OptionName]["required"] extends true ?
		OptionToType<InGuild, Options[OptionName]>
	:	OptionToType<InGuild, Options[OptionName]> | undefined;
};

/** Converts an option's configuration to the type the option will ouput. */
export type OptionToType<InGuild extends boolean, O extends Option<InGuild>> = {
	[ApplicationCommandOptionType.Attachment]: Attachment;
	[ApplicationCommandOptionType.Mentionable]: GuildMember | Role | User;
	[ApplicationCommandOptionType.Role]: Role | (InGuild extends true ? never : undefined);
	[ApplicationCommandOptionType.Boolean]: boolean;
	[ApplicationCommandOptionType.User]: GuildMember | User;
	[ApplicationCommandOptionType.Channel]:
		| (O["channelTypes"] extends ChannelType[] ?
				Exclude<GuildBasedChannel, { type: O["channelTypes"] }>
		  :	GuildBasedChannel)
		| (InGuild extends true ? never : undefined);
	[ApplicationCommandOptionType.Integer]: number;
	[ApplicationCommandOptionType.Number]: number;
	[ApplicationCommandOptionType.String]: O extends StringOption<InGuild> ? string
	:	O["choices"][keyof O["choices"]];
}[O["type"]];
