import type { InteractionReplyOptions } from "discord.js";

import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import { ActionRow as _ActionRow, ComponentType } from "discord.js";

import { paginate } from "./discord.js";

await describe("paginate", async () => {
	await it("should only respond once when `user` is `false` option", async () => {
		const messages: InteractionReplyOptions[] = [];
		await paginate(
			[1, 2, 3],
			(value) => value.toString(),
			(message) => {
				messages.push(message);
			},
			{ title: "Pagination Test", singular: "item", user: false, timeout: 45 * 60_000 },
		);
		strictEqual(messages.length, 1);
	});
	await it("should generate the proper first page", async () => {
		const messages: InteractionReplyOptions[] = [];
		await paginate(
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
			(value) => value.toString(),
			(message) => {
				messages.push(message);
			},
			{ title: "Pagination Test", singular: "item", user: false, timeout: 45 * 60_000 },
		);
		deepStrictEqual(messages, [
			{
				components: [],
				embeds: [
					{
						title: "Pagination Test",
						description: "1. 1\n2. 2\n3. 3\n4. 4\n5. 5\n6. 6\n7. 7\n8. 8\n9. 9\n10. 10",
						fields: [],
						footer: { text: `Page 1/1 • 10 items` },
						author: undefined,
						color: undefined,
					},
				],
			},
		]);
	});
	await it("should respect the `pageLength` option", async () => {
		await paginate(
			[1, 2, 3, 4, 5, 6],
			(value) => value.toString(),
			(message) => {
				const embed = message.embeds?.[0] ?? {};
				ok("description" in embed);
				strictEqual(embed.description, "1. 1\n2. 2\n3. 3");
				strictEqual(embed.footer?.text, `Page 1/2 • 6 items`);
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				pageLength: 3,
				timeout: 45 * 60_000,
			},
		);
	});
	await it("should respect the `rawOffset` option", async () => {
		await paginate(
			[
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
				24, 25,
			],
			(value) => value.toString(),
			(message) => {
				const embed = message.embeds?.[0] ?? {};
				ok("description" in embed);
				strictEqual(embed.description, "__21. 21__\n22. 22\n23. 23\n24. 24\n25. 25");
				strictEqual(embed.footer?.text, `Page 2/2 • 25 items`);
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				rawOffset: 20,
				timeout: 45 * 60_000,
			},
		);
	});
	await it("should respect the `generateComponents` option", async () => {
		await paginate(
			[1, 2, 3, 4, 5, 6],
			(value) => value.toString(),
			(message) => {
				deepStrictEqual(message.components?.[0], {
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "custom_component",
							type: ComponentType.StringSelect,
							placeholder: "Cancel",
							options: [
								{ value: "1", label: "1" },
								{ value: "2", label: "2" },
								{ value: "3", label: "3" },
								{ value: "4", label: "4" },
								{ value: "5", label: "5" },
								{ value: "6", label: "6" },
							],
						},
					],
				});
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				generateComponents(page) {
					return [
						{
							customId: "custom_component",
							type: ComponentType.StringSelect,
							placeholder: "Cancel",
							options: page.map((number) => ({
								value: number.toString(),
								label: number.toString(),
							})),
						},
					];
				},
				timeout: 45 * 60_000,
			},
		);
	});
	await it("should respect the `customComponentLocation` option", async () => {
		await paginate(
			[1, 2, 3, 4, 5, 6],
			(value) => value.toString(),
			(message) => {
				const actionRow = message.components?.[0];
				ok(actionRow);
				ok("components" in actionRow);

				const [select] = actionRow.components;
				ok(select);
				ok("type" in select);
				strictEqual(select.type, ComponentType.StringSelect);
				ok("customId" in select);
				strictEqual(select.customId, "custom_component");
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				customComponentLocation: "below",
				generateComponents(page) {
					return [
						{
							customId: "custom_component",
							type: ComponentType.StringSelect,
							placeholder: "Cancel",
							options: page.map((number) => ({
								value: number.toString(),
								label: number.toString(),
							})),
						},
					];
				},
				timeout: 45 * 60_000,
			},
		);
	});
	await it("should respect the `failMessage` option", async () => {
		const messages: InteractionReplyOptions[] = [];
		await paginate(
			[],
			(value) => value,
			(message) => {
				messages.push(message);
			},
			{
				title: "Pagination Test",
				singular: "item",
				user: false,
				failMessage: "fail",
				timeout: 45 * 60_000,
			},
		);
		deepStrictEqual(messages, [{ content: "fail" }]);
	});
});
