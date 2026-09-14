/**
 * UNIFLOWs & UniENGINE — CLIENT-SIDE IMAGE OPTIMIZER & COMPRESSOR
 * Tự động giảm dung lượng ảnh chất lượng cao (WebP) bằng HTML5 Canvas.
 * Giúp giảm ~85% - 95% dung lượng file ảnh 4K/máy ảnh (5MB-10MB -> 80KB-200KB)
 * mà không làm giảm chất lượng thị giác.
 */

import { uploadArtworkFile, isSupabaseConfigured } from './supabase.js';

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Nén 1 file ảnh client-side
 * @param {File|Blob} file 
 * @param {Object} opts { maxWidth: 1600, maxHeight: 1600, quality: 0.85, format: 'image/webp', square: false }
 * @returns {Promise<Object>} { file, blob, dataUrl, width, height, originalSize, compressedSize, savedBytes, savedPercent }
 */
export async function compressImageFile(file, opts = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    format = 'image/webp',
    square = false
  } = opts;

  return new Promise((resolve, reject) => {
    const originalSize = file.size || 0;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng hình ảnh không hợp lệ'));
      img.onload = () => {
        let srcW = img.naturalWidth || img.width;
        let srcH = img.naturalHeight || img.height;

        let targetW = srcW;
        let targetH = srcH;
        let sx = 0, sy = 0, sWidth = srcW, sHeight = srcH;

        if (square) {
          // Center crop to 1:1 square
          const minSide = Math.min(srcW, srcH);
          sx = Math.floor((srcW - minSide) / 2);
          sy = Math.floor((srcH - minSide) / 2);
          sWidth = minSide;
          sHeight = minSide;

          const maxDim = Math.min(maxWidth, maxHeight, minSide);
          targetW = maxDim;
          targetH = maxDim;
        } else {
          // Maintain aspect ratio within bounding box
          if (targetW > maxWidth) {
            targetH = Math.round((targetH * maxWidth) / targetW);
            targetW = maxWidth;
          }
          if (targetH > maxHeight) {
            targetH = Math.round((targetH * maxHeight) / targetH);
            targetH = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, targetW);
        canvas.height = Math.max(1, targetH);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Không khởi tạo được Canvas 2D'));
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);

        // Convert to Blob
        let exportFormat = format;
        canvas.toBlob((blob) => {
          if (!blob) {
            // Fallback to jpeg if webp unsupported
            exportFormat = 'image/jpeg';
            canvas.toBlob((blobFallback) => {
              if (!blobFallback) return reject(new Error('Lỗi xuất canvas ra blob'));
              processBlob(blobFallback, exportFormat);
            }, 'image/jpeg', quality);
            return;
          }
          processBlob(blob, exportFormat);
        }, exportFormat, quality);

        function processBlob(finalBlob, finalFormat) {
          const compressedSize = finalBlob.size;
          const savedBytes = Math.max(0, originalSize - compressedSize);
          const savedPercent = originalSize > 0 
            ? Math.round((savedBytes / originalSize) * 100) 
            : 0;

          const ext = finalFormat === 'image/webp' ? 'webp' : 'jpg';
          const originalName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'optimized_image';
          const newFileName = `${originalName}_compressed.${ext}`;

          const newFile = new File([finalBlob], newFileName, {
            type: finalFormat,
            lastModified: Date.now()
          });

          const dataUrl = canvas.toDataURL(finalFormat, quality);

          resolve({
            file: newFile,
            blob: finalBlob,
            dataUrl,
            width: targetW,
            height: targetH,
            originalSize,
            compressedSize,
            savedBytes,
            savedPercent,
            originalSizeFormatted: formatBytes(originalSize),
            compressedSizeFormatted: formatBytes(compressedSize)
          });
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Nén hàng loạt nhiều ảnh cùng lúc
 * @param {FileList|File[]} files
 * @param {Object} opts
 * @param {Function} onProgress
 */
export async function batchCompressImages(files, opts = {}, onProgress = null) {
  const fileArray = Array.from(files);
  const total = fileArray.length;
  const results = [];

  for (let i = 0; i < total; i++) {
    const file = fileArray[i];
    try {
      const res = await compressImageFile(file, opts);
      results.push({ success: true, file, result: res });
    } catch (err) {
      results.push({ success: false, file, error: err.message });
    }

    if (typeof onProgress === 'function') {
      const percent = Math.round(((i + 1) / total) * 100);
      onProgress({ current: i + 1, total, percent, result: results[results.length - 1] });
    }
  }

  return results;
}

/**
 * Tải ảnh lên Supabase Storage hoặc Free Storage Fallback
 * @param {File|Blob} fileOrBlob 
 * @param {string} prefix 
 * @returns {Promise<string>} Public URL
 */
export async function uploadImageSmart(fileOrBlob, prefix = 'img') {
  if (isSupabaseConfigured()) {
    return await uploadArtworkFile(fileOrBlob, prefix);
  }

  // Fallback: Return Data URL or Object URL for local testing
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(URL.createObjectURL(fileOrBlob));
    reader.readAsDataURL(fileOrBlob);
  });
}
