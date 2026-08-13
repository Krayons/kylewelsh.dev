import type { Terminal } from '@xterm/xterm'
import { interpretLocalCommand } from './localShell'
import { LINKS, PROMPT } from './boot'
import { bright, dim, mid, err, crlf } from './ansi'

/**
 * Simple line-oriented local shell on an existing xterm when the
 * container proxy is unavailable — same surface as the remote path.
 */
export function attachLocalShell(
  term: Terminal,
  opts: {
    onReboot: () => void
    onReady?: () => void
  },
): { dispose: () => void } {
  let line = ''
  const history: string[] = []
  let histPos = 0
  let disposed = false

  const writePrompt = () => {
    term.write(`${bright(PROMPT)} `)
  }

  const printLinks = () => {
    for (const l of LINKS) {
      term.writeln(`${dim('→')} ${dim(l.key.padEnd(10))} ${mid(l.url)}`)
    }
  }

  // Soft note — still shell output, not a layout mode flip
  term.writeln('')
  term.writeln(dim('# container offline — local phosphor shell'))
  term.writeln(dim("# type 'help' for commands"))
  term.writeln('')
  writePrompt()
  opts.onReady?.()

  term.options.disableStdin = false
  term.options.cursorBlink = true

  const dataDisp = term.onData((data) => {
    if (disposed) return

    for (const ch of data) {
      if (ch === '\r') {
        term.write(crlf)
        const raw = line
        const cmd = raw.trim()
        line = ''
        if (cmd) {
          history.push(cmd)
          histPos = history.length
        }

        const result = interpretLocalCommand(raw)
        switch (result.kind) {
          case 'print': {
            if (result.links) printLinks()
            for (const o of result.out) {
              if (o.kind === 'error') term.writeln(err(o.text))
              else if (o.kind === 'bright') term.writeln(bright(o.text))
              else if (o.kind === 'dim') term.writeln(dim(o.text))
              else term.writeln(mid(o.text))
            }
            writePrompt()
            break
          }
          case 'clear':
            term.clear()
            term.writeln(dim('kylewelsh.dev — tty1 · phosphor display'))
            writePrompt()
            break
          case 'reboot':
            opts.onReboot()
            return
          case 'noop':
            writePrompt()
            break
        }
      } else if (ch === '\u007f' || ch === '\b') {
        if (line.length > 0) {
          line = line.slice(0, -1)
          term.write('\b \b')
        }
      } else if (ch === '\u0003') {
        term.writeln('^C')
        line = ''
        writePrompt()
      } else if (ch === '\u000c') {
        term.clear()
        writePrompt()
      } else if (ch >= ' ' && ch !== '\u007f') {
        line += ch
        term.write(ch)
      }
    }
  })

  const keyDisp = term.onKey(({ domEvent }) => {
    if (disposed) return
    if (domEvent.key === 'ArrowUp') {
      domEvent.preventDefault()
      if (!history.length) return
      while (line.length) {
        line = line.slice(0, -1)
        term.write('\b \b')
      }
      histPos = Math.max(0, histPos - 1)
      line = history[histPos] ?? ''
      term.write(line)
    } else if (domEvent.key === 'ArrowDown') {
      domEvent.preventDefault()
      while (line.length) {
        line = line.slice(0, -1)
        term.write('\b \b')
      }
      histPos = Math.min(history.length, histPos + 1)
      line = history[histPos] ?? ''
      term.write(line)
    }
  })

  return {
    dispose: () => {
      disposed = true
      dataDisp.dispose()
      keyDisp.dispose()
    },
  }
}
