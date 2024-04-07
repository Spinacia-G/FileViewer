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

const sourceData = ref()

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

![img.webp](docs%2Fimg.webp)

## Reference

- [type check](https://github.com/sindresorhus/file-type)
- [docx viewer](https://www.npmjs.com/package/docx-preview)
- [pdf viewer](https://github.com/TaTo30/vue-pdf)

## Supported file types

- images: `.jpg` `.png` `.gif` `.bmp` `.webp`
- word: `.docx`
- pdf: `.pdf`
- plain text: `.txt`

