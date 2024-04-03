<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue'
import { readFileTypeFromBlob } from './file-type'
import { renderAsync } from 'docx-preview'
import { usePDF, VuePDF } from '@tato30/vue-pdf'

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
const pdfPages = ref<number>(0)
const textData = ref<string>('')

const viewerWordRef = ref<HTMLElement>()

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
        const { pdf, pages } = usePDF(window.URL.createObjectURL(blob))
        watch(pdf, () => {
          pdfData.value = pdf.value
          pdfPages.value = pages.value
        })
      } else if (type.value === 'unknown' && blob.type === 'text/plain') {
        type.value = 'txt'
        textData.value = await blob.text()
      }
    })
  }
})

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
      <div class="pdf-box">
        <VuePDF
          v-for="item in pdfPages"
          :key="item"
          :page="item"
          :pdf="pdfData"
          fit-parent
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
