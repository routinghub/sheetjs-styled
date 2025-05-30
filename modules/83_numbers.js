/*! sheetjs (C) 2013-present SheetJS -- http://sheetjs.com */
var subarray = function() {
  try {
    if (typeof Uint8Array == "undefined")
      return "slice";
    if (typeof Uint8Array.prototype.subarray == "undefined")
      return "slice";
    if (typeof Buffer !== "undefined") {
      if (typeof Buffer.prototype.subarray == "undefined")
        return "slice";
      if ((typeof Buffer.from == "function" ? Buffer.from([72, 62]) : new Buffer([72, 62])) instanceof Uint8Array)
        return "subarray";
      return "slice";
    }
    return "subarray";
  } catch (e) {
    return "slice";
  }
}();
function u8_to_dataview(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}
function u8str(u8) {
  return typeof TextDecoder != "undefined" ? new TextDecoder().decode(u8) : utf8read(a2s(u8));
}
function stru8(str) {
  return typeof TextEncoder != "undefined" ? new TextEncoder().encode(str) : s2a(utf8write(str));
}
function u8concat(u8a) {
  var len = 0;
  for (var i = 0; i < u8a.length; ++i)
    len += u8a[i].length;
  var out = new Uint8Array(len);
  var off = 0;
  for (i = 0; i < u8a.length; ++i) {
    var u8 = u8a[i], L = u8.length;
    if (L < 250) {
      for (var j = 0; j < L; ++j)
        out[off++] = u8[j];
    } else {
      out.set(u8, off);
      off += L;
    }
  }
  return out;
}
function popcnt(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  return (x + (x >> 4) & 252645135) * 16843009 >>> 24;
}
function readDecimal128LE(buf, offset) {
  var exp = (buf[offset + 15] & 127) << 7 | buf[offset + 14] >> 1;
  var mantissa = buf[offset + 14] & 1;
  for (var j = offset + 13; j >= offset; --j)
    mantissa = mantissa * 256 + buf[j];
  return (buf[offset + 15] & 128 ? -mantissa : mantissa) * Math.pow(10, exp - 6176);
}
function writeDecimal128LE(buf, offset, value) {
  var exp = Math.floor(value == 0 ? 0 : Math.LOG10E * Math.log(Math.abs(value))) + 6176 - 16;
  var mantissa = value / Math.pow(10, exp - 6176);
  buf[offset + 15] |= exp >> 7;
  buf[offset + 14] |= (exp & 127) << 1;
  for (var i = 0; mantissa >= 1; ++i, mantissa /= 256)
    buf[offset + i] = mantissa & 255;
  buf[offset + 15] |= value >= 0 ? 0 : 128;
}
function parse_varint49(buf, ptr) {
  var l = ptr.l;
  var usz = buf[l] & 127;
  varint:
    if (buf[l++] >= 128) {
      usz |= (buf[l] & 127) << 7;
      if (buf[l++] < 128)
        break varint;
      usz |= (buf[l] & 127) << 14;
      if (buf[l++] < 128)
        break varint;
      usz |= (buf[l] & 127) << 21;
      if (buf[l++] < 128)
        break varint;
      usz += (buf[l] & 127) * Math.pow(2, 28);
      ++l;
      if (buf[l++] < 128)
        break varint;
      usz += (buf[l] & 127) * Math.pow(2, 35);
      ++l;
      if (buf[l++] < 128)
        break varint;
      usz += (buf[l] & 127) * Math.pow(2, 42);
      ++l;
      if (buf[l++] < 128)
        break varint;
    }
  ptr.l = l;
  return usz;
}
function write_varint49(v) {
  var usz = new Uint8Array(7);
  usz[0] = v & 127;
  var L = 1;
  sz:
    if (v > 127) {
      usz[L - 1] |= 128;
      usz[L] = v >> 7 & 127;
      ++L;
      if (v <= 16383)
        break sz;
      usz[L - 1] |= 128;
      usz[L] = v >> 14 & 127;
      ++L;
      if (v <= 2097151)
        break sz;
      usz[L - 1] |= 128;
      usz[L] = v >> 21 & 127;
      ++L;
      if (v <= 268435455)
        break sz;
      usz[L - 1] |= 128;
      usz[L] = v / 256 >>> 21 & 127;
      ++L;
      if (v <= 34359738367)
        break sz;
      usz[L - 1] |= 128;
      usz[L] = v / 65536 >>> 21 & 127;
      ++L;
      if (v <= 4398046511103)
        break sz;
      usz[L - 1] |= 128;
      usz[L] = v / 16777216 >>> 21 & 127;
      ++L;
    }
  return usz[subarray](0, L);
}
function parse_packed_varints(buf) {
  var ptr = { l: 0 };
  var out = [];
  while (ptr.l < buf.length)
    out.push(parse_varint49(buf, ptr));
  return out;
}
function write_packed_varints(nums) {
  return u8concat(nums.map(function(x) {
    return write_varint49(x);
  }));
}
function varint_to_i32(buf) {
  var l = 0, i32 = buf[l] & 127;
  if (buf[l++] < 128)
    return i32;
  i32 |= (buf[l] & 127) << 7;
  if (buf[l++] < 128)
    return i32;
  i32 |= (buf[l] & 127) << 14;
  if (buf[l++] < 128)
    return i32;
  i32 |= (buf[l] & 127) << 21;
  if (buf[l++] < 128)
    return i32;
  i32 |= (buf[l] & 15) << 28;
  return i32;
}
function varint_to_u64(buf) {
  var l = 0, lo = buf[l] & 127, hi = 0;
  varint:
    if (buf[l++] >= 128) {
      lo |= (buf[l] & 127) << 7;
      if (buf[l++] < 128)
        break varint;
      lo |= (buf[l] & 127) << 14;
      if (buf[l++] < 128)
        break varint;
      lo |= (buf[l] & 127) << 21;
      if (buf[l++] < 128)
        break varint;
      lo |= (buf[l] & 127) << 28;
      hi = buf[l] >> 4 & 7;
      if (buf[l++] < 128)
        break varint;
      hi |= (buf[l] & 127) << 3;
      if (buf[l++] < 128)
        break varint;
      hi |= (buf[l] & 127) << 10;
      if (buf[l++] < 128)
        break varint;
      hi |= (buf[l] & 127) << 17;
      if (buf[l++] < 128)
        break varint;
      hi |= (buf[l] & 127) << 24;
      if (buf[l++] < 128)
        break varint;
      hi |= (buf[l] & 127) << 31;
    }
  return [lo >>> 0, hi >>> 0];
}
function parse_shallow(buf) {
  var out = [], ptr = { l: 0 };
  while (ptr.l < buf.length) {
    var off = ptr.l;
    var num = parse_varint49(buf, ptr);
    var type = num & 7;
    num = num / 8 | 0;
    var data;
    var l = ptr.l;
    switch (type) {
      case 0:
        {
          while (buf[l++] >= 128)
            ;
          data = buf[subarray](ptr.l, l);
          ptr.l = l;
        }
        break;
      case 1:
        {
          data = buf[subarray](l, l + 8);
          ptr.l = l + 8;
        }
        break;
      case 2:
        {
          var len = parse_varint49(buf, ptr);
          data = buf[subarray](ptr.l, ptr.l + len);
          ptr.l += len;
        }
        break;
      case 5:
        {
          data = buf[subarray](l, l + 4);
          ptr.l = l + 4;
        }
        break;
      default:
        throw new Error("PB Type ".concat(type, " for Field ").concat(num, " at offset ").concat(off));
    }
    var v = { data: data, type: type };
    if (out[num] == null)
      out[num] = [];
    out[num].push(v);
  }
  return out;
}
function write_shallow(proto) {
  var out = [];
  proto.forEach(function(field, idx) {
    if (idx == 0)
      return;
    field.forEach(function(item) {
      if (!item.data)
        return;
      out.push(write_varint49(idx * 8 + item.type));
      if (item.type == 2)
        out.push(write_varint49(item.data.length));
      out.push(item.data);
    });
  });
  return u8concat(out);
}
function mappa(data, cb) {
  return (data == null ? void 0 : data.map(function(d) {
    return cb(d.data);
  })) || [];
}
function parse_iwa_file(buf) {
  var _a;
  var out = [], ptr = { l: 0 };
  while (ptr.l < buf.length) {
    var len = parse_varint49(buf, ptr);
    var ai = parse_shallow(buf[subarray](ptr.l, ptr.l + len));
    ptr.l += len;
    var res = {
      id: varint_to_i32(ai[1][0].data),
      messages: []
    };
    ai[2].forEach(function(b) {
      var mi = parse_shallow(b.data);
      var fl = varint_to_i32(mi[3][0].data);
      res.messages.push({
        meta: mi,
        data: buf[subarray](ptr.l, ptr.l + fl)
      });
      ptr.l += fl;
    });
    if ((_a = ai[3]) == null ? void 0 : _a[0])
      res.merge = varint_to_i32(ai[3][0].data) >>> 0 > 0;
    out.push(res);
  }
  return out;
}
function write_iwa_file(ias) {
  var bufs = [];
  ias.forEach(function(ia) {
    var ai = [
      [],
      [{ data: write_varint49(ia.id), type: 0 }],
      []
    ];
    if (ia.merge != null)
      ai[3] = [{ data: write_varint49(+!!ia.merge), type: 0 }];
    var midata = [];
    ia.messages.forEach(function(mi) {
      midata.push(mi.data);
      mi.meta[3] = [{ type: 0, data: write_varint49(mi.data.length) }];
      ai[2].push({ data: write_shallow(mi.meta), type: 2 });
    });
    var aipayload = write_shallow(ai);
    bufs.push(write_varint49(aipayload.length));
    bufs.push(aipayload);
    midata.forEach(function(mid) {
      return bufs.push(mid);
    });
  });
  return u8concat(bufs);
}
function parse_snappy_chunk(type, buf) {
  if (type != 0)
    throw new Error("Unexpected Snappy chunk type ".concat(type));
  var ptr = { l: 0 };
  var usz = parse_varint49(buf, ptr);
  var chunks = [];
  var l = ptr.l;
  while (l < buf.length) {
    var tag = buf[l] & 3;
    if (tag == 0) {
      var len = buf[l++] >> 2;
      if (len < 60)
        ++len;
      else {
        var c = len - 59;
        len = buf[l];
        if (c > 1)
          len |= buf[l + 1] << 8;
        if (c > 2)
          len |= buf[l + 2] << 16;
        if (c > 3)
          len |= buf[l + 3] << 24;
        len >>>= 0;
        len++;
        l += c;
      }
      chunks.push(buf[subarray](l, l + len));
      l += len;
      continue;
    } else {
      var offset = 0, length = 0;
      if (tag == 1) {
        length = (buf[l] >> 2 & 7) + 4;
        offset = (buf[l++] & 224) << 3;
        offset |= buf[l++];
      } else {
        length = (buf[l++] >> 2) + 1;
        if (tag == 2) {
          offset = buf[l] | buf[l + 1] << 8;
          l += 2;
        } else {
          offset = (buf[l] | buf[l + 1] << 8 | buf[l + 2] << 16 | buf[l + 3] << 24) >>> 0;
          l += 4;
        }
      }
      if (offset == 0)
        throw new Error("Invalid offset 0");
      var j = chunks.length - 1, off = offset;
      while (j >= 0 && off >= chunks[j].length) {
        off -= chunks[j].length;
        --j;
      }
      if (j < 0) {
        if (off == 0)
          off = chunks[j = 0].length;
        else
          throw new Error("Invalid offset beyond length");
      }
      if (length < off)
        chunks.push(chunks[j][subarray](chunks[j].length - off, chunks[j].length - off + length));
      else {
        if (off > 0) {
          chunks.push(chunks[j][subarray](chunks[j].length - off));
          length -= off;
        }
        ++j;
        while (length >= chunks[j].length) {
          chunks.push(chunks[j]);
          length -= chunks[j].length;
          ++j;
        }
        if (length)
          chunks.push(chunks[j][subarray](0, length));
      }
      if (chunks.length > 25)
        chunks = [u8concat(chunks)];
    }
  }
  var clen = 0;
  for (var u8i = 0; u8i < chunks.length; ++u8i)
    clen += chunks[u8i].length;
  if (clen != usz)
    throw new Error("Unexpected length: ".concat(clen, " != ").concat(usz));
  return chunks;
}
function decompress_iwa_file(buf) {
  if (Array.isArray(buf))
    buf = new Uint8Array(buf);
  var out = [];
  var l = 0;
  while (l < buf.length) {
    var t = buf[l++];
    var len = buf[l] | buf[l + 1] << 8 | buf[l + 2] << 16;
    l += 3;
    out.push.apply(out, parse_snappy_chunk(t, buf[subarray](l, l + len)));
    l += len;
  }
  if (l !== buf.length)
    throw new Error("data is not a valid framed stream!");
  return out.length == 1 ? out[0] : u8concat(out);
}
function compress_iwa_file(buf) {
  var out = [];
  var l = 0;
  while (l < buf.length) {
    var c = Math.min(buf.length - l, 268435455);
    var frame = new Uint8Array(4);
    out.push(frame);
    var usz = write_varint49(c);
    var L = usz.length;
    out.push(usz);
    if (c <= 60) {
      L++;
      out.push(new Uint8Array([c - 1 << 2]));
    } else if (c <= 256) {
      L += 2;
      out.push(new Uint8Array([240, c - 1 & 255]));
    } else if (c <= 65536) {
      L += 3;
      out.push(new Uint8Array([244, c - 1 & 255, c - 1 >> 8 & 255]));
    } else if (c <= 16777216) {
      L += 4;
      out.push(new Uint8Array([248, c - 1 & 255, c - 1 >> 8 & 255, c - 1 >> 16 & 255]));
    } else if (c <= 4294967296) {
      L += 5;
      out.push(new Uint8Array([252, c - 1 & 255, c - 1 >> 8 & 255, c - 1 >> 16 & 255, c - 1 >>> 24 & 255]));
    }
    out.push(buf[subarray](l, l + c));
    L += c;
    frame[0] = 0;
    frame[1] = L & 255;
    frame[2] = L >> 8 & 255;
    frame[3] = L >> 16 & 255;
    l += c;
  }
  return u8concat(out);
}
var numbers_lut_new = function() {
  return { sst: [], rsst: [], ofmt: [], nfmt: [], fmla: [], ferr: [], cmnt: [] };
};
function numbers_format_cell(cell, t, flags, ofmt, nfmt) {
  var _a, _b, _c, _d;
  var ctype = t & 255, ver = t >> 8;
  var fmt = ver >= 5 ? nfmt : ofmt;
  dur:
    if (flags & (ver > 4 ? 8 : 4) && cell.t == "n" && ctype == 7) {
      var dstyle = ((_a = fmt[7]) == null ? void 0 : _a[0]) ? varint_to_i32(fmt[7][0].data) : -1;
      if (dstyle == -1)
        break dur;
      var dmin = ((_b = fmt[15]) == null ? void 0 : _b[0]) ? varint_to_i32(fmt[15][0].data) : -1;
      var dmax = ((_c = fmt[16]) == null ? void 0 : _c[0]) ? varint_to_i32(fmt[16][0].data) : -1;
      var auto = ((_d = fmt[40]) == null ? void 0 : _d[0]) ? varint_to_i32(fmt[40][0].data) : -1;
      var d = cell.v, dd = d;
      autodur:
        if (auto) {
          if (d == 0) {
            dmin = dmax = 2;
            break autodur;
          }
          if (d >= 604800)
            dmin = 1;
          else if (d >= 86400)
            dmin = 2;
          else if (d >= 3600)
            dmin = 4;
          else if (d >= 60)
            dmin = 8;
          else if (d >= 1)
            dmin = 16;
          else
            dmin = 32;
          if (Math.floor(d) != d)
            dmax = 32;
          else if (d % 60)
            dmax = 16;
          else if (d % 3600)
            dmax = 8;
          else if (d % 86400)
            dmax = 4;
          else if (d % 604800)
            dmax = 2;
          if (dmax < dmin)
            dmax = dmin;
        }
      if (dmin == -1 || dmax == -1)
        break dur;
      var dstr = [], zstr = [];
      if (dmin == 1) {
        dd = d / 604800;
        if (dmax == 1) {
          zstr.push('d"d"');
        } else {
          dd |= 0;
          d -= 604800 * dd;
        }
        dstr.push(dd + (dstyle == 2 ? " week" + (dd == 1 ? "" : "s") : dstyle == 1 ? "w" : ""));
      }
      if (dmin <= 2 && dmax >= 2) {
        dd = d / 86400;
        if (dmax > 2) {
          dd |= 0;
          d -= 86400 * dd;
        }
        zstr.push('d"d"');
        dstr.push(dd + (dstyle == 2 ? " day" + (dd == 1 ? "" : "s") : dstyle == 1 ? "d" : ""));
      }
      if (dmin <= 4 && dmax >= 4) {
        dd = d / 3600;
        if (dmax > 4) {
          dd |= 0;
          d -= 3600 * dd;
        }
        zstr.push((dmin >= 4 ? "[h]" : "h") + '"h"');
        dstr.push(dd + (dstyle == 2 ? " hour" + (dd == 1 ? "" : "s") : dstyle == 1 ? "h" : ""));
      }
      if (dmin <= 8 && dmax >= 8) {
        dd = d / 60;
        if (dmax > 8) {
          dd |= 0;
          d -= 60 * dd;
        }
        zstr.push((dmin >= 8 ? "[m]" : "m") + '"m"');
        if (dstyle == 0)
          dstr.push((dmin == 8 && dmax == 8 || dd >= 10 ? "" : "0") + dd);
        else
          dstr.push(dd + (dstyle == 2 ? " minute" + (dd == 1 ? "" : "s") : dstyle == 1 ? "m" : ""));
      }
      if (dmin <= 16 && dmax >= 16) {
        dd = d;
        if (dmax > 16) {
          dd |= 0;
          d -= dd;
        }
        zstr.push((dmin >= 16 ? "[s]" : "s") + '"s"');
        if (dstyle == 0)
          dstr.push((dmax == 16 && dmin == 16 || dd >= 10 ? "" : "0") + dd);
        else
          dstr.push(dd + (dstyle == 2 ? " second" + (dd == 1 ? "" : "s") : dstyle == 1 ? "s" : ""));
      }
      if (dmax >= 32) {
        dd = Math.round(1e3 * d);
        if (dmin < 32)
          zstr.push('.000"ms"');
        if (dstyle == 0)
          dstr.push((dd >= 100 ? "" : dd >= 10 ? "0" : "00") + dd);
        else
          dstr.push(dd + (dstyle == 2 ? " millisecond" + (dd == 1 ? "" : "s") : dstyle == 1 ? "ms" : ""));
      }
      cell.w = dstr.join(dstyle == 0 ? ":" : " ");
      cell.z = zstr.join(dstyle == 0 ? '":"' : " ");
      if (dstyle == 0)
        cell.w = cell.w.replace(/:(\d\d\d)$/, ".$1");
    }
}
function parse_old_storage(buf, lut, v, opts) {
  var dv = u8_to_dataview(buf);
  var flags = dv.getUint32(4, true);
  var ridx = -1, sidx = -1, zidx = -1, ieee = NaN, dc = 0, dt = new Date(Date.UTC(2001, 0, 1));
  var doff = v > 1 ? 12 : 8;
  if (flags & 2) {
    zidx = dv.getUint32(doff, true);
    doff += 4;
  }
  doff += popcnt(flags & (v > 1 ? 3468 : 396)) * 4;
  if (flags & 512) {
    ridx = dv.getUint32(doff, true);
    doff += 4;
  }
  doff += popcnt(flags & (v > 1 ? 12288 : 4096)) * 4;
  if (flags & 16) {
    sidx = dv.getUint32(doff, true);
    doff += 4;
  }
  if (flags & 32) {
    ieee = dv.getFloat64(doff, true);
    doff += 8;
  }
  if (flags & 64) {
    dt.setTime(dt.getTime() + (dc = dv.getFloat64(doff, true)) * 1e3);
    doff += 8;
  }
  if (v > 1) {
    flags = dv.getUint32(8, true) >>> 16;
    if (flags & 255) {
      if (zidx == -1)
        zidx = dv.getUint32(doff, true);
      doff += 4;
    }
  }
  var ret;
  var t = buf[v >= 4 ? 1 : 2];
  switch (t) {
    case 0:
      return void 0;
    case 2:
      ret = { t: "n", v: ieee };
      break;
    case 3:
      ret = { t: "s", v: lut.sst[sidx] };
      break;
    case 5:
      {
        if (opts == null ? void 0 : opts.cellDates)
          ret = { t: "d", v: dt };
        else
          ret = { t: "n", v: dc / 86400 + 35430, z: table_fmt[14] };
      }
      break;
    case 6:
      ret = { t: "b", v: ieee > 0 };
      break;
    case 7:
      ret = { t: "n", v: ieee };
      break;
    case 8:
      ret = { t: "e", v: 0 };
      break;
    case 9:
      {
        if (ridx > -1) {
          var rts = lut.rsst[ridx];
          ret = { t: "s", v: rts.v };
          if (rts.l)
            ret.l = { Target: rts.l };
        } else
          throw new Error("Unsupported cell type ".concat(buf[subarray](0, 4)));
      }
      break;
    default:
      throw new Error("Unsupported cell type ".concat(buf[subarray](0, 4)));
  }
  if (zidx > -1)
    numbers_format_cell(ret, t | v << 8, flags, lut.ofmt[zidx], lut.nfmt[zidx]);
  if (t == 7)
    ret.v /= 86400;
  return ret;
}
function parse_new_storage(buf, lut, opts) {
  var dv = u8_to_dataview(buf);
  var flags = dv.getUint32(4, true);
  var fields = dv.getUint32(8, true);
  var doff = 12;
  var ridx = -1, sidx = -1, zidx = -1, d128 = NaN, ieee = NaN, dc = 0, dt = new Date(Date.UTC(2001, 0, 1)), eidx = -1, fidx = -1;
  if (fields & 1) {
    d128 = readDecimal128LE(buf, doff);
    doff += 16;
  }
  if (fields & 2) {
    ieee = dv.getFloat64(doff, true);
    doff += 8;
  }
  if (fields & 4) {
    dt.setTime(dt.getTime() + (dc = dv.getFloat64(doff, true)) * 1e3);
    doff += 8;
  }
  if (fields & 8) {
    sidx = dv.getUint32(doff, true);
    doff += 4;
  }
  if (fields & 16) {
    ridx = dv.getUint32(doff, true);
    doff += 4;
  }
  doff += popcnt(fields & 480) * 4;
  if (fields & 512) {
    fidx = dv.getUint32(doff, true);
    doff += 4;
  }
  doff += popcnt(fields & 1024) * 4;
  if (fields & 2048) {
    eidx = dv.getUint32(doff, true);
    doff += 4;
  }
  var ret;
  var t = buf[1];
  switch (t) {
    case 0:
      ret = { t: "z" };
      break;
    case 2:
      ret = { t: "n", v: d128 };
      break;
    case 3:
      ret = { t: "s", v: lut.sst[sidx] };
      break;
    case 5:
      {
        if (opts == null ? void 0 : opts.cellDates)
          ret = { t: "d", v: dt };
        else
          ret = { t: "n", v: dc / 86400 + 35430, z: table_fmt[14] };
      }
      break;
    case 6:
      ret = { t: "b", v: ieee > 0 };
      break;
    case 7:
      ret = { t: "n", v: ieee };
      break;
    case 8:
      ret = { t: "e", v: 0 };
      break;
    case 9:
      {
        if (ridx > -1) {
          var rts = lut.rsst[ridx];
          ret = { t: "s", v: rts.v };
          if (rts.l)
            ret.l = { Target: rts.l };
        } else
          throw new Error("Unsupported cell type ".concat(buf[1], " : ").concat(fields & 31, " : ").concat(buf[subarray](0, 4)));
      }
      break;
    case 10:
      ret = { t: "n", v: d128 };
      break;
    default:
      throw new Error("Unsupported cell type ".concat(buf[1], " : ").concat(fields & 31, " : ").concat(buf[subarray](0, 4)));
  }
  doff += popcnt(fields & 4096) * 4;
  if (fields & 516096) {
    if (zidx == -1)
      zidx = dv.getUint32(doff, true);
    doff += 4;
  }
  if (fields & 524288) {
    var cmntidx = dv.getUint32(doff, true);
    doff += 4;
    if (lut.cmnt[cmntidx])
      ret.c = iwa_to_s5s_comment(lut.cmnt[cmntidx]);
  }
  if (zidx > -1)
    numbers_format_cell(ret, t | 5 << 8, fields >> 13, lut.ofmt[zidx], lut.nfmt[zidx]);
  if (t == 7)
    ret.v /= 86400;
  return ret;
}
function write_new_storage(cell, lut) {
  var out = new Uint8Array(32), dv = u8_to_dataview(out), l = 12, fields = 0;
  out[0] = 5;
  switch (cell.t) {
    case "n":
      if (cell.z && fmt_is_date(cell.z)) {
        out[1] = 5;
        dv.setFloat64(l, (numdate(cell.v + 1462).getTime() - Date.UTC(2001, 0, 1)) / 1e3, true);
        fields |= 4;
        l += 8;
        break;
      } else {
        out[1] = 2;
        writeDecimal128LE(out, l, cell.v);
        fields |= 1;
        l += 16;
      }
      break;
    case "b":
      out[1] = 6;
      dv.setFloat64(l, cell.v ? 1 : 0, true);
      fields |= 2;
      l += 8;
      break;
    case "s":
      {
        var s = cell.v == null ? "" : String(cell.v);
        if (cell.l) {
          var irsst = lut.rsst.findIndex(function(v) {
            var _a;
            return v.v == s && v.l == ((_a = cell.l) == null ? void 0 : _a.Target);
          });
          if (irsst == -1)
            lut.rsst[irsst = lut.rsst.length] = { v: s, l: cell.l.Target };
          out[1] = 9;
          dv.setUint32(l, irsst, true);
          fields |= 16;
          l += 4;
        } else {
          var isst = lut.sst.indexOf(s);
          if (isst == -1)
            lut.sst[isst = lut.sst.length] = s;
          out[1] = 3;
          dv.setUint32(l, isst, true);
          fields |= 8;
          l += 4;
        }
      }
      break;
    case "d":
      out[1] = 5;
      dv.setFloat64(l, (cell.v.getTime() - Date.UTC(2001, 0, 1)) / 1e3, true);
      fields |= 4;
      l += 8;
      break;
    case "z":
      out[1] = 0;
      break;
    default:
      throw "unsupported cell type " + cell.t;
  }
  if (cell.c) {
    lut.cmnt.push(s5s_to_iwa_comment(cell.c));
    dv.setUint32(l, lut.cmnt.length - 1, true);
    fields |= 524288;
    l += 4;
  }
  dv.setUint32(8, fields, true);
  return out[subarray](0, l);
}
function write_old_storage(cell, lut) {
  var out = new Uint8Array(32), dv = u8_to_dataview(out), l = 12, fields = 0, s = "";
  out[0] = 4;
  switch (cell.t) {
    case "n":
      break;
    case "b":
      break;
    case "s":
      {
        s = cell.v == null ? "" : String(cell.v);
        if (cell.l) {
          var irsst = lut.rsst.findIndex(function(v) {
            var _a;
            return v.v == s && v.l == ((_a = cell.l) == null ? void 0 : _a.Target);
          });
          if (irsst == -1)
            lut.rsst[irsst = lut.rsst.length] = { v: s, l: cell.l.Target };
          out[1] = 9;
          dv.setUint32(l, irsst, true);
          fields |= 512;
          l += 4;
        } else {
        }
      }
      break;
    case "d":
      break;
    case "e":
      break;
    case "z":
      break;
    default:
      throw "unsupported cell type " + cell.t;
  }
  if (cell.c) {
    dv.setUint32(l, lut.cmnt.length - 1, true);
    fields |= 4096;
    l += 4;
  }
  switch (cell.t) {
    case "n":
      out[1] = 2;
      dv.setFloat64(l, cell.v, true);
      fields |= 32;
      l += 8;
      break;
    case "b":
      out[1] = 6;
      dv.setFloat64(l, cell.v ? 1 : 0, true);
      fields |= 32;
      l += 8;
      break;
    case "s":
      {
        s = cell.v == null ? "" : String(cell.v);
        if (cell.l) {
        } else {
          var isst = lut.sst.indexOf(s);
          if (isst == -1)
            lut.sst[isst = lut.sst.length] = s;
          out[1] = 3;
          dv.setUint32(l, isst, true);
          fields |= 16;
          l += 4;
        }
      }
      break;
    case "d":
      out[1] = 5;
      dv.setFloat64(l, (cell.v.getTime() - Date.UTC(2001, 0, 1)) / 1e3, true);
      fields |= 64;
      l += 8;
      break;
    case "z":
      out[1] = 0;
      break;
    default:
      throw "unsupported cell type " + cell.t;
  }
  dv.setUint32(8, fields, true);
  return out[subarray](0, l);
}
function parse_cell_storage(buf, lut, opts) {
  switch (buf[0]) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
      return parse_old_storage(buf, lut, buf[0], opts);
    case 5:
      return parse_new_storage(buf, lut, opts);
    default:
      throw new Error("Unsupported payload version ".concat(buf[0]));
  }
}
function parse_TSP_Reference(buf) {
  var pb = parse_shallow(buf);
  return varint_to_i32(pb[1][0].data);
}
function write_TSP_Reference(idx) {
  return write_shallow([
    [],
    [{ type: 0, data: write_varint49(idx) }]
  ]);
}
function numbers_add_oref(iwa, ref) {
  var _a;
  var orefs = ((_a = iwa.messages[0].meta[5]) == null ? void 0 : _a[0]) ? parse_packed_varints(iwa.messages[0].meta[5][0].data) : [];
  var orefidx = orefs.indexOf(ref);
  if (orefidx == -1) {
    orefs.push(ref);
    iwa.messages[0].meta[5] = [{ type: 2, data: write_packed_varints(orefs) }];
  }
}
function numbers_del_oref(iwa, ref) {
  var _a;
  var orefs = ((_a = iwa.messages[0].meta[5]) == null ? void 0 : _a[0]) ? parse_packed_varints(iwa.messages[0].meta[5][0].data) : [];
  iwa.messages[0].meta[5] = [{ type: 2, data: write_packed_varints(orefs.filter(function(r) {
    return r != ref;
  })) }];
}
function parse_TST_TableDataList(M, root) {
  var pb = parse_shallow(root.data);
  var type = varint_to_i32(pb[1][0].data);
  var entries = pb[3];
  var data = [];
  (entries || []).forEach(function(entry) {
    var _a, _b;
    var le = parse_shallow(entry.data);
    if (!le[1])
      return;
    var key = varint_to_i32(le[1][0].data) >>> 0;
    switch (type) {
      case 1:
        data[key] = u8str(le[3][0].data);
        break;
      case 8:
        {
          var rt = M[parse_TSP_Reference(le[9][0].data)][0];
          var rtp = parse_shallow(rt.data);
          var rtpref = M[parse_TSP_Reference(rtp[1][0].data)][0];
          var mtype = varint_to_i32(rtpref.meta[1][0].data);
          if (mtype != 2001)
            throw new Error("2000 unexpected reference to ".concat(mtype));
          var tswpsa = parse_shallow(rtpref.data);
          var richtext = { v: tswpsa[3].map(function(x) {
            return u8str(x.data);
          }).join("") };
          data[key] = richtext;
          sfields:
            if ((_a = tswpsa == null ? void 0 : tswpsa[11]) == null ? void 0 : _a[0]) {
              var smartfields = (_b = parse_shallow(tswpsa[11][0].data)) == null ? void 0 : _b[1];
              if (!smartfields)
                break sfields;
              smartfields.forEach(function(sf) {
                var _a2, _b2, _c;
                var attr = parse_shallow(sf.data);
                if ((_a2 = attr[2]) == null ? void 0 : _a2[0]) {
                  var obj = M[parse_TSP_Reference((_b2 = attr[2]) == null ? void 0 : _b2[0].data)][0];
                  var objtype = varint_to_i32(obj.meta[1][0].data);
                  switch (objtype) {
                    case 2032:
                      var hlink = parse_shallow(obj.data);
                      if (((_c = hlink == null ? void 0 : hlink[2]) == null ? void 0 : _c[0]) && !richtext.l)
                        richtext.l = u8str(hlink[2][0].data);
                      break;
                    case 2039:
                      break;
                    default:
                      console.log("unrecognized ObjectAttribute type ".concat(objtype));
                  }
                }
              });
            }
        }
        break;
      case 2:
        data[key] = parse_shallow(le[6][0].data);
        break;
      case 3:
        data[key] = parse_shallow(le[5][0].data);
        break;
      case 10:
        {
          var cs = M[parse_TSP_Reference(le[10][0].data)][0];
          data[key] = parse_TSD_CommentStorageArchive(M, cs.data);
        }
        break;
      default:
        throw type;
    }
  });
  return data;
}
function parse_TST_TileRowInfo(u8, type) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  var pb = parse_shallow(u8);
  var R = varint_to_i32(pb[1][0].data) >>> 0;
  var cnt = varint_to_i32(pb[2][0].data) >>> 0;
  var wide_offsets = ((_b = (_a = pb[8]) == null ? void 0 : _a[0]) == null ? void 0 : _b.data) && varint_to_i32(pb[8][0].data) > 0 || false;
  var used_storage_u8, used_storage;
  if (((_d = (_c = pb[7]) == null ? void 0 : _c[0]) == null ? void 0 : _d.data) && type != 0) {
    used_storage_u8 = (_f = (_e = pb[7]) == null ? void 0 : _e[0]) == null ? void 0 : _f.data;
    used_storage = (_h = (_g = pb[6]) == null ? void 0 : _g[0]) == null ? void 0 : _h.data;
  } else if (((_j = (_i = pb[4]) == null ? void 0 : _i[0]) == null ? void 0 : _j.data) && type != 1) {
    used_storage_u8 = (_l = (_k = pb[4]) == null ? void 0 : _k[0]) == null ? void 0 : _l.data;
    used_storage = (_n = (_m = pb[3]) == null ? void 0 : _m[0]) == null ? void 0 : _n.data;
  } else
    throw "NUMBERS Tile missing ".concat(type, " cell storage");
  var width = wide_offsets ? 4 : 1;
  var used_storage_offsets = u8_to_dataview(used_storage_u8);
  var offsets = [];
  for (var C = 0; C < used_storage_u8.length / 2; ++C) {
    var off = used_storage_offsets.getUint16(C * 2, true);
    if (off < 65535)
      offsets.push([C, off]);
  }
  if (offsets.length != cnt)
    throw "Expected ".concat(cnt, " cells, found ").concat(offsets.length);
  var cells = [];
  for (C = 0; C < offsets.length - 1; ++C)
    cells[offsets[C][0]] = used_storage[subarray](offsets[C][1] * width, offsets[C + 1][1] * width);
  if (offsets.length >= 1)
    cells[offsets[offsets.length - 1][0]] = used_storage[subarray](offsets[offsets.length - 1][1] * width);
  return { R: R, cells: cells };
}
function parse_TST_Tile(M, root) {
  var _a;
  var pb = parse_shallow(root.data);
  var storage = -1;
  if ((_a = pb == null ? void 0 : pb[7]) == null ? void 0 : _a[0]) {
    if (varint_to_i32(pb[7][0].data) >>> 0)
      storage = 1;
    else
      storage = 0;
  }
  var ri = mappa(pb[5], function(u8) {
    return parse_TST_TileRowInfo(u8, storage);
  });
  return {
    nrows: varint_to_i32(pb[4][0].data) >>> 0,
    data: ri.reduce(function(acc, x) {
      if (!acc[x.R])
        acc[x.R] = [];
      x.cells.forEach(function(cell, C) {
        if (acc[x.R][C])
          throw new Error("Duplicate cell r=".concat(x.R, " c=").concat(C));
        acc[x.R][C] = cell;
      });
      return acc;
    }, [])
  };
}
function parse_TSD_CommentStorageArchive(M, data) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  var out = { t: "", a: "" };
  var csp = parse_shallow(data);
  if ((_b = (_a = csp == null ? void 0 : csp[1]) == null ? void 0 : _a[0]) == null ? void 0 : _b.data)
    out.t = u8str((_d = (_c = csp == null ? void 0 : csp[1]) == null ? void 0 : _c[0]) == null ? void 0 : _d.data) || "";
  if ((_f = (_e = csp == null ? void 0 : csp[3]) == null ? void 0 : _e[0]) == null ? void 0 : _f.data) {
    var as = M[parse_TSP_Reference((_h = (_g = csp == null ? void 0 : csp[3]) == null ? void 0 : _g[0]) == null ? void 0 : _h.data)][0];
    var asp = parse_shallow(as.data);
    if ((_j = (_i = asp[1]) == null ? void 0 : _i[0]) == null ? void 0 : _j.data)
      out.a = u8str(asp[1][0].data);
  }
  if (csp == null ? void 0 : csp[4]) {
    out.replies = [];
    csp[4].forEach(function(pi) {
      var cs = M[parse_TSP_Reference(pi.data)][0];
      out.replies.push(parse_TSD_CommentStorageArchive(M, cs.data));
    });
  }
  return out;
}
function iwa_to_s5s_comment(iwa) {
  var out = [];
  out.push({ t: iwa.t || "", a: iwa.a, T: iwa.replies && iwa.replies.length > 0 });
  if (iwa.replies)
    iwa.replies.forEach(function(reply) {
      out.push({ t: reply.t || "", a: reply.a, T: true });
    });
  return out;
}
function s5s_to_iwa_comment(s5s) {
  var out = { a: "", t: "", replies: [] };
  for (var i = 0; i < s5s.length; ++i) {
    if (i == 0) {
      out.a = s5s[i].a;
      out.t = s5s[i].t;
    } else {
      out.replies.push({ a: s5s[i].a, t: s5s[i].t });
    }
  }
  return out;
}
function parse_TST_TableModelArchive(M, root, ws, opts) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  var pb = parse_shallow(root.data);
  var range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  range.e.r = (varint_to_i32(pb[6][0].data) >>> 0) - 1;
  if (range.e.r < 0)
    throw new Error("Invalid row varint ".concat(pb[6][0].data));
  range.e.c = (varint_to_i32(pb[7][0].data) >>> 0) - 1;
  if (range.e.c < 0)
    throw new Error("Invalid col varint ".concat(pb[7][0].data));
  ws["!ref"] = encode_range(range);
  var dense = ws["!data"] != null, dws = ws;
  var store = parse_shallow(pb[4][0].data);
  var lut = numbers_lut_new();
  if ((_a = store[4]) == null ? void 0 : _a[0])
    lut.sst = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[4][0].data)][0]);
  if ((_b = store[6]) == null ? void 0 : _b[0])
    lut.fmla = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[6][0].data)][0]);
  if ((_c = store[11]) == null ? void 0 : _c[0])
    lut.ofmt = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[11][0].data)][0]);
  if ((_d = store[12]) == null ? void 0 : _d[0])
    lut.ferr = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[12][0].data)][0]);
  if ((_e = store[17]) == null ? void 0 : _e[0])
    lut.rsst = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[17][0].data)][0]);
  if ((_f = store[19]) == null ? void 0 : _f[0])
    lut.cmnt = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[19][0].data)][0]);
  if ((_g = store[22]) == null ? void 0 : _g[0])
    lut.nfmt = parse_TST_TableDataList(M, M[parse_TSP_Reference(store[22][0].data)][0]);
  var tile = parse_shallow(store[3][0].data);
  var _R = 0;
  if (!((_h = store[9]) == null ? void 0 : _h[0]))
    throw "NUMBERS file missing row tree";
  var rtt = parse_shallow(store[9][0].data)[1].map(function(p) {
    return parse_shallow(p.data);
  });
  rtt.forEach(function(kv) {
    _R = varint_to_i32(kv[1][0].data);
    var tidx = varint_to_i32(kv[2][0].data);
    var t = tile[1][tidx];
    if (!t)
      throw "NUMBERS missing tile " + tidx;
    var tl = parse_shallow(t.data);
    var ref2 = M[parse_TSP_Reference(tl[2][0].data)][0];
    var mtype2 = varint_to_i32(ref2.meta[1][0].data);
    if (mtype2 != 6002)
      throw new Error("6001 unexpected reference to ".concat(mtype2));
    var _tile = parse_TST_Tile(M, ref2);
    _tile.data.forEach(function(row, R) {
      row.forEach(function(buf, C) {
        var res = parse_cell_storage(buf, lut, opts);
        if (res) {
          if (dense) {
            if (!dws["!data"][_R + R])
              dws["!data"][_R + R] = [];
            dws["!data"][_R + R][C] = res;
          } else {
            ws[encode_col(C) + encode_row(_R + R)] = res;
          }
        }
      });
    });
    _R += _tile.nrows;
  });
  if ((_i = store[13]) == null ? void 0 : _i[0]) {
    var ref = M[parse_TSP_Reference(store[13][0].data)][0];
    var mtype = varint_to_i32(ref.meta[1][0].data);
    if (mtype != 6144)
      throw new Error("Expected merge type 6144, found ".concat(mtype));
    ws["!merges"] = (_j = parse_shallow(ref.data)) == null ? void 0 : _j[1].map(function(pi) {
      var merge = parse_shallow(pi.data);
      var origin = u8_to_dataview(parse_shallow(merge[1][0].data)[1][0].data), size = u8_to_dataview(parse_shallow(merge[2][0].data)[1][0].data);
      return {
        s: { r: origin.getUint16(0, true), c: origin.getUint16(2, true) },
        e: {
          r: origin.getUint16(0, true) + size.getUint16(0, true) - 1,
          c: origin.getUint16(2, true) + size.getUint16(2, true) - 1
        }
      };
    });
  }
  if (!((_k = ws["!merges"]) == null ? void 0 : _k.length) && ((_l = pb[47]) == null ? void 0 : _l[0])) {
    var merge_owner = parse_shallow(pb[47][0].data);
    if ((_m = merge_owner[2]) == null ? void 0 : _m[0]) {
      var formula_store = parse_shallow(merge_owner[2][0].data);
      if ((_n = formula_store[3]) == null ? void 0 : _n[0]) {
        ws["!merges"] = mappa(formula_store[3], function(u) {
          var _a2, _b2, _c2, _d2, _e2;
          var formula_pair = parse_shallow(u);
          var formula = parse_shallow(formula_pair[2][0].data);
          var AST_node_array = parse_shallow(formula[1][0].data);
          if (!((_a2 = AST_node_array[1]) == null ? void 0 : _a2[0]))
            return;
          var AST_node0 = parse_shallow(AST_node_array[1][0].data);
          var AST_node_type = varint_to_i32(AST_node0[1][0].data);
          if (AST_node_type != 67)
            return;
          var AST_colon_tract = parse_shallow(AST_node0[40][0].data);
          if (!((_b2 = AST_colon_tract[3]) == null ? void 0 : _b2[0]) || !((_c2 = AST_colon_tract[4]) == null ? void 0 : _c2[0]))
            return;
          var colrange = parse_shallow(AST_colon_tract[3][0].data);
          var rowrange = parse_shallow(AST_colon_tract[4][0].data);
          var c = varint_to_i32(colrange[1][0].data);
          var C = ((_d2 = colrange[2]) == null ? void 0 : _d2[0]) ? varint_to_i32(colrange[2][0].data) : c;
          var r = varint_to_i32(rowrange[1][0].data);
          var R = ((_e2 = rowrange[2]) == null ? void 0 : _e2[0]) ? varint_to_i32(rowrange[2][0].data) : r;
          return { s: { r: r, c: c }, e: { r: R, c: C } };
        }).filter(function(x) {
          return x != null;
        });
      }
    }
  }
}
function parse_TST_TableInfoArchive(M, root, opts) {
  var pb = parse_shallow(root.data);
  var out = { "!ref": "A1" };
  if (opts == null ? void 0 : opts.dense)
    out["!data"] = [];
  var tableref = M[parse_TSP_Reference(pb[2][0].data)];
  var mtype = varint_to_i32(tableref[0].meta[1][0].data);
  if (mtype != 6001)
    throw new Error("6000 unexpected reference to ".concat(mtype));
  parse_TST_TableModelArchive(M, tableref[0], out, opts);
  return out;
}
function parse_TN_SheetArchive(M, root, opts) {
  var _a;
  var pb = parse_shallow(root.data);
  var out = {
    name: ((_a = pb[1]) == null ? void 0 : _a[0]) ? u8str(pb[1][0].data) : "",
    sheets: []
  };
  var shapeoffs = mappa(pb[2], parse_TSP_Reference);
  shapeoffs.forEach(function(off) {
    M[off].forEach(function(m) {
      var mtype = varint_to_i32(m.meta[1][0].data);
      if (mtype == 6e3)
        out.sheets.push(parse_TST_TableInfoArchive(M, m, opts));
    });
  });
  return out;
}
function parse_TN_DocumentArchive(M, root, opts) {
  var _a;
  var out = book_new();
  out.Workbook = { WBProps: { date1904: true } };
  var pb = parse_shallow(root.data);
  if ((_a = pb[2]) == null ? void 0 : _a[0])
    throw new Error("Keynote presentations are not supported");
  var sheetoffs = mappa(pb[1], parse_TSP_Reference);
  sheetoffs.forEach(function(off) {
    M[off].forEach(function(m) {
      var mtype = varint_to_i32(m.meta[1][0].data);
      if (mtype == 2) {
        var root2 = parse_TN_SheetArchive(M, m, opts);
        root2.sheets.forEach(function(sheet, idx) {
          book_append_sheet(out, sheet, idx == 0 ? root2.name : root2.name + "_" + idx, true);
        });
      }
    });
  });
  if (out.SheetNames.length == 0)
    throw new Error("Empty NUMBERS file");
  out.bookType = "numbers";
  return out;
}
function parse_numbers_iwa(cfb, opts) {
  var _a, _b, _c, _d, _e, _f, _g;
  var M = {}, indices = [];
  cfb.FullPaths.forEach(function(p) {
    if (p.match(/\.iwpv2/))
      throw new Error("Unsupported password protection");
  });
  cfb.FileIndex.forEach(function(s) {
    if (!s.name.match(/\.iwa$/))
      return;
    if (s.content[0] != 0)
      return;
    var o;
    try {
      o = decompress_iwa_file(s.content);
    } catch (e) {
      return console.log("?? " + s.content.length + " " + (e.message || e));
    }
    var packets;
    try {
      packets = parse_iwa_file(o);
    } catch (e) {
      return console.log("## " + (e.message || e));
    }
    packets.forEach(function(packet) {
      M[packet.id] = packet.messages;
      indices.push(packet.id);
    });
  });
  if (!indices.length)
    throw new Error("File has no messages");
  if (((_c = (_b = (_a = M == null ? void 0 : M[1]) == null ? void 0 : _a[0].meta) == null ? void 0 : _b[1]) == null ? void 0 : _c[0].data) && varint_to_i32(M[1][0].meta[1][0].data) == 1e4)
    throw new Error("Pages documents are not supported");
  var docroot = ((_g = (_f = (_e = (_d = M == null ? void 0 : M[1]) == null ? void 0 : _d[0]) == null ? void 0 : _e.meta) == null ? void 0 : _f[1]) == null ? void 0 : _g[0].data) && varint_to_i32(M[1][0].meta[1][0].data) == 1 && M[1][0];
  if (!docroot)
    indices.forEach(function(idx) {
      M[idx].forEach(function(iwam) {
        var mtype = varint_to_i32(iwam.meta[1][0].data) >>> 0;
        if (mtype == 1) {
          if (!docroot)
            docroot = iwam;
          else
            throw new Error("Document has multiple roots");
        }
      });
    });
  if (!docroot)
    throw new Error("Cannot find Document root");
  return parse_TN_DocumentArchive(M, docroot, opts);
}
function write_TST_TileRowInfo(data, lut, wide) {
  var _a, _b, _c;
  var tri = [
    [],
    [{ type: 0, data: write_varint49(0) }],
    [{ type: 0, data: write_varint49(0) }],
    [{ type: 2, data: new Uint8Array([]) }],
    [{ type: 2, data: new Uint8Array(Array.from({ length: 510 }, function() {
      return 255;
    })) }],
    [{ type: 0, data: write_varint49(5) }],
    [{ type: 2, data: new Uint8Array([]) }],
    [{ type: 2, data: new Uint8Array(Array.from({ length: 510 }, function() {
      return 255;
    })) }],
    [{ type: 0, data: write_varint49(1) }]
  ];
  if (!((_a = tri[6]) == null ? void 0 : _a[0]) || !((_b = tri[7]) == null ? void 0 : _b[0]))
    throw "Mutation only works on post-BNC storages!";
  var cnt = 0;
  if (tri[7][0].data.length < 2 * data.length) {
    var new_7 = new Uint8Array(2 * data.length);
    new_7.set(tri[7][0].data);
    tri[7][0].data = new_7;
  }
  if (tri[4][0].data.length < 2 * data.length) {
    var new_4 = new Uint8Array(2 * data.length);
    new_4.set(tri[4][0].data);
    tri[4][0].data = new_4;
  }
  var dv = u8_to_dataview(tri[7][0].data), last_offset = 0, cell_storage = [];
  var _dv = u8_to_dataview(tri[4][0].data), _last_offset = 0, _cell_storage = [];
  var width = wide ? 4 : 1;
  for (var C = 0; C < data.length; ++C) {
    if (data[C] == null || data[C].t == "z" && !((_c = data[C].c) == null ? void 0 : _c.length) || data[C].t == "e") {
      dv.setUint16(C * 2, 65535, true);
      _dv.setUint16(C * 2, 65535);
      continue;
    }
    dv.setUint16(C * 2, last_offset / width, true);
    _dv.setUint16(C * 2, _last_offset / width, true);
    var celload, _celload;
    switch (data[C].t) {
      case "d":
        if (data[C].v instanceof Date) {
          celload = write_new_storage(data[C], lut);
          _celload = write_old_storage(data[C], lut);
          break;
        }
        celload = write_new_storage(data[C], lut);
        _celload = write_old_storage(data[C], lut);
        break;
      case "s":
      case "n":
      case "b":
      case "z":
        celload = write_new_storage(data[C], lut);
        _celload = write_old_storage(data[C], lut);
        break;
      default:
        throw new Error("Unsupported value " + data[C]);
    }
    cell_storage.push(celload);
    last_offset += celload.length;
    {
      _cell_storage.push(_celload);
      _last_offset += _celload.length;
    }
    ++cnt;
  }
  tri[2][0].data = write_varint49(cnt);
  tri[5][0].data = write_varint49(5);
  for (; C < tri[7][0].data.length / 2; ++C) {
    dv.setUint16(C * 2, 65535, true);
    _dv.setUint16(C * 2, 65535, true);
  }
  tri[6][0].data = u8concat(cell_storage);
  tri[3][0].data = u8concat(_cell_storage);
  tri[8] = [{ type: 0, data: write_varint49(wide ? 1 : 0) }];
  return tri;
}
function write_iwam(type, payload) {
  return {
    meta: [
      [],
      [{ type: 0, data: write_varint49(type) }]
    ],
    data: payload
  };
}
function get_unique_msgid(dep, dependents) {
  if (!dependents.last)
    dependents.last = 927262;
  for (var i = dependents.last; i < 2e6; ++i)
    if (!dependents[i]) {
      dependents[dependents.last = i] = dep;
      return i;
    }
  throw new Error("Too many messages");
}
function build_numbers_deps(cfb) {
  var dependents = {};
  var indices = [];
  cfb.FileIndex.map(function(fi, idx) {
    return [fi, cfb.FullPaths[idx]];
  }).forEach(function(row) {
    var fi = row[0], fp = row[1];
    if (fi.type != 2)
      return;
    if (!fi.name.match(/\.iwa/))
      return;
    if (fi.content[0] != 0)
      return;
    parse_iwa_file(decompress_iwa_file(fi.content)).forEach(function(packet) {
      indices.push(packet.id);
      dependents[packet.id] = { deps: [], location: fp, type: varint_to_i32(packet.messages[0].meta[1][0].data) };
    });
  });
  cfb.FileIndex.forEach(function(fi) {
    if (!fi.name.match(/\.iwa/))
      return;
    if (fi.content[0] != 0)
      return;
    parse_iwa_file(decompress_iwa_file(fi.content)).forEach(function(ia) {
      ia.messages.forEach(function(mess) {
        [5, 6].forEach(function(f) {
          if (!mess.meta[f])
            return;
          mess.meta[f].forEach(function(x) {
            dependents[ia.id].deps.push(varint_to_i32(x.data));
          });
        });
      });
    });
  });
  return dependents;
}
function write_TSP_Color_RGB(r, g, b) {
  return write_shallow([
    [],
    [{ type: 0, data: write_varint49(1) }],
    [],
    [{ type: 5, data: new Uint8Array(Float32Array.from([r / 255]).buffer) }],
    [{ type: 5, data: new Uint8Array(Float32Array.from([g / 255]).buffer) }],
    [{ type: 5, data: new Uint8Array(Float32Array.from([b / 255]).buffer) }],
    [{ type: 5, data: new Uint8Array(Float32Array.from([1]).buffer) }],
    [],
    [],
    [],
    [],
    [],
    [{ type: 0, data: write_varint49(1) }]
  ]);
}
function get_author_color(n) {
  switch (n) {
    case 0:
      return write_TSP_Color_RGB(99, 222, 171);
    case 1:
      return write_TSP_Color_RGB(162, 197, 240);
    case 2:
      return write_TSP_Color_RGB(255, 189, 189);
  }
  return write_TSP_Color_RGB(Math.random() * 255, Math.random() * 255, Math.random() * 255);
}
function write_numbers_iwa(wb, opts) {
  if (!opts || !opts.numbers)
    throw new Error("Must pass a `numbers` option -- check the README");
  var cfb = CFB.read(opts.numbers, { type: "base64" });
  var deps = build_numbers_deps(cfb);
  var docroot = numbers_iwa_find(cfb, deps, 1);
  if (docroot == null)
    throw "Could not find message ".concat(1, " in Numbers template");
  var sheetrefs = mappa(parse_shallow(docroot.messages[0].data)[1], parse_TSP_Reference);
  if (sheetrefs.length > 1)
    throw new Error("Template NUMBERS file must have exactly one sheet");
  wb.SheetNames.forEach(function(name, idx) {
    if (idx >= 1) {
      numbers_add_ws(cfb, deps, idx + 1);
      docroot = numbers_iwa_find(cfb, deps, 1);
      sheetrefs = mappa(parse_shallow(docroot.messages[0].data)[1], parse_TSP_Reference);
    }
    write_numbers_ws(cfb, deps, wb.Sheets[name], name, idx, sheetrefs[idx]);
  });
  return cfb;
}
function numbers_iwa_doit(cfb, deps, id, cb) {
  var entry = CFB.find(cfb, deps[id].location);
  if (!entry)
    throw "Could not find ".concat(deps[id].location, " in Numbers template");
  var x = parse_iwa_file(decompress_iwa_file(entry.content));
  var ainfo = x.find(function(packet) {
    return packet.id == id;
  });
  cb(ainfo, x);
  entry.content = compress_iwa_file(write_iwa_file(x));
  entry.size = entry.content.length;
}
function numbers_iwa_find(cfb, deps, id) {
  var entry = CFB.find(cfb, deps[id].location);
  if (!entry)
    throw "Could not find ".concat(deps[id].location, " in Numbers template");
  var x = parse_iwa_file(decompress_iwa_file(entry.content));
  var ainfo = x.find(function(packet) {
    return packet.id == id;
  });
  return ainfo;
}
function numbers_add_meta(mlist, newid, newloc) {
  mlist[3].push({ type: 2, data: write_shallow([
    [],
    [{ type: 0, data: write_varint49(newid) }],
    [{ type: 2, data: stru8(newloc.replace(/-[\s\S]*$/, "")) }],
    [{ type: 2, data: stru8(newloc) }],
    [{ type: 2, data: new Uint8Array([2, 0, 0]) }],
    [{ type: 2, data: new Uint8Array([2, 0, 0]) }],
    [],
    [],
    [],
    [],
    [{ type: 0, data: write_varint49(0) }],
    [],
    [{ type: 0, data: write_varint49(0) }]
  ]) });
  mlist[1] = [{ type: 0, data: write_varint49(Math.max(newid + 1, varint_to_i32(mlist[1][0].data))) }];
}
function numbers_add_msg(cfb, type, msg, path, deps, id) {
  if (!id)
    id = get_unique_msgid({ deps: [], location: "", type: type }, deps);
  var loc = "".concat(path, "-").concat(id, ".iwa");
  deps[id].location = "Root Entry" + loc;
  CFB.utils.cfb_add(cfb, loc, compress_iwa_file(write_iwa_file([{
    id: id,
    messages: [write_iwam(type, write_shallow(msg))]
  }])));
  var newloc = loc.replace(/^[\/]/, "").replace(/^Index\//, "").replace(/\.iwa$/, "");
  numbers_iwa_doit(cfb, deps, 2, function(ai) {
    var mlist = parse_shallow(ai.messages[0].data);
    numbers_add_meta(mlist, id || 0, newloc);
    ai.messages[0].data = write_shallow(mlist);
  });
  return id;
}
function numbers_meta_add_dep(mlist, deps, id, dep) {
  var loc = deps[id].location.replace(/^Root Entry\//, "").replace(/^Index\//, "").replace(/\.iwa$/, "");
  var parentidx = mlist[3].findIndex(function(m) {
    var _a, _b;
    var mm = parse_shallow(m.data);
    if ((_a = mm[3]) == null ? void 0 : _a[0])
      return u8str(mm[3][0].data) == loc;
    if (((_b = mm[2]) == null ? void 0 : _b[0]) && u8str(mm[2][0].data) == loc)
      return true;
    return false;
  });
  var parent = parse_shallow(mlist[3][parentidx].data);
  if (!parent[6])
    parent[6] = [];
  (Array.isArray(dep) ? dep : [dep]).forEach(function(dep2) {
    parent[6].push({
      type: 2,
      data: write_shallow([
        [],
        [{ type: 0, data: write_varint49(dep2) }]
      ])
    });
  });
  mlist[3][parentidx].data = write_shallow(parent);
}
function numbers_meta_del_dep(mlist, deps, id, dep) {
  var loc = deps[id].location.replace(/^Root Entry\//, "").replace(/^Index\//, "").replace(/\.iwa$/, "");
  var parentidx = mlist[3].findIndex(function(m) {
    var _a, _b;
    var mm = parse_shallow(m.data);
    if ((_a = mm[3]) == null ? void 0 : _a[0])
      return u8str(mm[3][0].data) == loc;
    if (((_b = mm[2]) == null ? void 0 : _b[0]) && u8str(mm[2][0].data) == loc)
      return true;
    return false;
  });
  var parent = parse_shallow(mlist[3][parentidx].data);
  if (!parent[6])
    parent[6] = [];
  parent[6] = parent[6].filter(function(m) {
    return varint_to_i32(parse_shallow(m.data)[1][0].data) != dep;
  });
  mlist[3][parentidx].data = write_shallow(parent);
}
function numbers_add_ws(cfb, deps, wsidx) {
  var sheetref = -1, newsheetref = -1;
  var remap = {};
  numbers_iwa_doit(cfb, deps, 1, function(docroot, arch) {
    var doc = parse_shallow(docroot.messages[0].data);
    sheetref = parse_TSP_Reference(parse_shallow(docroot.messages[0].data)[1][0].data);
    newsheetref = get_unique_msgid({ deps: [1], location: deps[sheetref].location, type: 2 }, deps);
    remap[sheetref] = newsheetref;
    numbers_add_oref(docroot, newsheetref);
    doc[1].push({ type: 2, data: write_TSP_Reference(newsheetref) });
    var sheet = numbers_iwa_find(cfb, deps, sheetref);
    sheet.id = newsheetref;
    if (deps[1].location == deps[newsheetref].location)
      arch.push(sheet);
    else
      numbers_iwa_doit(cfb, deps, newsheetref, function(_, x) {
        return x.push(sheet);
      });
    docroot.messages[0].data = write_shallow(doc);
  });
  var tiaref = -1;
  numbers_iwa_doit(cfb, deps, newsheetref, function(sheetroot, arch) {
    var sa = parse_shallow(sheetroot.messages[0].data);
    for (var i = 3; i <= 69; ++i)
      delete sa[i];
    var drawables = mappa(sa[2], parse_TSP_Reference);
    drawables.forEach(function(n) {
      return numbers_del_oref(sheetroot, n);
    });
    tiaref = get_unique_msgid({ deps: [newsheetref], location: deps[drawables[0]].location, type: deps[drawables[0]].type }, deps);
    numbers_add_oref(sheetroot, tiaref);
    remap[drawables[0]] = tiaref;
    sa[2] = [{ type: 2, data: write_TSP_Reference(tiaref) }];
    var tia = numbers_iwa_find(cfb, deps, drawables[0]);
    tia.id = tiaref;
    if (deps[drawables[0]].location == deps[newsheetref].location)
      arch.push(tia);
    else {
      numbers_iwa_doit(cfb, deps, 2, function(ai) {
        var mlist = parse_shallow(ai.messages[0].data);
        numbers_meta_add_dep(mlist, deps, newsheetref, tiaref);
        ai.messages[0].data = write_shallow(mlist);
      });
      numbers_iwa_doit(cfb, deps, tiaref, function(_, x) {
        return x.push(tia);
      });
    }
    sheetroot.messages[0].data = write_shallow(sa);
  });
  var tmaref = -1;
  numbers_iwa_doit(cfb, deps, tiaref, function(tiaroot, arch) {
    var tia = parse_shallow(tiaroot.messages[0].data);
    var da = parse_shallow(tia[1][0].data);
    for (var i = 3; i <= 69; ++i)
      delete da[i];
    var dap = parse_TSP_Reference(da[2][0].data);
    da[2][0].data = write_TSP_Reference(remap[dap]);
    tia[1][0].data = write_shallow(da);
    var oldtmaref = parse_TSP_Reference(tia[2][0].data);
    numbers_del_oref(tiaroot, oldtmaref);
    tmaref = get_unique_msgid({ deps: [tiaref], location: deps[oldtmaref].location, type: deps[oldtmaref].type }, deps);
    numbers_add_oref(tiaroot, tmaref);
    remap[oldtmaref] = tmaref;
    tia[2][0].data = write_TSP_Reference(tmaref);
    var tma = numbers_iwa_find(cfb, deps, oldtmaref);
    tma.id = tmaref;
    if (deps[tiaref].location == deps[tmaref].location)
      arch.push(tma);
    else
      numbers_iwa_doit(cfb, deps, tmaref, function(_, x) {
        return x.push(tma);
      });
    tiaroot.messages[0].data = write_shallow(tia);
  });
  numbers_iwa_doit(cfb, deps, tmaref, function(tmaroot, arch) {
    var _a, _b;
    var tma = parse_shallow(tmaroot.messages[0].data);
    var uuid = u8str(tma[1][0].data), new_uuid = uuid.replace(/-[A-Z0-9]*/, "-".concat(("0000" + wsidx.toString(16)).slice(-4)));
    tma[1][0].data = stru8(new_uuid);
    [12, 13, 29, 31, 32, 33, 39, 44, 47, 81, 82, 84].forEach(function(n) {
      return delete tma[n];
    });
    if (tma[45]) {
      var srrta = parse_shallow(tma[45][0].data);
      var ref = parse_TSP_Reference(srrta[1][0].data);
      numbers_del_oref(tmaroot, ref);
      delete tma[45];
    }
    if (tma[70]) {
      var hsoa = parse_shallow(tma[70][0].data);
      (_a = hsoa[2]) == null ? void 0 : _a.forEach(function(item) {
        var hsa = parse_shallow(item.data);
        [2, 3].map(function(n) {
          return hsa[n][0];
        }).forEach(function(hseadata) {
          var hsea = parse_shallow(hseadata.data);
          if (!hsea[8])
            return;
          var ref2 = parse_TSP_Reference(hsea[8][0].data);
          numbers_del_oref(tmaroot, ref2);
        });
      });
      delete tma[70];
    }
    [
      46,
      30,
      34,
      35,
      36,
      38,
      48,
      49,
      60,
      61,
      62,
      63,
      64,
      71,
      72,
      73,
      74,
      75,
      85,
      86,
      87,
      88,
      89
    ].forEach(function(n) {
      if (!tma[n])
        return;
      var ref2 = parse_TSP_Reference(tma[n][0].data);
      delete tma[n];
      numbers_del_oref(tmaroot, ref2);
    });
    var store = parse_shallow(tma[4][0].data);
    {
      [2, 4, 5, 6, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22].forEach(function(n) {
        var _a2;
        if (!((_a2 = store[n]) == null ? void 0 : _a2[0]))
          return;
        var oldref = parse_TSP_Reference(store[n][0].data);
        var newref = get_unique_msgid({ deps: [tmaref], location: deps[oldref].location, type: deps[oldref].type }, deps);
        numbers_del_oref(tmaroot, oldref);
        numbers_add_oref(tmaroot, newref);
        remap[oldref] = newref;
        var msg = numbers_iwa_find(cfb, deps, oldref);
        msg.id = newref;
        if (deps[oldref].location == deps[tmaref].location)
          arch.push(msg);
        else {
          deps[newref].location = deps[oldref].location.replace(oldref.toString(), newref.toString());
          if (deps[newref].location == deps[oldref].location)
            deps[newref].location = deps[newref].location.replace(/\.iwa/, "-".concat(newref, ".iwa"));
          CFB.utils.cfb_add(cfb, deps[newref].location, compress_iwa_file(write_iwa_file([msg])));
          var newloc = deps[newref].location.replace(/^Root Entry\//, "").replace(/^Index\//, "").replace(/\.iwa$/, "");
          numbers_iwa_doit(cfb, deps, 2, function(ai) {
            var mlist = parse_shallow(ai.messages[0].data);
            numbers_add_meta(mlist, newref, newloc);
            numbers_meta_add_dep(mlist, deps, tmaref, newref);
            ai.messages[0].data = write_shallow(mlist);
          });
        }
        store[n][0].data = write_TSP_Reference(newref);
      });
      var row_headers = parse_shallow(store[1][0].data);
      {
        (_b = row_headers[2]) == null ? void 0 : _b.forEach(function(tspref) {
          var oldref = parse_TSP_Reference(tspref.data);
          var newref = get_unique_msgid({ deps: [tmaref], location: deps[oldref].location, type: deps[oldref].type }, deps);
          numbers_del_oref(tmaroot, oldref);
          numbers_add_oref(tmaroot, newref);
          remap[oldref] = newref;
          var msg = numbers_iwa_find(cfb, deps, oldref);
          msg.id = newref;
          if (deps[oldref].location == deps[tmaref].location) {
            arch.push(msg);
          } else {
            deps[newref].location = deps[oldref].location.replace(oldref.toString(), newref.toString());
            if (deps[newref].location == deps[oldref].location)
              deps[newref].location = deps[newref].location.replace(/\.iwa/, "-".concat(newref, ".iwa"));
            CFB.utils.cfb_add(cfb, deps[newref].location, compress_iwa_file(write_iwa_file([msg])));
            var newloc = deps[newref].location.replace(/^Root Entry\//, "").replace(/^Index\//, "").replace(/\.iwa$/, "");
            numbers_iwa_doit(cfb, deps, 2, function(ai) {
              var mlist = parse_shallow(ai.messages[0].data);
              numbers_add_meta(mlist, newref, newloc);
              numbers_meta_add_dep(mlist, deps, tmaref, newref);
              ai.messages[0].data = write_shallow(mlist);
            });
          }
          tspref.data = write_TSP_Reference(newref);
        });
      }
      store[1][0].data = write_shallow(row_headers);
      var tiles = parse_shallow(store[3][0].data);
      {
        tiles[1].forEach(function(t) {
          var tst = parse_shallow(t.data);
          var oldtileref = parse_TSP_Reference(tst[2][0].data);
          var newtileref = remap[oldtileref];
          if (!remap[oldtileref]) {
            newtileref = get_unique_msgid({ deps: [tmaref], location: "", type: deps[oldtileref].type }, deps);
            deps[newtileref].location = "Root Entry/Index/Tables/Tile-".concat(newtileref, ".iwa");
            remap[oldtileref] = newtileref;
            var oldtile = numbers_iwa_find(cfb, deps, oldtileref);
            oldtile.id = newtileref;
            numbers_del_oref(tmaroot, oldtileref);
            numbers_add_oref(tmaroot, newtileref);
            CFB.utils.cfb_add(cfb, "/Index/Tables/Tile-".concat(newtileref, ".iwa"), compress_iwa_file(write_iwa_file([oldtile])));
            numbers_iwa_doit(cfb, deps, 2, function(ai) {
              var mlist = parse_shallow(ai.messages[0].data);
              mlist[3].push({ type: 2, data: write_shallow([
                [],
                [{ type: 0, data: write_varint49(newtileref) }],
                [{ type: 2, data: stru8("Tables/Tile") }],
                [{ type: 2, data: stru8("Tables/Tile-".concat(newtileref)) }],
                [{ type: 2, data: new Uint8Array([2, 0, 0]) }],
                [{ type: 2, data: new Uint8Array([2, 0, 0]) }],
                [],
                [],
                [],
                [],
                [{ type: 0, data: write_varint49(0) }],
                [],
                [{ type: 0, data: write_varint49(0) }]
              ]) });
              mlist[1] = [{ type: 0, data: write_varint49(Math.max(newtileref + 1, varint_to_i32(mlist[1][0].data))) }];
              numbers_meta_add_dep(mlist, deps, tmaref, newtileref);
              ai.messages[0].data = write_shallow(mlist);
            });
          }
          tst[2][0].data = write_TSP_Reference(newtileref);
          t.data = write_shallow(tst);
        });
      }
      store[3][0].data = write_shallow(tiles);
    }
    tma[4][0].data = write_shallow(store);
    tmaroot.messages[0].data = write_shallow(tma);
  });
}
function write_numbers_ws(cfb, deps, ws, wsname, sheetidx, rootref) {
  var drawables = [];
  numbers_iwa_doit(cfb, deps, rootref, function(docroot) {
    var sheetref = parse_shallow(docroot.messages[0].data);
    {
      sheetref[1] = [{ type: 2, data: stru8(wsname) }];
      drawables = mappa(sheetref[2], parse_TSP_Reference);
    }
    docroot.messages[0].data = write_shallow(sheetref);
  });
  var tia = numbers_iwa_find(cfb, deps, drawables[0]);
  var tmaref = parse_TSP_Reference(parse_shallow(tia.messages[0].data)[2][0].data);
  numbers_iwa_doit(cfb, deps, tmaref, function(docroot, x) {
    return write_numbers_tma(cfb, deps, ws, docroot, x, tmaref);
  });
}
var USE_WIDE_ROWS = true;
function write_numbers_tma(cfb, deps, ws, tmaroot, tmafile, tmaref) {
  if (!ws["!ref"])
    throw new Error("Cannot export empty sheet to NUMBERS");
  var range = decode_range(ws["!ref"]);
  range.s.r = range.s.c = 0;
  var trunc = false;
  if (range.e.c > 999) {
    trunc = true;
    range.e.c = 999;
  }
  if (range.e.r > 999999) {
    trunc = true;
    range.e.r = 999999;
  }
  if (trunc)
    console.error("Truncating to ".concat(encode_range(range)));
  var data = [];
  if (ws["!data"])
    data = ws["!data"];
  else {
    var colstr = [];
    for (var _C = 0; _C <= range.e.c; ++_C)
      colstr[_C] = encode_col(_C);
    for (var R_ = 0; R_ <= range.e.r; ++R_) {
      data[R_] = [];
      var _R = "" + (R_ + 1);
      for (_C = 0; _C <= range.e.c; ++_C) {
        var _cell = ws[colstr[_C] + _R];
        if (!_cell)
          continue;
        data[R_][_C] = _cell;
      }
    }
  }
  var LUT = {
    cmnt: [{ a: "~54ee77S~", t: "... the people who are crazy enough to think they can change the world, are the ones who do." }],
    ferr: [],
    fmla: [],
    nfmt: [],
    ofmt: [],
    rsst: [{ v: "~54ee77S~", l: "https://sheetjs.com/" }],
    sst: ["~Sh33tJ5~"]
  };
  var pb = parse_shallow(tmaroot.messages[0].data);
  {
    pb[6][0].data = write_varint49(range.e.r + 1);
    pb[7][0].data = write_varint49(range.e.c + 1);
    delete pb[46];
    var store = parse_shallow(pb[4][0].data);
    {
      var row_header_ref = parse_TSP_Reference(parse_shallow(store[1][0].data)[2][0].data);
      numbers_iwa_doit(cfb, deps, row_header_ref, function(rowhead, _x) {
        var _a;
        var base_bucket = parse_shallow(rowhead.messages[0].data);
        if ((_a = base_bucket == null ? void 0 : base_bucket[2]) == null ? void 0 : _a[0])
          for (var R2 = 0; R2 < data.length; ++R2) {
            var _bucket = parse_shallow(base_bucket[2][0].data);
            _bucket[1][0].data = write_varint49(R2);
            _bucket[4][0].data = write_varint49(data[R2].length);
            base_bucket[2][R2] = { type: base_bucket[2][0].type, data: write_shallow(_bucket) };
          }
        rowhead.messages[0].data = write_shallow(base_bucket);
      });
      var col_header_ref = parse_TSP_Reference(store[2][0].data);
      numbers_iwa_doit(cfb, deps, col_header_ref, function(colhead, _x) {
        var base_bucket = parse_shallow(colhead.messages[0].data);
        for (var C = 0; C <= range.e.c; ++C) {
          var _bucket = parse_shallow(base_bucket[2][0].data);
          _bucket[1][0].data = write_varint49(C);
          _bucket[4][0].data = write_varint49(range.e.r + 1);
          base_bucket[2][C] = { type: base_bucket[2][0].type, data: write_shallow(_bucket) };
        }
        colhead.messages[0].data = write_shallow(base_bucket);
      });
      var rbtree = parse_shallow(store[9][0].data);
      rbtree[1] = [];
      var tilestore = parse_shallow(store[3][0].data);
      {
        var tstride = 256;
        tilestore[2] = [{ type: 0, data: write_varint49(tstride) }];
        var tileref = parse_TSP_Reference(parse_shallow(tilestore[1][0].data)[2][0].data);
        var save_token = function() {
          var metadata = numbers_iwa_find(cfb, deps, 2);
          var mlist = parse_shallow(metadata.messages[0].data);
          var mlst = mlist[3].filter(function(m) {
            return varint_to_i32(parse_shallow(m.data)[1][0].data) == tileref;
          });
          return (mlst == null ? void 0 : mlst.length) ? varint_to_i32(parse_shallow(mlst[0].data)[12][0].data) : 0;
        }();
        {
          CFB.utils.cfb_del(cfb, deps[tileref].location);
          numbers_iwa_doit(cfb, deps, 2, function(ai) {
            var mlist = parse_shallow(ai.messages[0].data);
            mlist[3] = mlist[3].filter(function(m) {
              return varint_to_i32(parse_shallow(m.data)[1][0].data) != tileref;
            });
            numbers_meta_del_dep(mlist, deps, tmaref, tileref);
            ai.messages[0].data = write_shallow(mlist);
          });
          numbers_del_oref(tmaroot, tileref);
        }
        tilestore[1] = [];
        var ntiles = Math.ceil((range.e.r + 1) / tstride);
        for (var tidx = 0; tidx < ntiles; ++tidx) {
          var newtileid = get_unique_msgid({
            deps: [],
            location: "",
            type: 6002
          }, deps);
          deps[newtileid].location = "Root Entry/Index/Tables/Tile-".concat(newtileid, ".iwa");
          var tiledata = [
            [],
            [{ type: 0, data: write_varint49(0) }],
            [{ type: 0, data: write_varint49(Math.min(range.e.r + 1, (tidx + 1) * tstride)) }],
            [{ type: 0, data: write_varint49(0) }],
            [{ type: 0, data: write_varint49(Math.min((tidx + 1) * tstride, range.e.r + 1) - tidx * tstride) }],
            [],
            [{ type: 0, data: write_varint49(5) }],
            [{ type: 0, data: write_varint49(1) }],
            [{ type: 0, data: write_varint49(USE_WIDE_ROWS ? 1 : 0) }]
          ];
          for (var R = tidx * tstride; R <= Math.min(range.e.r, (tidx + 1) * tstride - 1); ++R) {
            var tilerow = write_TST_TileRowInfo(data[R], LUT, USE_WIDE_ROWS);
            tilerow[1][0].data = write_varint49(R - tidx * tstride);
            tiledata[5].push({ data: write_shallow(tilerow), type: 2 });
          }
          tilestore[1].push({ type: 2, data: write_shallow([
            [],
            [{ type: 0, data: write_varint49(tidx) }],
            [{ type: 2, data: write_TSP_Reference(newtileid) }]
          ]) });
          var newtile = {
            id: newtileid,
            messages: [write_iwam(6002, write_shallow(tiledata))]
          };
          var tilecontent = compress_iwa_file(write_iwa_file([newtile]));
          CFB.utils.cfb_add(cfb, "/Index/Tables/Tile-".concat(newtileid, ".iwa"), tilecontent);
          numbers_iwa_doit(cfb, deps, 2, function(ai) {
            var mlist = parse_shallow(ai.messages[0].data);
            mlist[3].push({ type: 2, data: write_shallow([
              [],
              [{ type: 0, data: write_varint49(newtileid) }],
              [{ type: 2, data: stru8("Tables/Tile") }],
              [{ type: 2, data: stru8("Tables/Tile-".concat(newtileid)) }],
              [{ type: 2, data: new Uint8Array([2, 0, 0]) }],
              [{ type: 2, data: new Uint8Array([2, 0, 0]) }],
              [],
              [],
              [],
              [],
              [{ type: 0, data: write_varint49(0) }],
              [],
              [{ type: 0, data: write_varint49(save_token) }]
            ]) });
            mlist[1] = [{ type: 0, data: write_varint49(Math.max(newtileid + 1, varint_to_i32(mlist[1][0].data))) }];
            numbers_meta_add_dep(mlist, deps, tmaref, newtileid);
            ai.messages[0].data = write_shallow(mlist);
          });
          numbers_add_oref(tmaroot, newtileid);
          rbtree[1].push({ type: 2, data: write_shallow([
            [],
            [{ type: 0, data: write_varint49(tidx * tstride) }],
            [{ type: 0, data: write_varint49(tidx) }]
          ]) });
        }
      }
      store[3][0].data = write_shallow(tilestore);
      store[9][0].data = write_shallow(rbtree);
      store[10] = [{ type: 2, data: new Uint8Array([]) }];
      if (ws["!merges"]) {
        var mergeid = get_unique_msgid({
          type: 6144,
          deps: [tmaref],
          location: deps[tmaref].location
        }, deps);
        tmafile.push({
          id: mergeid,
          messages: [write_iwam(6144, write_shallow([
            [],
            ws["!merges"].map(function(m) {
              return { type: 2, data: write_shallow([
                [],
                [{ type: 2, data: write_shallow([
                  [],
                  [{ type: 5, data: new Uint8Array(new Uint16Array([m.s.r, m.s.c]).buffer) }]
                ]) }],
                [{ type: 2, data: write_shallow([
                  [],
                  [{ type: 5, data: new Uint8Array(new Uint16Array([m.e.r - m.s.r + 1, m.e.c - m.s.c + 1]).buffer) }]
                ]) }]
              ]) };
            })
          ]))]
        });
        store[13] = [{ type: 2, data: write_TSP_Reference(mergeid) }];
        numbers_iwa_doit(cfb, deps, 2, function(ai) {
          var mlist = parse_shallow(ai.messages[0].data);
          numbers_meta_add_dep(mlist, deps, tmaref, mergeid);
          ai.messages[0].data = write_shallow(mlist);
        });
        numbers_add_oref(tmaroot, mergeid);
      } else
        delete store[13];
      var sstref = parse_TSP_Reference(store[4][0].data);
      numbers_iwa_doit(cfb, deps, sstref, function(sstroot) {
        var sstdata = parse_shallow(sstroot.messages[0].data);
        {
          sstdata[3] = [];
          LUT.sst.forEach(function(str, i) {
            if (i == 0)
              return;
            sstdata[3].push({ type: 2, data: write_shallow([
              [],
              [{ type: 0, data: write_varint49(i) }],
              [{ type: 0, data: write_varint49(1) }],
              [{ type: 2, data: stru8(str) }]
            ]) });
          });
        }
        sstroot.messages[0].data = write_shallow(sstdata);
      });
      var rsstref = parse_TSP_Reference(store[17][0].data);
      numbers_iwa_doit(cfb, deps, rsstref, function(rsstroot) {
        var rsstdata = parse_shallow(rsstroot.messages[0].data);
        rsstdata[3] = [];
        var style_indices = [
          904980,
          903835,
          903815,
          903845
        ];
        LUT.rsst.forEach(function(rsst, i) {
          if (i == 0)
            return;
          var tswpsa = [
            [],
            [{ type: 0, data: new Uint8Array([5]) }],
            [],
            [{ type: 2, data: stru8(rsst.v) }]
          ];
          tswpsa[10] = [{ type: 0, data: new Uint8Array([1]) }];
          tswpsa[19] = [{ type: 2, data: new Uint8Array([10, 6, 8, 0, 18, 2, 101, 110]) }];
          tswpsa[5] = [{ type: 2, data: new Uint8Array([10, 8, 8, 0, 18, 4, 8, 155, 149, 55]) }];
          tswpsa[2] = [{ type: 2, data: new Uint8Array([8, 148, 158, 55]) }];
          tswpsa[6] = [{ type: 2, data: new Uint8Array([10, 6, 8, 0, 16, 0, 24, 0]) }];
          tswpsa[7] = [{ type: 2, data: new Uint8Array([10, 8, 8, 0, 18, 4, 8, 135, 149, 55]) }];
          tswpsa[8] = [{ type: 2, data: new Uint8Array([10, 8, 8, 0, 18, 4, 8, 165, 149, 55]) }];
          tswpsa[14] = [{ type: 2, data: new Uint8Array([10, 6, 8, 0, 16, 0, 24, 0]) }];
          tswpsa[24] = [{ type: 2, data: new Uint8Array([10, 6, 8, 0, 16, 0, 24, 0]) }];
          var tswpsaid = get_unique_msgid({ deps: [], location: "", type: 2001 }, deps);
          var tswpsarefs = [];
          if (rsst.l) {
            var newhlinkid = numbers_add_msg(cfb, 2032, [
              [],
              [],
              [{ type: 2, data: stru8(rsst.l) }]
            ], "/Index/Tables/DataList", deps);
            tswpsa[11] = [];
            var smartfield = [[], []];
            if (!smartfield[1])
              smartfield[1] = [];
            smartfield[1].push({ type: 2, data: write_shallow([
              [],
              [{ type: 0, data: write_varint49(0) }],
              [{ type: 2, data: write_TSP_Reference(newhlinkid) }]
            ]) });
            tswpsa[11][0] = { type: 2, data: write_shallow(smartfield) };
            tswpsarefs.push(newhlinkid);
          }
          numbers_add_msg(cfb, 2001, tswpsa, "/Index/Tables/DataList", deps, tswpsaid);
          numbers_iwa_doit(cfb, deps, tswpsaid, function(iwa) {
            style_indices.forEach(function(ref) {
              return numbers_add_oref(iwa, ref);
            });
            tswpsarefs.forEach(function(ref) {
              return numbers_add_oref(iwa, ref);
            });
          });
          var rtpaid = numbers_add_msg(cfb, 6218, [
            [],
            [{ type: 2, data: write_TSP_Reference(tswpsaid) }],
            [],
            [{ type: 2, data: new Uint8Array([13, 255, 255, 255, 0, 18, 10, 16, 255, 255, 1, 24, 255, 255, 255, 255, 7]) }]
          ], "/Index/Tables/DataList", deps);
          numbers_iwa_doit(cfb, deps, rtpaid, function(iwa) {
            return numbers_add_oref(iwa, tswpsaid);
          });
          rsstdata[3].push({ type: 2, data: write_shallow([
            [],
            [{ type: 0, data: write_varint49(i) }],
            [{ type: 0, data: write_varint49(1) }],
            [],
            [],
            [],
            [],
            [],
            [],
            [{ type: 2, data: write_TSP_Reference(rtpaid) }]
          ]) });
          numbers_add_oref(rsstroot, rtpaid);
          numbers_iwa_doit(cfb, deps, 2, function(ai) {
            var mlist = parse_shallow(ai.messages[0].data);
            numbers_meta_add_dep(mlist, deps, rsstref, rtpaid);
            numbers_meta_add_dep(mlist, deps, rtpaid, tswpsaid);
            numbers_meta_add_dep(mlist, deps, tswpsaid, tswpsarefs);
            numbers_meta_add_dep(mlist, deps, tswpsaid, style_indices);
            ai.messages[0].data = write_shallow(mlist);
          });
        });
        rsstroot.messages[0].data = write_shallow(rsstdata);
      });
      if (LUT.cmnt.length > 1) {
        var cmntref = parse_TSP_Reference(store[19][0].data);
        var authors = {}, iauthor = 0;
        numbers_iwa_doit(cfb, deps, cmntref, function(cmntroot) {
          var cmntdata = parse_shallow(cmntroot.messages[0].data);
          {
            cmntdata[3] = [];
            LUT.cmnt.forEach(function(cc, i) {
              if (i == 0)
                return;
              var replies = [];
              if (cc.replies)
                cc.replies.forEach(function(c) {
                  if (!authors[c.a || ""])
                    authors[c.a || ""] = numbers_add_msg(cfb, 212, [
                      [],
                      [{ type: 2, data: stru8(c.a || "") }],
                      [{ type: 2, data: get_author_color(++iauthor) }],
                      [],
                      [{ type: 0, data: write_varint49(0) }]
                    ], "/Index/Tables/DataList", deps);
                  var aaaid2 = authors[c.a || ""];
                  var csaid2 = numbers_add_msg(cfb, 3056, [
                    [],
                    [{ type: 2, data: stru8(c.t || "") }],
                    [{ type: 2, data: write_shallow([
                      [],
                      [{ type: 1, data: new Uint8Array([0, 0, 0, 128, 116, 109, 182, 65]) }]
                    ]) }],
                    [{ type: 2, data: write_TSP_Reference(aaaid2) }]
                  ], "/Index/Tables/DataList", deps);
                  numbers_iwa_doit(cfb, deps, csaid2, function(iwa) {
                    return numbers_add_oref(iwa, aaaid2);
                  });
                  replies.push(csaid2);
                  numbers_iwa_doit(cfb, deps, 2, function(ai) {
                    var mlist = parse_shallow(ai.messages[0].data);
                    numbers_meta_add_dep(mlist, deps, csaid2, aaaid2);
                    ai.messages[0].data = write_shallow(mlist);
                  });
                });
              if (!authors[cc.a || ""])
                authors[cc.a || ""] = numbers_add_msg(cfb, 212, [
                  [],
                  [{ type: 2, data: stru8(cc.a || "") }],
                  [{ type: 2, data: get_author_color(++iauthor) }],
                  [],
                  [{ type: 0, data: write_varint49(0) }]
                ], "/Index/Tables/DataList", deps);
              var aaaid = authors[cc.a || ""];
              var csaid = numbers_add_msg(cfb, 3056, [
                [],
                [{ type: 2, data: stru8(cc.t || "") }],
                [{ type: 2, data: write_shallow([
                  [],
                  [{ type: 1, data: new Uint8Array([0, 0, 0, 128, 116, 109, 182, 65]) }]
                ]) }],
                [{ type: 2, data: write_TSP_Reference(aaaid) }],
                replies.map(function(r) {
                  return { type: 2, data: write_TSP_Reference(r) };
                }),
                [{ type: 2, data: write_shallow([
                  [],
                  [{ type: 0, data: write_varint49(i) }],
                  [{ type: 0, data: write_varint49(0) }]
                ]) }]
              ], "/Index/Tables/DataList", deps);
              numbers_iwa_doit(cfb, deps, csaid, function(iwa) {
                numbers_add_oref(iwa, aaaid);
                replies.forEach(function(r) {
                  return numbers_add_oref(iwa, r);
                });
              });
              cmntdata[3].push({ type: 2, data: write_shallow([
                [],
                [{ type: 0, data: write_varint49(i) }],
                [{ type: 0, data: write_varint49(1) }],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [{ type: 2, data: write_TSP_Reference(csaid) }]
              ]) });
              numbers_add_oref(cmntroot, csaid);
              numbers_iwa_doit(cfb, deps, 2, function(ai) {
                var mlist = parse_shallow(ai.messages[0].data);
                numbers_meta_add_dep(mlist, deps, cmntref, csaid);
                numbers_meta_add_dep(mlist, deps, csaid, aaaid);
                if (replies.length)
                  numbers_meta_add_dep(mlist, deps, csaid, replies);
                ai.messages[0].data = write_shallow(mlist);
              });
            });
          }
          cmntdata[2][0].data = write_varint49(LUT.cmnt.length + 1);
          cmntroot.messages[0].data = write_shallow(cmntdata);
        });
      }
    }
    pb[4][0].data = write_shallow(store);
  }
  tmaroot.messages[0].data = write_shallow(pb);
}
