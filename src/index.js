import FileViewer from './components';
export * from './components';
export default {
    install: (app) => {
        app.use(FileViewer);
    }
};
