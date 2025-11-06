/// <reference lib="dom" />
/// <reference path="../node_modules/typescript/lib/lib.dom.d.ts" />

declare type BufferSource = ArrayBuffer | ArrayBufferView;
declare type ArrayBufferView =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | DataView;
