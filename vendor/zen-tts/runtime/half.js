const HALF = (() => {
  const t = new Float32Array(65536);
  for (let h = 0; h < 65536; h++) {
    const s = h & 32768 ? -1 : 1;
    const e = h >> 10 & 31;
    const m = h & 1023;
    t[h] = e === 0 ? s * m * 2 ** -24 : e === 31 ? m ? NaN : s * Infinity : s * (1 + m / 1024) * 2 ** (e - 15);
  }
  return t;
})();
function toHalf(v) {
  const f = new Float32Array([v]);
  const x = new Uint32Array(f.buffer)[0];
  const sign = x >>> 16 & 32768;
  const e = (x >>> 23 & 255) - 127 + 15;
  let m = x & 8388607;
  if (e <= 0) {
    if (e < -10) return sign;
    m |= 8388608;
    const s = 14 - e;
    return sign | m + (1 << s - 1) >>> s;
  }
  if (e >= 31) return sign | 31744;
  const h = sign | e << 10 | m >>> 13;
  return m & 4096 ? h + 1 : h;
}
export {
  HALF,
  toHalf
};
