import { App } from 'vue';
import { ComponentOptionsMixin } from 'vue';
import { DefineComponent } from 'vue';
import { ExtractPropTypes } from 'vue';
import { Plugin as Plugin_2 } from 'vue';
import { PropType } from 'vue';
import { PublicProps } from 'vue';

declare const _default: {
    install: (app: App) => void;
};
export default _default;

export declare const FileViewer: SFCWithInstall<DefineComponent<    {
res: {
type: PropType<Response>;
required: true;
};
}, {}, unknown, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
res: {
type: PropType<Response>;
required: true;
};
}>>, {}, {}>>;

declare type SFCWithInstall<T> = T & Plugin_2;

export { }
