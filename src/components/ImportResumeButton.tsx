'use client';

// Upload an existing PDF/DOCX resume and turn it into an editable resume via
// POST /resume/import. Client-side type/size checks mirror the server limits.

import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import { apiUpload, apiErrorMessage } from '@/lib/api';
import { useLocale } from '@/i18n/LocaleProvider';
import type { ImportResumeResult } from '@/lib/types';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface Props {
  onImported: (result: ImportResumeResult) => void;
  variant?: 'primary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  label?: string;
}

export default function ImportResumeButton({
  onImported,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  label,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error(t('common.importFileTypeError'));
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(t('common.importFileSizeError'));
      return;
    }
    setUploading(true);
    try {
      const result = await apiUpload<ImportResumeResult>('/resume/import', file);
      toast.success(t('common.importSuccess'));
      onImported(result);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('common.importFailed')));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        loading={uploading}
        icon={<Upload className="w-4 h-4" />}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? t('common.readingResume') : label || t('common.importPdfDocx')}
      </Button>
    </>
  );
}
