import _FileViewer from './FileViewer.vue'
import type { App, Plugin } from 'vue'
import { readFileTypeFromBlob } from './file-type'
import {
  Image_Type,
  Pdf_Type,
  Text_Type,
  Excel_Type,
  Word_Type
} from './config'

export { readFileTypeFromBlob }
export { Image_Type, Pdf_Type, Text_Type, Excel_Type, Word_Type }

type SFCWithInstall<T> = T & Plugin
const withInstall = <T>(comp: T) => {
  (comp as SFCWithInstall<T>).install = (app: App) => {
    const name = (comp as any).name
    app.component(name, comp as SFCWithInstall<T>)
  }
  return comp as SFCWithInstall<T>
}

export const FileViewer = withInstall(_FileViewer)
export default FileViewer
