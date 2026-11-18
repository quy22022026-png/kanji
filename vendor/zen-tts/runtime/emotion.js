const emotionNames = ["neutral", "happy", "sad", "angry", "apologetic"];
const neutralBlend = Object.freeze({ neutral: 1, happy: 0, sad: 0, angry: 0, apologetic: 0 });
function blendFrom(values) {
  const total = values.reduce((a, b) => a + b, 0);
  return Object.freeze(Object.fromEntries(emotionNames.map((k, i) => [k, values[i] / total])));
}
export {
  blendFrom,
  emotionNames,
  neutralBlend
};
