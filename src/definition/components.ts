import type {
	AnySelectMenuInteraction,
	ButtonInteraction,
	ModalSubmitInteraction,
	SelectMenuType,
} from "discord.js";

export const buttons: Record<string, (interaction: ButtonInteraction, id: string) => any> = {};
export function defineButton(
	buttonName: string,
	handler: (interaction: ButtonInteraction, id: string) => any,
) {
	if (buttons[buttonName])
		throw new ReferenceError("Handler for button " + buttonName + " already exists");
	buttons[buttonName] = handler;
}

export const modals: Record<string, (interaction: ModalSubmitInteraction, id: string) => any> = {};
export function defineModal(
	modalName: string,
	handler: (interaction: ModalSubmitInteraction, id: string) => any,
) {
	if (modals[modalName])
		throw new ReferenceError("Handler for modal " + modalName + " already exists");
	modals[modalName] = handler;
}

export const selects: Record<string, SelectHandler> = {};

export function defineSelect(selectName: string, select: SelectHandler): void;
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
