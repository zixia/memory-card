// https://github.com/Microsoft/TypeScript/issues/14151#issuecomment-280812617
// if (!Symbol.asyncIterator) {
//   (<any>Symbol).asyncIterator =  Symbol.for('Symbol.asyncIterator')
// }

import * as path from 'path'
import * as fs   from 'fs'

import {
  log,
  VERSION,
}             from './config'
import {
  AsyncMap,
}             from './async-map.type'

export interface MemorySchema {
  // cookies?      : any
  [idx: string] : any
}

export type SlotName = keyof MemorySchema

export class MemoryCard implements AsyncMap {

  private payload : MemorySchema
  private file?   : string

  public get size(): Promise<number> {
    log.verbose('MemoryCard', 'size')
    return Promise.resolve(
      Object.keys(this.payload).length,
    )
  }

  constructor(
    public name?: string,
  ) {
    log.verbose('MemoryCard', 'constructor(%s)', name || '')

    this.payload = {}

    if (name) {
      this.file = path.isAbsolute(name)
        ? name
        : path.resolve(
            process.cwd(),
            name,
          )
      if (!/\.memory-card\.json$/.test(this.file)) {
        this.file +=  '.memory-card.json'
      }
    }

  }

  public toString() {
    return `MemoryCard<${this.name || ''}>`
  }

  public version(): string {
    return VERSION
  }

  public async load(): Promise<void> {
    log.verbose('MemoryCard', 'load() file: %s', this.file)

    const file = this.file
    if (!file) {
      log.verbose('MemoryCard', 'load() no file, NOOP')
      return
    }

    const fileExist = await new Promise<boolean>(r => fs.exists(file, r))
    if (!fileExist) {
      log.verbose('MemoryCard', 'load() file not exist, NOOP')
      return
    }

    const buffer = await new Promise<Buffer>((resolve, reject) => fs.readFile(file, (err, buf) => {
      if (err) {
        reject(err)
      } else {
        resolve(buf)
      }
    }))
    const text = buffer.toString()

    try {
      this.payload = JSON.parse(text)
    } catch (e) {
      log.error('MemoryCard', 'load() exception: %s', e)
    }
  }

  public async save(): Promise<void> {
    log.verbose('MemoryCard', 'save() file: %s', this.file)

    const file = this.file
    if (!file) {
      log.verbose('MemoryCard', 'save() no file, NOOP')
      return
    }
    if (!this.payload) {
      log.verbose('MemoryCard', 'save() no payload, NOOP')
      return
    }

    try {
      const text = JSON.stringify(this.payload)
      await new Promise<void>((resolve, reject) => fs.writeFile(file, text, err => err ? reject(err) : resolve()))
    } catch (e) {
      log.error('MemoryCard', 'save() exception: %s', e)
      throw e
    }
  }

  public async get<T = any>(slot: SlotName): Promise<undefined | T> {
    log.verbose('MemoryCard', 'get(%s)', slot)
    return this.payload[slot] as T
  }

  public async set<T = any>(slot: SlotName, data: T): Promise<void> {
    log.verbose('MemoryCard', 'set(%s, %s)', slot, data)
    this.payload[slot] = data
  }

  public async destroy(): Promise<void> {
    log.verbose('MemoryCard', 'destroy() file: %s', this.file)
    await this.clear()
    if (this.file && fs.existsSync(this.file)) {
      fs.unlinkSync(this.file)
      this.file = undefined
    }
  }

  public async* [Symbol.asyncIterator]<T = any>(): AsyncIterableIterator<[string, T]> {
    log.verbose('MemoryCard', '*[Symbol.asyncIterator]()')
    yield* this.entries()
  }

  public async* entries<T = any>(): AsyncIterableIterator<[string, T]> {
    log.verbose('MemoryCard', '*entries()')

    for (const slot in this.payload) {
      const data: T           = this.payload[slot]
      const pair: [string, T] = [slot, data]
      yield pair
    }
  }

  public async clear(): Promise<void> {
    log.verbose('MemoryCard', 'clear()')
    this.payload = {}
  }

  public async delete(slot: SlotName): Promise<void> {
    log.verbose('MemoryCard', 'delete(%s)', slot)
    delete this.payload[slot]
  }

  public async has(slot: SlotName): Promise<boolean> {
    log.verbose('MemoryCard', 'has(%s)', slot)

    return slot in this.payload
  }

  public async *keys(): AsyncIterableIterator<string> {
    log.verbose('MemoryCard', 'keys()')
    for (const slot in this.payload) {
      yield slot
    }
  }

  public async *values<T = any>(): AsyncIterableIterator<T> {
    log.verbose('MemoryCard', 'values()')
    for (const slot in this.payload) {
      yield this.payload[slot]
    }
  }
}

export default MemoryCard
