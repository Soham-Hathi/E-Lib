import buffer from 'node:buffer';
buffer.SlowBuffer = buffer.Buffer;
if (typeof globalThis.SlowBuffer === 'undefined') {
  globalThis.SlowBuffer = buffer.Buffer;
}
