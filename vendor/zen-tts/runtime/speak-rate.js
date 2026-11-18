const SPEED_MIN = 0.5;
const SPEED_MAX = 1.5;
const PITCH_MIN = -6;
const PITCH_MAX = 12;
function checkSpeedPitch(speed, pitch) {
  if (speed !== void 0 && !(Number.isFinite(speed) && speed >= SPEED_MIN && speed <= SPEED_MAX)) {
    throw new RangeError(`speed must be ${SPEED_MIN}..${SPEED_MAX} (got ${speed})`);
  }
  if (pitch !== void 0 && !(Number.isFinite(pitch) && pitch >= PITCH_MIN && pitch <= PITCH_MAX)) {
    throw new RangeError(`pitch must be ${PITCH_MIN}..${PITCH_MAX} semitones (got ${pitch})`);
  }
}
function scaleDurations(dur, speed) {
  if (speed === 1) return [...dur];
  const out = [];
  let exact = 0;
  let emitted = 0;
  for (const d of dur) {
    exact += d / speed;
    const n = Math.max(1, Math.round(exact - emitted));
    out.push(n);
    emitted += n;
  }
  return out;
}
function shiftF0(f0, pitch) {
  return pitch === 0 ? [...f0] : f0.map((v) => v + pitch);
}
function applySpeedPitch(f0, dur, speed, pitch) {
  checkSpeedPitch(speed, pitch);
  return {
    f0: pitch === void 0 || pitch === 0 ? f0 : shiftF0(f0, pitch),
    dur: speed === void 0 || speed === 1 ? dur : scaleDurations(dur, speed)
  };
}
function streamMaxChars(speed, base = 120) {
  return speed !== void 0 && speed < 1 ? Math.max(20, Math.floor(base * speed)) : base;
}
export {
  PITCH_MAX,
  PITCH_MIN,
  SPEED_MAX,
  SPEED_MIN,
  applySpeedPitch,
  checkSpeedPitch,
  scaleDurations,
  shiftF0,
  streamMaxChars
};
