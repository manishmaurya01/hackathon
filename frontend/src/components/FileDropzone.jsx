import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, File, X, Loader2 } from 'lucide-react';
import { formatBytes, fileExtension } from '../utils/format.js';

export const ACCEPTED = '.pdf,.docx,.txt';

/**
 * Drag & drop / click-to-browse upload zone.
 * Shows the selected file with name, size and a working Remove control.
 */
export default function FileDropzone({
  file,
  onFile,
  onRemove,
  disabled = false,
  maxFileSize,
  error,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const validate = useCallback(
    (candidate) => {
      if (!candidate) return 'No file selected.';
      const ext = fileExtension(candidate.name);
      if (!['.pdf', '.docx', '.txt'].includes(ext)) {
        return 'Unsupported file type. Please upload a PDF, DOCX or TXT file.';
      }
      if (maxFileSize && candidate.size > maxFileSize) {
        return `File is too large. Maximum size is ${formatBytes(maxFileSize)}.`;
      }
      return null;
    },
    [maxFileSize]
  );

  const acceptedTypes = useCallback(
    (list) => {
      const candidate = list?.[0];
      const problem = validate(candidate);
      if (problem) return { file: null, error: problem };
      return { file: candidate, error: null };
    },
    [validate]
  );

  function handleFiles(fileList) {
    if (disabled) return;
    const { file: next, error: err } = acceptedTypes(fileList);
    if (err) {
      onFile(null, err);
      return;
    }
    onFile(next, null);
  }

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const ext = file ? fileExtension(file.name) : '';
  const ExtIcon = ext === '.pdf' ? FileText : ext === '.docx' ? FileText : File;

  if (file) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <ExtIcon size={20} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{file.name}</p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
              <span className="uppercase font-medium">{ext.replace('.', '')}</span>
              <span aria-hidden="true">·</span>
              <span>{formatBytes(file.size)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="btn-ghost !px-2.5 !py-2 text-ink-500 hover:!text-red-600 hover:!bg-red-50"
            aria-label={`Remove ${file.name}`}
            title="Remove file"
          >
            <X size={17} />
          </button>
        </div>

        {disabled && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs font-medium text-ink-500">
            <Loader2 size={13} className="animate-spin" />
            Uploading…
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          dragging
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : error
              ? 'border-red-300 bg-red-50/40 hover:border-red-400'
              : 'border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50/40'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span
          className={`grid h-14 w-14 place-items-center rounded-full transition-colors ${
            dragging ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-500 group-hover:bg-brand-100 group-hover:text-brand-600'
          }`}
        >
          <UploadCloud size={26} strokeWidth={1.8} />
        </span>

        <p className="mt-4 text-sm font-semibold text-ink-900">Upload your assignment</p>
        <p className="mt-1 text-sm text-ink-500">PDF, DOCX or TXT</p>
        <p className="mt-3 text-xs text-ink-400">
          {maxFileSize ? `Maximum file size: ${formatBytes(maxFileSize)}` : 'Drag and drop, or click to browse'}
        </p>
        {maxFileSize && (
          <p className="text-xs text-ink-400">Drag and drop, or click to browse</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        aria-label="Choose assignment file"
      />

      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
