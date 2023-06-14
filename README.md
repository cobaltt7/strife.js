# strife.js

A Discord bot framework.

## Installation

Install alongside discord.js:

```sh
npm install discord.js strife.js
```

strife.js officially supports discord.js version 14.9 and above.

## Login

Login to your Discord bot by calling `login`:

```js
import { GatewayIntentBits } from "discord.js";
import { login } from "strife.js";
import path from "node:path";
import url from "node:url";

await login({
	clientOptions: { intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] },
	modulesDir: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "./modules"),
});
```

Once `login` has been called, you may import `client` from anywhere in your app:

```js
import { client } from "strife.js";
import { Client } from "discord.js";

client instanceof Client // true
```

Note that `client` is `undefined` before `login` is called, and this behavior is not accounted for in the types, so plan appropriately.

### Configuration

#### `clientOptions`

Type: `ClientOptions`

Options to pass to discord.js. As in discord.js, `intents` is the only required property. strife.js has some defaults on top of discord.js's:

-   `allowedMentions` is set to only ping users by default (including replied users)
-   `failIfNotExists` is set to `false` to return `null` instead of erroring in certain cases
-   `partials` is set to all available partials to avoid missed events
-   `ws.large_threshold` is set to `0` to start with as much data as possible.

Of course, these are all overridable.

#### `modulesDir`

Type: `string`

The directory to import modules from. See [Usage](#usage) for detailed information. It is reccomended to set this to `path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "./modules")`.

#### `botToken`

Type: `string | undefined`

The token to sign in to Discord with. Defaults to `process.env.BOT_TOKEN`

#### `commandErrorMessage`

Type: `string | undefined`

The message to display to the user when commands fail. Omit to use Discord's default `❗ The application did not respond`.

#### `commandsGuildId`

Type: `Snowflake | undefined`

If provided, all commands will be guild commands only available in the guild with this id, and commands registered in any other guilds/globally will be deleted.

#### `handleError`

Type: `((error: any, event: ClientEvent | RepliableInteraction) => Awaitable<void>) | undefined`

Called when an error occurs in discord.js or any event, component, or command handler. Defaults to `console.error`.

#### `productionId`

Type: `Snowflake | undefined`

If provided and is equal to the bot's user ID, the bot will crash right after connecting to Discord to avoid accidentally deploying in-development features to the production bot. Use the `--production` flag on the command line to deploy anyway.

## Usage

It is strongly reccomended to use this framework with TypeScript. In the future, this framework will provide more powerful dynamic types for your bots.

Every file in [`modulesDir`](#modulesdir), and every `index.js` in subdirectories of `modulesDir` will be automatically imported after logging in, but before commands are registered. It is recommended to only call the below functions in those files.

### Commands

Use the `defineCommand` function to define a command.

```js
import { defineCommand } from "strife.js";

defineCommand(
	{
		name: "ping",
		description: "Ping!",
	},

	async (interaction) => {
		await interaction.reply("Pong!");
	}
);
```

Use the `restricted: true` option to deny members permission to use the command, and require guild admins to explicitly set permissions via `Server Settings` -> `Integrations`.

#### Options

You can specify options for commands using the `options` property. This is a key-value pair where the keys are option names and the values are option details.

```js
import { defineCommand } from "strife.js";
import { ApplicationCommandOptionType, User } from "discord.js";

defineCommand(
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

	async (interaction) => {
		// code here...
	}
);
```

`type` (`ApplicationCommandOptionType`) and `description` (`string`) are required on all options. `required` (`boolean`) is optional, defaulting to `false`, but is allowed on all types of options.

Some types of options have additional customization fields:

-   `Channel` options allow `channelTypes` (`ChannelType[]`) to define allowed channel types for this option. Defaults to all supported guild channel types.
-   `Integer` and `Number` options allow `minValue` and/or `maxValue` to define lower and upper bounds for this option respectively. Defaults to `-2 ** 53` and `2 ** 53` respectively.
-   `String` commands allow a couple additional fields:
    -   `choices` (`Record<string, string>`) to require users to pick values from a predefined list. The keys are the values passed to your bot and the values are the descriptons displayed to the users. No other additional fields are allowed for this option when using `choices`.
    -   `minLength` (`number`) and/or `maxLength` (`number`) to define lower and upper bounds for this option's length respectively. Defaults to `0` and `6_000` respectively.
    -   `autocomplete` (`(interaction: AutocompleteInteraction<"cached" | "raw">) => Awaitable<ApplicationCommandOptionChoiceData<string>[]>`) to give users dynamic choices.
        -   Use `interaction.options.getFocused()` to get the value of the option so far. You can also use `interaction.options.getBoolean()`, `.getInteger()`, `.getNumber()`, and `.getString()`. Other option getters will not work, use `interaction.options.get()` instead.
        -   Return an array of choice objects. It will be truncated to fit the 25 item limit automatically. Avoid returning promises, this will be disallowed in the future.
        -   Note that Discord does not require users to select values from the options, handle values appropriately.

#### Subcommands

You can specify subcommands for commands using the `subcommands` property. This is a key-value pair where the keys are subcommand names and the values are subcommand details.

```js
import { defineCommand } from "strife.js";

defineCommand(
	{
		name: "xp",
		description: "Commands to view users’ XP amounts",

		subcommands: {
			rank: { description: "View your XP rank" },
			top: { description: "View the server XP leaderboard" },
		},
	},

	async (interaction) => {
		// code here...
	}
);
```

The root command description is not displayed anywhere in Discord clients, but it is sill required by the Discord API. Subcommands support options in the same way as regular commands. Subcommand groups are not currently supported.

#### Context Menu Commands

By default, commands are chat input commands. You make it a context menu command by using `type`:

```js
import { defineCommand } from "strife.js";
import { ApplicationCommandType } from "discord.js";

defineCommand(
	{
		name: "User Info",
		type: ApplicationCommandType.User,
	},

	async (interaction) => {
		// code here...
	}
);
```

Message context menu commands are also supported with `ApplicationCommandType.Message`.

### Events

Use the `defineEvent` function to define an event.

```js
import { defineEvent } from "strife.js";

defineEvent("messageCreate", async (message) => {
	// code here...
});
```

Note that since [all partials are enabled by default](#clientoptions), it is necessary to [handle partials accordingly](https://discordjs.guide/popular-topics/partials.html#enabling-partials).

You are allowed to define multiple listeners for the same event. Note that listener execution order is not guaranteed.

#### Pre-Events

Pre-events are a special type of event listener that execute before other listeners. They must return `Awaitable<boolean>` that determins if other listeners are executed or not. They are defined with the `defineEvent.pre` function:

```js
import { defineEvent } from "strife.js";

defineEvent.pre("messageCreate", async (message) => {
	// code here...
	return true;
});
```

Remember to return a boolean to explicitly say whether execution should continue.

A use case for this would be an automoderation system working alongside an XP system. The automoderation system could define a pre-event to delete rule-breaking messages and return `false` so users do not receive XP for rule-breaking messages.

You are only allowed to define one pre-event for every `ClientEvent`. You can define a pre-event along with or without defining normal events.

### Components

Use the `defineButton`, `defineModal`, and `defineSelect` functions to define a button, a modal, and a select menu respectively:

```js
import { defineButton } from "strife.js";

defineButton("foobar", async (interaction, data) => {
	// code here...
});
```

The button id (`"foobar"` in this example) and the `data` parameter of the callback function are both taken from the button's `customId`. For example, if the `customId` is `"abcd_foobar"`, then the callback for the `foobar` button will be called and the `data` parameter will have a value of `"abcd"`.

The button `data` may not have underscores but the `id` may. For example, a `customId` of `"foo_bar_baz"` will result in an `id` of `"bar_baz"` and the `data` `"foo"`. You can also omit the data from the `customId` alltogether - a `customId` of `"_foobar"` will result in an `id` of `"foobar"` and the `data` `""`.

It is not required for all `customId`s to follow this format nor to have an associated handler. You are free to collect interactions in any other way you wish alongside or independent of strife.js.

`defineModal` and `defineSelect` work in the same way as `defineButton`, but for modals and select menus respectively.

## Style Guide

None of the following are requirements other than those using the word "must", however they are all *strongly* encoraged. An ESLint plugin to enforce this style guide may be created in the future.

It is reccomended to call your [`modulesDir`](#modulesdir) `modules`. Each file or folder in `modulesDir` should be a different feature of your bot.

It is discoraged to import one module from another. Each module should work independently.

### File Modules

JavaScript files that lie directly inside `modulesDir` should be short - a couple hundred lines at most. If they are any longer, make them [directory modules](#directory-modules) instead.

### Directory Modules

Subdirectories of `modulesDir` *must* have an `index.js` file. This file should contain all the definitions for the module. In other words, `defineCommand`, `defineEvent`, etc. should only be used in the `index.js` of directory modules. If any callback is more than a few dozen lines long, it should instead be imported from another file in the same directory. If multiple files use the same values, constants for example, they should go in `misc.js` in that directory.

## Imports

This guide references the following imported values in inline code blocks:

```js
import {
	type ApplicationCommandOptionType
	type AutocompleteInteraction,
	type Awaitable,
	type ChannelType,
	type ClientOptions,
	type RepliableInteraction,
	type Snowflake,
	ApplicationCommandType,
} from "discord.js";
import {
	type ClientEvent,
	defineButton,
	defineCommand,
	defineEvent,
	defineModal,
	defineSelect,
} from "strife.js";
import path from "node:path";
import url from "node:url";
```

Values only referenced in multiline code blocks are not listed here as they are imported there.
