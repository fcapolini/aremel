import AremelServer from "./server/server";

new AremelServer({
    port: 3000,
    rootPath: process.cwd(),
});
