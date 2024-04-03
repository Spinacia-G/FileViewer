import _FileViewer from './FileViewer.vue'
import type { App, Plugin } from 'vue'

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
