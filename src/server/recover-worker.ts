import { parentPort, workerData } from "worker_threads";
import Compiler from "../compiler/compiler";


async function recoverPage() {
    const {filePath, url} = workerData;
    console.log(`recover-worker: "${filePath}","${url}"`);//tempdebug
    Compiler.recoverPage(filePath, url, (html) => {
        parentPort?.postMessage({html:html});
    }, (err) => {
        parentPort?.postMessage({err:err});
    });
}
recoverPage();
