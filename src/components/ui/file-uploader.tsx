'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

type UploadedFile = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  name: string;
};

export function FileUploader(props: {
  inputName?: string;
  pathPrefix?: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  onUploaded?: (file: UploadedFile) => void;
}) {
  const {
    inputName,
    pathPrefix = 'uploads',
    accept = '.jpg,.jpeg,.png,.pdf',
    maxSizeMB = 5,
    label = 'Upload file',
    onUploaded
  } = props;

  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState('');

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      setError('Only JPG, PNG, PDF files are allowed.');
      setFile(null);
      return;
    }

    const max = maxSizeMB * 1024 * 1024;
    if (f.size > max) {
      setError(`File too large. Max ${maxSizeMB}MB.`);
      setFile(null);
      return;
    }

    setFile(f);
  }

  function uploadNow() {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('pathPrefix', pathPrefix);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads');

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      setProgress(Math.round((evt.loaded / evt.total) * 100));
    };

    xhr.onerror = () => {
      setUploading(false);
      setError('Upload failed. Please try again.');
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data?.error ?? 'Upload failed.');
        } catch {
          setError('Upload failed.');
        }
        return;
      }

      const data = JSON.parse(xhr.responseText) as UploadedFile;
      setUrl(data.url);
      onUploaded?.(data);
    };

    xhr.send(fd);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept={accept} onChange={onPick} />
        <Button type="button" size="sm" onClick={uploadNow} disabled={!file || uploading}>
          {uploading ? 'Uploading…' : label}
        </Button>
      </div>

      {uploading ? <div className="text-xs text-zinc-600">Progress: {progress}%</div> : null}
      {url ? (
        <div className="text-xs text-green-700 break-all">Uploaded: {url}</div>
      ) : null}
      {error ? <div className="text-xs text-red-700">{error}</div> : null}

      {inputName ? <input type="hidden" name={inputName} value={url} readOnly /> : null}
    </div>
  );
}
