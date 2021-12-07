import AremelClient from "./client/client";
import { DomDocument } from "./shared/dom";

new AremelClient(document as unknown as DomDocument, window);
