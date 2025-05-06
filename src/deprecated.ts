import type { reservedClientEvents } from "./definition/events.js";

import { FormattingPatterns } from "discord.js";

/** @deprecated Use `(typeof `{@link reservedClientEvents}`)[number]` */
export type ReservedClientEvent = (typeof reservedClientEvents)[number];

/** @deprecated Use {@link GlobalEmojiPattern}. */
export const GlobalAnimatedEmoji = new RegExp(
	FormattingPatterns.AnimatedEmoji,
	`g${FormattingPatterns.AnimatedEmoji.flags}`,
);

export type {
	/** @deprecated This is meant to be an internal type. */
	GuildCacheReducer as CacheReducer,
} from "./util.js";
export type {
	/** @deprecated Use {@link EventHandler} */
	EventHandler as Event,
	/** @deprecated Use {@link StrifeEvents} */
	StrifeEvents as ClientEvent,
} from "./definition/events.js";
export type {
	/** @deprecated Use {@link AugmentedFlatCommandData} */
	AugmentedFlatCommandData as AugmentedRootCommandData,
	/** @deprecated Use {@link FlatCommandData} */
	FlatCommandData as RootCommandData,
	/** @deprecated Use {@link FlatCommandHandler} */
	FlatCommandHandler as RootCommandHandler,
	/** @deprecated Use {@link FlatCommandOptions} */
	FlatCommandOptions as RootCommandOptions,
} from "./definition/commands/flat.js";

export {
	/** @deprecated Use {@link GlobalInvitesPattern}. */
	GlobalInvitesPattern as InvitesPattern,
} from "./util/markdown.js";

export type {
	/** @deprecated Use {@link CommandOption} */
	CommandOption as Option,
	/** @deprecated Use {@link StringOption}. */
	StringOption as StringAutocompleteOption,
} from "./definition/commands/options.js";
