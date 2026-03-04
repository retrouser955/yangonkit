import { CompilerPlugin, CompilerPluginRuntime, Logger, MaybeFalsey, PluginTransformParameters, TransformedResult } from "commandkit";
import { Project, SyntaxKind } from "ts-morph";
import { OPTION_TYPES_MAP } from "../Constants";
import { writeFile } from "node:fs/promises"
import path from "node:path";

export class YangonKit extends CompilerPlugin {
    public readonly name = "com.retrouser955.commadkit.yangonkit";

    async activate(ctx: CompilerPluginRuntime): Promise<void> {
        Logger.info("YangonKit Activated");
        ctx.registerTemplate("command", async (args) => {
            const namePlain = args.splice(0, 1)[0];
            if(!namePlain) throw new Error("name is required.")

            const nameArr = namePlain.split("/");

            const name = nameArr[nameArr.length - 1];

            const description = args.join(" ")
            const template = `
            import { ChatInputCommandContext } from "commandkit";
                
            $: SlashCommand("${description.trim() ?? "A Slash Command"}")
            export default function ${name}({ interaction }: ChatInputCommandContext) {  
                interaction.reply("Hello from ${name}");
            }
            `.trim();

            await writeFile(path.join(process.cwd(), "src", "app", "commands", namePlain + ".ts"), template);
        })
    }

    async deactivate(ctx: CompilerPluginRuntime): Promise<void> {
        ctx.unregisterTemplate("command");
        Logger.info("YangonKit going out!");
    }

    async transform(params: PluginTransformParameters): Promise<MaybeFalsey<TransformedResult>> {
        const { code, id } = params;

        Logger.info(`[YANGON KIT]: Generating code for: ${id}`);

        // no transformation on non command files
        if (!id.includes("/commands/")) return;

        const project = new Project({
            skipAddingFilesFromTsConfig: true,
            useInMemoryFileSystem: true
        })

        const source = project.createSourceFile(id, code, {
            overwrite: true
        });

        const label = source.getChildrenOfKind(SyntaxKind.LabeledStatement)[0];

        const neightbor = label.getNextSibling((node) => node.isKind(SyntaxKind.FunctionDeclaration));

        if (!neightbor) throw new Error("Nearest neighbor not a function.");

        neightbor.toggleModifier("default", false);

        const paramName = `__kit_tmp_ctx_${Math.floor(Date.now() / 1000)}`;

        neightbor.insertParameter(0, {
            name: paramName,
            type: "ChatInputCommandContext"
        })

        const commandMacro = label.getDescendantsOfKind(SyntaxKind.CallExpression)[0];

        if (!['SlashCommand', 'MessageCommand'].includes(commandMacro.getExpression().getText())) throw new Error("Not a valid macro");

        const commandName = structuredClone(neightbor.getName());

        neightbor.rename("chatInput");

        const description = commandMacro.getArguments()[0].getText();
        const descriptionParsed = description.slice(1).slice(0, -1);

        const bodyText = neightbor.getBodyText();
        const tmpVarName = `__kit_tmp_opt_${Math.floor(Date.now() / 1000)}`;

        const actualArg = neightbor.getParameters()[1];
        const bindingPattern = actualArg.getNameNode();

        const bindingText = `const ${bindingPattern.getText()} = ${paramName};`;
        const replacedText = `${bindingText}\nconst ${tmpVarName} = ${paramName}.interaction.options;\n\n` + bodyText;

        actualArg.remove();

        neightbor.setBodyText(replacedText);

        if (!commandName) throw new Error("Command name not found"); // function is anon

        const paramMacros = neightbor
            .getDescendantsOfKind(SyntaxKind.CallExpression)
            .filter((node) => node.getExpression().isKind(SyntaxKind.Identifier) && node.getExpression().getText() === "$param")

        const options: string[] = [];

        for (const param of paramMacros) {
            const args = param.getArguments();
            const type = args[0].getText();

            const opts = args[1].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
            const optsText = opts.getText().trim();

            const optionName = param.getParentIfKindOrThrow(SyntaxKind.VariableDeclaration).getName();

            let optsTextCurlyRemoved = optsText.slice(0, -1).trim();
            if (!optsTextCurlyRemoved.endsWith(",")) optsTextCurlyRemoved += ",";
            optsTextCurlyRemoved += `\n\ttype: ${type},\n\tname: "${optionName}"\n}`;

            options.push(optsTextCurlyRemoved);

            // @ts-expect-error
            param.replaceWithText(`${tmpVarName}.${OPTION_TYPES_MAP[type.trim().replace("ApplicationCommandOptionType.", "")]}("${optionName}")`);
        }

        source.addStatements((writer) => {
            writer.write("export const command = ")
                .block(() => {
                    writer
                        .writeLine(`name: "${commandName}",`)
                        .writeLine(`description: "${descriptionParsed}",`)
                        .writeLine("options: [")
                        .indent(() => {
                            options.forEach((v, i) => {
                                writer
                                    .writeLine("{")
                                    .indent(() => {
                                        const lines = v.trim().slice(1).slice(0, -1).trim().split(",");
                                        for (const line of lines) {
                                            writer.writeLine(line.trim() + ",");
                                        }
                                    })
                                    .writeLine(`}${(i + 1) === options.length ? "" : ","}`)
                            })
                        })
                        .writeLine("]")
                })
        });

        label.remove();

        Logger.info(`[YANGON KIT]: Finished code for: ${id}`);

        return {
            code: source.getFullText()
        }
    }
}