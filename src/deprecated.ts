import type {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	AugmentedFlatCommandData,
	FlatCommandData,
	FlatCommandHandler,
	FlatCommandOptions,
} from "./definition/commands/flat.js";
import type { CommandOption, StringOption } from "./definition/commands/options.js";
import type { EventHandler, reservedClientEvents, StrifeEvents } from "./definition/events.js";
import type { GuildCacheReducer } from "./util.js";

/** @deprecated This is meant to be an internal type. */
export type CacheReducer<InGuild extends boolean> = GuildCacheReducer<InGuild>;

/** @deprecated Use `(typeof `{@link reservedClientEvents}`)[number]` */
export type ReservedClientEvent = (typeof reservedClientEvents)[number];
/** @deprecated Use {@link StrifeEvents} */
export type ClientEvent = StrifeEvents;
/** @deprecated Use {@link EventHandler} */
export type Event<E extends StrifeEvents> = EventHandler<E>;

/** @deprecated Use {@link FlatCommandData} */
export type RootCommandData<
	InGuild extends boolean,
	Options extends FlatCommandOptions<InGuild> = Record<string, never>,
> = FlatCommandData<InGuild, Options>;
/** @deprecated Use {@link FlatCommandOptions} */
export type RootCommandOptions<InGuild extends boolean> = FlatCommandOptions<InGuild>;
/** @deprecated Use {@link FlatCommandHandler} */
export type RootCommandHandler<
	InGuild extends boolean = boolean,
	Options extends FlatCommandOptions<InGuild> = FlatCommandOptions<InGuild>,
> = FlatCommandHandler<InGuild, Options>;
/** @deprecated Use {@link AugmentedFlatCommandData} */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AugmentedRootCommandData<
	InGuild extends boolean,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_Options extends FlatCommandOptions<InGuild>,
> {}

/** @deprecated Use {@link CommandOption} */
export type Option<InGuild extends boolean> = CommandOption<InGuild>;
/** @deprecated Use {@link StringOption}. */
export type StringAutocompleteOption<InGuild extends boolean> = StringOption<InGuild>;
