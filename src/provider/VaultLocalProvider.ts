import { App } from 'obsidian'
import { IVerse } from '../interfaces/IVerse'
import { IBibleVersion } from '../interfaces/IBibleVersion'
import { BaseBibleAPIProvider } from './BaseBibleAPIProvider'
import { BibleAPISourceCollection } from '../data/BibleApiSourceCollection'

/**
 * Bible book number → folder name component
 */
const BOOK_FOLDER_NAMES: Record<number, string> = {
  1: '01 - Genesis', 2: '02 - Exodus', 3: '03 - Leviticus',
  4: '04 - Numbers', 5: '05 - Deuteronomy', 6: '06 - Joshua',
  7: '07 - Judges', 8: '08 - Ruth', 9: '09 - 1 Samuel',
  10: '10 - 2 Samuel', 11: '11 - 1 Kings', 12: '12 - 2 Kings',
  13: '13 - 1 Chronicles', 14: '14 - 2 Chronicles', 15: '15 - Ezra',
  16: '16 - Nehemiah', 17: '17 - Esther', 18: '18 - Job',
  19: '19 - Psalms', 20: '20 - Proverbs', 21: '21 - Ecclesiastes',
  22: '22 - Song of Solomon', 23: '23 - Isaiah', 24: '24 - Jeremiah',
  25: '25 - Lamentations', 26: '26 - Ezekiel', 27: '27 - Daniel',
  28: '28 - Hosea', 29: '29 - Joel', 30: '30 - Amos',
  31: '31 - Obadiah', 32: '32 - Jonah', 33: '33 - Micah',
  34: '34 - Nahum', 35: '35 - Habakkuk', 36: '36 - Zephaniah',
  37: '37 - Haggai', 38: '38 - Zechariah', 39: '39 - Malachi',
  40: '40 - Matthew', 41: '41 - Mark', 42: '42 - Luke',
  43: '43 - John', 44: '44 - Acts', 45: '45 - Romans',
  46: '46 - 1 Corinthians', 47: '47 - 2 Corinthians',
  48: '48 - Galatians', 49: '49 - Ephesians', 50: '50 - Philippians',
  51: '51 - Colossians', 52: '52 - 1 Thessalonians',
  53: '53 - 2 Thessalonians', 54: '54 - 1 Timothy',
  55: '55 - 2 Timothy', 56: '56 - Titus', 57: '57 - Philemon',
  58: '58 - Hebrews', 59: '59 - James', 60: '60 - 1 Peter',
  61: '61 - 2 Peter', 62: '62 - 1 John', 63: '63 - 2 John',
  64: '64 - 3 John', 65: '65 - Jude', 66: '66 - Revelation',
}

/**
 * Map canonical book names to their book number.
 */
const BOOK_NUM: Record<string, number> = {
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4,
  deuteronomy: 5, joshua: 6, judges: 7, ruth: 8,
  '1 samuel': 9, '2 samuel': 10, '1 kings': 11, '2 kings': 12,
  '1 chronicles': 13, '2 chronicles': 14, ezra: 15, nehemiah: 16,
  esther: 17, job: 18, psalms: 19, psalm: 19,
  proverbs: 20, ecclesiastes: 21, 'song of solomon': 22,
  'song of songs': 22, isaiah: 23, jeremiah: 24,
  lamentations: 25, ezekiel: 26, daniel: 27, hosea: 28,
  joel: 29, amos: 30, obadiah: 31, jonah: 32,
  micah: 33, nahum: 34, habakkuk: 35, zephaniah: 36,
  haggai: 37, zechariah: 38, malachi: 39,
  matthew: 40, mark: 41, luke: 42, john: 43,
  acts: 44, romans: 45, '1 corinthians': 46,
  '2 corinthians': 47, galatians: 48, ephesians: 49,
  philippians: 50, colossians: 51, '1 thessalonians': 52,
  '2 thessalonians': 53, '1 timothy': 54, '2 timothy': 55,
  titus: 56, philemon: 57, hebrews: 58, james: 59,
  '1 peter': 60, '2 peter': 61, '1 john': 62, '2 john': 63,
  '3 john': 64, jude: 65, revelation: 66,
}

/**
 * HardCover key (version abbreviation) → vault Scripture folder name.
 * Each version's key in the vault mappings must match the `key` field
 * of the IBibleVersion entries that use this provider.
 *
 * Add entries here for every local vault translation you register.
 */
const VAULT_FOLDER_MAP: Record<string, string> = {
  ceb: 'Scripture (CEB)',
  nrsv: 'Scripture (NRSV)',
  nrsvue: 'Scripture (NRSVue)',
  niv: 'Scripture (NIV)',
  msg: 'Scripture (MSG)',
  ntfe: 'Scripture (NTFE)',
  web: 'Scripture (WEB)',
}

/**
 * VaultLocalProvider — reads Bible text from Scripture (X) markdown files
 * in the Obsidian vault instead of fetching from an online API.
 */
export class VaultLocalProvider extends BaseBibleAPIProvider {
  private app: App
  private scriptureFolder: string

  constructor(bibleVersion: IBibleVersion, app: App) {
    super(bibleVersion)
    this.app = app
    this.scriptureFolder =
      VAULT_FOLDER_MAP[bibleVersion.key] || `Scripture (${bibleVersion.key.toUpperCase()})`
  }

  /**
   * Unused — vault provider reads files, not URLs.
   */
  protected buildRequestURL(
    _bookName: string,
    _chapter: number,
    _verses?: number[],
    _versionName?: string,
  ): string {
    return ''
  }

  /**
   * Unused — we parse markdown, not JSON.
   */
  protected formatBibleVerses(
    _data: { reference: string; verses: IVerse[] } | Array<object>,
    _bookName: string,
    _chapter: number,
    _verse: number[],
    _versionName: string,
  ): IVerse[] {
    return []
  }

  /**
   * Main entry: read verses from vault markdown files.
   */
  public async query(
    bookName: string,
    chapter: number,
    verse: number[],
    _versionName?: string,
  ): Promise<IVerse[]> {
    this._bibleReferenceHead = `${bookName} ${chapter}:${verse.join('-')}`
    this._currentQueryUrl = ''

    // Resolve book name to number
    const bookLower = bookName.toLowerCase()
    const bookNum = BOOK_NUM[bookLower] ?? this.guessBookNumber(bookLower, bookName)
    if (!bookNum) {
      console.warn(`[VaultLocal] Unknown book: ${bookName}`)
      return []
    }

    const folderName = BOOK_FOLDER_NAMES[bookNum]
    if (!folderName) {
      console.warn(`[VaultLocal] No folder for book #${bookNum}: ${bookName}`)
      return []
    }

    // Construct path and read the chapter file
    const bookDir = `${this.scriptureFolder}/${folderName}`
    const abstractFile = this.app.vault.getAbstractFileByPath(bookDir)
    if (!abstractFile || !('children' in abstractFile)) {
      console.warn(`[VaultLocal] Folder not found: ${bookDir}`)
      return []
    }

    const folder = abstractFile as any
    const chapFiles: any[] = folder.children.filter(
      (c: any) => c.extension === 'md',
    )

    const targetFile = chapFiles.find((f: any) => {
      const base = f.name.replace(/\.md$/, '')
      const parts = base.split('-')
      return parseInt(parts[parts.length - 1], 10) === chapter
    })
    const fallbackFile =
      !targetFile
        ? chapFiles.find((f: any) => !/-\d+\.md$/.test(f.name))
        : null

    const file = targetFile || fallbackFile
    if (!file) {
      console.warn(`[VaultLocal] Chapter ${chapter} not found in ${bookDir}`)
      return []
    }

    const content = await this.app.vault.read(file)
    return this.parseVerses(content, bookName, chapter, verse)
  }

  /**
   * Parse markdown chapter content into IVerse[].
   */
  private parseVerses(
    content: string,
    bookName: string,
    chapter: number,
    requestedVerses: number[],
  ): IVerse[] {
    const allVerses: Record<number, string> = {}
    let currentV: number | null = null

    for (const line of content.split('\n')) {
      const vm = line.match(/^######\s*v(\d+)\s*/)
      if (vm) {
        currentV = parseInt(vm[1], 10)
        const text = line.replace(/^######\s*v\d+\s*/, '').trim()
        allVerses[currentV] = text ? text + ' ' : ''
      } else if (currentV !== null && line.trim()) {
        const trimmed = line.trim()
        if (trimmed === '***' || trimmed.startsWith('[[')) continue
        allVerses[currentV] = (allVerses[currentV] || '') + trimmed + ' '
      }
    }

    // Trim trailing spaces
    for (const k of Object.keys(allVerses)) {
      allVerses[parseInt(k)] = allVerses[parseInt(k)].trim()
    }

    // Determine which verses to return
    const result: IVerse[] = []
    const verseSet = new Set(requestedVerses)

    // If the range implies "to end" (999 marker) or just a single-start,
    // collect from start to last available
    const sortedKeys = Object.keys(allVerses)
      .map(Number)
      .sort((a, b) => a - b)

    if (requestedVerses.length === 1 && sortedKeys.length > 0) {
      // Single verse or start-of-range
      const start = requestedVerses[0]
      for (const v of sortedKeys) {
        if (v >= start) {
          result.push({
            book_name: bookName,
            chapter,
            verse: v,
            text: allVerses[v],
          })
        }
      }
    } else if (requestedVerses.length >= 2) {
      // Range: [start, end]
      const start = requestedVerses[0]
      const end = requestedVerses[1]
      for (const v of sortedKeys) {
        if (v >= start && v <= end) {
          result.push({
            book_name: bookName,
            chapter,
            verse: v,
            text: allVerses[v],
          })
        }
      }
    } else {
      // Fallback: return matching keys
      for (const v of sortedKeys) {
        if (verseSet.size === 0 || verseSet.has(v)) {
          result.push({
            book_name: bookName,
            chapter,
            verse: v,
            text: allVerses[v],
          })
        }
      }
    }

    return result
  }

  private guessBookNumber(lower: string, original: string): number | null {
    // Try matching against BOOK_NUM keys by partial match
    for (const key of Object.keys(BOOK_NUM)) {
      if (lower.includes(key) || key.includes(lower)) return BOOK_NUM[key]
    }
    // Try matching the first word only (e.g. "Chronicles" → "1 chronicles")
    const firstWord = lower.split(/\s+/).pop()
    if (firstWord) {
      for (const key of Object.keys(BOOK_NUM)) {
        if (key.endsWith(firstWord)) return BOOK_NUM[key]
      }
    }
    return null
  }
}

/**
 * Scan the vault for folders named "Scripture (X)" and return IBibleVersion
 * entries that use the vaultLocal provider. Called once at plugin startup.
 */
export function discoverLocalVersions(app: App): IBibleVersion[] {
  const files = app.vault.getAllLoadedFiles()
  const scriptureFolders = files.filter(
    (f) => 'children' in f && /^Scripture\s*\(.+\)$/.test(f.name),
  ) as Array<{ name: string }>

  return scriptureFolders.map((folder) => {
    // Extract the translation label from "Scripture (CEB)" → "CEB"
    const label = folder.name.replace(/^Scripture\s*\((.+)\)$/, '$1')
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '')

    return {
      key,
      versionName: `${label} (Vault)`,
      language: 'English',
      code: 'en',
      apiSource: BibleAPISourceCollection.vaultLocal,
    }
  })
}
