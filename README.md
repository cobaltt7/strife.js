# strife.js

A Discord bot framework built around TypeScript support and ease of setup.

Strife.js has three main goals and purposes:

1. Allow TypeScript to infer types where it couldn't easily before, leading to better code editor intellisense and
   autocomplete.
2. Reduce the amount of boilerplate and duplicated code in Discord bots by streamlining as much as possible and
   exporting many useful utility functions
3. Make it simpler and cleaner to register multiple commands and options in large multipurpose bots that require
   handling the same events for many different things

Support is available in [the Cobots server](https://discord.gg/WaEbDrXKxK).

## Installation

Install alongside discord.js:

```sh
npm install discord.js strife.js
```

strife.js officially supports discord.js versions 14.9-14.16.

## Login

Call `login()` to connect to Discord and instantiate a discord.js client.

```js
import { fileURLToPath } from "node:url";

import { GatewayIntentBits } from "discord.js";
import { login } from "strife.js";

await login({
	clientOptions: { intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMembers },
	modulesDirectory: fileURLToPath(new URL("./modules", import.meta.url)),
});
```

Once `login()` has been called, you may import `client` from anywhere in your app to access the client instance it
created:

```js
import { Client } from "discord.js";
import { client } from "strife.js";

client instanceof Client; // true
```

Note that although `client` is typed as `Client<true>`, it is `undefined` prior to calling `login()`. Please plan
appropriately.

### Configuration

#### `clientOptions`

Type: `ClientOptions`

Options to pass to discord.js. As in discord.js, the only required property is `intents`. strife.js has some defaults on
top of discord.js's, which will be merged with these options, but all are still overridable.

- `allowedMentions` is set to only ping users by default (including replied users) to avoid accidental mass pings
- `failIfNotExists` is set to `false` to return `null` instead of erroring in certain cases
- `partials` is set to all available partials to avoid missed events

#### `modulesDirectory`

Type: `string`

The directory to import modules from. See [Usage](#usage) for detailed information. It is recommended to set this to
`fileURLToPath(new URL("./modules", import.meta.url))`. Omit to not load any modules.

#### `botToken`

Type: `string | undefined`

The token to connect to Discord with. Defaults to `process.env.BOT_TOKEN`.

#### `commandErrorMessage`

Type: `string | undefined`

The message displayed to the user when commands fail. Omit to use Discord's default
`❗ The application did not respond`.

#### `handleError`

Type:
`((error: unknown, event: RepliableInteraction | string) => Awaitable<void>) | { channel: string | (() => Awaitable<SendableChannel>); emoji?: string } | undefined`

Defines how errors should be handled in discord.js or any event, component, or command handler. Can either be a function
that will be called on each error, or an object defining how strife.js should handle it. If not set, all errors will
only be logged through `console.error()`. If set to an object, strife.js will log the error in the console, then
standardize it and format it nicely before sending it in a channel of your chosing. You can also optionally specify an
emoji to be included in the error log message for aesthetic purposes.

#### `debug`

Type: `boolean | "all" | undefined`

Controls the verbosity of debug logs. Set to `false` to disable them entirely, `true` to log most non-spammy messages
(excuding things like websocket heartbeats), or `"all"` to include everything. Defaults to
`process.env.NODE_ENV === "production" ? true : "all"`.

#### `defaultCommandAccess`

Type: `boolean | Snowflake | Snowflake[] | undefined`

The default value of [a command's `access` field](#access).

## Usage

It is recommended, but not required, to use this framework with TypeScript.

Every file in [`modulesDirectory`](#modulesdirectory), and every `index.js` in subdirectories of `modulesDirectory` will
be automatically imported after logging in, but before commands are registered. It is recommended to only call the below
functions in those files.

### Commands

Use the `defineChatCommand` function to define a basic, flat chat command.

```js
import { defineChatCommand } from "strife.js";

defineChatCommand(
	{ name: "ping", description: "Ping!" },

	async (interaction) => {
		await interaction.reply("Pong!");
	},
);
```

Use the `restricted: true` option to deny members permission to use the command, and require guild admins to explicitly
set permissions via `Server Settings` -> `Integrations`. `restricted` is only available on guild-only commands - see
[Access](#access).

#### Options

You can specify options for commands using the `options` property. This is a key-value pair where the keys are option
names and the values are option details.

```js
import { ApplicationCommandOptionType } from "discord.js";
import { defineChatCommand } from "strife.js";

defineChatCommand(
	{
		name: "say",
		description: "Send a message",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message content",
				maxLength: 2000,
				required: true,
			},
		},
	},

	async (interaction, options) => {
		// code here...
	},
);
```

`type`
(`Exclude<ApplicationCommandOptionType, ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup>`)
and `description` (`string`) are required on all options. `required` (`boolean`) is optional, defaulting to `false`, but
is allowed on all types of options.

Some types of options have additional customization fields:

- `Channel` options allow `channelTypes` (`ApplicationCommandOptionAllowedChannelTypes[]`) to define allowed channel
  types for this option. Defaults to all supported guild channel types.
- `Integer` and `Number` options allow `minValue` and/or `maxValue` to define lower and upper bounds for this option
  respectively. Defaults to the Discord defaults of `-2 ** 53` and `2 ** 53` respectively.
- `String` commands allow a few additional fields:
    - `choices` (`Record<string, string>`) to require users to pick values from a predefined list. The keys are the
      values passed to your bot and the values are the descriptions displayed to the users. No other additional fields
      are allowed for this option when using `choices`.
    - `minLength` (`number`) and/or `maxLength` (`number`) to define lower and upper bounds for this option's length
      respectively. Defaults to the Discord defaults of `0` and `6_000` respectively.
    - `autocomplete` (`AutocompleteHandler<InGuild>`) to define a callback to give users dynamic choices.
        - Use `interaction.options.getFocused()` to get the value of the option so far. You can also use
          `interaction.options.getBoolean()`, `.getInteger()`, `.getNumber()`, and `.getString()`. Other option-getters
          will not work, use `interaction.options.get()` instead.
        - Return an array of choice objects. It will be truncated to fit the 25-item limit automatically.
        - Note that Discord does not require users to select values from the options, so handle values appropriately.
        - Also note that TypeScript cannot automatically infer the type of the `interaction` parameter, however, it will
          error if you set it incorrectly, so make sure you manually specify it as `AutocompleteInteraction` (or
          `AutocompleteInteraction<"cached" | "raw">` for guild-only commands).

To retrieve option values at runtime, you can utilize the second `options` parameter of the command handler. You can
always use discord.js's `interaction.options` API, however, the `options` parameter is a key-value object of options.
That is often simpler to use and has better types when using TypeScript.

When using TypeScript, it is strongly recommended, and, in some cases, required, to type the entire command object
`as const` in order to correctly resolve the option types.

```ts
import { defineChatCommand } from "strife.js";

defineChatCommand(
	{ name: "ping", description: "Ping!" } as const,

	async (interaction) => {
		await interaction.reply("Pong!");
	},
);
```

It is unnecessary to type it `as const` in this example, however it is strongly encourgaed to add it to all commands for
consistency.

#### Subcommands

You can specify subcommands using the `defineSubcommands()` function. Define subcommands using the `subcommands`
property, which is a key-value pair where the keys are subcommand names and the values are subcommand details.
Subcommands must have `name`s and `description`s and may have `options`.

```js
import { defineSubcommands } from "strife.js";

defineSubcommands(
	{
		name: "xp",
		description: "Commands to view users’ XP amounts",

		subcommands: {
			rank: { description: "View your XP rank", options: {} },
			top: { description: "View the server XP leaderboard", options: {} },
		},
	},

	async (interaction, { subcommand, options }) => {
		// code here...
	},
);
```

Subcommands support options in the same way as regular commands.

When using subcommands, the second argument to the handler is an object with the properties `subcommand` (`string`) and
`options` (key-value pair as in `defineChatCommand()`). In order for this parameter to be correctly typed, all
subcommands must have `options` set, even if just to an empty object.

#### Subcommand Groups

You can specify subcommand groups using the `defineSubGroups()` function. Define subgroups using the `subcommands`
property, which is a key-value pair where the keys are subgroup names and the values are subgroup details. Subgroups
must have `name`s, `description`s, and `subcommands`. Subcommands must have `name`s and `description`s and may have
`options`.

```js
import { defineSubGroups } from "strife.js";

defineSubGroups(
	{
		name: "foo",
		description: "...",

		subcommands: {
			bar: {
				description: "...",
				subcommands: {
					baz: { description: "...", options: {} },
				},
			},
		},
	},

	async (interaction, { subcommand, subGroup, options }) => {
		// code here...
	},
);
```

Subcommands support options in the same way as regular commands.

When using subcommands, the second argument to the handler is an object with the properties `subcommand` (`string`),
`subGroup` (`string`), and `options` (key-value pair as in `defineChatCommand()`). In order for this parameter to be
correctly typed, all subcommands must have `options` set, even if just to an empty object.

Mixing subgroups and subcommands on the same level is not currently supported.

#### Menu Commands

Use the `defineMenuCommand()` function to define a menu command.

```js
import { ApplicationCommandType } from "discord.js";
import { defineMenuCommand } from "strife.js";

defineMenuCommand(
	{ name: "User Info", type: ApplicationCommandType.User },

	async (interaction) => {
		// code here...
	},
);
```

Message context menu commands are also supported with `ApplicationCommandType.Message`.

#### Access

By default, commands are allowed in all guilds plus DMs.

To change this behavior, you can set `defaultCommandAccess` when logging in. Pass in `Snowflake | Snowflake[]` to only
define commands in specified guilds, `false` to define them in every guild but no DMs, or `true` to use the default
settings. When using TypeScript, it is necessary to augment the `DefaultCommandAccess` interface when changing this. To
do that, add the following in a new `.d.ts` file:

```ts
declare module "strife.js" {
	export interface DefaultCommandAccess {
		inGuild: true;
	}
}
```

Commands also support a root-level `access` option to override this on a per-command basis. It supports the same
options, with the addition of `"@defaults"` in the array of `Snowflake`s to extend the default guilds. `"@defaults"` is
not available if `defaultCommandAccess` is unset or is set to a boolean.

#### Augments

You can define custom command properties by using augments (advanced usage):

```ts
import type { FlatCommandOptions, MenuCommandContext, SubcommandOptions, SubGroupsOptions } from "strife.js";

declare module "strife.js" {
	export interface AugmentedMenuCommandData<_InGuild extends boolean, _Context extends MenuCommandContext> {}

	export interface AugmentedFlatCommandData<InGuild extends boolean, _Options extends FlatCommandOptions<InGuild>> {}
	export interface AugmentedSubcommandData<InGuild extends boolean, _Options extends SubcommandOptions<InGuild>> {}
	export interface AugmentedSubGroupsData<InGuild extends boolean, _Options extends SubGroupsOptions<InGuild>> {}

	export interface AugmentedChatCommandData<_InGuild extends boolean> {}
	export interface AugmentedCommandData<_InGuild extends boolean> {}
}
```

### Events

Use the `defineEvent()` function to define an event handler.

```js
import { defineEvent } from "strife.js";

defineEvent("messageCreate", async (message) => {
	// code here...
});
```

You are allowed to define multiple handler for the same event. Note that handler execution order is not guaranteed.

Note that since [all partials are enabled by default](#clientoptions), it is necessary to
[handle partial structures accordingly](https://discordjs.guide/popular-topics/partials.html), or manually disable them
if you really don't want to receive partial data.

#### Pre-Events

Pre-events are a special type of event handler that executes before other handlers. They must return
`Awaitable<boolean>` that determines if other handlers are executed or not. They are defined with the
`defineEvent.pre()` function:

```js
import { defineEvent } from "strife.js";

defineEvent.pre("messageCreate", async (message) => {
	// code here...
	return true;
});
```

Remember to return a boolean to explicitly say whether execution should continue.

A use case for this would be an automoderation system working alongside an XP system. The automoderation system could
define a pre-event handler to delete rule-breaking messages and return `false` so users do not receive XP for
rule-breaking messages.

You are only allowed to define one pre-event handler per event. You can define a pre-event handler with or without
defining normal event handlers for that event.

### Components

Use the `defineButton()`, `defineModal()`, and `defineSelect()` functions to define button, modal, and select menu
handler respectively:

```js
import { defineButton } from "strife.js";

defineButton("foobar", async (interaction, data) => {
	// code here...
});
```

The button id (`"foobar"` in this example) and the `data` parameter of the callback function are both taken from the
button's `customId`. For example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar` button will
be called and the `data` parameter will have a value of `"abcd"`.

The button `data` may not have underscores but the `id` may. For example, a `customId` of `"foo_bar_baz"` will result in
an `id` of `"bar_baz"` and the `data` `"foo"`. You can also omit the data from the `customId` altogether - a `customId`
of `"_foobar"` will result in an `id` of `"foobar"` and the `data` `""`.

It is not required for all `customId`s to follow this format nor to have an associated handler. You are free to collect
interactions in any other way you wish alongside or independent of strife.js.

`defineModal()` and `defineSelect()` work in the same way as `defineButton()` but for modals and select menus
respectfully. For better type safety, `defineSelect()` also optionally allows specifing certain types of select menus to
collect. By default, all types of select menus are collected. However, you can not specify multiple handlers for the
same id but different types.

```js
import { ComponentType } from "discord.js";
import { defineSelect } from "strife.js";

defineSelect("foobar", ComponentType.StringSelect, async (interaction, data) => {
	// code here...
});
```

You can specify `SelectMenuType | SelectMenuType[]`.

## Style Guide

None of the following are requirements other than those using the word "must", however, they are all _strongly_
encouraged. An ESLint plugin to enforce this style guide may be created in the future.

It is recommended to call your [`modulesDirectory`](#modulesdirectory) `modules`. Each file or folder in
`modulesDirectory` should be a different feature of your bot.

It is discouraged to import one module from another. Each module should work independently.

### File Modules

JavaScript files that lie directly inside `modulesDirectory` should be short - a few hundred lines at most. If they are
any longer, make them [directory modules](#directory-modules) instead.

### Directory Modules

Subdirectories of `modulesDirectory` _must_ have an `index.js` file. This file should contain all the definitions for
the module. In other words, `defineChatCommand`, `defineEvent`, etc. should only be used in the `index.js` of directory
modules. If any callback is more than a few dozen lines long, it should instead be imported from another file in the
same directory. Functions and values that depend on the `client` being initialized belong in `misc.js` in that
directory. All other utilities and constants should go in `util.js` in that directory. There should also be a
`index.text.js` file to test all functions in `util.js`.

## Imports

This guide references the following imported values in inline code blocks:

```ts
import type {
	ApplicationCommandOptionAllowedChannelTypes,
	AutocompleteInteraction,
	Awaitable,
	ClientOptions,
	RepliableInteraction,
	SelectMenuType,
	Snowflake,
} from "discord.js";
import type { DefaultCommandAccess, SendableChannel } from "strife.js";

import { defineModal } from "strife.js";
```

Values only referenced in multiline code blocks are not listed here as they are imported there.
