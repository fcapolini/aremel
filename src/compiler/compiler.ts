import safeEval from "../server/safe-eval";
import { CODE_PREFIX, CODE_PREFIX_LEN } from "../server/server";
import { DomDocument, ELEMENT_NODE } from "../shared/dom";
import { CSS_AUTOHIDE_CLASS, make, PageObj } from "../shared/runtime";
import { normalizeText } from "../shared/util";
import App from "./app";
import { HtmlDocument, HtmlElement, HtmlText, TEXT_NODE } from "./htmldom";
import Preprocessor, { lookupTags } from "./preprocessor";
import fs from "fs";
import HtmlParser from "./htmlparser";
import AremelClient from "../client/client";

export default class Compiler {

    static getPage(rootPath: string,
                   url: string,
                   cb: (html: string, sources: Array<string>) => void,
                   err: (err: any) => void) {
        var prepro = new Preprocessor(rootPath);
        try {
            var u = new URL(url);
            var doc = prepro.read(u.pathname, `<lib>
                <style data-name="aremel">
                    .${CSS_AUTOHIDE_CLASS} {
                        display: none;
                    }
                </style>
                <:define tag=":data-source:script"
                    :url=""
                    :autoGet=[[true]]
                    :type="text/json"
                    :post=[[false]]
                    :params=[[null]]

                    type=[[type]]
                    :lastUrl=""
                    :on-url=[[
                        if (autoGet && url !== lastUrl) {
                            __rt.addRequest({
                                url:url, type:type,
                                post:post, params:undefined,
                                target:__this.__value_content,
                                scriptElement:__this.__dom
                            });
                        }
                    ]]
                    :doRequest=[[(params) => {
                        __rt.addRequest({
                            url:url, type:type,
                            post:post, params:params,
                            target:__this.__value_content,
                            scriptElement:__this.__dom
                        });
                    }]]
                    :content=[[
                        var ret = undefined;
                        if (__this.__dom.firstChild
                                && __this.__dom.firstChild.nodeType === ${TEXT_NODE}) {
                            try {
                                var s = __this.__dom.firstChild.nodeValue;
                                if (type === 'text/json') {
                                    ret = JSON.parse(s);
                                } else {
                                    ret = s;
                                }
                            } catch (ex) {
                                //TODO
                            }
                        }
                        ret;
                    ]]
                />
            </lib>`) as HtmlDocument;
            var app = new App(u, doc);
            var page = app.output();
            var rt = make(page, () => {
                Compiler._normalizeSpace(doc);
                var html = doc.toString();
                cb(html, prepro.parser.origins.slice());
            });
            var root = safeEval(`(${page.script})(rt)`, { rt: rt });
            rt.start();
            var code = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
            new HtmlText(doc, code, CODE_PREFIX + page.script, 0, 0, 0, false);
            var script = new HtmlElement(doc, root.body.__dom, 'script', 0, 0, 0);
            script.setAttribute('src', '/.aremel/bin/aremel.js');
            script.setAttribute('defer', '');
        } catch (ex: any) {
            // console.trace(ex);
            err(ex);
        }
    }

    static recoverPage(filePath:string, url:string, cb:(html:string)=>void, err:(err:any)=>void) {
        fs.readFile(filePath, 'utf8', (error, data) => {
            if (error) {
                err(error);
            } else {
                var doc = HtmlParser.parse(data);
                var body = lookupTags(
                    doc.firstElementChild,
                    new Set(['BODY'])
                )[0] as HtmlElement;
                // last two scripts are always: page code, runtime loading
                var scripts = lookupTags(body, new Set(['SCRIPT']));
                scripts.pop();
                var window = {
                    addEventListener: (t:string, h:any) => {},
                    removeEventListener: (t:string, h:any) => {},
                    location: {toString: () => url},
                };
                var script = scripts.pop() as HtmlElement;
                var code = (script.firstChild as HtmlText).nodeValue;
                code = code.substring(CODE_PREFIX_LEN);
                var page:PageObj = {
                    url: new URL(url),
                    doc: doc as DomDocument,
                    nodes: AremelClient.collectNodes(doc as DomDocument),
                    window: window,
                    isClient: false,
                    requester: App.requester,
                    script: code
                };
                var rt = make(page, () => cb(doc.toString()));
                safeEval(`(${page.script})(rt)`, {rt:rt});
                rt.start();
            }
        });
    }

    static _normalizeSpace(doc: HtmlDocument) {
        function f(e: HtmlElement) {
            for (var n of e.children) {
                if (n.nodeType === TEXT_NODE) {
                    (n as HtmlText).nodeValue = normalizeText((n as HtmlText).nodeValue);
                } else if (n.nodeType === ELEMENT_NODE) {
                    if ((n as HtmlElement).tagName === 'SCRIPT'
                        || (n as HtmlElement).tagName === 'PRE') {
                        continue;
                    }
                    f(n as HtmlElement);
                }
            }
        }
        f(doc.firstElementChild);
    }


}
