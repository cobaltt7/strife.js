import type { Awaitable, ClientEvents } from "discord.js";

/** Events that are reserved for strife.js to handle and that end-users should not use. */
export type ReservedClientEvent = "ready" | "debug" | "warn" | "error" | "invalidated"; // TODO: add interactionCreate
/** All supported client events that can be listened to. */
export type ClientEvent = Exclude<keyof ClientEvents, ReservedClientEvent>;
/** An event handler for a client event. */
export type Event = (...args: ClientEvents[ClientEvent]) => unknown;
const allEvents: Record<string, Event[]> = {};
const preEvents: Record<string, Event> = {};

/**
 * Define an event listener. You are allowed to define multiple listeners for the same event. Note that listener
 * execution order is not guaranteed.
 *
 * @param eventName The event to listen for.
 * @param event The event handler.
 */
export function defineEvent<EventName extends ClientEvent>(
	eventName: EventName,
	event: (...args: ClientEvents[EventName]) => unknown,
) {
	allEvents[eventName] ??= [];
	allEvents[eventName]?.push(event as Event);
}

/**
 * Define an pre-event listener. Pre-events are a special type of event listener that executes before other listeners.
 * to return a boolean to explicitly say whether execution should continue.
 *
 * A use case for this would be an automoderation system working alongside an XP system. The automoderation system could
 * define a pre-event to delete rule-breaking messages and return `false` so users do not receive XP for rule-breaking
 * messages.
 *
 * You are only allowed to define one pre-event for every `ClientEvent`. You can define a pre-event with or without
 * defining normal events.
 *
 * @param eventName The event to listen for.
 * @param event The event handler. Must return a boolean that determines if other listeners are executed or not.
 */
defineEvent.pre = function pre<EventName extends ClientEvent>(
	eventName: EventName,
	event: (...args: ClientEvents[EventName]) => Awaitable<boolean>,
) {
	if (preEvents[eventName])
		throw new ReferenceError("Pre-handler for event " + eventName + " already exists");
	preEvents[eventName] = event as Event;
	allEvents[eventName] ??= [];
};

/**
 * For every defined event, combine all the handlers into one function, handling pre-events and errors correctly.
 *
 * @returns An object of event handlers, indexed by the event name.
 */
export function getEvents(): { [E in ClientEvent]?: Event } {
	const parsedEvents: Record<string, Event> = {};

	for (const eventName in allEvents) {
		const preEvent = preEvents[eventName];
		const events = allEvents[eventName] ?? [];

		const event = async (...args: any) => {
			const results = await Promise.allSettled(events.map((event) => event(...args)));
			const failures = results.filter(
				(result): result is PromiseRejectedResult => result.status === "rejected",
			);

			if (failures.length === 1) throw failures[0]?.reason;
			if (failures.length) throw new AggregateError(failures);
		};

		parsedEvents[eventName] =
			preEvent ?
				async function (...args: any) {
					if (await preEvent(...args)) await event(...args);
				}
			:	event;
	}

	return parsedEvents;
}
