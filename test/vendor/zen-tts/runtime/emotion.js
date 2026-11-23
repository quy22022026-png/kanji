// The five emotion styles of the model, in the order of its style rows.
export const emotionNames = ['neutral', 'happy', 'sad', 'angry', 'apologetic'];
export const neutralBlend = Object.freeze({ neutral: 1, happy: 0, sad: 0, angry: 0, apologetic: 0 });
/** Non-negative amounts per emotion (emotionNames order) -> a blend whose weights sum to 1. */
export function blendFrom(values) {
    const total = values.reduce((a, b) => a + b, 0);
    return Object.freeze(Object.fromEntries(emotionNames.map((k, i) => [k, values[i] / total])));
}
