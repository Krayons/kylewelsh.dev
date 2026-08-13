import type { ITheme } from '@xterm/xterm'

/** Phosphor CRT palette for xterm.js */
export const phosphorTheme: ITheme = {
  background: '#04130b',
  foreground: '#4dff95',
  cursor: '#b6ffd2',
  cursorAccent: '#04130b',
  selectionBackground: 'rgba(77, 255, 149, 0.28)',
  selectionForeground: '#b6ffd2',
  black: '#04130b',
  red: '#ffb19a',
  green: '#4dff95',
  yellow: '#d4ff9a',
  blue: '#7ad4ff',
  magenta: '#c9a0ff',
  cyan: '#7affd4',
  white: '#b6ffd2',
  brightBlack: '#2f9d63',
  brightRed: '#ffc9b8',
  brightGreen: '#b6ffd2',
  brightYellow: '#e8ffb8',
  brightBlue: '#a8e4ff',
  brightMagenta: '#ddc0ff',
  brightCyan: '#b0ffe4',
  brightWhite: '#e8fff0',
}

export const xtermBaseOptions = {
  convertEol: true,
  fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 14,
  lineHeight: 1.35,
  cursorBlink: true,
  cursorStyle: 'block' as const,
  theme: phosphorTheme,
  allowProposedApi: true,
  scrollback: 2000,
}
