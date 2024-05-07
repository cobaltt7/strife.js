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
import type { CacheReducer } from "../../util.js";
import type { RootCommandOptions } from "./root.js";

export type Option<InGuild extends boolean> =
	| BasicOption
	| NumericalOption
	| ChannelOption
	| StringAutocompleteOption<InGuild>
	| StringChoicesOption;

export interface BasicOption extends BaseOption {
	type: (typeof ApplicationCommandOptionType)[
		| "Attachment"
		| "Boolean"
		| "Mentionable"
		| "Role"
		| "User"];
	choices?: never;
	channelTypes?: never;
	minValue?: never;
	maxValue?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
}
export interface NumericalOption extends BaseOption {
	type: (typeof ApplicationCommandOptionType)["Integer" | "Number"];
	minValue?: number;
	maxValue?: number;
	choices?: never;
	channelTypes?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
}
export interface ChannelOption extends BaseOption {
	type: ApplicationCommandOptionType.Channel;
	channelTypes?: ChannelType[];
	choices?: never;
	minValue?: never;
	maxValue?: never;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
}
export interface StringAutocompleteOption<InGuild extends boolean> extends BaseStringOption {
	minLength?: number;
	maxLength?: number;
	autocomplete?: AutocompleteHandler<InGuild>;
	choices?: never;
}
export type AutocompleteHandler<InGuild extends boolean> = (
	interaction: AutocompleteInteraction<CacheReducer<InGuild>>,
) => ApplicationCommandOptionChoiceData<string>[];
export interface StringChoicesOption extends BaseStringOption {
	choices: Record<string, string>;
	minLength?: never;
	maxLength?: never;
	autocomplete?: never;
}
export interface BaseStringOption extends BaseOption {
	type: ApplicationCommandOptionType.String;
	channelTypes?: never;
	minValue?: never;
	maxValue?: never;
}
export interface BaseOption {
	description: string;
	required?: boolean;
}

export type OptionsToType<InGuild extends boolean, Options extends RootCommandOptions<InGuild>> = {
	[OptionName in keyof Options]: Options[OptionName]["required"] extends true ?
		OptionToType<InGuild, Options[OptionName]>
	:	OptionToType<InGuild, Options[OptionName]> | undefined;
};

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
	[ApplicationCommandOptionType.String]: O extends StringAutocompleteOption<InGuild> ? string
	:	O["choices"][keyof O["choices"]];
}[O["type"]];
