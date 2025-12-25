import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download, Trash2 } from 'lucide-react';

export default function MessageAttachments({ attachments = [], onRemove, readOnly = false }) {
  const getIcon = (type) => {
    if (type?.startsWith('image/')) return Image;
    return FileText;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!attachments.length) return null;

  return (
    <div className="space-y-2">
      {attachments.map((attachment, index) => {
        const Icon = getIcon(attachment.type);
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border"
          >
            <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center">
              <Icon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.name}</p>
              {attachment.size && (
                <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
              )}
            </div>
            <div className="flex gap-1">
              {attachment.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={attachment.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {!readOnly && onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}