export const BUILTIN_DICT = [];
/** The built-in entries whose surface the user's dictionary does not have, then the user's entries. */
export function withBuiltinDict(user = []) {
    const own = new Set(user.map((e) => e.surface));
    return [...BUILTIN_DICT.filter((e) => !own.has(e.surface)), ...user];
}
