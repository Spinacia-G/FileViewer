import * as strtok3 from 'strtok3'
import * as Token from 'token-types'

const minimumBytes: number = 4100

const pngMagic: number[] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
const jpgMagic: number[] = [0xFF, 0xD8, 0xFF]
const bmpMagic: number[] = [0x42, 0x4D]
const gifMagic: number[] = [0x47, 0x49, 0x46]
const exeMagic: number[] = [0x4D, 0x5A]
const zipMagic: number[] = [0x50, 0x4B, 0x3, 0x4]
const shpMagic: number[] = [0x27, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
const icoMagic: number[] = [0x00, 0x00, 0x01, 0x00]

const stringToBytes = (str: string) => {
  return [...str].map(c => c.charCodeAt(0))
}

const webpMagic = stringToBytes('WEBP')
const pdfMagic = stringToBytes('%PDF')
const s3mMagic = stringToBytes('SCRM')

const readBuffer = (blob: Blob, start: number = 0, end: number = 2): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(blob.slice(start, end))
  })
}

const readBufferAll = (blob: Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

const check = async (blob: Blob, typeMagicArr: number[], offset: number = 0) => {
  const buffers = await readBuffer(blob, offset, typeMagicArr.length + offset)
  const uint8Array = new Uint8Array(buffers)
  return typeMagicArr.every(
    (header, index) => header === uint8Array[index]
  )
}

export const readFileTypeFromBlob = async (blob: Blob): Promise<{
  ext: string,
  mime: string
}> => {
  if (await check(blob, pngMagic)) {
    return { ext: 'png', mime: 'image/png' }
  }
  
  if (await check(blob, jpgMagic)) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  
  if (await check(blob, webpMagic, 8)) {
    return { ext: 'webp', mime: 'image/webp' }
  }
  
  if (await check(blob, bmpMagic)) {
    return { ext: 'bmp', mime: 'image/bmp' }
  }
  
  if (await check(blob, gifMagic)) {
    return { ext: 'gif', mime: 'image/gif' }
  }
  
  if (await check(blob, pdfMagic)) {
    return { ext: 'pdf', mime: 'application/pdf' }
  }
  
  if (await check(blob, icoMagic)) {
    return { ext: 'ico', mime: 'image/x-icon' }
  }
  
  if (await check(blob, zipMagic)) {
    const buffer = Buffer.alloc(minimumBytes)
    const sourceData = new Uint8Array(await readBufferAll(blob))
    const tokenizer = strtok3.fromBuffer(sourceData)
    if (tokenizer.fileInfo.size === undefined) {
      tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER
    }
    await tokenizer.peekBuffer(buffer, { length: 12, mayBeLess: true })
    
    try {
      while (tokenizer.position + 30 < tokenizer.fileInfo.size) {
        await tokenizer.readBuffer(buffer, { length: 30 })
        const zipHeader = {
          compressedSize: buffer.readUInt32LE(18),
          uncompressedSize: buffer.readUInt32LE(22),
          filenameLength: buffer.readUInt16LE(26),
          extraFieldLength: buffer.readUInt16LE(28),
          filename: ''
        }
        zipHeader.filename = await tokenizer.readToken(new Token.StringType(zipHeader.filenameLength, 'utf-8'))
        await tokenizer.ignore(zipHeader.extraFieldLength)
        
        if (zipHeader.filename === 'META-INF/mozilla.rsa') {
          return { ext: 'xpi', mime: 'application/x-xpinstall' }
        }
        
        if (zipHeader.filename.endsWith('.rels') || zipHeader.filename.endsWith('.xml')) {
          const type = zipHeader.filename.split('/')[0]
          switch (type) {
            case '_rels':
              break
            case 'word':
              return {
                ext: 'docx',
                mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              }
            case 'ppt':
              return {
                ext: 'pptx',
                mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
              }
            case 'xl':
              return {
                ext: 'xlsx',
                mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              }
            default:
              break
          }
        }
        
        if (zipHeader.filename.startsWith('xl/')) {
          return {
            ext: 'xlsx',
            mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        }
        
        if (zipHeader.filename.startsWith('3D/') && zipHeader.filename.endsWith('.model')) {
          return {
            ext: '3mf',
            mime: 'model/3mf'
          }
        }
        
        if (zipHeader.filename === 'mimetype' && zipHeader.compressedSize === zipHeader.uncompressedSize) {
          let mimeType = await tokenizer.readToken(new Token.StringType(zipHeader.compressedSize, 'utf-8'))
          mimeType = mimeType.trim()
          
          switch (mimeType) {
            case 'application/epub+zip':
              return {
                ext: 'epub',
                mime: 'application/epub+zip'
              }
            case 'application/vnd.oasis.opendocument.text':
              return {
                ext: 'odt',
                mime: 'application/vnd.oasis.opendocument.text'
              }
            case 'application/vnd.oasis.opendocument.spreadsheet':
              return {
                ext: 'ods',
                mime: 'application/vnd.oasis.opendocument.spreadsheet'
              }
            case 'application/vnd.oasis.opendocument.presentation':
              return {
                ext: 'odp',
                mime: 'application/vnd.oasis.opendocument.presentation'
              }
            default:
              break
          }
        }
        
        if (zipHeader.compressedSize === 0) {
          let nextHeaderIndex = -1
          
          while (nextHeaderIndex < 0 && (tokenizer.position < tokenizer.fileInfo.size)) {
            await tokenizer.peekBuffer(buffer, { mayBeLess: true })
            nextHeaderIndex = buffer.indexOf('504B0304', 0, 'hex')
            await tokenizer.ignore(nextHeaderIndex >= 0 ? nextHeaderIndex : buffer.length)
          }
        } else {
          await tokenizer.ignore(zipHeader.compressedSize)
        }
      }
    } catch (error) {
      if (!(error instanceof strtok3.EndOfStreamError)) {
        throw error
      }
    }
    
    return { ext: 'zip', mime: 'application/zip' }
  }
  
  if (await check(blob, exeMagic)) {
    return { ext: 'exe', mime: 'application/x-msdownload' }
  }
  
  if (await check(blob, s3mMagic)) {
    return { ext: 's3m', mime: 'audio/x-s3m' }
  }
  
  if (await check(blob, shpMagic, 2)) {
    return { ext: 'shp', mime: 'application/x-esri-shape' }
  }
  
  return { ext: 'unknown', mime: 'unknown' }
}
