import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const env = dotenv.config();
dotenvExpand.expand(env);

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL,
    },
    schema: "prisma/schema.prisma",
});
