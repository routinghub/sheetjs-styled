import { DenseWorkSheet, WorkBook, type utils } from 'xlsx';
export { parse, set_utils };

let _utils: typeof utils;
/** Set internal instance of `utils`
 *
 * Usage:
 *
 * ```js
 * const XLSX = require("xlsx");
 * const DTA = require("dta");
 * DTA.set_utils(XLSX.utils);
 * ```
 *
 * @param utils utils object
 */
function set_utils(utils: any): void {
  _utils = utils;
}

interface Payload {
  /** Offset */
  ptr: number;

  /** Raw data */
  raw: Uint8Array;

  /** Latin-1 encoded */
  str: string;

  /** DataView */
  dv: DataView;
}

function u8_to_dataview(array: Uint8Array): DataView { return new DataView(array.buffer, array.byteOffset, array.byteLength); }
function valid_inc(p: Payload, n: string): boolean {
  if(p.str.slice(p.ptr, p.ptr + n.length) != n) return false;
  p.ptr += n.length;
  return true;
}

function skip_end(p: Payload, n: string): void {
  const idx = p.str.indexOf(n, p.ptr);
  if(idx == -1) throw new Error(`Expected ${n} after offset ${p.ptr}`);
  p.ptr = idx + n.length;
}
function slice_end(p: Payload, n: string): Payload {
  const idx = p.str.indexOf(n, p.ptr);
  if(idx == -1) throw new Error(`Expected ${n} after offset ${p.ptr}`);
  const raw = p.raw.slice(p.ptr, idx);
  const res = {
    ptr: 0,
    raw,
    str: p.str.slice(p.ptr, idx),
    dv: u8_to_dataview(raw)
  };
  p.ptr = idx + n.length;
  return res;
}

function read_f64(p: Payload, LE: boolean): number | null {
  p.ptr += 8;
  const d = p.dv.getFloat64(p.ptr - 8, LE);
  return d > 8.988e+307 ? null : d;
}
function read_f32(p: Payload, LE: boolean): number | null {
  p.ptr += 4;
  const d = p.dv.getFloat32(p.ptr - 4, LE);
  return d > 1.701e+38 ? null : d;

}
function read_u32(p: Payload, LE: boolean) {
  p.ptr += 4;
  return p.dv.getUint32(p.ptr - 4, LE);
}
function read_i32(p: Payload, LE: boolean): number | null {
  p.ptr += 4;
  const u = p.dv.getInt32(p.ptr - 4, LE);
  return u > 0x7fffffe4 ? null : u;
}
function read_u16(p: Payload, LE: boolean) {
  p.ptr += 2;
  return p.dv.getUint16(p.ptr - 2, LE);
}
function read_i16(p: Payload, LE: boolean): number | null {
  p.ptr += 2;
  const u = p.dv.getInt16(p.ptr - 2, LE);
  return u > 32740 ? null : u;
}
function read_u8(p: Payload) {
  return p.raw[p.ptr++];
}
function read_i8(p: Payload): number | null {
  let u = p.raw[p.ptr++];
  u = u < 128 ? u : u - 256;
  return u > 100 ? null : u;
}

const SUPPORTED_VERSIONS_TAGGED = [
  "117", // stata 13
  "118", // stata 14-18
  // "119", // stata 15/16/17/18 (> 32767 variables)
  // "120", // stata 18 (<= 32767, with aliases)
  // "121", // stata 18 (> 32767, with aliases)
];

function parse_tagged(raw: Uint8Array): WorkBook {
  const err = ("Not a DTA file");
  /* sadly the web zealots decided to abandon binary strings */
  const str = new TextDecoder('latin1').decode(raw);

  const d: Payload = {
    ptr: 0,
    raw,
    str,
    dv: u8_to_dataview(raw)
  }

  let vers: number = 118;
  let LE: boolean = true;
  let nvar: number = 0, nobs: number = 0, nobs_lo = 0, nobs_hi = 0;
  let label: string = "", timestamp: string = "";
  const var_types: number[] = [];
  const var_names: string[] = [];
  const formats: string[] = [];

  /* 5. Dataset format definition */
  if(!valid_inc(d, "<stata_dta>")) throw err;

  /* 5.1 Header <header> */
  {
    if(!valid_inc(d, "<header>")) throw err;

    /* <release> */
    {
      if(!valid_inc(d, "<release>")) throw err;
      const res = slice_end(d, "</release>");
      if(SUPPORTED_VERSIONS_TAGGED.indexOf(res.str) == -1) throw (`Unsupported DTA ${res.str} file`);
      vers = +res.str;
    }

    /* <byteorder> */
    {
      if(!valid_inc(d, "<byteorder>")) throw err;
      const res = slice_end(d, "</byteorder>");
      switch(res.str) {
        case "MSF": LE = false; break;
        case "LSF": LE = true; break;
        default: throw (`Unsupported byteorder ${res.str}`);
      }
    }

    /* <K> */
    {
      if(!valid_inc(d, "<K>")) throw err;
      const res = slice_end(d, "</K>");
      nvar = read_u16(res, LE);
    }

    /* <N> */
    {
      if(!valid_inc(d, "<N>")) throw err;
      const res = slice_end(d, "</N>");
      if(vers == 117) nobs = nobs_lo = read_u32(res, LE);
      else {
        const lo = read_u32(res, LE), hi = read_u32(res, LE);
        nobs = LE ? ((nobs_lo = lo) + (nobs_hi = hi) * Math.pow(2,32)) : ((nobs_lo = hi) + (nobs_hi = lo) * Math.pow(2,32));
      }
      if(nobs > 1e6) console.error(`More than 1 million observations -- extra rows will be dropped`);
    }

    /* <label> */
    {
      if(!valid_inc(d, "<label>")) throw err;
      const res = slice_end(d, "</label>");
      const w = vers >= 118 ? 2 : 1;
      const strlen = w == 1 ? read_u8(res) : read_u16(res, LE);
      if(strlen + w != res.str.length) throw (`Expected string length ${strlen} but actual length was ${res.str.length - w}`);
      if(strlen > 0) label = new TextDecoder().decode(res.raw.slice(w));
    }

    /* <timestamp> */
    {
      if(!valid_inc(d, "<timestamp>")) throw err;
      const res = slice_end(d, "</timestamp>");
      const strlen = read_u8(res);
      if(strlen + 1 != res.str.length) throw (`Expected string length ${strlen} but actual length was ${res.str.length - 1}`);
      if(strlen > 0) timestamp = res.str.slice(1);
    }

    if(!valid_inc(d, "</header>")) throw err;
  }

  /* 5.2 Map <map> */
  {
    /* TODO: validate map? */
    if(!valid_inc(d, "<map>")) throw err;
    /* 14 8-byte offsets for:
      <stata_data>
      <map>
      <variable_types>
      <varnames>
      <sortlist>
      <formats>
      <value_label_names>
      <variable_labels>
      <characteristics>
      <data>
      <strls>
      <value_labels>
      </stata_data>
      EOF
    */
    skip_end(d, "</map>");
  }

  let stride = 0;
  /* 5.3 Variable types <variable_types> */
  {
    if(!valid_inc(d, "<variable_types>")) throw err;
    const res = slice_end(d, "</variable_types>");
    if(res.raw.length != 2 * nvar) throw (`Expected variable_types length ${nvar * 2}, found ${res.raw.length}`);
    while(res.ptr < res.raw.length) {
      const type = read_u16(res, LE);
      var_types.push(type);
      if(type >= 1 && type <= 2045) stride += type;
      else switch(type) {
        case 32768: stride += 8; break;
        case 65526: stride += 8; break;
        case 65527: stride += 4; break;
        case 65528: stride += 4; break;
        case 65529: stride += 2; break;
        case 65530: stride += 1; break;
        default: throw (`Unsupported field type ${type}`);
      }
    }
  }

  /* 5.4 Variable names <varnames> */
  {
    if(!valid_inc(d, "<varnames>")) throw err;
    const res = slice_end(d, "</varnames>");
    const w = vers >= 118 ? 129 : 33;
    if(res.raw.length != w * nvar) throw (`Expected variable_types length ${nvar * w}, found ${res.raw.length}`);
    while(res.ptr < res.raw.length) {
      const name = new TextDecoder().decode(res.raw.slice(res.ptr, res.ptr + w));
      res.ptr += w;
      var_names.push(name.replace(/\x00[\s\S]*/,""));
    }
  }

  /* 5.5 Sort order of observations <sortlist> */
  {
    /* TODO: check sort list? */
    if(!valid_inc(d, "<sortlist>")) throw err;
    const res = slice_end(d, "</sortlist>");
    if(res.raw.length != 2 * nvar + 2) throw (`Expected sortlist length ${nvar * 2 + 2}, found ${res.raw.length}`);
  }

  /* 5.6 Display formats <formats> */
  {
    if(!valid_inc(d, "<formats>")) throw err;
    const res = slice_end(d, "</formats>");
    const w = vers >= 118 ? 57 : 49;
    if(res.raw.length != w * nvar) throw (`Expected formats length ${nvar * w}, found ${res.raw.length}`);
    while(res.ptr < res.raw.length) {
      const name = new TextDecoder().decode(res.raw.slice(res.ptr, res.ptr + w));
      res.ptr += w;
      formats.push(name.replace(/\x00[\s\S]*/,""));
    }
  }

  /* TODO: <value_label_names> */
  {
    if(!valid_inc(d, "<value_label_names>")) throw err;
    const w = vers >= 118 ? 129 : 33;
    const res = slice_end(d, "</value_label_names>");
  }

  /* TODO: <variable_labels> */
  {
    if(!valid_inc(d, "<variable_labels>")) throw err;
    const w = vers >= 118 ? 321 : 81;
    const res = slice_end(d, "</variable_labels>");
  }

  /* 5.9 Characteristics <characteristics> */
  {
    if(!valid_inc(d, "<characteristics>")) throw err;
    while(d.str.slice(d.ptr, d.ptr + 4) == "<ch>") {
      d.ptr += 4;
      const len = read_u32(d, LE);
      d.ptr += len;
      if(!valid_inc(d, "</ch>")) throw err;
    }
    if(!valid_inc(d, "</characteristics>")) throw err;
  }

  const ws: DenseWorkSheet = (_utils.aoa_to_sheet([var_names], {dense: true}) as DenseWorkSheet);

  var ptrs: Array<[number, number, Uint8Array]> = []
  /* 5.10 Data <data> */
  {
    if(!valid_inc(d, "<data>")) throw err;
    for(let R = 0; R < nobs; ++R) {
      const row: any[] = [];
      for(let C = 0; C < nvar; ++C) {
        let t = var_types[C];
        // TODO: formats, dta_12{0,1} aliases?
        if(t >= 1 && t <= 2045) {
          /* NOTE: dta_117 restricts strf to ASCII */
          let s = new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + t));
          s = s.replace(/\x00[\s\S]*/,"");
          row[C] = s;
          d.ptr += t;
        } else switch(t) {
          case 65526: row[C] = read_f64(d, LE); break;
          case 65527: row[C] = read_f32(d, LE); break;
          case 65528: row[C] = read_i32(d, LE); break;
          case 65529: row[C] = read_i16(d, LE); break;
          case 65530: row[C] = read_i8(d); break;
          case 32768: {
            row[C] = "##SheetJStrL##";
            ptrs.push([R+1,C, d.raw.slice(d.ptr, d.ptr + 8)]);
            d.ptr += 8;
          } break;
          default: throw (`Unsupported field type ${t} for ${var_names[C]}`);
        }
      }
      _utils.sheet_add_aoa(ws, [row], {origin: -1, sheetStubs: true});
    }
    if(!valid_inc(d, "</data>")) throw err;
  }

  /* 5.11 StrLs <strls> */
  {
    if(!valid_inc(d, "<strls>")) throw err;

    const strl_tbl: string[][] = [];
      while(d.raw[d.ptr] == 71 /* G */) {
      if(!valid_inc(d, "GSO")) throw err;
      const v = read_u32(d, LE);
      let o = 0;
      if(vers == 117) o = read_u32(d, LE);
      else {
        const lo = read_u32(d, LE), hi = read_u32(d, LE);
        o = LE ? (lo + hi * Math.pow(2,32)) : (hi + lo * Math.pow(2,32));
        if(o > 1e6) console.error(`More than 1 million observations -- data will be dropped`);
      }
      const t = read_u8(d);
      const len = read_u32(d, LE);
      if(!strl_tbl[o]) strl_tbl[o] = [];
      let str = "";
      if(t == 129) {
        // TODO: codepage
        str = new TextDecoder("latin1").decode(d.raw.slice(d.ptr, d.ptr + len));
        d.ptr += len;
      } else {
        str = new TextDecoder("latin1").decode(d.raw.slice(d.ptr, d.ptr + len)).replace(/\x00$/,"");
        d.ptr += len;
      }
      strl_tbl[o][v] = str;
    }
    if(!valid_inc(d, "</strls>")) throw err;

    ptrs.forEach(([R,C,buf]) => {
      const dv = u8_to_dataview(buf);
      let v = 0, o = 0;
      switch(vers) {
        case 117: { // v(4) o(4)
          v = dv.getUint32(0, LE);
          o = dv.getUint32(4, LE);
        } break;

        case 118: case 120: { // v(2) o(6)
          v = dv.getUint16(0, LE);
          const o1 = dv.getUint16(2, LE), o2 = dv.getUint32(4, LE);
          o = LE ? o1 + o2 * 65536 : o2 + o1 * (2**32);
        } break;

        case 119: case 121: { // v(3) o(5)
          const v1 = dv.getUint16(0, LE), v2 = buf[2];
          v = LE ? v1 + (v2 << 16) : v2 + (v1 << 8);
          const o1 = buf[3], o2 = dv.getUint32(4, LE);
          o = LE ? o1 + o2 * 256 : o2 + o1 * (2**32);
        }
      }
      ws["!data"][R][C].v = strl_tbl[o][v];
    });
  }

  /* 5.12 Value labels <value_labels> */
  {
    if(!valid_inc(d, "<value_labels>")) throw err;
    const res = slice_end(d, "</value_labels>");
  }

  if(!valid_inc(d, "</stata_dta>")) throw err;

  const wb = _utils.book_new();
  _utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}

function parse_legacy(raw: Uint8Array): WorkBook {
  let vers: number = raw[0];
  switch(vers) {
    case 102: // stata 1
    case 112: // stata 8/9
      throw (`Unsupported DTA ${vers} file`);

    case 103: // stata 2/3
    case 104: // stata 4
    case 105: // stata 5
    case 108: // stata 6
    case 110: // stata 7
    case 111: // stata 7
    case 113: // stata 8/9
    case 114: // stata 10/11
    case 115: // stata 12
      break;

    default: throw new Error("Not a DTA file");
  }

  const d: Payload = {
    ptr: 1,
    raw,
    str:"",
    dv: u8_to_dataview(raw)
  }

  let LE: boolean = true;
  let nvar: number = 0, nobs: number = 0;
  let label: string = "", timestamp: string = "";
  const var_types: number[] = [];
  const var_names: string[] = [];
  const formats: string[] = [];

  /* 5.1 Header */
  {
    const byteorder = read_u8(d);
    switch(byteorder) {
      case 1: LE = false; break;
      case 2: LE = true; break;
      default: throw (`DTA ${vers} Unexpected byteorder ${byteorder}`);
    }

    let byte = read_u8(d);
    if(byte != 1) throw (`DTA ${vers} Unexpected filetype ${byte}`);
    // NOTE: dta_105 technically supports filetype 2

    d.ptr++; // "unused"
    nvar = read_u16(d, LE);
    nobs = read_u32(d, LE);
    d.ptr += (vers >= 108 ? 81 : 32); // TODO: data_label
    if(vers >= 105) d.ptr += 18; // TODO: time_stamp
  }

  /* 5.2 Descriptors */
  {
    let C = 0;

    // typlist
    for(C = 0; C < nvar; ++C) var_types.push(read_u8(d));

    // varlist
    const w = vers >= 110 ? 33 : 9;
    for(C = 0; C < nvar; ++C) {
      var_names.push(new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + w)).replace(/\x00[\s\S]*$/,""));
      d.ptr += w;
    }

    // srtlist
    d.ptr += 2*(nvar + 1);

    // fmtlist
    const fw = (vers >= 114 ? 49 : vers >= 105 ? 12 : 7);
    for(C = 0; C < nvar; ++C) {
      formats.push(new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + fw)).replace(/\x00[\s\S]*$/,""));
      d.ptr += fw;
    }

    // lbllist
    d.ptr += (vers >= 110 ? 33 : 9) * nvar;
  }

  /* 5.3 Variable labels */
  // TODO: should these names be used in the worksheet?
  d.ptr += (vers >= 106 ? 81 : 32) * nvar;

  /* 5.4 Expansion fields */
  if(vers >= 105) while(d.ptr < d.raw.length) {
    const dt = read_u8(d), len = (vers >= 111 ? read_u32 : read_u16)(d, LE);
    if(dt == 0 && len == 0) break;
    d.ptr += len;
  }

  const ws: DenseWorkSheet = (_utils.aoa_to_sheet([var_names], {dense: true}) as DenseWorkSheet);

  /* 5.5 Data */
  for(let R = 0; R < nobs; ++R) {
    const row: any[] = [];
    for(let C = 0; C < nvar; ++C) {
      let t = var_types[C];
      // TODO: data type processing
      if(vers >= 111 && t >= 1 && t <= 244) {
        /* NOTE: dta_117 restricts strf to ASCII */
        let s = new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + t));
        s = s.replace(/\x00[\s\S]*/,"");
        row[C] = s;
        d.ptr += t;
      } else switch(t) {
        case 251: case 0x62: row[C] = read_i8(d); break; // byte
        case 252: case 0x69: row[C] = read_i16(d, LE); break; // int
        case 253: case 0x6c: row[C] = read_i32(d, LE); break; // long
        case 254: case 0x66: row[C] = read_f32(d, LE); break; // float
        case 255: case 0x64: row[C] = read_f64(d, LE); break; // double
        default: throw (`Unsupported field type ${t} for ${var_names[C]}`);
      }
    }
    _utils.sheet_add_aoa(ws, [row], {origin: -1, sheetStubs: true});
  }

  /* 5.6 Value labels */
  // EOF or labels

  const wb: WorkBook = _utils.book_new();
  _utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}

/** Parse DTA file
 *
 * NOTE: In NodeJS, `Buffer` extends `Uint8Array`
 *
 * @param {Uint8Array} data File data
 */
function parse(data: Uint8Array): WorkBook {
  if(data[0] >= 102 && data[0] <= 115) return parse_legacy(data);
  if(data[0] === 60) return parse_tagged(data);
  throw new Error("Not a DTA file");
}
