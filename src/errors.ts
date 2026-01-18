import type { Message, RepliableInteraction } from "discord.js";
import type { SendableChannel } from "./util.js";

import { isNativeError } from "node:util/types";

import { inlineCode } from "discord.js";
import { serializeError } from "serialize-error";

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
	const eventString = `[${
		typeof event === "string" ? event
		: event.isCommand() ?
			event.command ?
				`/${event.command.name}`
			:	event.constructor.name
		:	`${event.constructor.name}: ${event.customId}`
	}]`;
	console.error(eventString, error);
	if (!channel) return;
	try {
		const name =
			error && typeof error === "object" && "name" in error && error.name ?
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
				error.name.toString()
			:	"Error";
		if (name === "ExperimentalWarning") return;

		const errorString = stringifyError(error);
		const lines = errorString.split("\n");
		const external =
			lines.length > 10
			|| errorString.includes("```")
			|| lines.some((line) => line.length > 100);

		const trigger =
			typeof event === "string" ? inlineCode(event)
			: event.isChatInputCommand() ? commandInteractionToString(event)
			: inlineCode(
					event.isCommand() && event.command ?
						`/${event.command.name}`
					:	`${event.constructor.name}${event.isButton() ? `: ${event.customId}` : ""}`,
				);

		return await channel.send({
			content: `${emoji ? `${emoji} ` : ""}**${name}** occurred in ${trigger}${
				external ? "" : `\n\`\`\`json\n${errorString}\n\`\`\``
			}`,
			files:
				external ?
					[{ attachment: Buffer.from(errorString, "utf8"), name: "error.json" }]
				:	[],
		});
	} catch (loggingError) {
		console.error(eventString, loggingError);
		process.exit(1);
	}
}

/**
 * Standardizes an error's properties and stringifies it to JSON, transforming non-JSON values where
 * found.
 *
 * @param error The error to stringify.
 * @returns The stringified error.
 */
export function stringifyError(error: unknown): string {
	return JSON.stringify(
		error,
		(_, value) =>
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			typeof value === "bigint" || typeof value === "symbol" ? value.toString()
			: isNativeError(value) ? standardizeError(value)
			: value,
		"  ",
	);
}

type StandardizedError = {
	name?: unknown;
	code?: unknown;
	message?: unknown;
	stack?: unknown;
	cause?: unknown;
	errors?: unknown;
};

export function standardizeError(error: unknown): StandardizedError {
	if (typeof error !== "object" || !error) return standardizeError({ message: error });

	const serialized = serializeError(error);

	const message =
		"message" in error ?
			typeof error.message === "string" && error.message.includes("\n") ?
				error.message.split("\n")
			:	error.message
		:	undefined;

	if (!("stack" in error) || typeof error.stack !== "string" || !error.stack)
		Error.captureStackTrace(error, standardizeError);

	const extra = { ...error, ...serialized };
	delete extra.name;
	delete extra.code;
	delete extra.message;
	delete extra.stack;
	delete extra.cause;
	delete extra.errors;

	const cause = "cause" in error ? standardizeError(error.cause) : undefined;

	if (cause && "cause" in error)
		cause.stack =
			typeof error.cause === "object" && error.cause && "stack" in error.cause ?
				error.cause.stack
			:	undefined;

	return {
		name: "name" in error ? error.name : undefined,
		code: "code" in error ? error.code : undefined,
		message,
		stack: sanitizePath((error as { stack: string }).stack)
			.split("\n")
			.slice(Array.isArray(message) ? message.length : 1),
		cause,
		errors:
			"errors" in error ?
				Array.isArray(error.errors) ?
					error.errors.map(standardizeError)
				:	error.errors
			:	undefined,
		...extra,
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
	let decoded;
	try {
		decoded = decodeURIComponent(unclean);
	} catch {
		decoded = unclean;
	}

	const sanitized = decoded.replaceAll("\\", "/").replaceAll("file:///", "");
	return relative ? sanitized.replaceAll(sanitizePath(process.cwd(), false), ".") : sanitized;
}
