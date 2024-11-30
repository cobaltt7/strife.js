import type {
	ApplicationCommandData,
	Awaitable,
	ClientOptions,
	RepliableInteraction,
	Snowflake,
} from "discord.js";
import type { BaseCommandData, DefaultCommandAccess } from "./definition/commands.js";
import type { MenuCommandHandler } from "./definition/commands/menu.js";
import type { RootCommandHandler } from "./definition/commands/root.js";
import type { SubcommandHandler } from "./definition/commands/subcommands.js";
import type { SubGroupsHandler } from "./definition/commands/subGroups.js";
import type { ClientEvent, Event } from "./definition/events.js";
import type { SendableChannel } from "./util.js";

import assert from "node:assert";
import fileSystem from "node:fs/promises";
import path from "node:path";
import url from "node:url";

import {
	BaseInteraction,
	Client,
	DiscordAPIError,
	GuildChannel,
	GuildMember,
	Partials,
	RESTJSONErrorCodes,
	Role,
	version,
} from "discord.js";

import { autocompleters, commands, NoSubcommand } from "./definition/commands.js";
import { buttons, modals, selects } from "./definition/components.js";
import { defineEvent, getEvents } from "./definition/events.js";
import { logError } from "./errors.js";
import { DEFAULT_GUILDS } from "./util.js";

const globalCommandKey = Symbol("global");

/**
 * The client instance created by {@link login()}.
 *
 * Note that although this is typed as {@link Client<true>}, it is `undefined` prior to calling {@link login()}, contrary
 * to the types. Please plan appropriately.
 */
export let client: Client<true> = undefined as any;

/**
 * Connect to Discord and instantiate a discord.js client.
 *
 * @param options The options to se when logging in.
 */
export async function login(options: LoginOptions) {
	const [major, minor = "", patch] = version.split(".");
	if (major !== "14" || +minor < 9 || patch?.includes("-dev")) {
		process.emitWarning(
			`You are using an non-officially-supported version of discord.js (${
				version
			}). Please use version ^14.9 for maximum stability.`,
			"ExperimentalWarning",
		);
	}

	const Handler = new Client({
		allowedMentions: { parse: ["users"], repliedUser: true },
		failIfNotExists: false,
		partials: [
			Partials.User,
			Partials.Channel,
			Partials.GuildMember,
			Partials.Message,
			Partials.Reaction,
			Partials.GuildScheduledEvent,
			Partials.ThreadMember,
		],
		...options.clientOptions,
	});

	const debug = options.debug ?? (process.env.NODE_ENV === "production" ? true : "all");

	const readyPromise = new Promise<Client<true>>((resolve) => Handler.once("ready", resolve));
	Handler.on("debug", (message) => {
		if (
			debug === "all" ||
			(debug &&
				!message.includes("Sending a heartbeat") &&
				!message.includes("Heartbeat acknowledged"))
		)
			console.debug(message);
	})
		.on("warn", (warning) => handleError(warning, "warn"))
		.on("error", (error) => handleError(error, "error"))
		.on("invalidated", async () => {
			console.error(new ReferenceError("Session is invalid"));
			process.exit(1);
		})
		.on("guildUnavailable", async (guild) =>
			handleError(
				new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`),
				"guildUnavailable",
			),
		)
		.rest.on("invalidRequestWarning", (data) =>
			handleError(
				`${data.count} requests; ${data.remainingTime}ms left`,
				"invalidRequestWarning",
			),
		)
		.on("restDebug", (message) => {
			if (debug === "all" || (debug && !message.includes("Received bucket hash update")))
				console.debug(message);
		});

	await Handler.login(options.botToken ?? process.env.BOT_TOKEN);
	client = await readyPromise;

	console.log(`Connected to Discord with tag ${client.user.tag ?? ""}`);

	const handleError =
		typeof options.handleError === "function" ?
			options.handleError
		:	await buildErrorHandler(options.handleError);

	if (options.modulesDir) {
		process.emitWarning(
			"The `modulesDir` option is deprecated. Please use `modulesDirectory` instead.",
			"DeprecationWarning",
		);
	}
	const directory = options.modulesDir ?? options.modulesDirectory;
	const modules = directory ? await fileSystem.readdir(directory) : [];

	const promises = modules.map(async (module) => {
		const fullPath = path.join(directory ?? process.cwd(), module);
		const resolved =
			(await fileSystem.lstat(fullPath)).isDirectory() ?
				path.join(fullPath, "./index.js")
			:	fullPath;
		if (path.extname(resolved) !== ".js") return;

		await import(
			url.pathToFileURL(path.resolve(directory ?? process.cwd(), resolved)).toString()
		);
	});
	await Promise.all(promises);

	defineEvent("interactionCreate", async (interaction) => {
		if (interaction.isAutocomplete()) {
			const command = interaction.command?.name ?? "";
			const subGroup = interaction.options.getSubcommandGroup();
			const subcommand = interaction.options.getSubcommand(false);
			const option = interaction.options.getFocused(true).name;

			const autocomplete =
				autocompleters[command]?.[subGroup ?? NoSubcommand]?.[subcommand ?? NoSubcommand]?.[
					option
				];

			if (!autocomplete) {
				throw new ReferenceError(
					`Autocomplete handler for \`/${command}${subGroup ? " " + subGroup : ""}${
						subcommand ? " " + subcommand : ""
					}\`'s \`${option}\` option not found`,
				);
			}

			return interaction.respond(autocomplete(interaction).slice(0, 25));
		}

		if (!interaction.isCommand()) {
			const [id, name] = interaction.customId.split(/(?<=^[^_]*)_/);
			if (!name) return;

			if (interaction.isButton()) await buttons[name]?.(interaction, id ?? "");
			else if (interaction.isModalSubmit()) await modals[name]?.(interaction, id ?? "");
			else if (interaction.isAnySelectMenu()) await selects[name]?.(interaction, id ?? "");

			return;
		}

		const { command } = commands[interaction.command?.name ?? ""]?.[0] ?? {};

		if (!command)
			throw new ReferenceError(`Command \`${interaction.command?.name}\` not found`);

		if (interaction.isContextMenuCommand()) await (command as MenuCommandHandler)(interaction);
		else {
			const rawOptions =
				interaction.options.data[0]?.options?.[0]?.options ??
				interaction.options.data[0]?.options ??
				interaction.options.data;

			const optionsData = rawOptions.map(
				async (option) =>
					[
						option.name,
						option.attachment ||
							(!option.channel || option.channel instanceof GuildChannel ?
								option.channel
							:	await interaction.guild?.channels.fetch(option.channel.id)) ||
							(option.member instanceof GuildMember && option.member) ||
							option.user ||
							(!option.role || option.role instanceof Role ?
								option.role
							:	await interaction.guild?.roles.fetch(option.role.id)) ||
							option.value,
					] as const,
			);
			const options = Object.fromEntries(await Promise.all(optionsData));

			const subGroup = interaction.options.getSubcommandGroup();
			const subcommand = interaction.options.getSubcommand(false);
			if (subGroup && subcommand)
				await (command as SubGroupsHandler)(interaction, {
					subcommand,
					subGroup: subGroup,
					options,
				});
			else if (subcommand)
				await (command as SubcommandHandler)(interaction, { subcommand, options });
			else await (command as RootCommandHandler)(interaction, options);
		}
	});

	for (const [event, execute] of Object.entries(getEvents()) as [ClientEvent, Event][]) {
		client.on(event, async (...args) => {
			try {
				await execute(...args);
			} catch (error) {
				const interaction =
					args[0] instanceof BaseInteraction && !args[0].isAutocomplete() ?
						args[0]
					:	undefined;
				await handleError(error, interaction ? interaction : event);

				if (!options.commandErrorMessage) return;

				if (interaction?.deferred || interaction?.replied) {
					await interaction.followUp({
						ephemeral: true,
						content: options.commandErrorMessage,
					});
				} else if (
					Number(interaction?.createdAt) - Date.now() < 3000 &&
					!(
						error instanceof DiscordAPIError &&
						error.code === RESTJSONErrorCodes.UnknownInteraction
					)
				) {
					await interaction?.reply({
						ephemeral: true,
						content: options.commandErrorMessage,
					});
				}
			}
		});
	}

	const defaultGuilds =
		options.defaultCommandAccess !== undefined &&
		typeof options.defaultCommandAccess !== "boolean" &&
		[options.defaultCommandAccess].flat();
	const guildCommands = Object.entries(commands).reduce<{
		[key: Snowflake]: ApplicationCommandData[];
		[globalCommandKey]?: ApplicationCommandData[];
	}>((accumulator, [name, commands]) => {
		for (const command of commands) {
			const access = command.access ?? options.defaultCommandAccess ?? true;
			if (typeof access === "boolean") {
				if (commands.length > 1)
					throw new TypeError(
						`Cannot set a boolean access on a command with a duplicate name`,
					);
				accumulator[globalCommandKey] ??= [];
				accumulator[globalCommandKey].push({ ...command, name, dmPermission: access });
			} else {
				const guilds = new Set([access].flat());
				if (guilds.has(DEFAULT_GUILDS)) {
					if (defaultGuilds) {
						for (let guild of defaultGuilds) guilds.add(guild);
						guilds.delete(DEFAULT_GUILDS);
					} else {
						throw new ReferenceError(
							`Cannot use \`${DEFAULT_GUILDS}\` without explicitly setting default guilds`,
						);
					}
				}
				for (const guild of guilds) {
					accumulator[guild] ??= [];
					accumulator[guild]?.push({ ...command, name });
				}
			}
		}
		return accumulator;
	}, {});

	const guilds = await client.guilds.fetch();
	await Promise.all(
		guilds.map(async (guild) => {
			await client.application.commands.set(guildCommands[guild.id] ?? [], guild.id);
			guildCommands[guild.id] = [];
		}),
	);

	await client.application.commands.set(guildCommands[globalCommandKey] ?? []);
	guildCommands[globalCommandKey] = [];

	for (const guildId in guildCommands) {
		if (!Object.prototype.hasOwnProperty.call(guildCommands, guildId)) continue;

		const commands = guildCommands[guildId];
		if (!commands?.length) continue;

		await handleError(
			new ReferenceError(`Could not register commands in missing guild \`${guildId}\``),
			"ready",
		);
	}
}

/** Login options. */
export type LoginOptions = {
	/**
	 * Options to pass to discord.js. As in discord.js, the only required property is `intents`. strife.js has some
	 * defaults on top of discord.js's, which will be merged with these options, but all are still overridable.
	 *
	 * @default {
	 * 	allowedMentions: { parse: ["users"]; repliedUser: true };
	 * 	failIfNotExists: false;
	 * 	partials: [
	 * 		Partials.User,
	 * 		Partials.Channel,
	 * 		Partials.GuildMember,
	 * 		Partials.Message,
	 * 		Partials.Reaction,
	 * 		Partials.GuildScheduledEvent,
	 * 		Partials.ThreadMember,
	 * 	];
	 * }
	 */
	clientOptions: ClientOptions;
	/** @deprecated Use {@link LoginOptions.modulesDirectory} */
	modulesDir?: string;
	/**
	 * The directory to import modules from. It is recommended to set this to `fileURLToPath(new URL("./modules",
	 * import.meta.url))`. Omit to not load any modules.
	 */
	modulesDirectory?: string;
	/**
	 * The token to connect to Discord with.
	 *
	 * @default `process.env.BOT_TOKEN`
	 */
	botToken?: string;
	/**
	 * The message displayed to the user when commands fail. Omit to use Discord's default `❗ The application did not
	 * respond`.
	 */
	commandErrorMessage?: string;
	/**
	 * Defines how errors should be handled in discord.js or any event, component, or command handler. Can either be a
	 * function that will be called on each error, or an object defining how strife.js should handle it. If set to an
	 * object, strife.js will log the error in the console, then standardize it and format it nicely before sending it
	 * in a channel of your chosing. You can also optionally specify an emoji to be included in the error log for
	 * aesthetic purposes. If not set, all errors will only be logged through `console.error`.
	 */
	handleError?:
		| ((error: unknown, event: RepliableInteraction | string) => Awaitable<void>)
		| { channel: string | (() => Awaitable<SendableChannel>); emoji?: string }
		| undefined;
	/**
	 * Controls the verbosity of debug logs. Set to `false` to disable them entirely, `true` to log most non-spammy
	 * messages (excuding things like websocket heartbeats), or `"all"` to include everything.
	 *
	 * @default process.env.NODE_ENV === "production" ? true : "all"
	 */
	debug?: boolean | "all";
} & (DefaultCommandAccess extends { inGuild: true } ?
	{
		/** The default value of {@link BaseCommandData.access a command's `access` field}. */
		defaultCommandAccess: false | Snowflake | Snowflake[];
	}
:	{
		/** The default value of {@link BaseCommandData.access a command's `access` field}. */
		defaultCommandAccess?: true;
	});
async function buildErrorHandler(
	options: { channel: string | (() => Awaitable<SendableChannel>); emoji?: string } | undefined,
): Promise<(error: unknown, event: RepliableInteraction | string) => Awaitable<void>> {
	const channel =
		typeof options?.channel === "string" ?
			await client.channels.fetch(options.channel)
		:	await options?.channel();
	assert(channel && "send" in channel);
	return async (error: unknown, event: RepliableInteraction | string) => {
		await logError({ error, event, channel, emoji: options?.emoji });
	};
}
