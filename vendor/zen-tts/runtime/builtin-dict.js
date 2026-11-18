const BUILTIN_DICT = [];
function withBuiltinDict(user = []) {
  const own = new Set(user.map((e) => e.surface));
  return [...BUILTIN_DICT.filter((e) => !own.has(e.surface)), ...user];
}
export {
  BUILTIN_DICT,
  withBuiltinDict
};
