declare module "algorand-msgpack" {
  type BufferSource = ArrayBuffer | ArrayBufferView;
  type ArrayBufferView =
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

  export function decode(buffer: BufferSource): any;
  export function decodeAsync(buffer: BufferSource): Promise<any>;
  export class Decoder {
    decode(buffer: BufferSource): any;
    decodeAsync(buffer: BufferSource): Promise<any>;
  }
}
