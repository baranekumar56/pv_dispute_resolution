import { useState, useCallback, useRef } from 'react';
import {
  Upload, File, X, CheckCircle2, AlertCircle, Loader2,
  FileText, Hash, DollarSign, Calendar, List, Eye
} from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Button, Badge } from '@/components/ui';
import { UploadedDocument, ExtractedData } from '@/types';
import { formatFileSize, formatDate } from '@/utils';
import { ACCEPTED_DOC_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/config/constants';
import clsx from 'clsx';

// ─── Mock extracted data ──────────────────────────────────────────────────────
const MOCK_EXTRACTED: ExtractedData = {
  invoice_number: 'INV-2024-0089',
  vendor: 'TechSolutions Pvt. Ltd.',
  total_amount: 45750,
  date: '2025-01-10T00:00:00Z',
  line_items: [
    { description: 'Software License (Annual)', quantity: 1, unit_price: 38000, total: 38000 },
    { description: 'Implementation Support',    quantity: 8, unit_price: 750,   total: 6000  },
    { description: 'GST 18%',                   quantity: 1, unit_price: 1750,  total: 1750  },
  ],
  raw_text: 'Invoice from TechSolutions Pvt. Ltd.\nDate: 10 Jan 2025\nINV-2024-0089\nTotal payable: ₹45,750',
};

// ─── Upload zone ──────────────────────────────────────────────────────────────
const UploadZone = ({ onFiles }: { onFiles: (files: File[]) => void }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFiles(files);
  }, [onFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        'border-2 border-dashed rounded-xl2 flex flex-col items-center justify-center gap-3 py-12 px-6 cursor-pointer transition-all duration-200',
        dragging
          ? 'border-brand-400 bg-brand-50'
          : 'border-surface-200 hover:border-brand-300 hover:bg-surface-50'
      )}
    >
      <div className={clsx(
        'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
        dragging ? 'bg-brand-100' : 'bg-surface-100'
      )}>
        <Upload size={24} className={dragging ? 'text-brand-500' : 'text-surface-400'} />
      </div>
      <div className="text-center">
        <p className="font-medium text-surface-700 text-sm">
          {dragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          or <span className="text-brand-600 font-medium">click to browse</span>
        </p>
      </div>
      <p className="text-xs text-surface-300">
        PDF, JPEG, PNG, DOCX — max {MAX_FILE_SIZE_MB} MB each
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_DOC_TYPES.join(',')}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

// ─── File item in queue ───────────────────────────────────────────────────────
const FileQueueItem = ({
  doc,
  onRemove,
  onPreview,
}: {
  doc: UploadedDocument;
  onRemove: (id: string) => void;
  onPreview: (doc: UploadedDocument) => void;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-100 bg-white hover:bg-surface-50 transition-colors group">
    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
      <File size={16} className="text-brand-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-surface-800 truncate">{doc.filename}</p>
      <p className="text-xs text-surface-400">{formatFileSize(doc.size)}</p>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {doc.status === 'processing' && (
        <Loader2 size={15} className="text-brand-400 animate-spin" />
      )}
      {doc.status === 'extracted' && (
        <CheckCircle2 size={15} className="text-green-500" />
      )}
      {doc.status === 'failed' && (
        <AlertCircle size={15} className="text-red-400" />
      )}
      <Badge variant={
        doc.status === 'extracted' ? 'success' :
        doc.status === 'failed'    ? 'danger'  : 'info'
      }>
        {doc.status === 'extracted' ? 'Extracted' : doc.status === 'failed' ? 'Failed' : 'Processing'}
      </Badge>
      {doc.status === 'extracted' && (
        <button onClick={() => onPreview(doc)} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-brand-500 transition-colors">
          <Eye size={14} />
        </button>
      )}
      <button
        onClick={() => onRemove(doc.id)}
        className="p-1 rounded-lg hover:bg-red-50 text-surface-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  </div>
);

// ─── Extracted data panel ─────────────────────────────────────────────────────
const ExtractedPanel = ({ data }: { data: ExtractedData | null; doc?: UploadedDocument }) => {
  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <FileText size={28} className="text-surface-300" />
        </div>
        <h3 className="font-display font-semibold text-surface-500 mb-1">No document selected</h3>
        <p className="text-sm text-surface-400 max-w-xs">
          Upload a document and click preview to see extracted data here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Document Fields</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Hash,       label: 'Invoice No.',   value: data.invoice_number },
            { icon: FileText,   label: 'Vendor',        value: data.vendor },
            { icon: DollarSign, label: 'Total Amount',  value: data.total_amount ? `₹${data.total_amount.toLocaleString('en-IN')}` : undefined },
            { icon: Calendar,   label: 'Date',          value: data.date ? formatDate(data.date) : undefined },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-surface-50 rounded-xl p-3 border border-surface-100">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-surface-400" />
                <span className="text-[11px] text-surface-400 uppercase tracking-wider font-medium">{label}</span>
              </div>
              <p className="text-sm font-semibold text-surface-800 truncate">
                {value ?? <span className="text-surface-300 font-normal italic">—</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {data.line_items && data.line_items.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <List size={12} />
            Line Items
          </p>
          <div className="border border-surface-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="text-left px-3 py-2 text-surface-400 font-medium">Description</th>
                  <th className="text-right px-3 py-2 text-surface-400 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-surface-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {data.line_items.map((item, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2 text-surface-700">{item.description}</td>
                    <td className="px-3 py-2 text-right text-surface-500">{item.quantity}</td>
                    <td className="px-3 py-2 text-right font-medium text-surface-800">
                      ₹{item.total.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.raw_text && (
        <div>
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Raw Text Preview</p>
          <pre className="text-xs text-surface-600 bg-surface-50 border border-surface-100 rounded-xl p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-36 overflow-y-auto">
            {data.raw_text}
          </pre>
        </div>
      )}
    </div>
  );
};

// ─── Documents Page ───────────────────────────────────────────────────────────
let idCounter = 1;

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [activeDoc, setActiveDoc] = useState<UploadedDocument | null>(null);

  const handleFiles = (files: File[]) => {
    const newDocs: UploadedDocument[] = files
      .filter((f) => {
        if (!ACCEPTED_DOC_TYPES.includes(f.type)) return false;
        if (f.size > MAX_FILE_SIZE_BYTES) return false;
        return true;
      })
      .map((f) => ({
        id: String(idCounter++),
        filename: f.name,
        size: f.size,
        mime_type: f.type,
        uploaded_at: new Date().toISOString(),
        status: 'processing' as const,
      }));

    setDocuments((prev) => [...prev, ...newDocs]);

    // Simulate async extraction
    newDocs.forEach((doc) => {
      setTimeout(() => {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? { ...d, status: 'extracted', extracted_data: MOCK_EXTRACTED }
              : d
          )
        );
      }, 2000 + Math.random() * 1500);
    });
  };

  const handleRemove = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeDoc?.id === id) setActiveDoc(null);
  };

  const handlePreview = (doc: UploadedDocument) => setActiveDoc(doc);

  const handleClearAll = () => {
    setDocuments([]);
    setActiveDoc(null);
  };

  return (
    <div className="p-6 h-full max-w-screen-xl mx-auto flex flex-col">
      <PageHeader
        title="Document Upload"
        subtitle="Upload financial documents for AI-powered data extraction."
        action={
          documents.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          ) : undefined
        }
      />

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

        {/* ── Left: Upload panel ── */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-surface-800 mb-4 text-sm">Upload Documents</h3>
            <UploadZone onFiles={handleFiles} />
          </div>

          {/* Queue */}
          {documents.length > 0 && (
            <div className="card p-5 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-surface-800 text-sm">
                  Uploaded Files
                </h3>
                <Badge variant={documents.some(d => d.status === 'processing') ? 'info' : 'success'}>
                  {documents.filter(d => d.status === 'extracted').length}/{documents.length} ready
                </Badge>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1">
                {documents.map((doc) => (
                  <FileQueueItem
                    key={doc.id}
                    doc={doc}
                    onRemove={handleRemove}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Extracted data panel ── */}
        <div className="card p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-surface-800 text-sm">Extracted Data</h3>
            {activeDoc && (
              <div className="flex items-center gap-2">
                <File size={12} className="text-surface-400" />
                <span className="text-xs text-surface-400 truncate max-w-[200px]">{activeDoc.filename}</span>
                <Badge variant="success">AI Extracted</Badge>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <ExtractedPanel
              data={activeDoc?.extracted_data ?? null}
              doc={activeDoc ?? undefined}
            />
          </div>

          {/* Coming soon notice */}
          {!activeDoc && (
            <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
              <p className="text-xs text-brand-600">
                <span className="font-semibold">🚧 Coming soon:</span> Live AI extraction powered by the document processing service.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
