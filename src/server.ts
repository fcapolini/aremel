import AremelServer from "./server/server";

new AremelServer({
    port: 3001,
    rootPath: process.cwd(),
    trustProxy: true,
    assumeHttps: true,
    useCache: true,
});
