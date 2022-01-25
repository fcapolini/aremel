import AremelServer from "./server/server";

new AremelServer({
    port: 3001,
    rootPath: process.cwd(),
    trustProxy: false,
    assumeHttps: false,
    useCache: true,
});
