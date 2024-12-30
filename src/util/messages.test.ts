import type {
	APIActionRowComponent,
	APIMessageActionRowComponent,
	APITextInputComponent,
	ButtonComponent,
	MessageActionRowComponent,
	TextInputComponent,
} from "discord.js";

import { deepStrictEqual } from "node:assert";
import { describe, it } from "node:test";

import { ActionRow, ButtonStyle, ComponentType } from "discord.js";

import { disableComponents } from "./messages.js";

class TestActionRow<
	ComponentType extends MessageActionRowComponent | TextInputComponent,
	// @ts-expect-error TS2675
> extends ActionRow<ComponentType> {
	constructor(data: APIActionRowComponent<APIMessageActionRowComponent | APITextInputComponent>) {
		super(data);
		this.testing = true;
	}
	testing;
}

describe("disableComponents", () => {
	it("should disable components", () => {
		deepStrictEqual(
			disableComponents([
				new TestActionRow<ButtonComponent>({
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
						},
					],
				}),
			]),
			[
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
							disabled: true,
						},
					],
				},
			],
		);
	});
	it("should disable multiple rows", () => {
		deepStrictEqual(
			disableComponents([
				new TestActionRow<ButtonComponent>({
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
						},
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 2",
							custom_id: "button",
						},
					],
				}),
			]),
			[
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 1",
							custom_id: "button",
							disabled: true,
						},
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Button 2",
							custom_id: "button",
							disabled: true,
						},
					],
				},
			],
		);
	});
	it("should not disable links", () => {
		deepStrictEqual(
			disableComponents([
				new TestActionRow<ButtonComponent>({
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Button 1",
							url: "https://discord.com",
						},
					],
				}),
			]),
			[
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Button 1",
							url: "https://discord.com",
							disabled: false,
						},
					],
				},
			],
		);
	});
});
