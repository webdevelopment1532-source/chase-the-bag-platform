"use strict";
describe("Security Setup", () => {
    test("No token in codebase", () => {
        const fs = require("fs");
        const files = fs.readdirSync("./src");
        let found = false;
        files.forEach((file) => {
            const filePath = `./src/${file}`;
            if (fs.statSync(filePath).isFile()) {
                const content = fs.readFileSync(filePath, "utf8");
                if (content.includes("DISCORD_TOKEN="))
                    found = true;
            }
        });
        expect(found).toBe(false);
    });
    // Add more security tests as needed
});
