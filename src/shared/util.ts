
export class StringBuf {
	parts: string[];

	constructor() {
		this.parts = [];
	}

	add(s:string) {
		this.parts.push(s);
	}

	toString() {
		return this.parts.join('');
	}
}

export function makeCamelName(n:string):string {
	// @ts-ignore
	return new EReg('(\\-\\w)', 'g').map(n, function(re:EReg):string {
		return n.substr(re.matchedPos().pos + 1, 1).toUpperCase();
	});
}

export function makeHyphenName(n:string):string {
	// @ts-ignore
	return new EReg('([0-9a-z][A-Z])', 'g').map(n, function(re:EReg):string {
		var p = re.matchedPos().pos;
		return n.substr(p, 1).toLowerCase() + '-' + n.substr(p + 1, 1).toLowerCase();
	});
}

export function normalizeText(s?:string): string {
	if (s) {
		// @ts-ignore
		return new EReg('([\\s]+)', 'gm').map(s, (ereg) => {
			return ereg.matched(1).indexOf('\n') >= 0 ? '\n' : ' ';
		});
	}
	// @ts-ignore
	return undefined;
}

export function normalizeSpace(s?:string): string {
	if (s) {
		// @ts-ignore
		return new EReg('([\\s]+)', 'gm').map(s, (ereg) => {
			return ' ';
		});
	}
	// @ts-ignore
	return undefined;
}

export function eregMap(s:string, e:string, f:(re:any)=>string): string {
	var s = s.split('\n').join('\\n');
	// @ts-ignore
	s = new EReg(e, 'gm').map(s, (re) => {
		return f({group:(i:number) => re.matched(i).split('\\n').join('\n')});
	});
	s = s.split('\\n').join('\n');
	return s;
}

// -----------------------------------------------------------------------------
// stolen from Haxe implementation
// -----------------------------------------------------------------------------

// @ts-ignore
export function EReg(r,opt) {
	// @ts-ignore
	this.r = new RegExp(r,opt.split("u").join(""));
};
EReg.prototype = {
	// @ts-ignore
	match: function(s) {
		if(this.r.global) {
			this.r.lastIndex = 0;
		}
		this.r.m = this.r.exec(s);
		this.r.s = s;
		return this.r.m != null;
	}
	// @ts-ignore
	,matched: function(n) {
		if(this.r.m != null && n >= 0 && n < this.r.m.length) {
			return this.r.m[n];
		} else {
			throw "EReg::matched";
		}
	}
	,matchedPos: function() {
		if(this.r.m == null) {
			throw "No string matched";
		}
		return { pos : this.r.m.index, len : this.r.m[0].length};
	}
	// @ts-ignore
	,matchSub: function(s,pos,len) {
		if(len == null) {
			len = -1;
		}
		if(this.r.global) {
			this.r.lastIndex = pos;
			this.r.m = this.r.exec(len < 0 ? s : substr(s,0,pos + len));
			var b = this.r.m != null;
			if(b) {
				this.r.s = s;
			}
			return b;
		} else {
			var b2 = this.match(len < 0 ? substr(s,pos,null) : substr(s,pos,len));
			if(b2) {
				this.r.s = s;
				this.r.m.index += pos;
			}
			// @ts-ignore
			return b;
		}
	}
	// @ts-ignore
	,map: function(s,f) {
		var offset = 0;
		var buf_b = "";
		while(true) {
			if(offset >= s.length) {
				break;
			} else if(!this.matchSub(s,offset)) {
				buf_b += (''+substr(s,offset,null));
				break;
			}
			var p = this.matchedPos();
			buf_b += (''+substr(s,offset,p.pos - offset));
			buf_b += (''+f(this));
			if(p.len == 0) {
				buf_b += (''+substr(s,p.pos,1));
				offset = p.pos + 1;
			} else {
				offset = p.pos + p.len;
			}
			if(!this.r.global) {
				break;
			}
		}
		if(!this.r.global && offset > 0 && offset < s.length) {
			buf_b += (''+substr(s,offset,null));
		}
		return buf_b;
	}
	,__class__: EReg
};
// @ts-ignore
function substr(s,pos,len) {
	if(len == null) {
		len = s.length;
	} else if(len < 0) {
		if(pos == 0) {
			len = s.length + len;
		} else {
			return "";
		}
	}
	return s.substr(pos,len);
};
