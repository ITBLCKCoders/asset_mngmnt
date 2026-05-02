const noop = () => {};
const stub = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  child: () => stub,
};
export const createLogger = () => stub;
export default createLogger();
