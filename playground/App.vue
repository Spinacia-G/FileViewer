<script lang="ts" setup>
import file1 from '../src/assets/files/4.webp?url'
import file2 from '../src/assets/files/440px-Rosa_Precious_platinum.jpg?url'
import file3 from '../src/assets/files/Archive file.docx?url'
import file4 from '../src/assets/files/Articles.docx?url'
import file5 from '../src/assets/files/download-guide-source-han.pdf?url'
import file6 from '../src/assets/files/excel-file.xlsx?url'
import file7 from '../src/assets/files/hello, this is a file.txt?url'
import file8 from '../src/assets/files/hello.docx?url'
import file9 from '../src/assets/files/Lossless compression.txt?url'
import file10 from '../src/assets/files/Rosa_sulfurea_001.JPG?url'
import file11 from '../src/assets/files/what.zip?url'
import file12 from '../src/assets/files/ZIP (file format) - Wikipedia.pdf?url'
import file13 from '../src/assets/icons/loading.svg?url'
import { ref } from 'vue'

import { FileViewer, readFileTypeFromBlob } from '../dist/index.js'
// import '../dist/style.css'
// import FileViewer from '../src/components/FileViewer.vue'

const fileList = [
  file1,
  file2,
  file3,
  file4,
  file5,
  file6,
  file7,
  file8,
  file9,
  file10,
  file11,
  file12,
  file13
]

const url = ref<string>('')
const resData = ref<Response>()
const blobData = ref<Blob>()
const type = ref<string>()

const reloadFile = async () => {
  clearFile()
  url.value = fileList[Math.floor(Math.random() * fileList.length)]
  fetch(url.value)
    .then(async (res: Response) => {
      const blob = await res.clone().blob()
      // type.value = (await readFileTypeFromBlob(blob)).ext
      blobData.value = blob
    })
}

const clearFile = () => {
  resData.value = undefined
  blobData.value = undefined
}

const uploadRef = ref<HTMLElement>()
const handleUpload = () => {
  uploadRef.value?.click()
}
const handleChange = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  clearFile()
  blobData.value = files[0]
}

const uploadMultiRef = ref<HTMLElement>()
const handleUploadMulti = () => {
  uploadMultiRef.value?.click()
}
const handleChangeMulti = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (let i = 0; i < fileList.length; i++) {
    const file = files.item(i)
    readFileTypeFromBlob(file).then(res => {
      console.log(res, file.name)
    })
  }
}
</script>

<template>
  <div class="playground-container">
    <div class="btn-group">
      <div class="handle-btn" @click="handleUpload">
        upload file
        <input ref="uploadRef" :multiple="false" type="file"
               @change="handleChange"
               @click.stop />
      </div>
      <div class="handle-btn" @click="handleUploadMulti">
        check multi-file
        <input ref="uploadMultiRef" :multiple="true" type="file"
               @change="handleChangeMulti"
               @click.stop />
      </div>
      <div class="handle-btn" @click="reloadFile">load file (random)</div>
      <div class="handle-btn" @click="clearFile">clear file</div>
    </div>
    <p>{{ url }}</p>
    <FileViewer
      :blob="blobData"
      :res="resData"
      :type="type"
      :watermark-size="50"
      change-img
      class="viewer-container"
      watermark="test"
    />
  </div>
</template>

<style scoped>
.playground-container {
  font-family: Consolas, 'PT Mono', serif;
  position: absolute;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: flex-start;
  box-sizing: border-box;
  width: 100vw;
  height: 100vh;
  padding: 20px;
  background-color: #f0f0f3;
  inset: 0;
}

.btn-group {
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 20px;
}

p {
  font-size: 14px;
  color: #999;
}

.viewer-container {
  width: 100%;
  height: calc(100% - 100px);
}

input {
  display: none;
}

.handle-btn {
  font-size: 16px;
  font-weight: 500;
  padding: 6px 15px;
  cursor: pointer;
  transition: all 0.25s;
  border: 1px solid transparent;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 1px 1px 5px #9992;

  &:hover {
    color: #646cff;
    border: 1px solid #646cff;
  }
}
</style>
