import { inlineCode, type Message, type RepliableInteraction } from "discord.js";
import { serializeError } from "serialize-error";
import type { SendableChannel } from "./util.js";
import { commandInteractionToString } from "./util/markdown.js";

/**
 * Log an error.
 *
 * @param options.error The error to log.
 * @param options.event The event that caused the error.
 * @param options.channel The channel to log the error in, or omit to only log in the console.
 * @param options.emoji The emoji to use.
 * @returns The log message if one was sent.
 */
export async function logError({
	error,
	event,
	channel,
	emoji,
}: {
	error: unknown;
	event: RepliableInteraction | string;
	channel?: SendableChannel;
	emoji?: string;
}): Promise<Message | undefined> {
	console.error(
		`[${
			typeof event == "string" ? event
			: event.isCommand() ? `/${event.command?.name}`
			: `${event.constructor.name}: ${event.customId}`
		}]`,
		error,
	);
	if (!channel) return;
	try {
		const name =
			error && typeof error === "object" && "name" in error ? `${error.name}` : "Error";
		if ("ExperimentalWarning" == name) return;

		const errorString = stringifyError(error);
		const lines = errorString.split("\n");
		const external =
			lines.length > 10 ||
			errorString.includes("```") ||
			lines.some((line) => line.length > 100);

		const trigger =
			typeof event == "string" ? inlineCode(event)
			: event.isChatInputCommand() ? commandInteractionToString(event)
			: inlineCode(
					event.isCommand() && event.command ?
						`/${event.command.name}`
					:	`${event.constructor.name}${event.isButton() ? `: ${event.customId}` : ""}`,
				);

		return await channel.send({
			content:
				`${emoji ? `${emoji} ` : ""}**${name}** occurred in ${trigger}` +
				(external ? "" : `\n\`\`\`json\n${errorString}\n\`\`\``),
			files:
				external ?
					[{ attachment: Buffer.from(errorString, "utf8"), name: "error.json" }]
				:	[],
		});
	} catch (loggingError) {
		console.error(
			`[${
				typeof event == "string" ? event
				: event.isCommand() ? `/${event.command?.name}`
				: `${event.constructor.name}: ${event.customId}`
			}]`,
			loggingError,
		);
		process.exit(1);
	}
}

/**
 * Standardizes an error's properties and stringifies it to JSON, transforming non-JSON values where found.
 *
 * @param error The error to stringify.
 * @returns The stringified error.
 */
export function stringifyError(error: unknown): string {
	return JSON.stringify(
		error,
		(_, value) =>
			typeof value === "bigint" || typeof value === "symbol" ? value.toString()
			: value instanceof Error ? standardizeError(value)
			: value,
		"  ",
	);
}

function standardizeError(error: unknown): object {
	if (typeof error !== "object" || !error) return { error };

	const serialized = serializeError(error);

	const message =
		"message" in error ?
			typeof error.message === "string" && error.message.includes("\n") ?
				error.message.split("\n")
			:	error.message
		:	undefined;
	const { stack } = "stack" in error ? error : new Error();

	const extra = { ...error, ...serialized };
	delete extra.name;
	delete extra.code;
	delete extra.message;
	delete extra.stack;
	delete extra.cause;
	delete extra.errors;

	return {
		name: "name" in error ? error.name : undefined,
		code: "code" in error ? error.code : undefined,
		message,
		stack:
			typeof stack === "string" ?
				sanitizePath(stack)
					.split("\n")
					.slice(Array.isArray(message) ? message.length : 1)
			:	stack,
		cause: "cause" in error ? standardizeError(error.cause) : undefined,
		errors:
			"errors" in error ?
				Array.isArray(error.errors) ?
					error.errors.map(standardizeError)
				:	error.errors
			:	undefined,
	};
}

/**
 * Sanatize a filepath.
 *
 * @param unclean The path to sanitize.
 * @param relative Whether the resulting path should be relative to the current working directory.
 * @returns The sanatized path.
 */
export function sanitizePath(unclean: string, relative = true): string {
	let decoded = undefined;
	try {
		decoded = decodeURIComponent(unclean);
	} catch {
		decoded = unclean;
	}

	const sanitized = decoded.replaceAll("\\", "/").replaceAll("file:///", "");
	return relative ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}
