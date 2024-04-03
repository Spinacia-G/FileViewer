import FileViewer from './components'

export * from './components'
import { App } from 'vue'

export default {
  install: (app: App) => {
    app.use(FileViewer)
  }
}
