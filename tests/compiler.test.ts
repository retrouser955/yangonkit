import { describe, expect, it } from "vitest";
import { YangonKit } from "../src/index";
import type { TransformedResult } from "commandkit";

const yangonKit = new YangonKit({});

// @ts-expect-error mock compiler plugin for yangonkit
await yangonKit.activate({
    registerTemplate() { }
})

const COMPILER_TEST_CODE_NO_JSX = `
import type { ChatInputCommandContext } from "commandkit";

$: SlashCommand("Replies with a pong!")
export default function ping({ interaction }: ChatInputCommandContext) {
    interaction.reply("pong!");
}
`.trim();

const COMPILER_TEST_CODE_NO_JSX_OPTIONS = `
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
    interaction.reply(\`Result: \${result}\`);
}
`.trim();

const COMPILER_TEST_CODE_JSX = `
import type { ChatInputCommandContext } from "commandkit";
import { Container, TextDisplay } from "commandkit";

$: SlashCommand("Replies with a pong test JSX!")
export default function ping({ interaction }: ChatInputCommandContext) {
    const container = (
        <Container accentColor={Colors.Blue}>
            <TextDisplay content="Welcome!" />
            <TextDisplay content="This is a test example!" />
        </Container>
    );
}
`.trim();

describe("YangonKit.transform()", () => {
    it("should transform a SlashCommand macro", async () => {
        const result = await yangonKit.transform({
            code: COMPILER_TEST_CODE_NO_JSX,
            id: "/commands/ping.ts"
        });

        expect(result).toBeDefined();
        expect(result).not.toBe(false);
        expect((result as TransformedResult).code).toContain("name: \"ping\"");
        expect((result as TransformedResult).code).toContain("description: \"Replies with a pong!\"");
    });

    it("should perserve JSX and transform", async () => {
        const result = await yangonKit.transform({
            code: COMPILER_TEST_CODE_JSX,
            id: "/commands/jsxtest.tsx"
        });

        expect(result).toBeDefined();
        expect(result).not.toBe(false);
        expect((result as TransformedResult).code).toContain("name: \"ping\"");
        expect((result as TransformedResult).code).toContain("description: \"Replies with a pong test JSX!\"");
    });

    it("should parse the option correctly", async () => {
        const result = await yangonKit.transform({
            code: COMPILER_TEST_CODE_NO_JSX_OPTIONS,
            id: "/commands/options.ts"
        });

        expect(result).toBeDefined();
        expect(result).not.toBe(false);

        // main command test
        expect((result as TransformedResult).code).toContain("name: \"add\"");
        expect((result as TransformedResult).code).toContain("description: \"Add two numbers\"");

        // options test
        expect((result as TransformedResult).code).toContain("name: \"firstNumber\"");
        expect((result as TransformedResult).code).toContain("description: \"First number\"");
    })
});