import type { TerminalDisplay } from './remoteSession'
import { BOOT, INTRO, LINKS, PROMPT } from './boot'
import { bright, dim, mid, crlf } from './ansi'

export type IntroOptions = {
  display: TerminalDisplay
  reduceMotion: boolean
  /** Return true to abort mid-sequence */
  isCancelled: () => boolean
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

async function typewrite(
  display: TerminalDisplay,
  text: string,
  msPerChar: number,
  isCancelled: () => boolean,
) {
  for (const ch of text) {
    if (isCancelled()) return
    display.write(ch)
    if (msPerChar > 0) await sleep(msPerChar)
  }
}

function padDots(label: string, width: number): string {
  const dots = Math.max(2, width - label.length - 8)
  return `${label} ${'.'.repeat(dots)} `
}

/**
 * Play the classic CRT intro entirely inside xterm so the later PTY
 * handoff is just more bytes on the same surface.
 */
export async function playIntro(opts: IntroOptions): Promise<void> {
  const { display, reduceMotion, isCancelled } = opts
  const d = reduceMotion ? 0 : 1

  display.writeln(dim('kylewelsh.dev — tty1 · phosphor display'))
  display.writeln(dim('────────────────────────────────────'))
  display.writeln('')

  for (const line of BOOT) {
    if (isCancelled()) return
    const left = padDots(line.label, 42)
    display.writeln(
      `${dim('·')} ${dim(left)}${bright(`[ ${line.status} ]`)}`,
    )
    await sleep(150 * d)
  }

  await sleep(350 * d)
  if (isCancelled()) return

  display.writeln('')
  display.write(`${bright(PROMPT)} `)
  display.writeln(mid('whoami'))
  display.writeln(bright('kyle welsh'))
  display.writeln(
    mid("software engineer — the bits don't do what i want them to do."),
  )

  await sleep(450 * d)
  if (isCancelled()) return

  display.writeln('')
  display.write(`${bright(PROMPT)} `)
  display.writeln(mid('cat intro.txt'))
  if (reduceMotion) {
    display.writeln(mid(INTRO))
  } else {
    await typewrite(display, INTRO, 28, isCancelled)
    display.write(crlf)
  }

  await sleep(280 * d)
  if (isCancelled()) return

  display.writeln('')
  display.write(`${bright(PROMPT)} `)
  display.writeln(mid('links --social'))
  for (const l of LINKS) {
    if (isCancelled()) return
    // Full URL so WebLinksAddon makes it clickable
    display.writeln(
      `${dim('→')} ${dim(l.key.padEnd(10))} ${mid(l.url)}`,
    )
  }

  await sleep(200 * d)
}
