import { readFileSync } from 'node:fs';

export type Dimensions = { width: number; height: number };

/** JPEG Start-Of-Frame markers, which carry the frame's dimensions.
 *  0xC4 (DHT), 0xC8 (JPG), and 0xCC (DAC) share the range but are not SOFs. */
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** Markers that stand alone — no length field, no payload. */
const STANDALONE_MARKERS = new Set([
  0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8,
]);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The first four bytes shared by both "GIF87a" and "GIF89a" headers. */
const GIF_SIGNATURE = Buffer.from('GIF8');

/** The APP1 EXIF segment header: the bytes "Exif" followed by two NULs. */
const EXIF_MARKER = Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

/**
 * The intrinsic pixel dimensions of an image file, read from its header.
 *
 * Covers the formats this site uses: SVG, PNG, JPEG, GIF. Throws — rather
 * than guessing or returning zeroes — on anything it cannot read, so a test
 * asserting against it fails loudly instead of passing vacuously.
 */
export function readImageDimensions(filePath: string): Dimensions {
  const buffer = readFileSync(filePath);

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return readPng(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return readJpeg(buffer, filePath);
  if (buffer.subarray(0, 4).equals(GIF_SIGNATURE)) return readGif(buffer, filePath);
  if (looksLikeSvg(buffer)) return readSvg(buffer, filePath);

  throw new Error(
    `${filePath}: unrecognized image format. readImageDimensions supports ` +
      `SVG, PNG, JPEG, and GIF — add a reader here if the site starts using another.`,
  );
}

function readPng(buffer: Buffer): Dimensions {
  // IHDR is always the first chunk: 8-byte signature, 4-byte length,
  // 4-byte type, then width and height as big-endian uint32.
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readGif(buffer: Buffer, filePath: string): Dimensions {
  // Logical screen descriptor: width and height are little-endian uint16 at
  // bytes 6 and 8, right after the 6-byte "GIF87a"/"GIF89a" signature.
  if (buffer.length < 10) {
    throw new Error(`${filePath}: truncated GIF — no logical screen descriptor.`);
  }

  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function readJpeg(buffer: Buffer, filePath: string): Dimensions {
  let offset = 2; // past the SOI marker
  let orientation = 1;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw new Error(`${filePath}: malformed JPEG — expected a marker at byte ${offset}.`);
    }

    const marker = buffer[offset + 1];

    if (STANDALONE_MARKERS.has(marker)) {
      offset += 2;
      continue;
    }
    // End of image, or the start of entropy-coded scan data we must not walk.
    if (marker === 0xd9 || marker === 0xda) break;

    const length = buffer.readUInt16BE(offset + 2);
    const payload = offset + 4;

    // APP1 carries EXIF, which always precedes the SOF in practice.
    if (marker === 0xe1) {
      orientation =
        readExifOrientation(buffer.subarray(payload, payload + length - 2)) ?? orientation;
    }

    if (SOF_MARKERS.has(marker)) {
      // SOF payload: 1-byte sample precision, then height, then width.
      const height = buffer.readUInt16BE(payload + 1);
      const width = buffer.readUInt16BE(payload + 3);

      // Orientations 5-8 transpose the image: browsers honour the EXIF tag and
      // display height-by-width, so the stored dimensions are not the ones the
      // layout needs. Refuse to guess.
      if (orientation >= 5 && orientation <= 8) {
        throw new Error(
          `${filePath}: stored as ${width}x${height} but carries EXIF orientation ` +
            `${orientation}, so browsers display it rotated as ${height}x${width}. ` +
            `Re-save the image upright (stripping the orientation tag) so the ` +
            `stored and displayed dimensions agree.`,
        );
      }

      return { width, height };
    }

    offset = payload + length - 2;
  }

  throw new Error(`${filePath}: no JPEG Start-Of-Frame marker found.`);
}

/** The EXIF orientation tag, or undefined if the segment has none. */
function readExifOrientation(segment: Buffer): number | undefined {
  if (!segment.subarray(0, 6).equals(EXIF_MARKER)) return undefined;

  const tiff = segment.subarray(6);

  try {
    const littleEndian = tiff.subarray(0, 2).toString('latin1') === 'II';
    const u16 = (at: number) => (littleEndian ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at));
    const u32 = (at: number) => (littleEndian ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at));

    if (u16(2) !== 0x002a) return undefined; // not a TIFF header

    const ifdStart = u32(4);
    const entryCount = u16(ifdStart);

    for (let i = 0; i < entryCount; i += 1) {
      const entry = ifdStart + 2 + i * 12;
      if (u16(entry) === 0x0112) return u16(entry + 8);
    }
  } catch {
    // Truncated or malformed EXIF. Absent orientation is the safe reading:
    // the stored dimensions then stand on their own.
    return undefined;
  }

  return undefined;
}

function looksLikeSvg(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).toString('utf8').trimStart().startsWith('<');
}

function readSvg(buffer: Buffer, filePath: string): Dimensions {
  const markup = buffer.toString('utf8');
  const openingTag = /<svg\b[^>]*>/i.exec(markup)?.[0];

  if (!openingTag) throw new Error(`${filePath}: no <svg> element found.`);

  // Explicit width/height win; they are what a browser uses as the intrinsic
  // size. Percentages carry no pixel size, so fall through to the viewBox.
  const width = pixelAttribute(openingTag, 'width');
  const height = pixelAttribute(openingTag, 'height');
  if (width !== undefined && height !== undefined) return { width, height };

  const viewBox = /\bviewBox\s*=\s*["']([^"']+)["']/i.exec(openingTag)?.[1];
  const parts = viewBox?.trim().split(/[\s,]+/).map(Number);

  if (parts?.length === 4 && parts.every((n) => Number.isFinite(n))) {
    return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
  }

  throw new Error(
    `${filePath}: <svg> has no pixel width/height and no usable viewBox, ` +
      `so it has no intrinsic size to compare against.`,
  );
}

/** An SVG length attribute in pixels, or undefined if absent or relative. */
function pixelAttribute(tag: string, name: string): number | undefined {
  const raw = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag)?.[1]?.trim();
  if (raw === undefined) return undefined;

  const match = /^([0-9]*\.?[0-9]+)(px)?$/i.exec(raw);
  return match ? Math.round(Number(match[1])) : undefined;
}
