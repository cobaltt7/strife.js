import type { CacheType } from "discord.js";

export type CacheReducer<InGuild extends boolean> = InGuild extends true
	? "cached" | "raw"
	: CacheType;

export const DEFAULT_GUILDS = "@defaults";
