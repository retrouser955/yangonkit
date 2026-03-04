// src/Constants.ts
var OPTION_TYPES_MAP = {
  "Attachment": "getAttachment",
  "Boolean": "getBoolean",
  "Channel": "getChannel",
  "Integer": "getInteger",
  "Mentionable": "getMentionable",
  "Number": "getNumber",
  "Role": "getRole",
  "String": "getString",
  "Subcommand": "getSubcommand",
  "SubcommandGroup": "getSubcommandGroup",
  "User": "getUser"
};

// src/Classes/YangonKit.ts
import { CompilerPlugin, Logger } from "commandkit";
import { Project, SyntaxKind } from "ts-morph";
var YangonKit = class extends CompilerPlugin {
  name = "com.retrouser955.commadkit.yangonkit";
  async activate(ctx) {
    Logger.info("YangonKit Activated");
  }
  async deactivate(ctx) {
    Logger.info("YangonKit going out!");
  }
  async transform(params) {
    const { code, id } = params;
    Logger.info(`[YANGON KIT]: Generating code for: ${id}`);
    if (!id.includes("/commands/")) return;
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      useInMemoryFileSystem: true
    });
    const source = project.createSourceFile(id, code, {
      overwrite: true
    });
    const label = source.getChildrenOfKind(SyntaxKind.LabeledStatement)[0];
    const neightbor = label.getNextSibling((node) => node.isKind(SyntaxKind.FunctionDeclaration));
    if (!neightbor) throw new Error("Nearest neighbor not a function.");
    neightbor.toggleModifier("default", false);
    const paramName = `__kit_tmp_ctx_${Math.floor(Date.now() / 1e3)}`;
    neightbor.insertParameter(0, {
      name: paramName,
      type: "ChatInputCommandContext"
    });
    const commandMacro = label.getDescendantsOfKind(SyntaxKind.CallExpression)[0];
    if (!["SlashCommand", "MessageCommand"].includes(commandMacro.getExpression().getText())) throw new Error("Not a valid macro");
    const commandName = structuredClone(neightbor.getName());
    neightbor.rename("chatInput");
    const description = commandMacro.getArguments()[0].getText();
    const descriptionParsed = description.slice(1).slice(0, -1);
    const bodyText = neightbor.getBodyText();
    const tmpVarName = `__kit_tmp_opt_${Math.floor(Date.now() / 1e3)}`;
    const actualArg = neightbor.getParameters()[1];
    const bindingPattern = actualArg.getNameNode();
    const bindingText = `const ${bindingPattern.getText()} = ${paramName};`;
    const replacedText = `${bindingText}
const ${tmpVarName} = ${paramName}.interaction.options;

` + bodyText;
    actualArg.remove();
    neightbor.setBodyText(replacedText);
    if (!commandName) throw new Error("Command name not found");
    const paramMacros = neightbor.getDescendantsOfKind(SyntaxKind.CallExpression).filter((node) => node.getExpression().isKind(SyntaxKind.Identifier) && node.getExpression().getText() === "$param");
    const options = [];
    for (const param of paramMacros) {
      const args = param.getArguments();
      const type = args[0].getText();
      const opts = args[1].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const optsText = opts.getText().trim();
      const optionName = param.getParentIfKindOrThrow(SyntaxKind.VariableDeclaration).getName();
      let optsTextCurlyRemoved = optsText.slice(0, -1).trim();
      if (!optsTextCurlyRemoved.endsWith(",")) optsTextCurlyRemoved += ",";
      optsTextCurlyRemoved += `
	type: ${type},
	name: "${optionName}"
}`;
      options.push(optsTextCurlyRemoved);
      param.replaceWithText(`${tmpVarName}.${OPTION_TYPES_MAP[type.trim().replace("ApplicationCommandOptionType.", "")]}("${optionName}")`);
    }
    source.addStatements((writer) => {
      writer.write("export const command = ").block(() => {
        writer.writeLine(`name: "${commandName}",`).writeLine(`description: "${descriptionParsed}",`).writeLine("options: [").indent(() => {
          options.forEach((v, i) => {
            writer.writeLine("{").indent(() => {
              const lines = v.trim().slice(1).slice(0, -1).trim().split("\n");
              for (const line of lines) {
                writer.writeLine(line.trim());
              }
            }).writeLine(`}${i + 1 === options.length ? "" : ","}`);
          });
        }).writeLine("]");
      });
    });
    label.remove();
    Logger.info(`[YANGON KIT]: Finished code for: ${id}`);
    return {
      code: source.getFullText()
    };
  }
};
export {
  OPTION_TYPES_MAP,
  YangonKit
};
