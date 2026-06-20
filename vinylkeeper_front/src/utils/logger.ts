const noop = (..._args: unknown[]): void => {};
const isDev = import.meta.env.DEV;

export const logger = {
  error: console.error.bind(console),
  warn: isDev ? console.warn.bind(console) : noop,
};
