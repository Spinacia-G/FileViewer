import _FileViewer from './FileViewer.vue';
import { readFileTypeFromBlob } from './detect-type';
import { Image_Type, Pdf_Type, Text_Type, Excel_Type, Word_Type, Zip_Type } from './config';
export { readFileTypeFromBlob };
export { Image_Type, Pdf_Type, Text_Type, Excel_Type, Word_Type, Zip_Type };
const withInstall = (comp) => {
    comp.install = (app) => {
        const name = comp.name;
        app.component(name, comp);
    };
    return comp;
};
export const FileViewer = withInstall(_FileViewer);
export default FileViewer;
