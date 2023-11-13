var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);

// dta.ts
var dta_exports = {};
__export(dta_exports, {
  parse: () => parse,
  set_utils: () => set_utils
});
var _utils;
function set_utils(utils) {
  _utils = utils;
}
function u8_to_dataview(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}
function valid_inc(p, n) {
  if (p.str.slice(p.ptr, p.ptr + n.length) != n)
    return false;
  p.ptr += n.length;
  return true;
}
function skip_end(p, n) {
  const idx = p.str.indexOf(n, p.ptr);
  if (idx == -1)
    throw new Error(`Expected ${n} after offset ${p.ptr}`);
  p.ptr = idx + n.length;
}
function slice_end(p, n) {
  const idx = p.str.indexOf(n, p.ptr);
  if (idx == -1)
    throw new Error(`Expected ${n} after offset ${p.ptr}`);
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
function read_f64(p, LE) {
  p.ptr += 8;
  const d = p.dv.getFloat64(p.ptr - 8, LE);
  return d > 8988e304 ? null : d;
}
function read_f32(p, LE) {
  p.ptr += 4;
  const d = p.dv.getFloat32(p.ptr - 4, LE);
  return d > 1701e35 ? null : d;
}
function read_u32(p, LE) {
  p.ptr += 4;
  return p.dv.getUint32(p.ptr - 4, LE);
}
function read_i32(p, LE) {
  p.ptr += 4;
  const u = p.dv.getInt32(p.ptr - 4, LE);
  return u > 2147483620 ? null : u;
}
function read_u16(p, LE) {
  p.ptr += 2;
  return p.dv.getUint16(p.ptr - 2, LE);
}
function read_i16(p, LE) {
  p.ptr += 2;
  const u = p.dv.getInt16(p.ptr - 2, LE);
  return u > 32740 ? null : u;
}
function read_u8(p) {
  return p.raw[p.ptr++];
}
function read_i8(p) {
  let u = p.raw[p.ptr++];
  u = u < 128 ? u : u - 256;
  return u > 100 ? null : u;
}
var SUPPORTED_VERSIONS_TAGGED = [
  "117",
  "118"
];
function parse_tagged(raw) {
  const err = "Not a DTA file";
  const str = new TextDecoder("latin1").decode(raw);
  const d = {
    ptr: 0,
    raw,
    str,
    dv: u8_to_dataview(raw)
  };
  let vers = 118;
  let LE = true;
  let nvar = 0, nobs = 0, nobs_lo = 0, nobs_hi = 0;
  let label = "", timestamp = "";
  const var_types = [];
  const var_names = [];
  const formats = [];
  if (!valid_inc(d, "<stata_dta>"))
    throw err;
  {
    if (!valid_inc(d, "<header>"))
      throw err;
    {
      if (!valid_inc(d, "<release>"))
        throw err;
      const res = slice_end(d, "</release>");
      if (SUPPORTED_VERSIONS_TAGGED.indexOf(res.str) == -1)
        throw `Unsupported DTA ${res.str} file`;
      vers = +res.str;
    }
    {
      if (!valid_inc(d, "<byteorder>"))
        throw err;
      const res = slice_end(d, "</byteorder>");
      switch (res.str) {
        case "MSF":
          LE = false;
          break;
        case "LSF":
          LE = true;
          break;
        default:
          throw `Unsupported byteorder ${res.str}`;
      }
    }
    {
      if (!valid_inc(d, "<K>"))
        throw err;
      const res = slice_end(d, "</K>");
      nvar = read_u16(res, LE);
    }
    {
      if (!valid_inc(d, "<N>"))
        throw err;
      const res = slice_end(d, "</N>");
      if (vers == 117)
        nobs = nobs_lo = read_u32(res, LE);
      else {
        const lo = read_u32(res, LE), hi = read_u32(res, LE);
        nobs = LE ? (nobs_lo = lo) + (nobs_hi = hi) * Math.pow(2, 32) : (nobs_lo = hi) + (nobs_hi = lo) * Math.pow(2, 32);
      }
      if (nobs > 1e6)
        console.error(`More than 1 million observations -- extra rows will be dropped`);
    }
    {
      if (!valid_inc(d, "<label>"))
        throw err;
      const res = slice_end(d, "</label>");
      const w = vers >= 118 ? 2 : 1;
      const strlen = w == 1 ? read_u8(res) : read_u16(res, LE);
      if (strlen + w != res.str.length)
        throw `Expected string length ${strlen} but actual length was ${res.str.length - w}`;
      if (strlen > 0)
        label = new TextDecoder().decode(res.raw.slice(w));
    }
    {
      if (!valid_inc(d, "<timestamp>"))
        throw err;
      const res = slice_end(d, "</timestamp>");
      const strlen = read_u8(res);
      if (strlen + 1 != res.str.length)
        throw `Expected string length ${strlen} but actual length was ${res.str.length - 1}`;
      if (strlen > 0)
        timestamp = res.str.slice(1);
    }
    if (!valid_inc(d, "</header>"))
      throw err;
  }
  {
    if (!valid_inc(d, "<map>"))
      throw err;
    skip_end(d, "</map>");
  }
  let stride = 0;
  {
    if (!valid_inc(d, "<variable_types>"))
      throw err;
    const res = slice_end(d, "</variable_types>");
    if (res.raw.length != 2 * nvar)
      throw `Expected variable_types length ${nvar * 2}, found ${res.raw.length}`;
    while (res.ptr < res.raw.length) {
      const type = read_u16(res, LE);
      var_types.push(type);
      if (type >= 1 && type <= 2045)
        stride += type;
      else
        switch (type) {
          case 32768:
            stride += 8;
            break;
          case 65526:
            stride += 8;
            break;
          case 65527:
            stride += 4;
            break;
          case 65528:
            stride += 4;
            break;
          case 65529:
            stride += 2;
            break;
          case 65530:
            stride += 1;
            break;
          default:
            throw `Unsupported field type ${type}`;
        }
    }
  }
  {
    if (!valid_inc(d, "<varnames>"))
      throw err;
    const res = slice_end(d, "</varnames>");
    const w = vers >= 118 ? 129 : 33;
    if (res.raw.length != w * nvar)
      throw `Expected variable_types length ${nvar * w}, found ${res.raw.length}`;
    while (res.ptr < res.raw.length) {
      const name = new TextDecoder().decode(res.raw.slice(res.ptr, res.ptr + w));
      res.ptr += w;
      var_names.push(name.replace(/\x00[\s\S]*/, ""));
    }
  }
  {
    if (!valid_inc(d, "<sortlist>"))
      throw err;
    const res = slice_end(d, "</sortlist>");
    if (res.raw.length != 2 * nvar + 2)
      throw `Expected sortlist length ${nvar * 2 + 2}, found ${res.raw.length}`;
  }
  {
    if (!valid_inc(d, "<formats>"))
      throw err;
    const res = slice_end(d, "</formats>");
    const w = vers >= 118 ? 57 : 49;
    if (res.raw.length != w * nvar)
      throw `Expected formats length ${nvar * w}, found ${res.raw.length}`;
    while (res.ptr < res.raw.length) {
      const name = new TextDecoder().decode(res.raw.slice(res.ptr, res.ptr + w));
      res.ptr += w;
      formats.push(name.replace(/\x00[\s\S]*/, ""));
    }
  }
  {
    if (!valid_inc(d, "<value_label_names>"))
      throw err;
    const w = vers >= 118 ? 129 : 33;
    const res = slice_end(d, "</value_label_names>");
  }
  {
    if (!valid_inc(d, "<variable_labels>"))
      throw err;
    const w = vers >= 118 ? 321 : 81;
    const res = slice_end(d, "</variable_labels>");
  }
  {
    if (!valid_inc(d, "<characteristics>"))
      throw err;
    while (d.str.slice(d.ptr, d.ptr + 4) == "<ch>") {
      d.ptr += 4;
      const len = read_u32(d, LE);
      d.ptr += len;
      if (!valid_inc(d, "</ch>"))
        throw err;
    }
    if (!valid_inc(d, "</characteristics>"))
      throw err;
  }
  const ws = _utils.aoa_to_sheet([var_names], { dense: true });
  var ptrs = [];
  {
    if (!valid_inc(d, "<data>"))
      throw err;
    for (let R = 0; R < nobs; ++R) {
      const row = [];
      for (let C = 0; C < nvar; ++C) {
        let t = var_types[C];
        if (t >= 1 && t <= 2045) {
          let s = new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + t));
          s = s.replace(/\x00[\s\S]*/, "");
          row[C] = s;
          d.ptr += t;
        } else
          switch (t) {
            case 65526:
              row[C] = read_f64(d, LE);
              break;
            case 65527:
              row[C] = read_f32(d, LE);
              break;
            case 65528:
              row[C] = read_i32(d, LE);
              break;
            case 65529:
              row[C] = read_i16(d, LE);
              break;
            case 65530:
              row[C] = read_i8(d);
              break;
            case 32768:
              {
                row[C] = "##SheetJStrL##";
                ptrs.push([R + 1, C, d.raw.slice(d.ptr, d.ptr + 8)]);
                d.ptr += 8;
              }
              break;
            default:
              throw `Unsupported field type ${t} for ${var_names[C]}`;
          }
      }
      _utils.sheet_add_aoa(ws, [row], { origin: -1, sheetStubs: true });
    }
    if (!valid_inc(d, "</data>"))
      throw err;
  }
  {
    if (!valid_inc(d, "<strls>"))
      throw err;
    const strl_tbl = [];
    while (d.raw[d.ptr] == 71) {
      if (!valid_inc(d, "GSO"))
        throw err;
      const v = read_u32(d, LE);
      let o = 0;
      if (vers == 117)
        o = read_u32(d, LE);
      else {
        const lo = read_u32(d, LE), hi = read_u32(d, LE);
        o = LE ? lo + hi * Math.pow(2, 32) : hi + lo * Math.pow(2, 32);
        if (o > 1e6)
          console.error(`More than 1 million observations -- data will be dropped`);
      }
      const t = read_u8(d);
      const len = read_u32(d, LE);
      if (!strl_tbl[o])
        strl_tbl[o] = [];
      let str2 = "";
      if (t == 129) {
        str2 = new TextDecoder("latin1").decode(d.raw.slice(d.ptr, d.ptr + len));
        d.ptr += len;
      } else {
        str2 = new TextDecoder("latin1").decode(d.raw.slice(d.ptr, d.ptr + len)).replace(/\x00$/, "");
        d.ptr += len;
      }
      strl_tbl[o][v] = str2;
    }
    if (!valid_inc(d, "</strls>"))
      throw err;
    ptrs.forEach(([R, C, buf]) => {
      const dv = u8_to_dataview(buf);
      let v = 0, o = 0;
      switch (vers) {
        case 117:
          {
            v = dv.getUint32(0, LE);
            o = dv.getUint32(4, LE);
          }
          break;
        case 118:
        case 120:
          {
            v = dv.getUint16(0, LE);
            const o1 = dv.getUint16(2, LE), o2 = dv.getUint32(4, LE);
            o = LE ? o1 + o2 * 65536 : o2 + o1 * 2 ** 32;
          }
          break;
        case 119:
        case 121: {
          const v1 = dv.getUint16(0, LE), v2 = buf[2];
          v = LE ? v1 + (v2 << 16) : v2 + (v1 << 8);
          const o1 = buf[3], o2 = dv.getUint32(4, LE);
          o = LE ? o1 + o2 * 256 : o2 + o1 * 2 ** 32;
        }
      }
      ws["!data"][R][C].v = strl_tbl[o][v];
    });
  }
  {
    if (!valid_inc(d, "<value_labels>"))
      throw err;
    const res = slice_end(d, "</value_labels>");
  }
  if (!valid_inc(d, "</stata_dta>"))
    throw err;
  const wb = _utils.book_new();
  _utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}
function parse_legacy(raw) {
  let vers = raw[0];
  switch (vers) {
    case 102:
    case 112:
      throw `Unsupported DTA ${vers} file`;
    case 103:
    case 104:
    case 105:
    case 108:
    case 110:
    case 111:
    case 113:
    case 114:
    case 115:
      break;
    default:
      throw new Error("Not a DTA file");
  }
  const d = {
    ptr: 1,
    raw,
    str: "",
    dv: u8_to_dataview(raw)
  };
  let LE = true;
  let nvar = 0, nobs = 0;
  let label = "", timestamp = "";
  const var_types = [];
  const var_names = [];
  const formats = [];
  {
    const byteorder = read_u8(d);
    switch (byteorder) {
      case 1:
        LE = false;
        break;
      case 2:
        LE = true;
        break;
      default:
        throw `DTA ${vers} Unexpected byteorder ${byteorder}`;
    }
    let byte = read_u8(d);
    if (byte != 1)
      throw `DTA ${vers} Unexpected filetype ${byte}`;
    d.ptr++;
    nvar = read_u16(d, LE);
    nobs = read_u32(d, LE);
    d.ptr += vers >= 108 ? 81 : 32;
    if (vers >= 105)
      d.ptr += 18;
  }
  {
    let C = 0;
    for (C = 0; C < nvar; ++C)
      var_types.push(read_u8(d));
    const w = vers >= 110 ? 33 : 9;
    for (C = 0; C < nvar; ++C) {
      var_names.push(new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + w)).replace(/\x00[\s\S]*$/, ""));
      d.ptr += w;
    }
    d.ptr += 2 * (nvar + 1);
    const fw = vers >= 114 ? 49 : vers >= 105 ? 12 : 7;
    for (C = 0; C < nvar; ++C) {
      formats.push(new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + fw)).replace(/\x00[\s\S]*$/, ""));
      d.ptr += fw;
    }
    d.ptr += (vers >= 110 ? 33 : 9) * nvar;
  }
  d.ptr += (vers >= 106 ? 81 : 32) * nvar;
  if (vers >= 105)
    while (d.ptr < d.raw.length) {
      const dt = read_u8(d), len = (vers >= 111 ? read_u32 : read_u16)(d, LE);
      if (dt == 0 && len == 0)
        break;
      d.ptr += len;
    }
  const ws = _utils.aoa_to_sheet([var_names], { dense: true });
  for (let R = 0; R < nobs; ++R) {
    const row = [];
    for (let C = 0; C < nvar; ++C) {
      let t = var_types[C];
      if (vers >= 111 && t >= 1 && t <= 244) {
        let s = new TextDecoder().decode(d.raw.slice(d.ptr, d.ptr + t));
        s = s.replace(/\x00[\s\S]*/, "");
        row[C] = s;
        d.ptr += t;
      } else
        switch (t) {
          case 251:
          case 98:
            row[C] = read_i8(d);
            break;
          case 252:
          case 105:
            row[C] = read_i16(d, LE);
            break;
          case 253:
          case 108:
            row[C] = read_i32(d, LE);
            break;
          case 254:
          case 102:
            row[C] = read_f32(d, LE);
            break;
          case 255:
          case 100:
            row[C] = read_f64(d, LE);
            break;
          default:
            throw `Unsupported field type ${t} for ${var_names[C]}`;
        }
    }
    _utils.sheet_add_aoa(ws, [row], { origin: -1, sheetStubs: true });
  }
  const wb = _utils.book_new();
  _utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}
function parse(data) {
  if (data[0] >= 102 && data[0] <= 115)
    return parse_legacy(data);
  if (data[0] === 60)
    return parse_tagged(data);
  throw new Error("Not a DTA file");
}
module.exports = __toCommonJS(dta_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parse,
  set_utils
});
