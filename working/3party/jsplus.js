if(!Array.prototype.reduce) {
	Array.prototype.reduce = function(callback, initialValue) {
		var previous = initialValue,
			k = 0,
			length = this.length;
		if(typeof initialValue === "undefined") {
			previous = this[0];
			k = 1;
		}

		if(typeof callback === "function") {
			for(; k < length; k++) {
				this.hasOwnProperty(k) && (previous = callback(previous, this[k], k, this));
			}
		}
		return previous;
	};
}

if(!Array.prototype.forEach) {
	Array.prototype.forEach = function(callback, thisArg) {
		var T, k;
		if(this == null) {
			throw new TypeError(" this is null or not defined");
		}
		var O = Object(this);
		var len = O.length >>> 0; // Hack to convert O.length to a UInt32
		if({}.toString.call(callback) != "[object Function]") {
			throw new TypeError(callback + " is not a function");
		}
		if(thisArg) {
			T = thisArg;
		}
		k = 0;
		while(k < len) {
			var kValue;
			if(k in O) {
				kValue = O[k];
				callback.call(T, kValue, k, O);
			}
			k++;
		}
	};
}

if(!Array.prototype.every) {
	Array.prototype.every = function(fun /* , thisp */ ) {
		var len = this.length;
		if(typeof fun != "function")
			throw new TypeError();
		var thisp = arguments[1];
		for(var i = 0; i < len; i++) {
			if(i in this && !fun.call(thisp, this[i], i, this))
				return false;
		}
		return true;
	};
}

if(!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(elt /* , from */ ) {
		var len = this.length >>> 0;
		var from = Number(arguments[1]) || 0;
		from = (from < 0) ? Math.ceil(from) : Math.floor(from);
		if(from < 0)
			from += len;
		for(; from < len; from++) {
			if(from in this && this[from] === elt)
				return from;
		}
		return -1;
	};
}

if(!Array.prototype.filter) {
	Array.prototype.filter = function(fun /* , thisp */ ) {
		var len = this.length;
		if(typeof fun != "function")
			throw new TypeError();
		var res = new Array();
		var thisp = arguments[1];
		for(var i = 0; i < len; i++) {
			if(i in this) {
				var val = this[i]; // in case fun mutates this
				if(fun.call(thisp, val, i, this))
					res.push(val);
			}
		}
		return res;
	};
}
if(!Array.prototype.map) {
	Array.prototype.map = function(fun /* , thisp */ ) {
		var len = this.length;
		if(typeof fun != "function")
			throw new TypeError();
		var res = new Array(len);
		var thisp = arguments[1];
		for(var i = 0; i < len; i++) {
			if(i in this)
				res[i] = fun.call(thisp, this[i], i, this);
		}
		return res;
	};
}
if(!Array.prototype.some) {
	Array.prototype.some = function(fun /* , thisp */ ) {
		var len = this.length;
		if(typeof fun != "function")
			throw new TypeError();
		var thisp = arguments[1];
		for(var i = 0; i < len; i++) {
			if(i in this && fun.call(thisp, this[i], i, this))
				return true;
		}
		return false;
	};
}

if(!Array.prototype.find) {
	Array.prototype.find = function(fun /* , thisp */ ) {
		var len = this.length;
		if(typeof fun != "function")
			throw new TypeError();
		var thisp = arguments[1];
		for(var i = 0; i < len; i++) {
			if(i in this && fun.call(thisp, this[i], i, this))
				return this[i];
		}
		return undefined;
	};
}

if(!Array.prototype.findIndex) {
	Array.prototype.findIndex = function(fun /* , thisp */ ) {
		var len = this.length;
		if(typeof(fun) != "function") {
			throw new TypeError();
		}
		var thisp = arguments[1];
		for(var i = 0; i < len; i++) {
			if(i in this && fun.call(thisp, this[i], i, this))
				return i;
		}
		return -1;
	};
}

if(!Object.create) {
	Object.create = function(o) {
		function f() {
			this.__proto__ = o;
		};
		f.prototype = o;
		return new f;
	};
}

if(!Object.getPrototypeOf) {
	Object.getPrototypeOf = function(o) {
		return o.__proto__;
	};
}

if(!Object.keys) {
	Object.keys = function(o) {
		var a = [];
		for(var i in o) {
			if(o.hasOwnProperty(i)) {
				a.push(i);
			}
		}
		return a;
	};
}

if(!Function.prototype.delay) {
	Function.prototype.delay = function(timeout) {
		var _this = this;
		var _params = Array.prototype.slice.call(arguments, 1);
		var timer = setTimeout(function() {
			_this.call(_this, _params);
		}, timeout);
		return timer;
	};
}

if(!Date.prototype.format) {
	Date.prototype.format = function(format) {
		var o = {
			"M+": this.getMonth() + 1, // month
			"d+": this.getDate(), // day
			"h+": this.getHours(), // hour
			"m+": this.getMinutes(), // minute
			"s+": this.getSeconds(), // second
			"SSS": this.getMilliseconds(), // millisecond
			"S+": this.getMilliseconds()
			// millisecond
		}
		if(/(y+)/.test(format)) {
			format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
		}
		for(var k in o) {
			if(new RegExp("(" + k + ")").test(format)) {
				format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("00" + o[k]).length - k.length));
			}
		}
		return format;
	};
}

if(!String.prototype.toDate) {
	String.prototype.toDate = function() {
		var re = new RegExp("^\\d+$");
		if(this.match(re)) {
			if(this.length == 8) {
				return new Date(this.substr(0, 4), this.substr(4, 2) - 1, this.substr(6, 2));
			}
			if(this.length == 14) {
				return new Date(this.substr(0, 4), this.substr(4, 2) - 1, this.substr(6, 2), this.substr(8, 2), this.substr(10, 2), this.substr(12, 2));
			}
			if(this.length == 17) {
				return new Date(this.substr(0, 4), this.substr(4, 2) - 1, this.substr(6, 2), this.substr(8, 2), this.substr(10, 2), this.substr(12, 2), this.substr(14, 3));
			}
		}
		return new Date(Date.parse(this));
	}
}

if(!Number.prototype.format) {
	Number.prototype.format = function(dec, sep) {
		if(sep === undefined || sep === null) {
			sep = "";
		}
		var n = dec >= 0 && dec <= 20 ? dec : 2;
		var s = parseFloat((this + "").replace(/[^\d\.]/g, "")).toFixed(n) + "";
		var l = s.split(".")[0].split("").reverse();
		var r = (n == 0) ? "" : s.split(".")[1];
		var t = "";
		for(i = 0; i < l.length; i++) {
			t += l[i] + ((i + 1) % 3 == 0 && (i + 1) != l.length ? sep : "");
		}
		if(n != 0) {
			s = t.split("").reverse().join("") + "." + r;
		} else {
			s = t.split("").reverse().join("");
		}
		if(this >= 0) {
			return s;
		} else {
			return "-" + s;
		}
	};
}

if(!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/(^\s*|\s*$)/g, '');
	};
}

if(!String.prototype.ltrim) {
	String.prototype.ltrim = function() {
		return this.replace(/(^\s*)/g, '');
	};
}

if(!String.prototype.rtrim) {
	String.prototype.rtrim = function() {
		return this.replace(/\s+$/, '');
	};
}

if(!String.prototype.endsWith) {
	String.prototype.endsWith = function(s) {
		if(s == null || s == "" || this.length == 0 || s.length > this.length) {
			return false;
		}
		if(this.substring(this.length - s.length) == s) {
			return true;
		}
		return false;
	};
}

if(!String.prototype.startsWith) {
	String.prototype.startsWith = function(s) {
		if(s == null || s == "" || this.length == 0 || s.length > this.length) {
			return false;
		}
		if(this.substr(0, s.length) == s) {
			return true;
		}
		return false;
	};
}
/*
 * opt 模式。默认是 g:全局， m:多行, i:不区分大小写 m 限定。默认是任意。^ 代表开始匹配， $ 代表尾部匹配 * 代表全部匹配
 */
if(!String.prototype.pattern) {
	String.prototype.pattern = function(opt, m) {
		var s = this.replace(/[\\\*\{\[\(\)\]\}\.\^\$\+\?\|\-]/g, function(n) {
			return "\\" + n;
		});
		if(m == "^") {
			s = "^" + s;
		} else if(m == "$") {
			s = s + "$";
		} else if(m == "*") {
			s = "^" + s + "$";
		}
		return new RegExp(s, (opt != undefined) ? opt : "g");
	};
}
/*
 * findWhat:RegExp 或者 文字列 replaceWith: 替换匹配到的内容 可以是function 或者 文本 replaceOther: 替换余下的内容 可以是function 或者 文本 opt, m 参照 pattern
 */
if(!String.prototype.replaceAll) {
	String.prototype.replaceAll = function(findWhat, replaceWith, replaceOther, opt, m) {
		var val = "",
			rp = ""; // , rg = "\\*{[()]}.^$+?|-"
		var fp = 0;
		var str = this;
		var exp;
		if(Object.prototype.toString.call(findWhat) === '[object RegExp]') {
			exp = findWhat;
		} else {
			exp = findWhat.pattern(opt, m);
		}
		while(true) {
			var s = exp.exec(str);
			if(s == null) {
				break;
			}
			rp = str.substring(fp, s.index);
			if(rp.length > 0) {
				val += "" + ((typeof(replaceOther) == "function") ? replaceOther(rp) : (typeof(replaceOther) == "undefined") ? rp : replaceOther);
			}
			val += "" + ((typeof(replaceWith) == "function") ? replaceWith(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9]) : replaceWith);
			fp = s.index + s[0].length;
		}
		rp = str.substring(fp);
		if(rp.length > 0) {
			val += "" + ((typeof(replaceOther) == "function") ? replaceOther(rp) : (typeof(replaceOther) == "undefined") ? rp : replaceOther);
		}
		return val;
	};
}

if(!String.prototype.toBoolean) {
	String.prototype.toBoolean = function() {
		var s = this.toLowerCase();
		if(s === "true" || s === "false" || s === "on" || s === "yes" || s === "1" || s === "-1") {
			return true;
		}
		return false;
	}

}

if(!String.prototype.dasherize) {
	String.prototype.dasherize = function(seperator) {
		var s = this.trim().replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1').replace(/-+/g, '-').toLowerCase();
		if(seperator) {
			return s.replaceAll('-', seperator).substr(1);
		}
		return s.substr(1);
	}
}

if(!String.prototype.camelize) {
	String.prototype.camelize = function(captialize) {
		var s = this.trim().replace(/(\-|_|\s)+(.)?/g, function(mathc, sep, c) {
			return(c ? c.toUpperCase() : '');
		});
		if(captialize) {
			return s.captialize();
		} else if(captialize === false) {
			return s.decaptialize();
		}
		return s;
	}
}

if(!String.prototype.captialize) {
	String.prototype.captialize = function() {
		if(this.length > 0) {
			return this.charAt(0).toUpperCase() + this.substr(1);
		}
		return this;
	}
}

if(!String.prototype.decaptialize) {
	String.prototype.decaptialize = function() {
		if(this.length > 0) {
			return this.charAt(0).toLowerCase() + this.substr(1);
		}
		return this;
	}
}

if(!String.prototype.lpad) {
	String.prototype.lpad = function(len, ch) {
		if(this.length >= len) {
			return this;
		}
		if(ch == null || ch === undefined || ch == '') {
			ch = ' ';
		}
		len = len - this.length;
		var left = Array(len + 1).join(ch);
		return left + this;
	}
}

if(!String.prototype.rpad) {
	String.prototype.rpad = function(len, ch) {
		if(this.length >= len) {
			return this;
		}
		if(ch == null || ch === undefined || ch == '') {
			ch = ' ';
		}
		len = len - this.length;
		var right = Array(len + 1).join(ch);
		return this + right;
	}
}

if(!String.prototype.pad) {
	String.prototype.pad = function(len, ch) {
		if(this.length >= len) {
			return this;
		}
		if(ch == null || ch === undefined || ch == '') {
			ch = ' ';
		}
		len = len - this.length;
		var left = Array(Math.ceil(len / 2) + 1).join(ch);
		var right = Array(Math.floor(len / 2) + 1).join(ch);
		return left + this + right;
	}
}

if(!String.prototype.left) {
	String.prototype.left = function(len) {
		return this.substr(0, len);
	}
}

if(!String.prototype.right) {
	String.prototype.right = function(len) {
		return this.substr(-len);
	}
}

if(!String.prototype.repeat) {
	String.prototype.repeat = function(n) {
		return Array(n + 1).join(this);
	}
}

if(!String.prototype.count) {
	String.prototype.count = function(ss) {
		var count = 0,
			pos = this.indexOf(ss)
		while(pos >= 0) {
			count += 1
			pos = this.indexOf(ss, pos + 1)
		}
		return count;
	};
}

if(!String.prototype.reverse) {
	String.prototype.reverse = function() {
		var s = this.split('');
		return s.reverse().join('');
	}
}

if(!String.prototype.parseCSV) {
	String.prototype.parseCSV = function(delimiter, qualifier) {
		delimiter = delimiter || ',';
		qualifier = qualifier || '"';

		var i = 0,
			fieldBuffer = [],
			fields = [],
			rows = [],
			len = this.length,
			inField = false,
			skip = false;

		while(i < len) {
			var current = this.charAt(i);
			switch(current) {
				case qualifier:
					if(inField && this.charAt(i + 1) === qualifier) {
						fieldBuffer.push(current);
						i += 1;
						break;
					}
					skip = inField;
					if(!inField) {
						fieldBuffer.length = 0;
					}
					inField = !inField;
					break;
				case delimiter:
					if(inField) {
						fieldBuffer.push(current);
					} else {
						fields.push(fieldBuffer.join(''))
						fieldBuffer.length = 0;
						skip = false;
					}
					break;
				case '\r':
					if(inField) {
						fieldBuffer.push(current);
					} else {
						fields.push(fieldBuffer.join(''))
						rows.push(fields);
						fields = [];
						fieldBuffer.length = 0;
						skip = false;
						if(this.charAt(i + 1) == '\n') {
							i += 1;
						}
					}
					break;
				default:
					if(!skip) {
						fieldBuffer.push(current);
					}
					break;
			}
			i += 1;
		}
		fields.push(fieldBuffer.join(''));
		rows.push(fields);
		return rows;
	}
}

if(!String.prototype.encodeBase64) {
	String.prototype.encodeBase64 = function() {
		var base64encodechars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var utf16to8 = function(str) {
			var out, i, len, c;
			out = "";
			len = str.length;
			for(i = 0; i < len; i++) {
				c = str.charCodeAt(i);
				if((c >= 0x0001) && (c <= 0x007f)) {
					out += str.charAt(i);
				} else if(c > 0x07ff) {
					out += String.fromCharCode(0xe0 | ((c >> 12) & 0x0f));
					out += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
					out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
				} else {
					out += String.fromCharCode(0xc0 | ((c >> 6) & 0x1f));

					out += String.fromCharCode(0x80 | ((c >> 0) & 0x3f));
				}
			}
			return out;
		}
		var str = utf16to8(this);
		var out, i, len;
		var c1, c2, c3;
		len = str.length;
		i = 0;
		out = "";
		while(i < len) {
			c1 = str.charCodeAt(i++) & 0xff;
			if(i == len) {
				out += base64encodechars.charAt(c1 >> 2);
				out += base64encodechars.charAt((c1 & 0x3) << 4);
				out += "==";
				break;
			}
			c2 = str.charCodeAt(i++);
			if(i == len) {
				out += base64encodechars.charAt(c1 >> 2);
				out += base64encodechars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
				out += base64encodechars.charAt((c2 & 0xf) << 2);
				out += "=";
				break;
			}
			c3 = str.charCodeAt(i++);
			out += base64encodechars.charAt(c1 >> 2);
			out += base64encodechars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
			out += base64encodechars.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
			out += base64encodechars.charAt(c3 & 0x3f);
		}
		return out;
	}
}

if(!String.prototype.decodeBase64) {
	String.prototype.decodeBase64 = function() {
		var base64decodechars = new Array(-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
			16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1);
		var utf8to16 = function(str) {
			var out, i, len, c;
			var char2, char3;
			out = "";
			len = str.length;
			i = 0;
			while(i < len) {
				c = str.charCodeAt(i++);
				switch(c >> 4) {
					case 0:
					case 1:
					case 2:
					case 3:
					case 4:
					case 5:
					case 6:
					case 7:
						// 0xxxxxxx
						out += str.charAt(i - 1);
						break;
					case 12:
					case 13:
						// 110x xxxx   10xx xxxx
						char2 = str.charCodeAt(i++);
						out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
						break;
					case 14:
						// 1110 xxxx  10xx xxxx  10xx xxxx
						char2 = str.charCodeAt(i++);
						char3 = str.charCodeAt(i++);
						out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0));
						break;
				}
			}
			return out;
		}
		var str = this;
		var c1, c2, c3, c4;
		var i, len, out;
		len = str.length;
		i = 0;
		out = "";
		while(i < len) {

			do {
				c1 = base64decodechars[str.charCodeAt(i++) & 0xff];
			} while (i < len && c1 == -1);
			if(c1 == -1)
				break;

			do {
				c2 = base64decodechars[str.charCodeAt(i++) & 0xff];
			} while (i < len && c2 == -1);
			if(c2 == -1)
				break;
			out += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));

			do {
				c3 = str.charCodeAt(i++) & 0xff;
				if(c3 == 61)
					return out;
				c3 = base64decodechars[c3];
			} while (i < len && c3 == -1);
			if(c3 == -1)
				break;
			out += String.fromCharCode(((c2 & 0xf) << 4) | ((c3 & 0x3c) >> 2));

			do {
				c4 = str.charCodeAt(i++) & 0xff;
				if(c4 == 61)
					return out;
				c4 = base64decodechars[c4];
			} while (i < len && c4 == -1);
			if(c4 == -1)
				break;
			out += String.fromCharCode(((c3 & 0x03) << 6) | c4);
		}
		return utf8to16(out);

	}
}

window.getRequestParameter = function() {
	var url = location.search;
	var theRequest = new Object();
	if(url.indexOf("?") != -1) {
		var str = url.substr(1);
		strs = str.split("&");
		for(var i = 0; i < strs.length; i++) {
			theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
		}
	}
	return theRequest;
}

if(!window.Promise) {

	(function(window, undefined) {

		var final = function(status, value) {
			var promise = this,
				fn, st;

			if(promise._status !== 'PENDING') return;

			setTimeout(function() {
				promise._status = status;
				st = promise._status === 'FULFILLED'
				queue = promise[st ? '_resolves' : '_rejects'];

				while(fn = queue.shift()) {
					value = fn.call(promise, value) || value;
				}

				promise[st ? '_value' : '_reason'] = value;
				promise['_resolves'] = promise['_rejects'] = undefined;
			});
		}

		var Promise = function(resolver) {
			if(!(typeof resolver === 'function'))
				throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');

			if(!(this instanceof Promise)) return new Promise(resolver);

			var promise = this;
			promise._value;
			promise._reason;
			promise._status = 'PENDING';
			//存储状态
			promise._resolves = [];
			promise._rejects = [];

			var resolve = function(value) {
				final.apply(promise, ['FULFILLED'].concat([value]));
			}

			var reject = function(reason) {
				final.apply(promise, ['REJECTED'].concat([reason]));
			}

			resolver(resolve, reject);
		}

		Promise.prototype.then = function(onFulfilled, onRejected) {
			var promise = this;
			return new Promise(function(resolve, reject) {

				function handle(value) {
					var ret = typeof onFulfilled === 'function' && onFulfilled(value) || value;

					if(ret && typeof ret['then'] == 'function') {
						ret.then(function(value) {
							resolve(value);
						}, function(reason) {
							reject(reason);
						});
					} else {
						resolve(ret);
					}
				}

				function errback(reason) {
					reason = typeof onRejected === 'function' && onRejected(reason) || reason;
					reject(reason);
				}

				if(promise._status === 'PENDING') {
					promise._resolves.push(handle);
					promise._rejects.push(errback);
				} else if(promise._status === FULFILLED) {
					callback(promise._value);
				} else if(promise._status === REJECTED) {
					errback(promise._reason);
				}
			});
		}

		Promise.prototype.error = function(onRejected) {
			return this.then(undefined, onRejected)
		}

		try{
			//Promise.prototype.catch = function(onRejected) {
			//	return this.then(undefined, onRejected)
			//}
		}catch(e){
		}

		Promise.prototype.delay = function(ms, value) {
			return this.then(function(ori) {
				return Promise.delay(ms, value || ori);
			})
		}

		Promise.delay = function(ms, value) {
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					resolve(value);
					console.log('1');
				}, ms);
			})
		}

		Promise.resolve = function(arg) {
			return new Promise(function(resolve, reject) {
				resolve(arg)
			})
		}

		Promise.reject = function(arg) {
			return Promise(function(resolve, reject) {
				reject(arg)
			})
		}

		Promise.all = function(promises) {
			if(!Array.isArray(promises)) {
				throw new TypeError('You must pass an array to all.');
			}
			return new Promise(function(resolve, reject) {
				var i = 0,
					result = [],
					len = promises.length,
					count = len

				function resolver(index) {
					return function(value) {
						resolveAll(index, value);
					};
				}

				function rejecter(reason) {
					reject(reason);
				}

				function resolveAll(index, value) {
					result[index] = value;
					if(--count == 0) {
						resolve(result)
					}
				}
				if(len == 0) {
					resolve(result);
				} else {
					for(; i < len; i++) {
						promises[i].then(resolver(i), rejecter);
					}
				}
			});
		}

		Promise.race = function(promises) {
			return new Promise(function(resolve, reject) {
				var i = 0,
					len = promises.length;

				function resolver(value) {
					resolve(value);
				}

				function rejecter(reason) {
					reject(reason);
				}
				if(len == 0) {
					resolve(result);
				} else {
					for(; i < len; i++) {
						promises[i].then(resolver, rejecter);
					}
				}
			});
		}

		window.Promise = Promise;

	})(window);
}

if(!window.Promise.when) {
	Promise.when = function(promises) {
		return new Promise(function(resolve, reject) {
			var i = 0,
				result = [],
				len = promises.length,
				count_success = 0,
				count_failure = 0;

			function resolver(index) {
				return function(value) {
					++count_success;
					handler(index, true, value);
				};
			}

			function rejecter(index) {
				return function(value) {
					++count_failure;
					handler(index, false, value);
				};
			}

			function handler(index, status, value) {
				result[index] = {
					status: status,
					value: value
				};
				if(count_success + count_failure == len) {
					if(count_failure == 0) {
						resolve(result);
					} else {
						reject(result);
					}
				}
			}
			if(len == 0) {
				resolve(result);
			} else {
				for(; i < len; i++) {
					promises[i].then(resolver(i), rejecter(i));
				}
			}
		});
	}
}