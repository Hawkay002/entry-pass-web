// components/guests/import-export.tsx — import + export modals for the Guest List.

"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseImportFile, exportTickets } from "@/lib/import-export";
import { importTickets } from "@/app/actions/import";
import type { ParsedTicket } from "@/lib/import-export";
import type { Ticket as TicketType } from "@/lib/types";

export function ImportExportButtons({
  selectedTickets,
  allTickets,
}: {
  selectedTickets: TicketType[];
  allTickets: TicketType[];
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
        <Upload className="mr-1.5 h-4 w-4" /> Import
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={selectedTickets.length === 0}
        onClick={() => setExportOpen(true)}
      >
        <FileDown className="mr-1.5 h-4 w-4" /> Export ({selectedTickets.length})
      </Button>

      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        existingPhones={allTickets.map((t) =>
          t.phone.replace("+91", "")
        )}
      />
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        tickets={selectedTickets}
      />
    </>
  );
}

function ImportModal({
  open,
  onOpenChange,
  existingPhones,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingPhones: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedTicket[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const records = await parseImportFile(file);
      setParsed(records);
    } catch (err) {
      toast.error("Parse failed", { description: (err as Error).message });
    }
  }

  async function handleImport() {
    setImporting(true);
    const res = await importTickets(parsed, existingPhones);
    setImporting(false);
    if (res.ok) {
      toast.success(
        `Imported ${res.imported} guests (${res.duplicates} duplicates skipped)`
      );
      onOpenChange(false);
      setParsed([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    } else {
      toast.error("Import failed", { description: res.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Guests</DialogTitle>
          <DialogDescription>
            Upload a file to bulk import tickets. Supported: CSV, JSON, TXT, XLSX.
            Duplicates are skipped based on phone number.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.txt,.xlsx"
            onChange={handleFile}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Browse Files
          </Button>
          {fileName && (
            <p className="text-sm text-success-green">
              Selected: {fileName} ({parsed.length} records)
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsed.length === 0 || importing}
          >
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {parsed.length > 0 ? `${parsed.length} Records` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportModal({
  open,
  onOpenChange,
  tickets,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tickets: TicketType[];
}) {
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const name = filename || "guest_list";
    try {
      await exportTickets(tickets, name, format);
      toast.success(`Exported ${tickets.length} records as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (err) {
      toast.error("Export failed", { description: (err as Error).message });
    }
    setExporting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Exporting {tickets.length} selected guest(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-name">File Name</Label>
            <Input
              id="export-name"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="guest_list"
            />
          </div>
          <div className="space-y-2">
            <Label>File Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v ?? "csv")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="txt">Text (.txt)</SelectItem>
                <SelectItem value="doc">Word (.doc)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
