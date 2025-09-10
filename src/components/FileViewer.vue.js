/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, watch, nextTick, toRaw } from 'vue';
import { readFileTypeFromBlob } from './detect-type';
import { renderAsync } from 'docx-preview';
import * as PDFJS from 'pdfjs-dist';
import PDFWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { Image_Type, Pdf_Type, Text_Type, Word_Type } from './config';
defineOptions({
    name: 'FileViewer'
});
const props = withDefaults(defineProps(), {
    download: false,
    changeImg: false,
    fit: 'contain'
});
const type = ref('');
const imageUrl = ref('');
const imgParam = ref({
    scale: 1,
    tx: 0,
    ty: 0,
    deg: 0,
    enableTransition: true
});
const pdfData = ref();
const pdfDoc = ref();
const pdfPages = ref(0);
const textData = ref('');
const viewerWordRef = ref();
const viewerPdfRef = ref();
watch(() => props.res, async (newVal) => {
    resetStatus();
    if (newVal === undefined) {
        return;
    }
    else {
        const blob = await newVal.blob();
        type.value = props.type || (await readFileTypeFromBlob(blob)).ext;
        nextTick(async () => {
            if (Image_Type.includes(type.value)) {
                imageUrl.value = window.URL.createObjectURL(blob);
            }
            else if (Word_Type.includes(type.value)) {
                renderAsync(blob, viewerWordRef.value);
            }
            else if (Pdf_Type.includes(type.value)) {
                loadPdfFile(window.URL.createObjectURL(blob));
            }
            else if (Text_Type.includes(type.value)) {
                textData.value = await blob.text();
            }
        });
    }
});
watch(() => props.blob, async (newVal) => {
    resetStatus();
    if (newVal === undefined) {
        return;
    }
    else {
        type.value = props.type || (await readFileTypeFromBlob(newVal)).ext;
        nextTick(async () => {
            if (Image_Type.includes(type.value)) {
                imageUrl.value = window.URL.createObjectURL(newVal);
            }
            else if (Word_Type.includes(type.value)) {
                renderAsync(newVal, viewerWordRef.value);
            }
            else if (Pdf_Type.includes(type.value)) {
                loadPdfFile(window.URL.createObjectURL(newVal));
            }
            else if (Text_Type.includes(type.value)) {
                textData.value = await newVal.text();
            }
        });
    }
});
/* load pdf */
const configWorker = (workerSrc) => {
    PDFJS.GlobalWorkerOptions.workerSrc = workerSrc;
};
const loadPdfFile = (src) => {
    if (!PDFJS.GlobalWorkerOptions?.workerSrc) {
        configWorker(PDFWorker);
    }
    const loadingTask = PDFJS.getDocument(src);
    loadingTask.promise.then(async (doc) => {
        pdfDoc.value = doc;
        pdfPages.value = doc.numPages;
        nextTick(() => {
            renderPdf(1);
        });
    });
};
const renderPdf = (pageIndex) => {
    toRaw(pdfDoc.value)?.getPage(pageIndex).then(async (page) => {
        /* get scale */
        const parentWidth = viewerPdfRef.value.parentNode.clientWidth;
        const scaleWidth = page.getViewport({ scale: 1 }).width;
        const scale = parentWidth / scaleWidth;
        /* get viewport */
        const defaultViewport = page.getViewport();
        const viewportParams = {
            scale,
            rotation: defaultViewport.rotation
        };
        const viewport = page.getViewport(viewportParams);
        /* get canvas dom */
        const canvasId = `pdf-canvas-${pageIndex}`;
        const canvasDom = document.getElementById(canvasId);
        const dpr = window.devicePixelRatio || 1;
        canvasDom.width = Math.floor(viewport.width * dpr);
        canvasDom.height = Math.floor(viewport.height * dpr);
        canvasDom.style.width = `${Math.floor(viewport.width)}px`;
        canvasDom.style.height = `${Math.floor(viewport.height)}px`;
        viewerPdfRef.value?.style.setProperty('--scale-factor', `${viewport.scale}`);
        /* render page into canvas context */
        const renderContext = {
            canvasContext: canvasDom.getContext('2d'),
            viewport,
            annotationMode: PDFJS.AnnotationMode.ENABLE_FORMS,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
        };
        const task = page.render(renderContext);
        /* add watermark */
        if (props.watermark) {
            task.promise.then(() => {
                const ctx = canvasDom.getContext('2d');
                let pattern = ctx.createPattern(getPattern(), 'repeat');
                ctx.rect(0, 0, canvasDom.width, canvasDom.height);
                ctx.rotate(-30 * Math.PI / 180);
                ctx.fillStyle = pattern;
                ctx.fill();
            });
        }
        /* render all pages */
        if (pageIndex < pdfPages.value) {
            renderPdf(pageIndex + 1);
        }
    });
};
/* get watermark pattern */
const getPattern = () => {
    const label = props.watermark ?? 'WaterMark';
    const count = label.length;
    const size = props.watermarkSize ?? 200;
    let canvas = document.createElement('canvas');
    canvas.height = size * 2;
    canvas.width = count * size * 1.1;
    let ctx = canvas.getContext('2d');
    ctx.font = `${size}px Bold Source Hans CN`;
    ctx.fillStyle = props.watermarkColor ?? '#6662';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, size);
    return canvas;
};
const resetStatus = () => {
    imageUrl.value = '';
    resetImg(0);
    pdfData.value = undefined;
    pdfPages.value = 0;
    textData.value = '';
};
/* tools - download file */
const downloadFile = () => {
};
const viewerImgRef = ref();
const maxScale = 7;
const minScale = 0.2;
const zoomRate = 1.2;
const handleMousewheel = (evt) => {
    const delta = evt.deltaY || evt.deltaX;
    delta < 0 ? zoomInImg() : zoomOutImg();
};
const handleMousedown = (evt) => {
    if (!viewerImgRef.value)
        return;
    const originX = imgParam.value.tx;
    const originY = imgParam.value.ty;
    const startX = evt.pageX;
    const startY = evt.pageY;
    const dragHandler = ((ev) => {
        imgParam.value.enableTransition = false;
        imgParam.value.tx = originX + (ev.pageX - startX) / imgParam.value.scale;
        imgParam.value.ty = originY + (ev.pageY - startY) / imgParam.value.scale;
    });
    document.addEventListener('mousemove', dragHandler);
    document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', dragHandler);
        imgParam.value.enableTransition = true;
    });
    evt.preventDefault();
};
const zoomOutImg = () => {
    if (imgParam.value.scale > minScale) {
        imgParam.value.scale = Number.parseFloat((imgParam.value.scale / zoomRate).toFixed(3));
    }
};
const zoomInImg = () => {
    if (imgParam.value.scale < maxScale) {
        imgParam.value.scale = Number.parseFloat((imgParam.value.scale * zoomRate).toFixed(3));
    }
};
const resetImg = (deg) => {
    let newDeg = 0;
    if (deg === -1) {
        const originDeg = imgParam.value.deg;
        switch (originDeg % 360) {
            case 90:
            case -270:
                newDeg = originDeg - 90;
                break;
            case 180:
            case -180:
                newDeg = originDeg - (originDeg % 360);
                break;
            case -90:
            case 270:
                newDeg = originDeg + 90;
                break;
            default:
                newDeg = originDeg;
                break;
        }
    }
    imgParam.value = {
        scale: 1,
        tx: 0,
        ty: 0,
        deg: newDeg,
        enableTransition: true
    };
};
const rotateImg = (delta) => {
    imgParam.value.deg = imgParam.value.deg + delta;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    download: false,
    changeImg: false,
    fit: 'contain'
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--reset']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--zoom-out']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--zoom-in']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--rotate-left']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--rotate-right']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--reset']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--zoom-out']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--zoom-in']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--rotate-left']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--rotate-right']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--reset']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
if (__VLS_ctx.Image_Type.includes(__VLS_ctx.type)) {
    if (props.changeImg) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "s-viewer-img-container--change" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            ...{ onMousedown: (__VLS_ctx.handleMousedown) },
            ...{ onMousewheel: (__VLS_ctx.handleMousewheel) },
            ref: "viewerImgRef",
            src: (__VLS_ctx.imageUrl),
            ...{ style: ({ transform: `scale(${__VLS_ctx.imgParam.scale}) translate(${__VLS_ctx.imgParam.tx}px, ${__VLS_ctx.imgParam.ty}px) rotate(${__VLS_ctx.imgParam.deg}deg)`, transition: `${__VLS_ctx.imgParam.enableTransition ? 'transform 0.2s linear' : 'none'}` }) },
            alt: "",
        });
        /** @type {typeof __VLS_ctx.viewerImgRef} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "s-viewer-img-tool-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.zoomOutImg) },
            ...{ class: "s-viewer-img-tool-btn--zoom-out" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            height: "32",
            viewBox: "0 0 24 24",
            width: "32",
            xmlns: "http://www.w3.org/2000/svg",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.5",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            cx: "11.5",
            cy: "11.5",
            r: "9.5",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M18.5 18.5L22 22M9 11.5h5",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.zoomInImg) },
            ...{ class: "s-viewer-img-tool-btn--zoom-in" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            height: "32",
            viewBox: "0 0 24 24",
            width: "32",
            xmlns: "http://www.w3.org/2000/svg",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1.5",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            cx: "11.5",
            cy: "11.5",
            r: "9.5",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M18.5 18.5L22 22M9 11.5h2.5m0 0H14m-2.5 0V14m0-2.5V9",
            'stroke-linecap': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.Image_Type.includes(__VLS_ctx.type)))
                        return;
                    if (!(props.changeImg))
                        return;
                    __VLS_ctx.resetImg(-1);
                } },
            ...{ class: "s-viewer-img-tool-btn--reset" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            height: "32",
            viewBox: "0 0 24 24",
            width: "32",
            xmlns: "http://www.w3.org/2000/svg",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M12.079 2.25c-4.794 0-8.734 3.663-9.118 8.333H2a.75.75 0 0 0-.528 1.283l1.68 1.666a.75.75 0 0 0 1.056 0l1.68-1.666a.75.75 0 0 0-.528-1.283h-.893c.38-3.831 3.638-6.833 7.612-6.833a7.658 7.658 0 0 1 6.537 3.643a.75.75 0 1 0 1.277-.786A9.158 9.158 0 0 0 12.08 2.25m8.761 8.217a.75.75 0 0 0-1.054 0L18.1 12.133a.75.75 0 0 0 .527 1.284h.899c-.382 3.83-3.651 6.833-7.644 6.833a7.697 7.697 0 0 1-6.565-3.644a.75.75 0 1 0-1.277.788a9.197 9.197 0 0 0 7.842 4.356c4.808 0 8.765-3.66 9.15-8.333H22a.75.75 0 0 0 .527-1.284z",
            fill: "currentColor",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.Image_Type.includes(__VLS_ctx.type)))
                        return;
                    if (!(props.changeImg))
                        return;
                    __VLS_ctx.rotateImg(-90);
                } },
            ...{ class: "s-viewer-img-tool-btn--rotate-left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            height: "32",
            viewBox: "0 0 24 24",
            width: "32",
            xmlns: "http://www.w3.org/2000/svg",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
            fill: "none",
            stroke: "currentColor",
            'stroke-linecap': "round",
            'stroke-width': "1.5",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "m11.336 5.479l-3.973 3.53C5.795 10.405 5.01 11.102 5.01 12c0 .899.785 1.596 2.353 2.99l3.972 3.53c.716.637 1.074.956 1.37.823c.295-.133.295-.611.295-1.57v-2.344c3.6 0 7.5 1.714 9 4.571c0-9.142-5.334-11.428-9-11.428V6.226c0-.958 0-1.437-.295-1.57c-.296-.132-.653.186-1.37.823",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M8.462 4.5L3.245 9.344a3.897 3.897 0 0 0 .126 5.823l5.09 4.333",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.Image_Type.includes(__VLS_ctx.type)))
                        return;
                    if (!(props.changeImg))
                        return;
                    __VLS_ctx.rotateImg(90);
                } },
            ...{ class: "s-viewer-img-tool-btn--rotate-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            height: "32",
            viewBox: "0 0 24 24",
            width: "32",
            xmlns: "http://www.w3.org/2000/svg",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
            fill: "none",
            stroke: "currentColor",
            'stroke-linecap': "round",
            'stroke-width': "1.5",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "m12.664 5.479l3.973 3.53c1.568 1.395 2.353 2.092 2.353 2.99c0 .899-.785 1.596-2.353 2.99l-3.973 3.53c-.716.637-1.074.956-1.369.823c-.295-.133-.295-.611-.295-1.57v-2.344c-3.6 0-7.5 1.714-9 4.571c0-9.142 5.333-11.428 9-11.428V6.226c0-.958 0-1.437.295-1.57c.295-.132.653.186 1.37.823",
            'stroke-linejoin': "round",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "m15.539 4.5l5.216 4.844a3.897 3.897 0 0 1-.126 5.823l-5.09 4.333",
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.imageUrl),
            ...{ style: (`object-fit: ${props.fit}`) },
            alt: "",
            ...{ class: "s-viewer-img-container" },
        });
    }
}
else if (__VLS_ctx.Word_Type.includes(__VLS_ctx.type)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "viewerWordRef",
        ...{ class: "s-viewer-word-container" },
    });
    /** @type {typeof __VLS_ctx.viewerWordRef} */ ;
}
else if (__VLS_ctx.Pdf_Type.includes(__VLS_ctx.type)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "viewerPdfRef",
        ...{ class: "s-viewer-pdf-container" },
    });
    /** @type {typeof __VLS_ctx.viewerPdfRef} */ ;
    for (const [page] of __VLS_getVForSourceType((__VLS_ctx.pdfPages))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.canvas)({
            id: (`pdf-canvas-${page}`),
            key: (page),
        });
    }
}
else if (__VLS_ctx.Text_Type.includes(__VLS_ctx.type)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "s-viewer-text-container" },
    });
    (__VLS_ctx.textData);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "s-viewer-text-container" },
    });
}
/** @type {__VLS_StyleScopedClasses['s-viewer-img-container--change']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--zoom-out']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--zoom-in']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--reset']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--rotate-left']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-tool-btn--rotate-right']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-img-container']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-word-container']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-pdf-container']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-text-container']} */ ;
/** @type {__VLS_StyleScopedClasses['s-viewer-text-container']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Image_Type: Image_Type,
            Pdf_Type: Pdf_Type,
            Text_Type: Text_Type,
            Word_Type: Word_Type,
            type: type,
            imageUrl: imageUrl,
            imgParam: imgParam,
            pdfPages: pdfPages,
            textData: textData,
            viewerWordRef: viewerWordRef,
            viewerPdfRef: viewerPdfRef,
            viewerImgRef: viewerImgRef,
            handleMousewheel: handleMousewheel,
            handleMousedown: handleMousedown,
            zoomOutImg: zoomOutImg,
            zoomInImg: zoomInImg,
            resetImg: resetImg,
            rotateImg: rotateImg,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
