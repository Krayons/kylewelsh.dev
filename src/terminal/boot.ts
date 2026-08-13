export type BootLine = { label: string; status: string }

export type SocialLink = {
  key: string
  handle: string
  url: string
}

export const BOOT: BootLine[] = [
  { label: 'power-on self test', status: 'ok' },
  { label: 'mount /home/kyle', status: 'ok' },
  { label: 'init curiosity subsystem', status: 'ok' },
  { label: 'calibrate phosphor @ 60hz', status: 'ok' },
  { label: 'load personality.cfg', status: 'ok' },
]

export const INTRO = 'Hi, welcome :)'

export const LINKS: SocialLink[] = [
  {
    key: 'twitter',
    handle: '@kylewelshlive',
    url: 'https://x.com/kylewelshlive',
  },
  {
    key: 'linkedin',
    handle: 'kyle-ian-bransby-welsh',
    url: 'https://www.linkedin.com/in/kyle-ian-bransby-welsh/',
  },
  {
    key: 'instagram',
    handle: '@kylewelshlive',
    url: 'https://www.instagram.com/kylewelshlive/',
  },
]

/** Matches busybox PS1 when cwd is $HOME */
export const PROMPT = 'kyle@home:~$'
