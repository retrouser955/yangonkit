import type { CallExpression, FunctionDeclaration, SourceFile, ts } from "ts-morph";
import { SyntaxKind, VariableDeclarationKind } from "ts-morph";
import { generateCurrentUnix } from "../Utils";
import { OPTION_TYPES_MAP } from "../../Constants";

export function processSlashCommand(source: SourceFile, neighbor: FunctionDeclaration, commandMacro: CallExpression<ts.CallExpression>) {
    neighbor.toggleModifier("default", false);

    const paramName = `__kit_tmp_ctx_${generateCurrentUnix()}`;

    neighbor.insertParameter(0, {
        name: paramName,
        type: "ChatInputCommandContext"
    })

    const commandName = structuredClone(neighbor.getName());

    neighbor.rename("chatInput");

    const args = commandMacro.getArguments();

    const description = args[0].getText();
    const descriptionParsed = description.slice(1).slice(0, -1);

    const bodyText = neighbor.getBodyText();
    const tmpVarName = `__kit_tmp_opt_${generateCurrentUnix()}`;

    const actualArg = neighbor.getParameters()[1];
    const bindingPattern = actualArg.getNameNode();

    const bindingText = `const ${bindingPattern.getText()} = ${paramName};`;
    const replacedText = `${bindingText}\nconst ${tmpVarName} = ${paramName}.interaction.options;\n\n` + bodyText;

    actualArg.remove();

    neighbor.setBodyText(replacedText);

    if (!commandName) throw new Error("Command name not found"); // function is anon

    const paramMacros = neighbor
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter((node) => node.getExpression().isKind(SyntaxKind.Identifier) && node.getExpression().getText() === "$param")

    const options: string[] = [];

    for (const param of paramMacros) {
        const optionName = param.getParentIfKindOrThrow(SyntaxKind.VariableDeclaration).getName();
        const optionNameVar = `__kit_tmp_opt_${optionName}_${generateCurrentUnix()}`;

        const args = param.getArguments();
        const type = args[0].getText();

        const opts = args[1].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

        opts.addPropertyAssignment({
            name: "type",
            initializer: type
        })
        opts.addPropertyAssignment({
            name: "name",
            initializer: JSON.stringify(optionName)
        })

        const optsText = opts.getText().trim();

        source.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [{
                name: optionNameVar,
                initializer: optsText
            }]
        })

        options.push(optionNameVar);

        // @ts-expect-error
        param.replaceWithText(`${tmpVarName}.${OPTION_TYPES_MAP[type.trim().replace("ApplicationCommandOptionType.", "")]}("${optionName}")`);
    }

    const commandStatement = source.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        isExported: true,
        declarations: [
            {
                name: "command",
                initializer: "{}"
            }
        ]
    })

    const dec = commandStatement.getDeclarations()[0].getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);

    dec.addPropertyAssignment({
        name: "name",
        initializer: JSON.stringify(commandName)
    })
    dec.addPropertyAssignment({
        name: "description",
        initializer: JSON.stringify(descriptionParsed)
    })

    if(args.length > 1 && args[1].isKind(SyntaxKind.ObjectLiteralExpression)) {
        const opts = args[1].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
        const props = opts.getProperties();

        for(const prop of props) {
            if(prop.isKind(SyntaxKind.PropertyAssignment)) {
                const name = prop.getName();
                const initializer = prop.getInitializer();
                dec.addPropertyAssignment({
                    name,
                    initializer: initializer?.getText() || "undefined"
                })
            }
        }
    }

    dec.addPropertyAssignment({
        name: "options",
        initializer: (writer) => {
            writer
                .write("[")
                .indent(() => {
                    for(const option of options) {
                        writer.writeLine(option + ",");
                    }
                })
                .write("\n]")
        }
    })

    return source.getText();
}