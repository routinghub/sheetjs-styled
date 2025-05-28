var strs = {}; // shared strings
var _ssfopts = {}; // spreadsheet formatting options


/*global Map */
var browser_has_Map = typeof Map !== 'undefined';

function get_sst_id(sst/*:SST*/, str/*:string*/, rev)/*:number*/ {
	var i = 0, len = sst.length;
	if(rev) {
		if(browser_has_Map ? rev.has(str) : Object.prototype.hasOwnProperty.call(rev, str)) {
			var revarr = browser_has_Map ? rev.get(str) : rev[str];
			for(; i < revarr.length; ++i) {
				if(sst[revarr[i]].t === str) { sst.Count ++; return revarr[i]; }
			}
		}
	} else for(; i < len; ++i) {
		if(sst[i].t === str) { sst.Count ++; return i; }
	}
	sst[len] = ({t:str}/*:any*/); sst.Count ++; sst.Unique ++;
	if(rev) {
		if(browser_has_Map) {
			if(!rev.has(str)) rev.set(str, []);
			rev.get(str).push(len);
		} else {
			if(!Object.prototype.hasOwnProperty.call(rev, str)) rev[str] = [];
			rev[str].push(len);
		}
	}
	return len;
}

function col_obj_w(C/*:number*/, col) {
	var p = ({min:C+1,max:C+1}/*:any*/);
	/* wch (chars), wpx (pixels) */
	var wch = -1;
	if(col.MDW) MDW = col.MDW;
	if(col.width != null) p.customWidth = 1;
	else if(col.wpx != null) wch = px2char(col.wpx);
	else if(col.wch != null) wch = col.wch;
	if(wch > -1) { p.width = char2width(wch); p.customWidth = 1; }
	else if(col.width != null) p.width = col.width;
	if(col.hidden) p.hidden = true;
	if(col.level != null) { p.outlineLevel = p.level = col.level; }
	return p;
}

function default_margins(margins/*:Margins*/, mode/*:?string*/) {
	if(!margins) return;
	var defs = [0.7, 0.7, 0.75, 0.75, 0.3, 0.3];
	if(mode == 'xlml') defs = [1, 1, 1, 1, 0.5, 0.5];
	if(margins.left   == null) margins.left   = defs[0];
	if(margins.right  == null) margins.right  = defs[1];
	if(margins.top    == null) margins.top    = defs[2];
	if(margins.bottom == null) margins.bottom = defs[3];
	if(margins.header == null) margins.header = defs[4];
	if(margins.footer == null) margins.footer = defs[5];
}

function style_equals(a, b)
{
	return a != undefined
		&& b != undefined
		&& a.fontId == b.fontId
		&& a.fillId == b.fillId
		&& a.borderId == b.borderId
		&& a.xfId == b.xfId
		&& (a.alignment !== undefined && b.alignment !== undefined
			&& a.alignment.vertical == b.alignment.vertical
			&& a.alignment.horizontal == b.alignment.horizontal
			&& a.alignment.wrapText == b.alignment.wrapText);
}

function get_cell_style(styles/*:Array<any>*/, cell/*:Cell*/, opts) {
	var z = opts.revssf[cell.z != null ? cell.z : "General"];
	var i = 0x3c, len = styles.length;
	if(z == null && opts.ssf) {
		for(; i < 0x188; ++i) if(opts.ssf[i] == null) {
			SSF__load(cell.z, i);
			// $FlowIgnore
			opts.ssf[i] = cell.z;
			opts.revssf[cell.z] = z = i;
			break;
		}
	}
	for(i = 0; i != len; ++i) {
		if(styles[i].numFmtId === z && (!cell.s || style_equals(styles[i], cell.s))) {
			return i;
		}
	}
	// see write_cellXfs for writing
	var style = {
		numFmtId: z,
		applyNumberFormat: 1,
		fontId: cell.s ? cell.s.fontId : 0,
		fillId: cell.s ? cell.s.fillId : 0,
		borderId: cell.s ? cell.s.borderId : 0,
		xfId: cell.s ? cell.s.xfId : 0,
		alignment: cell.s ? cell.s.alignment : undefined,
	};
	cell.s && (
		cell.s.fontId && (style.applyFont = 1),
		cell.s.fillId && (style.applyFill = 1),
		cell.s.borderId && (style.applyBorder = 1),
		cell.s.alignment && (style.applyAlignment = 1)
	);

	styles[len] = style;
	return len;
}

function safe_format(p/*:Cell*/, fmtid/*:number*/, fillid/*:?number*/, opts, themes, styles, date1904) {
	try {
		if(opts.cellNF) p.z = table_fmt[fmtid];
	} catch(e) { if(opts.WTF) throw e; }
	if(p.t === 'z' && !opts.cellStyles) return;
	if(p.t === 'd' && typeof p.v === 'string') p.v = parseDate(p.v);
	if((!opts || opts.cellText !== false) && p.t !== 'z') try {
		if(table_fmt[fmtid] == null) SSF__load(SSFImplicit[fmtid] || "General", fmtid);
		if(p.t === 'e') p.w = p.w || BErr[p.v];
		else if(fmtid === 0) {
			if(p.t === 'n') {
				if((p.v|0) === p.v) p.w = p.v.toString(10);
				else p.w = SSF_general_num(p.v);
			}
			else if(p.t === 'd') {
				var dd = datenum(p.v, !!date1904);
				if((dd|0) === dd) p.w = dd.toString(10);
				else p.w = SSF_general_num(dd);
			}
			else if(p.v === undefined) return "";
			else p.w = SSF_general(p.v,_ssfopts);
		}
		else if(p.t === 'd') p.w = SSF_format(fmtid,datenum(p.v, !!date1904),_ssfopts);
		else p.w = SSF_format(fmtid,p.v,_ssfopts);
	} catch(e) { if(opts.WTF) throw e; }
	if(!opts.cellStyles) return;
	if(fillid != null) try {
		p.s = styles.Fills[fillid];
		if (p.s.fgColor && p.s.fgColor.theme && !p.s.fgColor.rgb) {
			p.s.fgColor.rgb = rgb_tint(themes.themeElements.clrScheme[p.s.fgColor.theme].rgb, p.s.fgColor.tint || 0);
			if(opts.WTF) p.s.fgColor.raw_rgb = themes.themeElements.clrScheme[p.s.fgColor.theme].rgb;
		}
		if (p.s.bgColor && p.s.bgColor.theme) {
			p.s.bgColor.rgb = rgb_tint(themes.themeElements.clrScheme[p.s.bgColor.theme].rgb, p.s.bgColor.tint || 0);
			if(opts.WTF) p.s.bgColor.raw_rgb = themes.themeElements.clrScheme[p.s.bgColor.theme].rgb;
		}
	} catch(e) { if(opts.WTF && styles.Fills) throw e; }
}

function check_ws(ws/*:Worksheet*/, sname/*:string*/, i/*:number*/) {
	if(ws && ws['!ref']) {
		var range = safe_decode_range(ws['!ref']);
		if(range.e.c < range.s.c || range.e.r < range.s.r) throw new Error("Bad range (" + i + "): " + ws['!ref']);
	}
}
