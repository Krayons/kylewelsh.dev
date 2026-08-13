export type OutLine = { text: string; kind?: 'dim' | 'bright' | 'error' }

export type Entry = {
  id: number
  cmd: string
  out: OutLine[]
  links?: boolean
}

export type LocalShellResult =
  | { kind: 'print'; cmd: string; out: OutLine[]; links?: boolean }
  | { kind: 'clear' }
  | { kind: 'reboot' }
  | { kind: 'noop' }

/** Interpret a local (offline) phosphor shell command. */
export function interpretLocalCommand(raw: string): LocalShellResult {
  const cmd = raw.trim()
  const [name = '', ...rest] = cmd.split(/\s+/)

  switch (name.toLowerCase()) {
    case '':
      return { kind: 'print', cmd: raw, out: [] }
    case 'help':
      return {
        kind: 'print',
        cmd: raw,
        out: [
          { text: 'available commands:', kind: 'dim' },
          { text: '  help          this list' },
          { text: '  whoami        who is this guy' },
          { text: '  links         social links' },
          { text: '  date          local time' },
          { text: '  echo <text>   say it back' },
          { text: '  clear         wipe the screen' },
          { text: '  reboot        power-cycle the crt' },
        ],
      }
    case 'whoami':
      return {
        kind: 'print',
        cmd: raw,
        out: [
          { text: 'kyle welsh', kind: 'bright' },
          {
            text: "software engineer — the bits don't do what i want them to do.",
          },
        ],
      }
    case 'links':
    case 'social':
      return { kind: 'print', cmd: raw, out: [], links: true }
    case 'date':
      return {
        kind: 'print',
        cmd: raw,
        out: [{ text: new Date().toString() }],
      }
    case 'echo':
      return {
        kind: 'print',
        cmd: raw,
        out: [{ text: rest.join(' ') }],
      }
    case 'ls':
      return {
        kind: 'print',
        cmd: raw,
        out: [{ text: 'intro.txt   personality.cfg   regrets/' }],
      }
    case 'sudo':
      return {
        kind: 'print',
        cmd: raw,
        out: [
          {
            text: 'kyle is not in the sudoers file. this incident will be reported.',
            kind: 'error',
          },
        ],
      }
    case 'exit':
    case 'logout':
      return {
        kind: 'print',
        cmd: raw,
        out: [{ text: 'there is no escape.', kind: 'dim' }],
      }
    case 'clear':
      return { kind: 'clear' }
    case 'reboot':
      return { kind: 'reboot' }
    default:
      return {
        kind: 'print',
        cmd: raw,
        out: [
          {
            text: `command not found: ${name} — try 'help'`,
            kind: 'error',
          },
        ],
      }
  }
}
