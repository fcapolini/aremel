import Compiler from "../compiler/compiler";
import Preprocessor from "../compiler/preprocessor";

// @ts-ignore
export default function({rootPath, url}) {
    // console.log(`compile-worker: "${rootPath}", "${url}"`);//tempdebug
    function f(cb:(res:any)=>void, err:(err:any)=>void) {
        var prepro = new Preprocessor(rootPath);
        Compiler.getPage(prepro, url, (html, sources) => {
            cb({html:html, sources:sources});
        }, (error) => {
            err({err:error});
        });
    }
    return new Promise(f);
}
