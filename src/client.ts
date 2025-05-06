import type {
	ApplicationCommandData,
	Awaitable,
	ClientOptions,
	RepliableInteraction,
	Snowflake,
} from "discord.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { BaseCommandData, DefaultCommandAccess } from "./definition/commands.js";
import type { FlatCommandHandler } from "./definition/commands/flat.js";
import type { MenuCommandHandler } from "./definition/commands/menu.js";
import type { SubGroupsHandler } from "./definition/commands/sub-groups.js";
import type { SubcommandHandler } from "./definition/commands/subcommands.js";
import type { EventHandler, StrifeEvents } from "./definition/events.js";
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

import { commands } from "./definition/commands.js";
import { autocompleters, NoSubcommand } from "./definition/commands/options.js";
import { buttons, modals, selects } from "./definition/components.js";
import { defineEvent, getEvents } from "./definition/events.js";
import { logError } from "./errors.js";
import { DEFAULT_GUILDS } from "./util.js";

const globalCommandKey = Symbol("global");

/**
 * Once {@link login()} has been called, you may import this from anywhere in your app to access the
 * client instance it created.
 *
 * Note that although this is typed as {@link Client<true>}, it is `undefined` prior to calling
 * {@link login()}. Please plan appropriately.
 */
export let client: Client<true>;

/**
 * Connect to Discord and instantiate a discord.js client.
 *
 * @param loginOptions Configuration.
 */
export async function login(loginOptions: LoginOptions): Promise<void> {
	const [major, minor = "", patch] = version.split(".");
	if (major !== "14" || +minor < 9 || patch?.includes("-dev"))
		process.emitWarning(
			`You are using an non-officially-supported version of discord.js (${
				version
			}). Please use version ^14.9 for maximum stability.`,
			"ExperimentalWarning",
		);

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
		...loginOptions.clientOptions,
	});

	const debug = loginOptions.debug ?? (process.env.NODE_ENV === "production" ? true : "all");
	let handleError = console.error;

	const readyPromise = new Promise<Client<true>>((resolve) => {
		Handler.once("ready", resolve);
	});
	Handler.on("debug", (message) => {
		if (
			debug === "all"
			|| (debug
				&& !message.includes("Sending a heartbeat")
				&& !message.includes("Heartbeat acknowledged"))
		)
			console.debug(message);
	})
		.on("warn", (warning) => handleError(warning, "warn"))
		.on("error", (error) => handleError(error, "error"))
		.on("invalidated", () => {
			console.error(new ReferenceError("Session is invalid"));
			process.exit(1);
		})
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

	await Handler.login(loginOptions.botToken ?? process.env.BOT_TOKEN);
	client = await readyPromise;

	console.log(`Connected to Discord with tag ${client.user.tag}`);

	handleError =
		typeof loginOptions.handleError === "function" ?
			loginOptions.handleError
		:	await buildErrorHandler(loginOptions.handleError);

	if (loginOptions.modulesDir)
		process.emitWarning(
			"The `modulesDir` option is deprecated. Please use `modulesDirectory` instead.",
			"DeprecationWarning",
		);

	const directory = loginOptions.modulesDirectory ?? loginOptions.modulesDir;
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

			if (!autocomplete)
				throw new ReferenceError(
					`Autocomplete handler for \`/${command}${subGroup ? ` ${subGroup}` : ""}${
						subcommand ? ` ${subcommand}` : ""
					}\`’s \`${option}\` option not found`,
				);

			await interaction.respond(autocomplete(interaction).slice(0, 25));
			return;
		}

		if (!interaction.isCommand()) {
			const [id, name] = interaction.customId.split(/(?<=^[^_]*)_/);
			if (!name) return;

			if (interaction.isButton()) await buttons[name]?.(interaction, id ?? "");
			else if (interaction.isModalSubmit()) await modals[name]?.(interaction, id ?? "");
			else if (interaction.isAnySelectMenu()) await selects[name]?.(interaction, id ?? "");

			return;
		}

		if (!interaction.command) throw new ReferenceError("Unknown command run");
		const { command } = commands[interaction.command.name]?.[0] ?? {};
		if (!command) throw new ReferenceError(`Command \`${interaction.command.name}\` not found`);

		if (interaction.isContextMenuCommand()) await (command as MenuCommandHandler)(interaction);
		else {
			const rawOptions =
				interaction.options.data[0]?.options?.[0]?.options
				?? interaction.options.data[0]?.options
				?? interaction.options.data;

			const optionsData = rawOptions.map(
				async (option) =>
					[
						option.name,
						(option.attachment
							?? (!option.channel || option.channel instanceof GuildChannel ?
								option.channel
							:	await interaction.guild?.channels.fetch(option.channel.id))
							?? (option.member instanceof GuildMember && option.member))
							|| (option.user
								?? (!option.role || option.role instanceof Role ?
									option.role
								:	await interaction.guild?.roles.fetch(option.role.id))
								?? option.value),
					] as const,
			);
			const parsedOptions = Object.fromEntries(await Promise.all(optionsData));

			const subGroup = interaction.options.getSubcommandGroup();
			const subcommand = interaction.options.getSubcommand(false);
			if (subGroup && subcommand)
				await (command as SubGroupsHandler)(interaction, {
					subcommand,
					subGroup,
					options: parsedOptions,
				});
			else if (subcommand)
				await (command as SubcommandHandler)(interaction, {
					subcommand,
					options: parsedOptions,
				});
			else await (command as FlatCommandHandler)(interaction, parsedOptions);
		}
	});

	for (const [event, execute] of Object.entries(getEvents()) as [
		StrifeEvents,
		EventHandler<StrifeEvents>,
	][])
		client.on(event, async (...args) => {
			try {
				await execute(...args);
			} catch (error) {
				const interaction =
					args[0] instanceof BaseInteraction && !args[0].isAutocomplete() ?
						args[0]
					:	undefined;
				await handleError(error, interaction ?? event);

				if (!loginOptions.commandErrorMessage) return;

				if (interaction?.deferred || interaction?.replied)
					await interaction.followUp({
						ephemeral: true,
						content: loginOptions.commandErrorMessage,
					});
				else if (
					Number(interaction?.createdAt) - Date.now() < 3000
					&& !(
						error instanceof DiscordAPIError
						&& error.code === RESTJSONErrorCodes.UnknownInteraction
					)
				)
					await interaction?.reply({
						ephemeral: true,
						content: loginOptions.commandErrorMessage,
					});
			}
		});

	const defaultGuilds =
		loginOptions.defaultCommandAccess !== undefined
		&& typeof loginOptions.defaultCommandAccess !== "boolean"
		&& [loginOptions.defaultCommandAccess].flat();
	const commandsByGuild = Object.entries(commands).reduce<
		Partial<Record<Snowflake | typeof globalCommandKey, ApplicationCommandData[]>>
	>((accumulator, [commandName, guildCommands]) => {
		for (const command of guildCommands) {
			const access = command.access ?? loginOptions.defaultCommandAccess ?? true;
			if (typeof access === "boolean") {
				if (guildCommands.length > 1)
					throw new TypeError(
						`Cannot set a boolean access on a command with a duplicate name`,
					);
				accumulator[globalCommandKey] ??= [];
				accumulator[globalCommandKey].push({
					...command,
					name: commandName,
					dmPermission: access,
				});
			} else {
				const guilds = new Set([access].flat());
				if (guilds.has(DEFAULT_GUILDS))
					if (defaultGuilds) {
						for (const guild of defaultGuilds) guilds.add(guild);
						guilds.delete(DEFAULT_GUILDS);
					} else
						throw new ReferenceError(
							`Cannot use \`${DEFAULT_GUILDS}\` without explicitly setting default guilds`,
						);

				for (const guild of guilds) {
					accumulator[guild]?.push({ ...command, name: commandName });
					accumulator[guild] ??= [{ ...command, name: commandName }];
				}
			}
		}
		return accumulator;
	}, {});

	const guilds = await client.guilds.fetch();
	await Promise.all(
		guilds.map(async (guild) => {
			await client.application.commands.set(commandsByGuild[guild.id] ?? [], guild.id);
			commandsByGuild[guild.id] = [];
		}),
	);

	await client.application.commands.set(commandsByGuild[globalCommandKey] ?? []);
	commandsByGuild[globalCommandKey] = [];

	for (const guildId in commandsByGuild) {
		if (!Object.hasOwn(commandsByGuild, guildId)) continue;

		const guildCommands = commandsByGuild[guildId];
		if (!guildCommands?.length) continue;

		await handleError(
			new ReferenceError(`Could not register commands in missing guild \`${guildId}\``),
			"ready",
		);
	}
}

/** Configuration. */
export type LoginOptions = {
	/**
	 * Options to pass to discord.js. As in discord.js, the only required property is `intents`.
	 * strife.js has some defaults on top of discord.js's, which will be merged with these options,
	 * but all are still overridable.
	 *
	 * - `allowedMentions` is set to only ping users by default (including replied users) to avoid
	 *   accidental mass pings.
	 * - `failIfNotExists` is set to `false` to return `null` instead of erroring in certain cases.
	 * - `partials` is set to all available partials to avoid missed events.
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
	 * The directory to import modules from. It is recommended to set this to `fileURLToPath(new
	 * URL("./modules", import.meta.url))`. Omit to not load any modules.
	 */
	modulesDirectory?: string;
	/**
	 * The token to connect to Discord with.
	 *
	 * @default `process.env.BOT_TOKEN`
	 */
	botToken?: string;
	/**
	 * The message displayed to the user when commands fail. Omit to use Discord's default `❗ The
	 * application did not respond`.
	 */
	commandErrorMessage?: string;
	/**
	 * Defines how errors should be handled in discord.js or any event, component, or command
	 * handler. Can either be a function that will be called on each error, or an object defining
	 * how strife.js should handle it. If not set, all errors will only be logged through
	 * {@link console.error()}. If set to an object, strife.js will log the error in the console,
	 * then standardize it and format it nicely before sending it in a channel of your chosing. You
	 * can also optionally specify an emoji to be included in the error log message for aesthetic
	 * purposes.
	 */
	handleError?:
		| ((error: unknown, event: RepliableInteraction | string) => Awaitable<void>)
		| { channel: string | (() => Awaitable<SendableChannel>); emoji?: string }
		| undefined;
	/**
	 * Controls the verbosity of debug logs. Set to `false` to disable them entirely, `true` to log
	 * most non-spammy messages (excuding things like websocket heartbeats), or `"all"` to include
	 * everything.
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
	if (options)
		assert(channel && "send" in channel, "Cannot send messages in provided error log channel");
	return async (error: unknown, event: RepliableInteraction | string) => {
		await logError({ error, event, channel, emoji: options?.emoji });
	};
}
