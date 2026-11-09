import { AutocompleteCommandContext, CommandData } from "commandkit";
import {
    ApplicationCommandOptionType,
    CommandInteractionOptionResolver,
    RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

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
}>, "type" | "name" | "required">

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type MaybePromise<T> = T | Promise<T>;

type KitCommandData = Omit<CommandData, "description" | "options" | "name">;
type KitAutoCompleteReturnType = { name: string, value: string }[];
type KitAutoCompleteHandler = (query: AutocompleteCommandContext) => MaybePromise<KitAutoCompleteReturnType | void>;

type ParamOptions<T extends ApplicationCommandOptionType> =
    KitOptionsParsed<T> &
    (T extends ApplicationCommandOptionType.String
        ? { autocomplete?: KitAutoCompleteHandler }
        : {});

declare global {
    function $param<
        T extends ApplicationCommandOptionType,
        R extends boolean = false
    >(
        type: T,
        options: ParamOptions<T> & { required?: R }
    ): T extends ApplicationCommandOptionType.Subcommand ?
        ParamReturnType[T] :
        T extends ApplicationCommandOptionType.SubcommandGroup ?
        ParamReturnType[T] : 
        R extends true ?
            ParamReturnType[T] :
            ParamReturnType[T] | undefined;

    function SlashCommand(description: string, options?: KitCommandData): void;
}