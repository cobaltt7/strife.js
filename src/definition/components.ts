import type {
	AnySelectMenuInteraction,
	ButtonInteraction,
	ModalSubmitInteraction,
	SelectMenuType,
} from "discord.js";

/** An object containing all registered button handlers. */
export const buttons: Record<string, (interaction: ButtonInteraction, data: string) => any> = {};
/**
 * Define a button listener.
 *
 * The button ID and the `data` parameter of the callback function are both taken from the button's `customId`. For
 * example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar` button will be called and the
 * `data` parameter will have a value of `"abcd"`.
 *
 * @param buttonID The button ID.
 * @param handler The button handler.
 */
export function defineButton(
	buttonID: string,
	handler: (interaction: ButtonInteraction, data: string) => any,
) {
	if (buttons[buttonID])
		throw new ReferenceError(`Handler for button ${buttonID} already exists`);
	buttons[buttonID] = handler;
}

/** An object containing all registered modal handlers. */
export const modals: Record<string, (interaction: ModalSubmitInteraction, data: string) => any> =
	{};
/**
 * Define a modal listener.
 *
 * The modal ID and the `data` parameter of the callback function are both taken from the modal's `customId`. For
 * example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar` modal will be called and the `data`
 * parameter will have a value of `"abcd"`.
 *
 * @param modalID The modal ID.
 * @param handler The modal handler.
 */
export function defineModal(
	modalID: string,
	handler: (interaction: ModalSubmitInteraction, data: string) => any,
) {
	if (modals[modalID]) throw new ReferenceError(`Handler for modal ${modalID} already exists`);
	modals[modalID] = handler;
}

/** An object containing all registered select menu handlers. */
export const selects: Record<string, SelectHandler> = {};
/**
 * Define a select menu listener.
 *
 * The select menu ID and the `data` parameter of the callback function are both taken from the select menu's
 * `customId`. For example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar` select menu will be
 * called and the `data` parameter will have a value of `"abcd"`.
 *
 * @param selectMenuID The select menu ID.
 * @param type The types of select menus to collect. By default, all types of select menus are collected. However, you
 *   can not specify multiple listeners for the same ID but different types.
 * @param handler The select menu handler.
 */
export function defineSelect(selectMenuID: string, select: SelectHandler): void;
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
		throw new ReferenceError("Handler for select menu " + selectName + " already exists");

	const types = typeof typesOrHandler === "function" || [typesOrHandler].flat();
	const handler = typeof typesOrHandler === "function" ? typesOrHandler : optionalHandler;
	if (!handler) throw new TypeError("No handler passed in for select menu " + selectName);

	selects[selectName] =
		types === true ? handler : (
			(interaction, id) =>
				types.includes(interaction.componentType) && handler(interaction, id)
		);
}

type SelectHandler<type extends SelectMenuType = SelectMenuType> = (
	interaction: AnySelectMenuInteraction & { componentType: type },
	id: string,
) => any;
