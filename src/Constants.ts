export const OPTION_TYPES_MAP = {
    'Attachment': "getAttachment",
    'Boolean': "getBoolean",
    'Channel': "getChannel",
    'Integer': "getInteger",
    'Mentionable': "getMentionable",
    'Number': "getNumber",
    'Role': "getRole",
    'String': "getString",
    'Subcommand': "getSubcommand",
    'SubcommandGroup': "getSubcommandGroup",
    'User': "getUser"
} as const;

export const PING_CMD_TEMPLATE = `
import type { ChatInputCommandContext } from "commandkit";

$: SlashCommand("Replies with a pong!")
export default function ping({ interaction }: ChatInputCommandContext) {
    interaction.reply("pong!");
}
`.trim();