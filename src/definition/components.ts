import type {
	AnySelectMenuInteraction,
	Awaitable,
	ButtonInteraction,
	ModalSubmitInteraction,
	SelectMenuType,
} from "discord.js";

/** An object containing all registered button handlers. */
export const buttons: Record<string, ButtonHandler> = {};
/** An event handler for a button click. */
export type ButtonHandler = (interaction: ButtonInteraction, data: string) => Awaitable<unknown>;
/**
 * Define a button handler.
 *
 * The button id and the `data` parameter of the callback function are both taken from the button's
 * `customId`. For example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar`
 * button will be called and the `data` parameter will have a value of `"abcd"`.
 *
 * @param buttonId The button id.
 * @param handler The button handler.
 */
export function defineButton(
	buttonId: string,
	handler: (interaction: ButtonInteraction, data: string) => Awaitable<unknown>,
): void {
	if (buttons[buttonId])
		throw new ReferenceError(`Handler for button ${buttonId} already exists`);
	buttons[buttonId] = handler;
}

/** An object containing all registered modal handlers. */
export const modals: Record<string, ModalHandler> = {};
/** An event handler for a modal submission. */
export type ModalHandler = (
	interaction: ModalSubmitInteraction,
	data: string,
) => Awaitable<unknown>;
/**
 * Define a modal handler.
 *
 * The modal id and the `data` parameter of the callback function are both taken from the modal's
 * `customId`. For example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar`
 * modal will be called and the `data` parameter will have a value of `"abcd"`.
 *
 * @param modalId The modal id.
 * @param handler The modal handler.
 */
export function defineModal(
	modalId: string,
	handler: (interaction: ModalSubmitInteraction, data: string) => Awaitable<unknown>,
): void {
	if (modals[modalId]) throw new ReferenceError(`Handler for modal ${modalId} already exists`);
	modals[modalId] = handler;
}

/** An object containing all registered select menu handlers. */
export const selects: Record<string, SelectHandler> = {};
/** An event handler for a select menu defocus. */
export type SelectHandler<Type extends SelectMenuType = SelectMenuType> = (
	interaction: AnySelectMenuInteraction & { componentType: Type },
	id: string,
) => Awaitable<unknown>;
/**
 * Define a select menu handler.
 *
 * The select menu id and the `data` parameter of the callback function are both taken from the
 * select menu's `customId`. For example, if the `customId` is `"abcd_foobar"`, then the callback
 * for the `foobar` select menu will be called and the `data` parameter will have a value of
 * `"abcd"`.
 *
 * @param selectMenuId The select menu id.
 * @param type The types of select menus to collect. By default, all types of select menus are
 *   collected. However, you can not specify multiple handlers for the same id but different types.
 * @param handler The select menu handler.
 */
export function defineSelect(selectMenuId: string, select: SelectHandler): void;
export function defineSelect<Type extends SelectMenuType>(
	selectName: string,
	type: Type | Type[],
	select: SelectHandler<Type>,
): void;
export function defineSelect(
	selectName: string,
	typesOrHandler: SelectMenuType | SelectHandler,
	optionalHandler?: SelectHandler,
): void {
	if (selects[selectName])
		throw new ReferenceError(`Handler for select menu ${selectName} already exists`);

	const types = typeof typesOrHandler === "function" || [typesOrHandler].flat();
	const handler = typeof typesOrHandler === "function" ? typesOrHandler : optionalHandler;
	if (!handler) throw new TypeError(`No handler passed in for select menu ${selectName}`);

	selects[selectName] =
		types === true ? handler : (
			(interaction, id) =>
				types.includes(interaction.componentType) && handler(interaction, id)
		);
}
