import FileViewer from './components/FileViewer.vue'
import type { Plugin } from 'vue'

export const FileViewerPlugin: Plugin = {
  install(Vue) {
    Vue.component(FileViewer.name, FileViewer)
  }
}

export default FileViewerPlugin
