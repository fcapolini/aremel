import Compiler from "../compiler/compiler";

// @ts-ignore
export default function({filePath, url}) {
    // console.log(`recover-worker: "${filePath}", "${url}"`);//tempdebug
    function f(cb:(res:any)=>void, err:(err:any)=>void) {
        Compiler.recoverPage(filePath, url, (html) => {
            cb({html:html});
        }, (error) => {
            err({err:error});
        });
    }
    return new Promise(f);
}
