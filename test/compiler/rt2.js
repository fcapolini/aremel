function(__rt) {
	function __nn(v) {return v != null ? v : "";}
	function __add(v) {__rt.values.push(v); return v;}
	function __link(l) {__rt.links.push(l);}
	function __ev(h) {__rt.evhandlers.push(h);}
	var __this = __scope_0 = {__dom: __rt.page.nodes[0], __doc: __dom.ownerDocument};
	var body;
	__f = function (__outer, __outer_get_data, __outer_data, __add, __link, __ev, __domGetter, __self) {
		var __this = __scope_1 = {__outer: __outer, __dom: __rt.page.nodes[1], __self: __self};
		__this.v1 = __add({v: "a"});
		Object.defineProperty(__this, "v1", {get: function () {return __rt.get(v1)}, set: function (v) {return __rt.set(v1, v)}});
		Object.defineProperty(__this, "__value_v1", {get: function () {return v1}});
		__this.v2 = __add({fn: function () {__scope_1.v1 + "!";}});
		Object.defineProperty(__this, "v2", {get: function () {return __rt.get(v2)}, set: function (v) {return __rt.set(v2, v)}});
		Object.defineProperty(__this, "__value_v2", {get: function () {return v2}});
		return __this;
	}
	body = __f(__this, __get_data, data, __add, __link, __ev, __domGetter, __f);
	return __this;
}