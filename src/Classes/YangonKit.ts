import { CompilerPlugin, CompilerPluginRuntime, Logger, MaybeFalsey, PluginTransformParameters, TransformedResult } from "commandkit";
import { Project, SyntaxKind } from "ts-morph";
import { writeFile } from "node:fs/promises"
import path from "node:path";
import { processSlashCommand } from "./Generators";

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

        // no transformation on non command files
        if (!id.includes("/commands/")) return;
        Logger.info(`[YANGON KIT]: Generating code for: ${id}`);

        const project = new Project({
            skipAddingFilesFromTsConfig: true,
            useInMemoryFileSystem: true
        })

        const source = project.createSourceFile(id, code, {
            overwrite: true
        });

        const label = source.getChildrenOfKind(SyntaxKind.LabeledStatement)[0];

        if(label.getLabel().getText() !== "$") return;

        const neighbor = label.getNextSibling((node) => node.isKind(SyntaxKind.FunctionDeclaration));

        if (!neighbor) throw new Error("Nearest neighbor not a function.");

        const commandMacro = label.getDescendantsOfKind(SyntaxKind.CallExpression)[0];

        const name = commandMacro.getExpression().getText();

        // TODO: Add support for message commands
        if (!['SlashCommand'].includes(name)) return;

        let result: string | undefined = undefined;

        if(name === "SlashCommand") {
            result = processSlashCommand(source, neighbor, commandMacro, label);
        }

        Logger.info(`[YANGON KIT]: Finished code for: ${id}`);

        if(result) return {
            code: result
        }
    }
}