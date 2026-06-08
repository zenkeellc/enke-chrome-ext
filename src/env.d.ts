/// <reference types="vite/client" />
/// <reference types="chrome" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module 'qr-code-styling' {
  interface QRCodeStyling {
    new(options?: Partial<Options>): QRCodeStyling;
    append(element: HTMLElement): void;
    update(options: Partial<Options>): void;
    download(options?: { name?: string; extension?: string }): void;
  }

  interface Options {
    width: number;
    height: number;
    type: string;
    data: string;
    image: string;
    imageOptions?: {
      crossOrigin?: string;
      margin?: number;
      imageSize?: number;
    };
    dotsOptions: {
      color: string;
      type: string;
    };
    cornersSquareOptions: {
      type: string;
      color: string;
    };
    cornersDotOptions: {
      type: string;
      color: string;
    };
  }

  const QRCodeStyling: {
    new(options?: Partial<Options>): QRCodeStyling;
  };

  export default QRCodeStyling;
  export type { Options, QRCodeStyling };
}
