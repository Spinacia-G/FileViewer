## Introduction

A file viewer component in Typescript. The file type is detected by checking
the magic number.

## Installation

```
npm install @spinicia_/file-viewer
```

```
pnpm add @spinacia_/file-viewer
```

## Usage

```
<script setup lang="ts">
import { ref } from 'vue'
import { FileViewer } from '@spinacia_/file-viewer/dist'
import '@spinacia_/file-viewer/dist/style.css'

import testUrl from '@/assets/files/testFile.pdf?url'

const sourceData = ref<Response>()

const loadFile = async () => {
  fetch(testUrl).then((res: Response) => {
    sourceData.value = res
  }
}

// const clearFile = () => { sourceData.value = undefined }
</script>

<template>
  <button @click="loadFile">Load file</button>
  <FileViewer :res="sourceData" class="viewer-container" />
</template>

<style scoped>
.viewer-container {
  width: 60vw;
  height: 80vh;
  box-shadow:
    2px 2px 15px #9992,
    2px 2px 10px #9994,
    2px 2px 5px #9996;
}
</style>
```

or specify the type in props:

```
<script setup lang="ts">
import { ref } from 'vue'
import { FileViewer, readFileTypeFromBlob } from '@spinacia_/file-viewer/dist'
import '@spinacia_/file-viewer/dist/style.css'

import testUrl from '@/assets/files/testFile.pdf?url'

const blobData = ref<Blob>()
const type = ref<string>()

const loadFile = async () => {
  fetch(testUrl).then(async (res: Response) => {
    const blob = await res.clone().blob()
    type.value = (await readFileTypeFromBlob(blob)).ext
    blobData.value = blob
  }
}

// const clearFile = () => { blobData.value = undefined }
</script>

<template>
  <button @click="loadFile">Load file</button>
  <FileViewer :blob="blobData" :type="type" />
</template>
```

and all supported types can be checked in XXX_TYPE variables:

```
import { Image_Type, Pdf_Type, Text_Type, Excel_Type, Word_Type } from '@spinacia_/file-viewer/dist'
```

## Props

| name        | default     | type                                         | description                                                                                                   |
|-------------|-------------|----------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| `ref`       | `undefined` | `Response`                                   | file source data                                                                                              |
| `blob`      | `undefined` | `Blob`                                       | file source data                                                                                              |
| `type`      | `undefined` | `string`                                     | if the file type is not passed in props, its type will be automatically detected by checking the magic number |
| `changeImg` | `false`     | `boolean`                                    | if true, the image can be zoomed by `mousewheel` and dragged by `mousedown`/`mouseup`                         |
| `fit`       | `contain`   | `contain`/`cover`/`fill`/`none`/`scale-down` | indicate how the image should be resized to fit its container, same as object-fit                             |

## Reference

- [type check](https://github.com/sindresorhus/file-type)
- [docx viewer](https://www.npmjs.com/package/docx-preview)
- [pdfjs-dist](https://github.com/mozilla/pdf.js)

## Supported file types

- images: `.jpg` `.png` `.gif` `.bmp` `.webp` `.svg`
- word: `.docx`
- pdf: `.pdf`
- plain text: `.txt`

