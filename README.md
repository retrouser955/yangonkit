# YangonKit - CommandKit made simpler

YangonKit is a compiler framework for CommandKit that introduces Svelte-like runes (icons) for your Discord bots.

# Getting started

Getting started with YangonKit is extremely easy.

## Installation

[Create a CommandKit bot](https://commandkit.js.org/docs/guide/getting-started/introduction) and install yangonkit via the following command.

```bash
$ npm install --dev yangonkit
```

## Configuration

Now, go into your commandkit.config.ts file and add YangonKit to the code.

```ts
import { defineConfig } from "commandkit/config";
import { yangonKit } from "yangonkit";

export default defineConfig({
    plugins: [
        yangonKit()
    ]
})
```

## Creating an icon-powered Command

### What are icons?

Icons are compiler flags that yangonkit exposes. It tells yangonkit that a particular piece of code is related to the compiler. Icons are always prefixed with a $ or labeled $: (similar to svelte's runes) and the contains **no working code** inside the function.

Let us make a command. We will use a **say** command as an example as it makes great use of the `$param` icon.

```ts
import { ChatInputCommandContext } from "commandkit";
import { ApplicationCommandOptionType } from "discord.js";

$: SlashCommand("Say something")
export default function say({ interaction }: ChatInputCommandContext) {
    const message = $param(ApplicationCommandOptionType.String, {
        description: "What would you like to say?",
        required: true
    });

    interaction.reply(message);
}
```

When YangonKit compiles this code, it transforms it into:

```ts
import { ChatInputCommandContext } from "commandkit";
import { ApplicationCommandOptionType } from "discord.js";

export const command = {
    name: "say",
    description: "Say something",
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "message",
            description: "What would you like to say?",
            required: true
        }
    ]
}

function chatInput(context: ChatInputCommandContext) {
    const { interaction } = context;
    const __options = interaction.options;
    
    const message = __options.getString("message");

    interaction.reply(message);
}
```

## Available Icons

### $: SlashCommand(description, options?)

Creates a chat input (slash) command. The function immediately following this icon becomes the command handler.

**Parameters:**
- `description` (string, required): The command description shown in Discord
- `options` (object, optional): Additional command options (extends `CommandData` minus name, description, and options)

**Example:**
```ts
$: SlashCommand("Greets a user")
export default function greet({ interaction }: ChatInputCommandContext) {
    interaction.reply("Hello!");
}
```

### $param(type, options)

Declares a command option/parameter. Must be used inside a `$: SlashCommand()` function body.

**Parameters:**
- `type` (ApplicationCommandOptionType): The option type
- `options` (object): Option configuration (name is inferred from variable name)

*bonus: $param is completely type-safe!*

**Example:**
```ts
$: SlashCommand("Add two numbers")
export default function add({ interaction }: ChatInputCommandContext) {
    const firstNumber = $param(ApplicationCommandOptionType.Integer, {
        description: "First number",
        required: true
    });

    const secondNumber = $param(ApplicationCommandOptionType.Integer, {
        description: "Second number",
        required: true
    });

    const result = firstNumber + secondNumber;
    interaction.reply(`Result: ${result}`);
}
```

## Option Types

YangonKit supports all Discord.js `ApplicationCommandOptionType` options:

- `String` - Text input
- `Integer` - Whole number
- `Number` - Decimal number
- `Boolean` - True/false toggle
- `User` - Discord user
- `Role` - Discord role
- `Channel` - Discord channel
- `Mentionable` - User or role
- `Attachment` - File attachment
- `Subcommand` - Nested command
- `SubcommandGroup` - Group of subcommands

## File Structure

Place your icon-powered commands in the `src/app/commands/` directory:

```
src/
└── app/
    └── commands/
        ├── say.ts
        ├── ping.ts
        └── userinfo.ts
```