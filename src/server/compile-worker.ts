import { parentPort, workerData } from "worker_threads";
import Compiler from "../compiler/compiler";


async function compilePage() {
    const {rootPath, url} = workerData;
    console.log(`compile-worker: "${rootPath}","${url}"`);//tempdebug
    Compiler.getPage(rootPath, url, (html, sources) => {
        parentPort?.postMessage({html:html, sources:sources});
    }, (err) => {
        parentPort?.postMessage({err:err});
    });
}
compilePage();
