
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
