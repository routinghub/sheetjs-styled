function keys(o/*:any*/)/*:Array<any>*/ {
	var ks = Object.keys(o), o2 = [];
	for(var i = 0; i < ks.length; ++i) if(Object.prototype.hasOwnProperty.call(o, ks[i])) o2.push(ks[i]);
	return o2;
}

function evert_key(obj/*:any*/, key/*:string*/)/*:EvertType*/ {
	var o = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) if(o[obj[K[i]][key]] == null) o[obj[K[i]][key]] = K[i];
	return o;
}

function evert(obj/*:any*/)/*:EvertType*/ {
	var o = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) o[obj[K[i]]] = K[i];
	return o;
}

function evert_num(obj/*:any*/)/*:EvertNumType*/ {
	var o = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) o[obj[K[i]]] = parseInt(K[i],10);
	return o;
}

function evert_arr(obj/*:any*/)/*:EvertArrType*/ {
	var o/*:EvertArrType*/ = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) {
		if(o[obj[K[i]]] == null) o[obj[K[i]]] = [];
		o[obj[K[i]]].push(K[i]);
	}
	return o;
}

var dnthresh  = /*#__PURE__*/Date.UTC(1899, 11, 30, 0, 0, 0); // -2209161600000
var dnthresh1 = /*#__PURE__*/Date.UTC(1899, 11, 31, 0, 0, 0); // -2209075200000
var dnthresh2 = /*#__PURE__*/Date.UTC(1904, 0, 1, 0, 0, 0); // -2209075200000
function datenum(v/*:Date*/, date1904/*:?boolean*/)/*:number*/ {
	var epoch = /*#__PURE__*/v.getTime();
	var res = (epoch - dnthresh) / (24 * 60 * 60 * 1000);
	if(date1904) { res -= 1462; return res < -1402 ? res - 1 : res; }
	return res < 60 ? res - 1 : res;
}
function numdate(v/*:number*/)/*:Date|number*/ {
	if(v >= 60 && v < 61) return v;
	var out = new Date();
	out.setTime((v>60 ? v : (v+1)) * 24 * 60 * 60 * 1000 + dnthresh);
	return out;
}

/* ISO 8601 Duration */
function parse_isodur(s) {
	var sec = 0, mt = 0, time = false;
	var m = s.match(/P([0-9\.]+Y)?([0-9\.]+M)?([0-9\.]+D)?T([0-9\.]+H)?([0-9\.]+M)?([0-9\.]+S)?/);
	if(!m) throw new Error("|" + s + "| is not an ISO8601 Duration");
	for(var i = 1; i != m.length; ++i) {
		if(!m[i]) continue;
		mt = 1;
		if(i > 3) time = true;
		switch(m[i].slice(m[i].length-1)) {
			case 'Y':
				throw new Error("Unsupported ISO Duration Field: " + m[i].slice(m[i].length-1));
			case 'D': mt *= 24;
				/* falls through */
			case 'H': mt *= 60;
				/* falls through */
			case 'M':
				if(!time) throw new Error("Unsupported ISO Duration Field: M");
				else mt *= 60;
				/* falls through */
			case 'S': break;
		}
		sec += mt * parseInt(m[i], 10);
	}
	return sec;
}

/* Blame https://bugs.chromium.org/p/v8/issues/detail?id=7863 for the regexide */
var pdre1 = /^(\d+):(\d+)(:\d+)?(\.\d+)?$/; // HH:MM[:SS[.UUU]]
var pdre2 = /^(\d+)-(\d+)-(\d+)$/; // YYYY-mm-dd
var pdre3 = /^(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)(:\d+)?(\.\d+)?$/; // YYYY-mm-dd(T or space)HH:MM[:SS[.UUU]], sans "Z"
/* parses a date string as a UTC date */
function parseDate(str/*:string*/, date1904/*:boolean*/)/*:Date*/ {
	if(str instanceof Date) return str;
	var m = str.match(pdre1);
	if(m) return new Date((date1904 ? dnthresh2 : dnthresh1) + ((parseInt(m[1], 10)*60 + parseInt(m[2], 10))*60 + (m[3] ? parseInt(m[3].slice(1), 10) : 0))*1000 + (m[4] ? parseInt((m[4]+"000").slice(1,4), 10) : 0));
	m = str.match(pdre2);
	if(m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], 0, 0, 0, 0));
	/* TODO: 1900-02-29T00:00:00.000 should return a flag to treat as a date code (affects xlml) */
	m = str.match(pdre3);
	if(m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], ((m[6] && parseInt(m[6].slice(1), 10))|| 0), ((m[7] && parseInt((m[7] + "0000").slice(1,4), 10))||0)));
	var d = new Date(str);
	return d;
}

function cc2str(arr/*:Array<number>*/, debomit)/*:string*/ {
	if(has_buf && Buffer.isBuffer(arr)) {
		if(debomit && buf_utf16le) {
			// TODO: temporary patch
			if(arr[0] == 0xFF && arr[1] == 0xFE) return utf8write(arr.slice(2).toString("utf16le"));
			if(arr[1] == 0xFE && arr[2] == 0xFF) return utf8write(utf16beread(arr.slice(2).toString("binary")));
		}
		return arr.toString("binary");
	}

	if(typeof TextDecoder !== "undefined") try {
		if(debomit) {
			if(arr[0] == 0xFF && arr[1] == 0xFE) return utf8write(new TextDecoder("utf-16le").decode(arr.slice(2)));
			if(arr[0] == 0xFE && arr[1] == 0xFF) return utf8write(new TextDecoder("utf-16be").decode(arr.slice(2)));
		}
		var rev = {
			"\u20ac": "\x80", "\u201a": "\x82", "\u0192": "\x83", "\u201e": "\x84",
			"\u2026": "\x85", "\u2020": "\x86", "\u2021": "\x87", "\u02c6": "\x88",
			"\u2030": "\x89", "\u0160": "\x8a", "\u2039": "\x8b", "\u0152": "\x8c",
			"\u017d": "\x8e", "\u2018": "\x91", "\u2019": "\x92", "\u201c": "\x93",
			"\u201d": "\x94", "\u2022": "\x95", "\u2013": "\x96", "\u2014": "\x97",
			"\u02dc": "\x98", "\u2122": "\x99", "\u0161": "\x9a", "\u203a": "\x9b",
			"\u0153": "\x9c", "\u017e": "\x9e", "\u0178": "\x9f"
		};
		if(Array.isArray(arr)) arr = new Uint8Array(arr);
		return new TextDecoder("latin1").decode(arr).replace(/[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, function(c) { return rev[c] || c; });
	} catch(e) {}

	var o = [], i = 0;
	// this cascade is for the browsers and runtimes of antiquity (and for modern runtimes that lack TextEncoder)
	try {
		for(i = 0; i < arr.length - 65536; i+=65536) o.push(String.fromCharCode.apply(0, arr.slice(i, i + 65536)));
		o.push(String.fromCharCode.apply(0, arr.slice(i)));
	} catch(e) { try {
			for(; i < arr.length - 16384; i+=16384) o.push(String.fromCharCode.apply(0, arr.slice(i, i + 16384)));
			o.push(String.fromCharCode.apply(0, arr.slice(i)));
		} catch(e) {
			for(; i != arr.length; ++i) o.push(String.fromCharCode(arr[i]));
		}
	}
	return o.join("");
}

function dup(o/*:any*/)/*:any*/ {
	var oc = dup_impl(o);
	if (o.xlsxCss) {
		oc.xlsxCss = o.xlsxCss;
	}
	return oc;
}

function dup_impl(o/*:any*/)/*:any*/ {
	if(typeof JSON != 'undefined' && !Array.isArray(o)) return JSON.parse(JSON.stringify(o));
	if(typeof o != 'object' || o == null) return o;
	if(o instanceof Date) return new Date(o.getTime());
	var out = {};
	for(var k in o) if(Object.prototype.hasOwnProperty.call(o, k)) out[k] = dup_impl(o[k]);
	return out;
}

function fill(c/*:string*/,l/*:number*/)/*:string*/ { var o = ""; while(o.length < l) o+=c; return o; }

/* TODO: stress test */
function fuzzynum(s/*:string*/)/*:number*/ {
	var v/*:number*/ = Number(s);
	if(!isNaN(v)) return isFinite(v) ? v : NaN;
	if(!/\d/.test(s)) return v;
	var wt = 1;
	var ss = s.replace(/([\d]),([\d])/g,"$1$2").replace(/[$]/g,"").replace(/[%]/g, function() { wt *= 100; return "";});
	if(!isNaN(v = Number(ss))) return v / wt;
	ss = ss.replace(/[(]([^()]*)[)]/,function($$, $1) { wt = -wt; return $1;});
	if(!isNaN(v = Number(ss))) return v / wt;
	return v;
}

/* NOTE: Chrome rejects bare times like 1:23 PM */
var FDRE1 = /^(0?\d|1[0-2])(?:|:([0-5]?\d)(?:|(\.\d+)(?:|:([0-5]?\d))|:([0-5]?\d)(|\.\d+)))\s+([ap])m?$/;
var FDRE2 = /^([01]?\d|2[0-3])(?:|:([0-5]?\d)(?:|(\.\d+)(?:|:([0-5]?\d))|:([0-5]?\d)(|\.\d+)))$/;
var FDISO = /^(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)(:\d+)(\.\d+)?[Z]?$/; // YYYY-mm-dd(T or space)HH:MM:SS[.UUU][Z]

/* TODO: 1904 adjustment */
var utc_append_works = new Date("6/9/69 00:00 UTC").valueOf() == -17798400000;
function fuzzytime1(M) /*:Date*/ {
	if(!M[2]) return new Date(Date.UTC(1899,11,31,(+M[1]%12) + (M[7] == "p" ? 12 : 0), 0, 0, 0));
	if(M[3]) {
			if(M[4]) return new Date(Date.UTC(1899,11,31,(+M[1]%12) + (M[7] == "p" ? 12 : 0), +M[2], +M[4], parseFloat(M[3])*1000));
			else return new Date(Date.UTC(1899,11,31,(M[7] == "p" ? 12 : 0), +M[1], +M[2], parseFloat(M[3])*1000));
	}
	else if(M[5]) return new Date(Date.UTC(1899,11,31, (+M[1]%12) + (M[7] == "p" ? 12 : 0), +M[2], +M[5], M[6] ? parseFloat(M[6]) * 1000 : 0));
	else return new Date(Date.UTC(1899,11,31,(+M[1]%12) + (M[7] == "p" ? 12 : 0), +M[2], 0, 0));
}
function fuzzytime2(M) /*:Date*/ {
	if(!M[2]) return new Date(Date.UTC(1899,11,31,+M[1], 0, 0, 0));
	if(M[3]) {
			if(M[4]) return new Date(Date.UTC(1899,11,31,+M[1], +M[2], +M[4], parseFloat(M[3])*1000));
			else return new Date(Date.UTC(1899,11,31,0, +M[1], +M[2], parseFloat(M[3])*1000));
	}
	else if(M[5]) return new Date(Date.UTC(1899,11,31, +M[1], +M[2], +M[5], M[6] ? parseFloat(M[6]) * 1000 : 0));
	else return new Date(Date.UTC(1899,11,31,+M[1], +M[2], 0, 0));
}
var lower_months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function fuzzydate(s/*:string*/)/*:Date*/ {
	// See issue 2863 -- this is technically not supported in Excel but is otherwise useful
	if(FDISO.test(s)) return s.indexOf("Z") == -1 ? local_to_utc(new Date(s)) : new Date(s);
	var lower = s.toLowerCase();
	var lnos = lower.replace(/\s+/g, " ").trim();
	var M = lnos.match(FDRE1);
	if(M) return fuzzytime1(M);
	M = lnos.match(FDRE2);
	if(M) return fuzzytime2(M);
	M = lnos.match(pdre3);
	if(M) return new Date(Date.UTC(+M[1], +M[2]-1, +M[3], +M[4], +M[5], ((M[6] && parseInt(M[6].slice(1), 10))|| 0), ((M[7] && parseInt((M[7] + "0000").slice(1,4), 10))||0)));
	var o = new Date(utc_append_works && s.indexOf("UTC") == -1 ? s + " UTC": s), n = new Date(NaN);
	var y = o.getYear(), m = o.getMonth(), d = o.getDate();
	if(isNaN(d)) return n;
	if(lower.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/)) {
		lower = lower.replace(/[^a-z]/g,"").replace(/([^a-z]|^)[ap]m?([^a-z]|$)/,"");
		if(lower.length > 3 && lower_months.indexOf(lower) == -1) return n;
	} else if(lower.replace(/[ap]m?/, "").match(/[a-z]/)) return n;
	if(y < 0 || y > 8099 || s.match(/[^-0-9:,\/\\\ ]/)) return n;
	return o;
}

var split_regex = /*#__PURE__*/(function() {
	var safe_split_regex = "abacaba".split(/(:?b)/i).length == 5;
	return function split_regex(str/*:string*/, re, def/*:string*/)/*:Array<string>*/ {
		if(safe_split_regex || typeof re == "string") return str.split(re);
		var p = str.split(re), o = [p[0]];
		for(var i = 1; i < p.length; ++i) { o.push(def); o.push(p[i]); }
		return o;
	};
})();

function utc_to_local(utc) {
	return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes(), utc.getUTCSeconds(), utc.getUTCMilliseconds());
}
function local_to_utc(local) {
	return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), local.getSeconds(), local.getMilliseconds()));
}

function remove_doctype(str) {
	var preamble = str.slice(0, 1024);
	var si = preamble.indexOf("<!DOCTYPE");
	if(si == -1) return str;
	var m = str.match(/<[\w]/);
	if(!m) return str;
	return str.slice(0, si) + str.slice(m.index);
}

/* str.match(/<!--[\s\S]*?-->/g) --> str_match_ng(str, "<!--", "-->") */
function str_match_ng(str, s, e) {
  var out = [];

  var si = str.indexOf(s);
  while(si > -1) {
    var ei = str.indexOf(e, si + s.length);
		if(ei == -1) break;

		out.push(str.slice(si, ei + e.length));
		si = str.indexOf(s, ei + e.length);
	}

  return out.length > 0 ? out : null;
}

/* str.replace(/<!--[\s\S]*?-->/g, "") --> str_remove_ng(str, "<!--", "-->") */
function str_remove_ng(str, s, e) {
  var out = [], last = 0;

  var si = str.indexOf(s);
	if(si == -1) return str;
  while(si > -1) {
		out.push(str.slice(last, si));
    var ei = str.indexOf(e, si + s.length);
		if(ei == -1) break;

		if((si = str.indexOf(s, (last = ei + e.length))) == -1) out.push(str.slice(last));
	}

  return out.join("");
}

/* str.match(/<tag\b[^>]*?>([\s\S]*?)</tag>/) --> str_match_xml(str, "tag") */
var xml_boundary = { " ": 1, "\t": 1, "\r": 1, "\n": 1, ">": 1 };
function str_match_xml(str, tag) {
	var si = str.indexOf('<' + tag), w = tag.length + 1, L = str.length;
	while(si >= 0 && si <= L - w && !xml_boundary[str.charAt(si + w)]) si = str.indexOf('<' + tag, si+1);
	if(si === -1) return null;
	var sf = str.indexOf(">", si + tag.length);
	if(sf === -1) return null;
	var et = "</" + tag + ">";
	var ei = str.indexOf(et, sf);
	if(ei == -1) return null;
	return [str.slice(si, ei + et.length), str.slice(sf + 1, ei)];
}

/* str.match(/<(?:\w+:)?tag\b[^<>]*?>([\s\S]*?)<\/(?:\w+:)?tag>/) --> str_match_xml(str, "tag") */
var str_match_xml_ns = /*#__PURE__*/(function() {
	var str_match_xml_ns_cache = {};
	return function str_match_xml_ns(str, tag) {
		var res = str_match_xml_ns_cache[tag];
		if(!res) str_match_xml_ns_cache[tag] = res = [
			new RegExp('<(?:\\w+:)?'+tag+'\\b[^<>]*>', "g"),
			new RegExp('</(?:\\w+:)?'+tag+'>', "g")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m = res[0].exec(str);
		if(!m) return null;
		var si = m.index;
		var sf = res[0].lastIndex;
		res[1].lastIndex = res[0].lastIndex;
		m = res[1].exec(str);
		if(!m) return null;
		var ei = m.index;
		var ef = res[1].lastIndex;
		return [str.slice(si, ef), str.slice(sf, ei)];
	};
})();

/* str.match(/<(?:\w+:)?tag\b[^<>]*?>([\s\S]*?)<\/(?:\w+:)?tag>/g) --> str_match_xml_ns_g(str, "tag") */
var str_match_xml_ns_g = /*#__PURE__*/(function() {
	var str_match_xml_ns_cache = {};
	return function str_match_xml_ns(str, tag) {
		var out = [];
		var res = str_match_xml_ns_cache[tag];
		if(!res) str_match_xml_ns_cache[tag] = res = [
			new RegExp('<(?:\\w+:)?'+tag+'\\b[^<>]*>', "g"),
			new RegExp('</(?:\\w+:)?'+tag+'>', "g")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m;
		while((m = res[0].exec(str))) {
			var si = m.index;
			res[1].lastIndex = res[0].lastIndex;
			m = res[1].exec(str);
			if(!m) return null;
			var ef = res[1].lastIndex;
			out.push(str.slice(si, ef));
			res[0].lastIndex = res[1].lastIndex;
		}
		return out.length == 0 ? null : out;
	};
})();
var str_remove_xml_ns_g = /*#__PURE__*/(function() {
	var str_remove_xml_ns_cache = {};
	return function str_remove_xml_ns_g(str, tag) {
		var out = [];
		var res = str_remove_xml_ns_cache[tag];
		if(!res) str_remove_xml_ns_cache[tag] = res = [
			new RegExp('<(?:\\w+:)?'+tag+'\\b[^<>]*>', "g"),
			new RegExp('</(?:\\w+:)?'+tag+'>', "g")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m;
		var si = 0, ef = 0;
		while((m = res[0].exec(str))) {
			si = m.index;
			out.push(str.slice(ef, si));
			ef = si;
			res[1].lastIndex = res[0].lastIndex;
			m = res[1].exec(str);
			if(!m) return null;
			ef = res[1].lastIndex;
			res[0].lastIndex = res[1].lastIndex;
		}
		out.push(str.slice(ef));
		return out.length == 0 ? "" : out.join("");
	};
})();

/* str.match(/<(?:\w+:)?tag\b[^>]*?>([\s\S]*?)<\/(?:\w+:)?tag>/gi) --> str_match_xml_ns_ig(str, "tag") */
var str_match_xml_ig = /*#__PURE__*/(function() {
	var str_match_xml_ns_cache = {};
	return function str_match_xml_ns(str, tag) {
		var out = [];
		var res = str_match_xml_ns_cache[tag];
		if(!res) str_match_xml_ns_cache[tag] = res = [
			new RegExp('<'+tag+'\\b[^<>]*>', "ig"),
			new RegExp('</'+tag+'>', "ig")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m;
		while((m = res[0].exec(str))) {
			var si = m.index;
			res[1].lastIndex = res[0].lastIndex;
			m = res[1].exec(str);
			if(!m) return null;
			var ef = res[1].lastIndex;
			out.push(str.slice(si, ef));
			res[0].lastIndex = res[1].lastIndex;
		}
		return out.length == 0 ? null : out;
	};
})();
