<script lang="ts" setup>
import { ref, watch, nextTick, toRaw } from 'vue'
import { readFileTypeFromBlob } from './detect-type'
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
import { Image_Type, Pdf_Type, Text_Type, Word_Type } from './config'

defineOptions({
  name: 'FileViewer'
})

const props = withDefaults(defineProps<{
  res: Response
  blob: Blob
  type?: string
  download?: boolean
  changeImg?: boolean
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
}>(), {
  download: false,
  changeImg: false,
  fit: 'contain'
})

const showDialog = ref<boolean>(false)
const type = ref<string>('')

const imageUrl = ref<string>('')
const imgScale = ref<number>(1)
const imgTx = ref<number>(0)
const imgTy = ref<number>(0)
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
    type.value = props.type || (await readFileTypeFromBlob(blob)).ext
    nextTick(async () => {
      if (Image_Type.includes(type.value)) {
        imageUrl.value = window.URL.createObjectURL(blob)
      } else if (Word_Type.includes(type.value)) {
        renderAsync(blob, viewerWordRef.value!)
      } else if (Pdf_Type.includes(type.value)) {
        loadPdfFile(window.URL.createObjectURL(blob))
      } else if (Text_Type.includes(type.value)) {
        textData.value = await blob.text()
      }
    })
  }
})

watch(() => props.blob, async (newVal: Blob) => {
  resetStatus()
  if (newVal === undefined) {
    showDialog.value = false
    return
  } else {
    showDialog.value = true
    type.value = props.type || (await readFileTypeFromBlob(newVal)).ext
    nextTick(async () => {
      if (Image_Type.includes(type.value)) {
        imageUrl.value = window.URL.createObjectURL(newVal)
      } else if (Word_Type.includes(type.value)) {
        renderAsync(newVal, viewerWordRef.value!)
      } else if (Pdf_Type.includes(type.value)) {
        loadPdfFile(window.URL.createObjectURL(newVal))
      } else if (Text_Type.includes(type.value)) {
        textData.value = await newVal.text()
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
  imgScale.value = 1
  imgTx.value = 0
  imgTy.value = 0
  pdfData.value = undefined
  pdfPages.value = 0
  textData.value = ''
}

/* tools - download file */
const downloadFile = () => {
}

const viewerImgRef = ref<HTMLImageElement>()

const maxScale = 7
const minScale = 0.2
const zoomRate = 1.2
const handleMousewheel = (evt: WheelEvent) => {
  const delta = evt.deltaY || evt.deltaX
  if (delta < 0) {
    if (imgScale.value < maxScale) {
      imgScale.value = Number.parseFloat(
        (imgScale.value * zoomRate).toFixed(3)
      )
    }
  } else {
    if (imgScale.value > minScale) {
      imgScale.value = Number.parseFloat(
        (imgScale.value / zoomRate).toFixed(3)
      )
    }
  }
}

const handleMousedown = (evt: MouseEvent) => {
  if (!viewerImgRef.value) return
  
  const originX = imgTx.value
  const originY = imgTy.value
  const startX = evt.pageX
  const startY = evt.pageY
  
  const dragHandler = ((ev: MouseEvent) => {
    imgTx.value = originX + (ev.pageX - startX) / imgScale.value
    imgTy.value = originY + (ev.pageY - startY) / imgScale.value
  })
  document.addEventListener('mousemove', dragHandler)
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', dragHandler)
  })
  
  evt.preventDefault()
}
</script>

<template>
  <div v-if="showDialog" style="position: relative">
    <template v-if="Image_Type.includes(type)">
      <template v-if="props.changeImg">
        <div class="s-viewer-img-container--change">
          <img
            ref="viewerImgRef"
            :src="imageUrl"
            :style="{transform:`scale(${imgScale}) translate(${imgTx}px, ${imgTy}px)`}"
            alt=""
            @mousedown="handleMousedown"
            @mousewheel="handleMousewheel"
          />
        </div>
      </template>
      <template v-else>
        <img :src="imageUrl" :style="`object-fit: ${props.fit}`" alt=""
             class="s-viewer-img-container" />
      </template>
    </template>
    <template v-else-if="Word_Type.includes(type)">
      <div ref="viewerWordRef" class="s-viewer-word-container" />
    </template>
    <template v-else-if="Pdf_Type.includes(type)">
      <div ref="viewerPdfRef" class="s-viewer-pdf-container">
        <canvas
          v-for="page in pdfPages"
          :id="`pdf-canvas-${page}`"
          :key="page"
        />
      </div>
    </template>
    <template v-else-if="Text_Type.includes(type)">
      <div class="s-viewer-text-container">
        {{ textData }}
      </div>
    </template>
    <template v-else>
      <div class="s-viewer-text-container">
        <!-- Unsupported file type - {{ type }} -->
      </div>
    </template>
  </div>
</template>

<style scoped>
.s-viewer-img-container--change {
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: auto;
  background-color: #fff;
}

.s-viewer-img-container {
  overflow: auto;
  width: 100%;
  height: 100%;
  margin: auto;
  background-color: #fff;
}

.s-viewer-word-container {
  overflow: auto;
  width: 100%;
  height: 100%;
  margin: auto;
  background-color: #fff;
}

.s-viewer-pdf-container {
  overflow-y: scroll;
  align-items: center;
  height: 100%;
}

.s-viewer-text-container {
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
