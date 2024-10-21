import type { CacheType, Channel } from "discord.js";

export type GuildCacheReducer<InGuild extends boolean> =
	InGuild extends true ? "cached" | "raw" : CacheType;

/** @deprecated Use {@link GuildCacheReducer} */
export type CacheReducer<InGuild extends boolean> = GuildCacheReducer<InGuild>;

export const DEFAULT_GUILDS = "@defaults";

export const footerSeperator = " • ";
export const zeroWidthSpace = "\u200B";

export type SendableChannel = Extract<Channel, { send: (...args: any[]) => any }>;
