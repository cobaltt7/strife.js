import type { CacheType, Channel } from "discord.js";

/** @internal */
export type GuildCacheReducer<InGuild extends boolean> =
	InGuild extends true ? "cached" | "raw" : CacheType;

/**
 * Can be used in {@link BaseCommandData.access} to extend the guilds defined in
 * {@link LoginOptions.defaultCommandAccess}
 */
export const DEFAULT_GUILDS = "@defaults";

/**
 * The symbol Discord uses between the text and timestamp in an embed footer. Can be used between
 * strings to create a natural-looking break in footer text.
 */
export const footerSeperator = " • ";

/** A zero-width space, useful to create embed fields with an empty title and/or value. */
export const zeroWidthSpace = "\u200B";

/** @internal */
export type SendableChannel = Extract<Channel, { send(...args: unknown[]): unknown }>;
