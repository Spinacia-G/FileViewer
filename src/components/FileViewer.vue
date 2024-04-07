<script lang="ts" setup>
import { ref, watch, nextTick, toRaw } from 'vue'
import { readFileTypeFromBlob } from './file-type'
import { renderAsync } from 'docx-preview'
import * as PDFJS from 'pdfjs-dist'
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min?url'
import {
  PDFDocumentProxy
} from 'pdfjs-dist'
import {
  GetViewportParameters,
  RenderParameters
} from 'pdfjs-dist/types/src/display/api'

defineOptions({
  name: 'FileViewer'
})

const Image_Type = ['png', 'jpg', 'webp', 'bmp', 'gif', 'svg', 'ico']
const Pdf_Type = ['pdf']
const Word_Type = ['docx']
// const Excel_Type = ['xlsx']
const Text_Type = ['txt']
const props = withDefaults(defineProps<{
  res: Response
}>(), {})

const showDialog = ref<boolean>(false)
const type = ref<string>('')

const imageUrl = ref<string>('')
const pdfData = ref()
const pdfDoc = ref<PDFDocumentProxy>()
const pdfPages = ref<number>(0)
const textData = ref<string>('')

const viewerWordRef = ref<HTMLElement>()
const viewerPdfRef = ref<HTMLElement>()

watch(() => props.res, async (newVal: Response) => {
  if (newVal === undefined) {
    showDialog.value = false
    resetStatus()
    return
  } else {
    showDialog.value = true
    const blob = await newVal.blob()
    type.value = (await readFileTypeFromBlob(blob)).ext
    nextTick(async () => {
      if (Image_Type.includes(type.value)) {
        imageUrl.value = window.URL.createObjectURL(blob)
      } else if (Word_Type.includes(type.value)) {
        renderAsync(blob, viewerWordRef.value!)
      } else if (Pdf_Type.includes(type.value)) {
        loadPdfFile(window.URL.createObjectURL(blob))
      } else if (type.value === 'unknown' && blob.type === 'text/plain') {
        type.value = 'txt'
        textData.value = await blob.text()
      }
    })
  }
})

/* load pdf */
const configWorker = (workerSrc: string) => {
  PDFJS.GlobalWorkerOptions.workerSrc = workerSrc
}
const loadPdfFile = (src: string) => {
  if (!PDFJS.GlobalWorkerOptions?.workerSrc) {
    configWorker(PDFWorker)
  }
  const loadingTask = PDFJS.getDocument(src)
  loadingTask.promise.then(async (doc: PDFDocumentProxy) => {
    pdfDoc.value = doc
    pdfPages.value = doc.numPages
    nextTick(() => {
      renderPdf(1)
    })
  })
}
const renderPdf = (pageIndex: number) => {
  toRaw(pdfDoc.value)?.getPage(pageIndex).then(async (page) => {
    /* get scale */
    const parentWidth: number = (viewerPdfRef.value!.parentNode! as HTMLElement).clientWidth
    const scaleWidth: number = page.getViewport({ scale: 1 }).width
    const scale = parentWidth / scaleWidth
    /* get viewport */
    const defaultViewport = page.getViewport()
    const viewportParams: GetViewportParameters = {
      scale,
      rotation: defaultViewport.rotation
    }
    const viewport = page.getViewport(viewportParams)
    /* get canvas dom */
    const canvasId = `pdf-canvas-${pageIndex}`
    const canvasDom: HTMLCanvasElement = (document.getElementById(canvasId) as HTMLCanvasElement)
    const dpr = window.devicePixelRatio || 1
    canvasDom.width = Math.floor(viewport.width * dpr)
    canvasDom.height = Math.floor(viewport.height * dpr)
    canvasDom.style.width = `${Math.floor(viewport.width)}px`
    canvasDom.style.height = `${Math.floor(viewport.height)}px`
    viewerPdfRef.value?.style.setProperty('--scale-factor', `${viewport.scale}`)
    /* render page into canvas context */
    const renderContext: RenderParameters = {
      canvasContext: canvasDom.getContext('2d')!,
      viewport,
      annotationMode: PDFJS.AnnotationMode.ENABLE_FORMS,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
    }
    page.render(renderContext)
    /* render all pages */
    if (pageIndex < pdfPages.value) {
      renderPdf(pageIndex + 1)
    }
  })
}

const resetStatus = () => {
  imageUrl.value = ''
  pdfData.value = undefined
  pdfPages.value = 0
  textData.value = ''
}
</script>

<template>
  <div v-if="showDialog">
    <template v-if="Image_Type.includes(type)">
      <img :src="imageUrl" alt="" class="viewer-box" />
    </template>
    <template v-else-if="Word_Type.includes(type)">
      <div ref="viewerWordRef" class="viewer-box" />
    </template>
    <template v-else-if="Pdf_Type.includes(type)">
      <div ref="viewerPdfRef" class="pdf-box">
        <canvas
          v-for="page in pdfPages"
          :id="`pdf-canvas-${page}`"
          :key="page"
        />
      </div>
    </template>
    <template v-else-if="Text_Type.includes(type)">
      <div class="text-box">
        {{ textData }}
      </div>
    </template>
    <template v-else>
      <div class="text-box">
        Unsupported file type - {{ type }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.viewer-box {
  overflow: auto;
  width: 100%;
  height: 100%;
  margin: auto;
  background-color: #fff;
  object-fit: contain;
}

.pdf-box {
  overflow-y: scroll;
  align-items: center;
  height: 100%;
}

.text-box {
  overflow-y: auto;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 10px;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: rgb(150 150 150 / 15%);
}

::-webkit-scrollbar-corner {
  background: transparent;
}
</style>
<style>
.docx-wrapper {
  padding: 0 !important;
  background: #fff !important;
  
  .docx {
    box-shadow: none !important;
  }
}
</style>
