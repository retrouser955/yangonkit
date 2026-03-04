import { CompilerPlugin, CompilerPluginRuntime, PluginTransformParameters, MaybeFalsey, TransformedResult } from 'commandkit';
import { ApplicationCommandOptionType, RESTPostAPIApplicationCommandsJSONBody, CommandInteractionOptionResolver } from 'discord.js';

declare const OPTION_TYPES_MAP: {
    readonly Attachment: "getAttachment";
    readonly Boolean: "getBoolean";
    readonly Channel: "getChannel";
    readonly Integer: "getInteger";
    readonly Mentionable: "getMentionable";
    readonly Number: "getNumber";
    readonly Role: "getRole";
    readonly String: "getString";
    readonly Subcommand: "getSubcommand";
    readonly SubcommandGroup: "getSubcommandGroup";
    readonly User: "getUser";
};

declare class YangonKit extends CompilerPlugin {
    readonly name = "com.retrouser955.commadkit.yangonkit";
    activate(ctx: CompilerPluginRuntime): Promise<void>;
    deactivate(ctx: CompilerPluginRuntime): Promise<void>;
    transform(params: PluginTransformParameters): Promise<MaybeFalsey<TransformedResult>>;
}

type ParamReturnType = {
    [ApplicationCommandOptionType.Attachment]: NonNullable<ReturnType<CommandInteractionOptionResolver['getAttachment']>>;
    [ApplicationCommandOptionType.Boolean]: NonNullable<ReturnType<CommandInteractionOptionResolver['getBoolean']>>;
    [ApplicationCommandOptionType.Channel]: NonNullable<ReturnType<CommandInteractionOptionResolver['getChannel']>>;
    [ApplicationCommandOptionType.Integer]: NonNullable<ReturnType<CommandInteractionOptionResolver['getInteger']>>;
    [ApplicationCommandOptionType.Mentionable]: NonNullable<ReturnType<CommandInteractionOptionResolver['getMentionable']>>;
    [ApplicationCommandOptionType.Number]: NonNullable<ReturnType<CommandInteractionOptionResolver['getNumber']>>;
    [ApplicationCommandOptionType.Role]: NonNullable<ReturnType<CommandInteractionOptionResolver['getRole']>>;
    [ApplicationCommandOptionType.String]: NonNullable<ReturnType<CommandInteractionOptionResolver['getString']>>;
    [ApplicationCommandOptionType.Subcommand]: NonNullable<ReturnType<CommandInteractionOptionResolver['getSubcommand']>>;
    [ApplicationCommandOptionType.SubcommandGroup]: NonNullable<ReturnType<CommandInteractionOptionResolver['getSubcommandGroup']>>;
    [ApplicationCommandOptionType.User]: NonNullable<ReturnType<CommandInteractionOptionResolver['getUser']>>;
}

type ExtractArrayType<T> = T extends Array<infer R> ? R : never;

type KitOptions = ExtractArrayType<RESTPostAPIApplicationCommandsJSONBody['options']>

type KitOptionsParsed<T extends ApplicationCommandOptionType> = Omit<Extract<KitOptions, {
    type: T
}>, "type" | "name">

declare global {
    function $param<
        T extends ApplicationCommandOptionType,
        O extends KitOptionsParsed<T>
    >(
        type: T,
        options: O
    ): O extends { required: true } ?
        ParamReturnType[T] :
        T extends ApplicationCommandOptionType.Subcommand ?
        ParamReturnType[T] :
        T extends ApplicationCommandOptionType.SubcommandGroup ?
        ParamReturnType[T] :
        ParamReturnType[T] | undefined;

    function SlashCommand(description: string): void;
}

export { OPTION_TYPES_MAP, YangonKit };
