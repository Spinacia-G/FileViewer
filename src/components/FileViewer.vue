<script lang="ts" setup>
import { ref, watch, nextTick, shallowRef } from 'vue'
import { readFileTypeFromBlob } from './detect-type'
import { renderAsync } from 'docx-preview'
import { Image_Type, Pdf_Type, Text_Type, Word_Type } from './config'
import { usePDF, VuePDF } from "@tato30/vue-pdf";

interface PropsParam {
  /**
   * @description file source data
   */
  res?: Response
  /**
   * @description file source data
   */
  blob?: Blob
  /**
   * @description file type
   */
  type?: string
  download?: boolean
  change?: boolean
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  watermark?: string
  watermarkProps?: Partial<{
    columns: number
    rows: number
    color: string
    rotation: number
    fontSize: number
  }>
  pagination?: number
}

interface ImgParamType {
  scale: number
  tx: number
  ty: number
  deg: number
  enableTransition: boolean
}

defineOptions({
  name: 'FileViewer'
})

const props = withDefaults(defineProps<PropsParam>(), {
  download: false,
  change: false,
  fit: 'contain'
})

const type = ref<string>('')

const imageUrl = ref<string>('')
const imgParam = ref<ImgParamType>({
  scale: 1,
  tx: 0,
  ty: 0,
  deg: 0,
  enableTransition: true
})

const textData = ref<string>('')

const viewerWordRef = ref<HTMLElement>()
const viewerPdfRef = ref<HTMLElement>()

watch(() => props.res, async (newVal: Response | undefined) => {
  resetStatus()
  if (newVal === undefined) {
    return
  } else {
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

watch(() => props.blob, async (newVal: Blob | undefined) => {
  resetStatus()
  if (newVal === undefined) {
    return
  } else {
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

const pdfData = shallowRef()
const pdfPages = ref<number>(0)
const pdfScale = ref<number>(1)
const curPage = ref<number>(1)
const maxCurPage = ref<number>(1)
const pageSize = ref<number>(1)
const watermarkText = ref<string>('')
const waterMarkOptions = ref({
  columns: 10,
  rows: 10,
  color: 'rgba(255, 100, 100, 0.4)',
  rotation: 30,
  fontSize: 20
})

/* load pdf */
const loadPdfFile = (src: string) => {
  // handle watermark
  watermarkText.value = props.watermark || ''
  waterMarkOptions.value = Object.assign(waterMarkOptions.value, props.watermarkProps || {})
  // handle source data
  const { pdf, pages } = usePDF(src)
  watch(pdf, (newVal) => {
    pdfData.value = newVal
    pdfPages.value = pages.value

    // handle pagination
    if (props.pagination) {
      maxCurPage.value = Math.ceil(pdfPages.value / props.pagination)
      pageSize.value = props.pagination
    } else {
      pageSize.value = pdfPages.value
    }
  })
}

const rangePage = (start: number, end: number) => {
  const res: number[] = []
  for (let i = start; i <= end; i++) {
    res.push(i)
  }
  return res
}

const decreasePage = () => {
  curPage.value = Math.max(1, curPage.value - 1)
}

const increasePage = () => {
  curPage.value = Math.min(maxCurPage.value, curPage.value + 1)
}

const resetStatus = () => {
  imageUrl.value = ''
  resetImg(0)
  pdfData.value = undefined
  pdfPages.value = 0
  pdfScale.value = 1
  curPage.value = 1
  maxCurPage.value = 1
  pageSize.value = 1
  watermarkText.value = ''
  waterMarkOptions.value = {
    columns: 10,
    rows: 10,
    color: 'rgba(255, 100, 100, 0.4)',
    rotation: 30,
    fontSize: 20
  }
  textData.value = ''
}

const zoomOutPdf = () => {
  pdfScale.value = Math.max(0.2, pdfScale.value - 0.1)
}

const zoomInPdf = () => {
  pdfScale.value = Math.min(3, pdfScale.value + 0.1)
}

const resetPdf = () => {
  pdfScale.value = 1
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
  delta < 0 ? zoomInImg() : zoomOutImg()
}

const handleMousedown = (evt: MouseEvent) => {
  if (!viewerImgRef.value) return

  const originX = imgParam.value.tx
  const originY = imgParam.value.ty
  const startX = evt.pageX
  const startY = evt.pageY

  const dragHandler = ((ev: MouseEvent) => {
    imgParam.value.enableTransition = false
    imgParam.value.tx = originX + (ev.pageX - startX) / imgParam.value.scale
    imgParam.value.ty = originY + (ev.pageY - startY) / imgParam.value.scale
  })
  document.addEventListener('mousemove', dragHandler)
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', dragHandler)
    imgParam.value.enableTransition = true
  })

  evt.preventDefault()
}

const zoomOutImg = () => {
  if (imgParam.value.scale > minScale) {
    imgParam.value.scale = Number.parseFloat(
      (imgParam.value.scale / zoomRate).toFixed(3)
    )
  }
}
const zoomInImg = () => {
  if (imgParam.value.scale < maxScale) {
    imgParam.value.scale = Number.parseFloat(
      (imgParam.value.scale * zoomRate).toFixed(3)
    )
  }
}
const resetImg = (deg: number) => {
  let newDeg: number = 0
  if (deg === -1) {
    const originDeg = imgParam.value.deg
    switch (originDeg % 360) {
      case 90:
      case -270:
        newDeg = originDeg - 90
        break
      case 180:
      case -180:
        newDeg = originDeg - (originDeg % 360)
        break
      case -90:
      case 270:
        newDeg = originDeg + 90
        break
      default:
        newDeg = originDeg
        break
    }
  }
  imgParam.value = {
    scale: 1,
    tx: 0,
    ty: 0,
    deg: newDeg,
    enableTransition: true
  }
}
const rotateImg = (delta: number) => {
  imgParam.value.deg = imgParam.value.deg + delta
}
</script>

<template>
  <div style="position: relative">
    <template v-if="Image_Type.includes(type)">
      <template v-if="props.change">
        <div class="s-viewer-img-container--change">
          <img
            ref="viewerImgRef"
            :src="imageUrl"
            :style="{transform:`scale(${imgParam.scale}) translate(${imgParam.tx}px, ${imgParam.ty}px) rotate(${imgParam.deg}deg)`, transition: `${imgParam.enableTransition ? 'transform 0.2s linear' : 'none'}`}"
            alt=""
            @mousedown="handleMousedown"
            @mousewheel="handleMousewheel"
          />
          <div class="s-viewer-tool-bar">
            <div class="s-viewer-tool-btn" @click="zoomOutImg">
              <svg height="32" viewBox="0 0 24 24" width="32"
                   xmlns="http://www.w3.org/2000/svg">
                <g fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11.5" cy="11.5" r="9.5" />
                  <path d="M18.5 18.5L22 22M9 11.5h5" stroke-linecap="round" />
                </g>
              </svg>
            </div>
            <div class="s-viewer-tool-btn" @click="zoomInImg">
              <svg height="32" viewBox="0 0 24 24" width="32"
                   xmlns="http://www.w3.org/2000/svg">
                <g fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11.5" cy="11.5" r="9.5" />
                  <path d="M18.5 18.5L22 22M9 11.5h2.5m0 0H14m-2.5 0V14m0-2.5V9"
                        stroke-linecap="round" />
                </g>
              </svg>
            </div>
            <div class="s-viewer-tool-btn s-viewer-tool-btn--reset" @click="resetImg(-1)">
              <svg height="32" viewBox="0 0 24 24" width="32"
                   xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12.079 2.25c-4.794 0-8.734 3.663-9.118 8.333H2a.75.75 0 0 0-.528 1.283l1.68 1.666a.75.75 0 0 0 1.056 0l1.68-1.666a.75.75 0 0 0-.528-1.283h-.893c.38-3.831 3.638-6.833 7.612-6.833a7.658 7.658 0 0 1 6.537 3.643a.75.75 0 1 0 1.277-.786A9.158 9.158 0 0 0 12.08 2.25m8.761 8.217a.75.75 0 0 0-1.054 0L18.1 12.133a.75.75 0 0 0 .527 1.284h.899c-.382 3.83-3.651 6.833-7.644 6.833a7.697 7.697 0 0 1-6.565-3.644a.75.75 0 1 0-1.277.788a9.197 9.197 0 0 0 7.842 4.356c4.808 0 8.765-3.66 9.15-8.333H22a.75.75 0 0 0 .527-1.284z"
                  fill="currentColor" />
              </svg>
            </div>
            <div class="s-viewer-tool-btn" @click="rotateImg(-90)">
              <svg height="32" viewBox="0 0 24 24" width="32"
                   xmlns="http://www.w3.org/2000/svg">
                <g fill="none" stroke="currentColor" stroke-linecap="round"
                   stroke-width="1.5">
                  <path
                    d="m11.336 5.479l-3.973 3.53C5.795 10.405 5.01 11.102 5.01 12c0 .899.785 1.596 2.353 2.99l3.972 3.53c.716.637 1.074.956 1.37.823c.295-.133.295-.611.295-1.57v-2.344c3.6 0 7.5 1.714 9 4.571c0-9.142-5.334-11.428-9-11.428V6.226c0-.958 0-1.437-.295-1.57c-.296-.132-.653.186-1.37.823"
                    stroke-linejoin="round" />
                  <path
                    d="M8.462 4.5L3.245 9.344a3.897 3.897 0 0 0 .126 5.823l5.09 4.333" />
                </g>
              </svg>
            </div>
            <div class="s-viewer-tool-btn" @click="rotateImg(90)">
              <svg height="32" viewBox="0 0 24 24" width="32"
                   xmlns="http://www.w3.org/2000/svg">
                <g fill="none" stroke="currentColor" stroke-linecap="round"
                   stroke-width="1.5">
                  <path
                    d="m12.664 5.479l3.973 3.53c1.568 1.395 2.353 2.092 2.353 2.99c0 .899-.785 1.596-2.353 2.99l-3.973 3.53c-.716.637-1.074.956-1.369.823c-.295-.133-.295-.611-.295-1.57v-2.344c-3.6 0-7.5 1.714-9 4.571c0-9.142 5.333-11.428 9-11.428V6.226c0-.958 0-1.437.295-1.57c.295-.132.653.186 1.37.823"
                    stroke-linejoin="round" />
                  <path
                    d="m15.539 4.5l5.216 4.844a3.897 3.897 0 0 1-.126 5.823l-5.09 4.333" />
                </g>
              </svg>
            </div>
          </div>
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
        <div class="s-viewer-pdf-scroll">
          <VuePDF
            v-for="page in rangePage((curPage - 1) * pageSize + 1, Math.min(pdfPages, curPage * pageSize))"
            :key="page"
            :pdf="pdfData"
            :page="page"
            :scale="pdfScale"
            :watermark-text="watermarkText"
            :watermark-options="waterMarkOptions"
          />
        </div>
        <div v-if="props.change" class="s-viewer-tool-bar">
          <div class="s-viewer-tool-btn" @click="zoomOutPdf">
            <svg height="32" viewBox="0 0 24 24" width="32"
                 xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11.5" cy="11.5" r="9.5" />
                <path d="M18.5 18.5L22 22M9 11.5h5" stroke-linecap="round" />
              </g>
            </svg>
          </div>
          <div class="s-viewer-tool-btn" @click="resetPdf">
            <svg height="32" viewBox="0 0 24 24" width="32"
                 xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M12.079 2.25c-4.794 0-8.734 3.663-9.118 8.333H2a.75.75 0 0 0-.528 1.283l1.68 1.666a.75.75 0 0 0 1.056 0l1.68-1.666a.75.75 0 0 0-.528-1.283h-.893c.38-3.831 3.638-6.833 7.612-6.833a7.658 7.658 0 0 1 6.537 3.643a.75.75 0 1 0 1.277-.786A9.158 9.158 0 0 0 12.08 2.25m8.761 8.217a.75.75 0 0 0-1.054 0L18.1 12.133a.75.75 0 0 0 .527 1.284h.899c-.382 3.83-3.651 6.833-7.644 6.833a7.697 7.697 0 0 1-6.565-3.644a.75.75 0 1 0-1.277.788a9.197 9.197 0 0 0 7.842 4.356c4.808 0 8.765-3.66 9.15-8.333H22a.75.75 0 0 0 .527-1.284z"
                  fill="currentColor" />
            </svg>
          </div>
          <div class="s-viewer-tool-btn" @click="zoomInPdf">
            <svg height="32" viewBox="0 0 24 24" width="32"
                 xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11.5" cy="11.5" r="9.5" />
                <path d="M18.5 18.5L22 22M9 11.5h2.5m0 0H14m-2.5 0V14m0-2.5V9"
                      stroke-linecap="round" />
              </g>
            </svg>
          </div>
          <template v-if="props.pagination">
            <div class="s-viewer-tool-divider" />
            <div class="s-viewer-tool-btn" @click="decreasePage">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M7.34 9.353c-1.787 1.154-1.787 4.14 0 5.294l10.79 6.967c1.736 1.122 3.87-.338 3.87-2.647V5.033c0-2.31-2.134-3.769-3.87-2.648z"/>
                  <path stroke-linecap="round" d="M2 5v14"/>
                </g>
              </svg>
            </div>
            <div class="s-viewer-tool-text">{{ curPage }}/{{ maxCurPage }}</div>
            <div class="s-viewer-tool-btn" @click="increasePage">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M16.66 9.353c1.787 1.154 1.787 4.14 0 5.294L5.87 21.614C4.135 22.737 2 21.277 2 18.968V5.033c0-2.31 2.134-3.769 3.87-2.648z"/>
                  <path stroke-linecap="round" d="M22 5v14"/>
                </g>
              </svg>
            </div>
          </template>
        </div>
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
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: auto;
  user-select: none;
  background-color: transparent;
}

.s-viewer-tool-bar {
  position: absolute;
  bottom: 10px;
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: center;
  padding: 3px 25px;
  pointer-events: none;
  border-radius: 18px;
  background-color: #aaa5;
  backdrop-filter: blur(20px);
  gap: 5px;
  left: 50%;
  transform: translateX(-50%);
  overflow: hidden;
  user-select: none;
}

.s-viewer-tool-text {
  color: #fff;
  margin: 0 3px;
  white-space: nowrap;
}

.s-viewer-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  cursor: pointer;
  pointer-events: auto;
}

.s-viewer-tool-btn--reset {
  margin: 0 10px;
}

.s-viewer-tool-divider {
  margin: 0 10px;
}

.s-viewer-tool-btn svg {
  width: 20px;
  height: 20px;
  transition: all 0.2s ease;
  color: #fff;
}

.s-viewer-tool-btn:hover > svg {
  color: #666;
}

.s-viewer-tool-btn:active > svg {
  scale: 0.75;
}

.s-viewer-img-container {
  overflow: auto;
  width: 100%;
  height: 100%;
  margin: auto;
  background-color: transparent;
}

.s-viewer-word-container {
  overflow: auto;
  width: 100%;
  height: 100%;
  margin: auto;
  background-color: transparent;
}

.s-viewer-pdf-container {
  overflow-y: scroll;
  align-items: center;
  width: 100%;
  height: 100%;
}

.s-viewer-pdf-scroll {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.s-viewer-pdf-scroll div {
  margin: auto;
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
  background: transparent !important;

  .docx {
    box-shadow: none !important;
  }
}
</style>
