import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { readImageDimensions } from './imageDimensions';

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'image-dimensions-'));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Writes `bytes` to a scratch file and returns its path. */
function fixture(name: string, bytes: Buffer | string): string {
  const path = join(dir, name);
  writeFileSync(path, bytes);
  return path;
}

function u16be(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function u16le(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

/** A PNG containing nothing but the signature and an IHDR header. */
function png(width: number, height: number): Buffer {
  const widthHeight = Buffer.alloc(8);
  widthHeight.writeUInt32BE(width, 0);
  widthHeight.writeUInt32BE(height, 4);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]), // IHDR length
    Buffer.from('IHDR', 'latin1'),
    widthHeight,
  ]);
}

/** A baseline SOF0 segment carrying just the frame size. */
function sof0(width: number, height: number): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xc0]),
    u16be(11), // segment length, including these two bytes
    Buffer.from([0x08]), // sample precision
    u16be(height),
    u16be(width),
    Buffer.from([0x01, 0x01, 0x11, 0x00]), // one component
  ]);
}

/** An APP1 segment declaring a single EXIF orientation tag, little-endian. */
function exifApp1(orientation: number): Buffer {
  const tiff = Buffer.concat([
    Buffer.from('II', 'latin1'),
    Buffer.from([0x2a, 0x00]), // TIFF magic
    Buffer.from([0x08, 0x00, 0x00, 0x00]), // IFD0 starts 8 bytes in
    Buffer.from([0x01, 0x00]), // one entry
    Buffer.from([0x12, 0x01]), // tag 0x0112, Orientation
    Buffer.from([0x03, 0x00]), // type SHORT
    Buffer.from([0x01, 0x00, 0x00, 0x00]), // count
    Buffer.from([orientation, 0x00, 0x00, 0x00]), // value, inline
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // no next IFD
  ]);

  const payload = Buffer.concat([
    Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]), // "Exif\0\0"
    tiff,
  ]);

  return Buffer.concat([Buffer.from([0xff, 0xe1]), u16be(payload.length + 2), payload]);
}

function jpeg(...segments: Buffer[]): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, Buffer.from([0xff, 0xd9])]);
}

describe('readImageDimensions', () => {
  it('reads PNG dimensions from the IHDR chunk', () => {
    expect(readImageDimensions(fixture('a.png', png(1200, 1600)))).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it('reads JPEG dimensions from the SOF marker', () => {
    expect(readImageDimensions(fixture('a.jpg', jpeg(sof0(1544, 1600))))).toEqual({
      width: 1544,
      height: 1600,
    });
  });

  it('skips over segments that precede the SOF', () => {
    const comment = Buffer.concat([Buffer.from([0xff, 0xfe]), u16be(7), Buffer.from('hello')]);

    expect(readImageDimensions(fixture('b.jpg', jpeg(comment, sof0(300, 400))))).toEqual({
      width: 300,
      height: 400,
    });
  });

  it('ignores an EXIF orientation that does not transpose the image', () => {
    // 1 is upright; 3 is a 180-degree rotation. Neither swaps the axes.
    for (const orientation of [1, 3]) {
      const path = fixture(`up-${orientation}.jpg`, jpeg(exifApp1(orientation), sof0(900, 1200)));
      expect(readImageDimensions(path)).toEqual({ width: 900, height: 1200 });
    }
  });

  it('refuses a JPEG whose EXIF orientation transposes it', () => {
    // 6 and 8 are the quarter-turns a phone camera writes. The browser honours
    // them, so the stored dimensions are not the displayed ones.
    for (const orientation of [5, 6, 7, 8]) {
      const path = fixture(`rot-${orientation}.jpg`, jpeg(exifApp1(orientation), sof0(900, 1200)));
      expect(() => readImageDimensions(path)).toThrow(/orientation/i);
    }
  });

  it('reads SVG dimensions from explicit pixel attributes', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64px" height="48" />';
    expect(readImageDimensions(fixture('a.svg', svg))).toEqual({ width: 64, height: 48 });
  });

  it('falls back to the SVG viewBox when width and height are relative', () => {
    const svg = '<svg width="100%" height="100%" viewBox="0 0 900 1200"><rect /></svg>';
    expect(readImageDimensions(fixture('b.svg', svg))).toEqual({ width: 900, height: 1200 });
  });

  it('throws on an SVG with no intrinsic size', () => {
    expect(() => readImageDimensions(fixture('c.svg', '<svg><rect /></svg>'))).toThrow(
      /no pixel width\/height and no usable viewBox/,
    );
  });

  it('throws on a format it cannot read rather than guessing', () => {
    const bmp = Buffer.concat([Buffer.from('BM', 'latin1'), Buffer.alloc(10)]);
    expect(() => readImageDimensions(fixture('a.bmp', bmp))).toThrow(/unrecognized image format/);
  });

  it('reads GIF89a dimensions from the logical screen descriptor', () => {
    const gif = Buffer.concat([
      Buffer.from('GIF89a', 'latin1'),
      u16le(320),
      u16le(240),
      Buffer.from([0x00, 0x00, 0x00]), // packed fields, background color index, pixel aspect ratio
    ]);
    expect(readImageDimensions(fixture('a.gif', gif))).toEqual({ width: 320, height: 240 });
  });

  it('reads GIF87a dimensions from the logical screen descriptor', () => {
    const gif = Buffer.concat([
      Buffer.from('GIF87a', 'latin1'),
      u16le(64),
      u16le(48),
      Buffer.from([0x00, 0x00, 0x00]),
    ]);
    expect(readImageDimensions(fixture('b.gif', gif))).toEqual({ width: 64, height: 48 });
  });

  it('throws on a truncated GIF rather than returning nonsense', () => {
    const truncated = Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.from([0x01, 0x00])]);
    expect(() => readImageDimensions(fixture('c.gif', truncated))).toThrow(/truncated GIF/);
  });

  it('throws when a JPEG has no SOF marker at all', () => {
    expect(() => readImageDimensions(fixture('d.jpg', jpeg()))).toThrow(/no JPEG Start-Of-Frame/);
  });
});
