import type { Awaitable, ClientEvents } from "discord.js";

// TODO: add interactionCreate
/** Events that are reserved for strife.js to handle and that end-users should not use. */
export const reservedClientEvents = ["ready", "debug", "warn", "error", "invalidated"] as const;
/** All supported client events that can be handled. */
export type StrifeEvents = Exclude<keyof ClientEvents, (typeof reservedClientEvents)[number]>;

/** An event handler for a client event. */
export type EventHandler<EventName extends StrifeEvents> = (
	...args: ClientEvents[EventName]
) => Awaitable<unknown>;
/** An event handler for a pre-event. */
export type PreEventHandler<EventName extends StrifeEvents> = (
	...args: ClientEvents[EventName]
) => Awaitable<boolean>;

/** An object containing all registered event handlers. */
export const allEvents: { [EventName in StrifeEvents]?: EventHandler<EventName>[] } = {};
/** An object containing all registered pre-event handlers. */
export const preEvents: { [EventName in StrifeEvents]?: PreEventHandler<EventName> } = {};

/**
 * Define an event handler. You are allowed to define multiple handlers for the same event. Note
 * that handler execution order is not guaranteed.
 *
 * @param eventName The event to handle.
 * @param event The event handler.
 */
export function defineEvent<EventName extends StrifeEvents>(
	eventName: EventName,
	event: EventHandler<EventName>,
): void {
	allEvents[eventName]?.push(event);
	// @ts-expect-error TS2322
	allEvents[eventName] ??= [event];
}

/**
 * Define a pre-event handler. Pre-events are a special type of event handler that executes before
 * other handlers. They determine if other handlers are executed or not.
 *
 * A use case for this would be an automoderation system working alongside an XP system. The
 * automoderation system could define a pre-event handler to delete rule-breaking messages and
 * return `false` so users do not receive XP for rule-breaking messages.
 *
 * You are only allowed to define one pre-event handler per event. You can define a pre-event
 * handler with or without defining normal event handlers for that event.
 *
 * @param eventName The event to handle.
 * @param event The event handler. Must return whether other handlers should be executed or not.
 */
defineEvent.pre = function pre<EventName extends StrifeEvents>(
	eventName: EventName,
	event: PreEventHandler<EventName>,
) {
	if (preEvents[eventName])
		throw new ReferenceError(`Pre-event handler for event ${eventName} already exists`);
	// @ts-expect-error TS2322
	preEvents[eventName] = event;
	allEvents[eventName] ??= [];
};

/**
 * For every defined event, combine all the handlers into one function, handling pre-events and
 * errors correctly.
 *
 * @returns An object of event handlers, indexed by the event name.
 */
export function getEvents(): { [key in StrifeEvents]?: EventHandler<key> } {
	const parsedEvents: { [key in StrifeEvents]?: EventHandler<key> } = {};
	for (const [eventName, handlers = []] of Object.entries(allEvents) as [
		StrifeEvents,
		EventHandler<StrifeEvents>[],
	][]) {
		const preEvent = preEvents[eventName];

		async function handler(...args: ClientEvents[StrifeEvents]): Promise<void> {
			// @ts-expect-error TS2590
			if (preEvent && !(await preEvent(...args))) return;

			const results = await Promise.allSettled(handlers.map((event) => event(...args)));
			const failures = results.filter(
				(result): result is PromiseRejectedResult => result.status === "rejected",
			);

			if (failures.length === 1) throw failures[0]?.reason;
			if (failures.length)
				throw new AggregateError(failures, `Errors in multiple ${eventName} handlers`);
		}
		parsedEvents[eventName] = handler;
	}
	return parsedEvents;
}
