import type { CallExpression, FunctionDeclaration, LabeledStatement, SourceFile, ts } from "ts-morph";
import { SyntaxKind, VariableDeclarationKind } from "ts-morph";
import { generateCurrentUnix } from "../Utils";
import { OPTION_TYPES_MAP } from "../../Constants";
import { Logger } from "commandkit";

export function processSlashCommand(source: SourceFile, neighbor: FunctionDeclaration, commandMacro: CallExpression<ts.CallExpression>, label: LabeledStatement) {
    neighbor.toggleModifier("default", false);

    const paramName = `__kit_tmp_ctx_${generateCurrentUnix()}`;

    neighbor.insertParameter(0, {
        name: paramName,
        type: "import('commandkit').ChatInputCommandContext"
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
    const autoCompleteHandlers: string[] = [];

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

        const autocomplete = opts.getProperty("autocomplete");

        if(autocomplete && autocomplete.isKind(SyntaxKind.PropertyAssignment)) {
            const initializer = autocomplete.getInitializer();

            if(
                initializer
                &&
                (initializer.isKind(SyntaxKind.ArrowFunction) ||
                initializer.isKind(SyntaxKind.FunctionExpression) ||
                initializer.isKind(SyntaxKind.Identifier))
            ) {
                const handlerName = `__kit_tmp_autocomplete_${optionName}_${generateCurrentUnix()}`;
                source.addVariableStatement({
                    declarationKind: VariableDeclarationKind.Const,
                    declarations: [{
                        name: handlerName,
                        initializer: initializer.getText()
                    }]
                })
                
                autoCompleteHandlers.push(handlerName);
                autocomplete.setInitializer("true");
            } else {
                Logger.warn(`Autocomplete handler for option "${optionName}" is not a function or identifier. Skipping autocomplete handler generation for this option.`);
            }
        }

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

    if (args.length > 1 && args[1].isKind(SyntaxKind.ObjectLiteralExpression)) {
        const opts = args[1].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
        const props = opts.getProperties();

        for (const prop of props) {
            if (prop.isKind(SyntaxKind.PropertyAssignment)) {
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
                .writeLine("[")
                .indent(() => {
                    for (const option of options) {
                        writer.writeLine(option + ",");
                    }
                })
                .writeLine("]")
        }
    })

    if(autoCompleteHandlers.length > 0) {
        source.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            isExported: true,
            declarations: [
                {
                    name: "autocomplete",
                    initializer: (writer) => {
                        const autoCompleteInteractionVar = `__kit_tmp_auto_interaction_${generateCurrentUnix()}`;
                        writer.writeLine(`async (${autoCompleteInteractionVar}) => {`)
                        writer.indent(() => {
                            const autoCompleteCommandName = `__kit_tmp_auto_command_name_${generateCurrentUnix()}`;
                            writer.writeLine(`const ${autoCompleteCommandName} = ${autoCompleteInteractionVar}.interaction.commandName;`);

                            writer.indent(() => {
                                autoCompleteHandlers.forEach((handler) => {
                                    const handlerCommandName = handler.split("_").slice(4, -2).join("_");
                                    writer.writeLine(`if(${autoCompleteCommandName} === "${handlerCommandName}") {`);
                                    writer.indent(() => {
                                        const autoCompleteResultVar = `__kit_tmp_auto_result_${generateCurrentUnix()}`;
                                        writer.writeLine(`const ${autoCompleteResultVar} = await ${handler}(${autoCompleteInteractionVar});`);
                                        writer.writeLine(`if(Array.isArray(${autoCompleteResultVar}) && ${autoCompleteResultVar}.length > 0) ${autoCompleteInteractionVar}.interaction.respond(${autoCompleteResultVar})`);
                                        writer.writeLine("return;")
                                    })
                                    writer.writeLine("}")
                                });
                            })
                        })
                        writer.writeLine(`}`)
                    },
                    type: "import('commandkit').AutocompleteCommand"
                }
            ]
        })
    }

    label.remove();

    return source.getText();
}