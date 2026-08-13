/** Dim phosphor */
export const dim = (s: string) => `\x1b[38;2;47;157;99m${s}\x1b[0m`
/** Bright phosphor */
export const bright = (s: string) => `\x1b[1m\x1b[38;2;182;255;210m${s}\x1b[0m`
/** Standard phosphor */
export const mid = (s: string) => `\x1b[38;2;77;255;149m${s}\x1b[0m`
/** Soft error (amber) */
export const err = (s: string) => `\x1b[38;2;255;177;154m${s}\x1b[0m`

export const reset = '\x1b[0m'
export const crlf = '\r\n'
