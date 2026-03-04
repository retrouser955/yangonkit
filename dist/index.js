"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  OPTION_TYPES_MAP: () => OPTION_TYPES_MAP,
  YangonKit: () => YangonKit
});
module.exports = __toCommonJS(index_exports);

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
var import_commandkit = require("commandkit");
var import_ts_morph = require("ts-morph");
var YangonKit = class extends import_commandkit.CompilerPlugin {
  name = "com.retrouser955.commadkit.yangonkit";
  async activate(ctx) {
    import_commandkit.Logger.info("YangonKit Activated");
  }
  async deactivate(ctx) {
    import_commandkit.Logger.info("YangonKit going out!");
  }
  async transform(params) {
    const { code, id } = params;
    import_commandkit.Logger.info(`[YANGON KIT]: Generating code for: ${id}`);
    if (!id.includes("/commands/")) return;
    const project = new import_ts_morph.Project({
      skipAddingFilesFromTsConfig: true,
      useInMemoryFileSystem: true
    });
    const source = project.createSourceFile(id, code, {
      overwrite: true
    });
    const label = source.getChildrenOfKind(import_ts_morph.SyntaxKind.LabeledStatement)[0];
    const neightbor = label.getNextSibling((node) => node.isKind(import_ts_morph.SyntaxKind.FunctionDeclaration));
    if (!neightbor) throw new Error("Nearest neighbor not a function.");
    neightbor.toggleModifier("default", false);
    const paramName = `__kit_tmp_ctx_${Math.floor(Date.now() / 1e3)}`;
    neightbor.insertParameter(0, {
      name: paramName,
      type: "ChatInputCommandContext"
    });
    const commandMacro = label.getDescendantsOfKind(import_ts_morph.SyntaxKind.CallExpression)[0];
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
    const paramMacros = neightbor.getDescendantsOfKind(import_ts_morph.SyntaxKind.CallExpression).filter((node) => node.getExpression().isKind(import_ts_morph.SyntaxKind.Identifier) && node.getExpression().getText() === "$param");
    const options = [];
    for (const param of paramMacros) {
      const args = param.getArguments();
      const type = args[0].getText();
      const opts = args[1].asKindOrThrow(import_ts_morph.SyntaxKind.ObjectLiteralExpression);
      const optsText = opts.getText().trim();
      const optionName = param.getParentIfKindOrThrow(import_ts_morph.SyntaxKind.VariableDeclaration).getName();
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
    import_commandkit.Logger.info(`[YANGON KIT]: Finished code for: ${id}`);
    return {
      code: source.getFullText()
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OPTION_TYPES_MAP,
  YangonKit
});
