import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { cn } from "../../lib/utils";
import {
  Bold,
  Italic,
  List,
  Heading2,
  Link2,
  ImageIcon,
  Upload,
  Eye,
  Strikethrough,
  Code,
  Undo2,
  Redo2,
  ListOrdered,
} from "lucide-react";

type Props = {
  editor: Editor | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewOpen: () => void;
};

// ── Toolbar button helper ──
function ToolbarBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export default function EmailEditor({ editor, fileInputRef, onUploadImage, onPreviewOpen }: Props) {
  function handleInsertLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL odkazu", prev ?? "https://");
    if (!url) return;
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function handleInsertImageUrl() {
    if (!editor) return;
    const url = window.prompt("URL obrázku");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="space-y-1.5">
      <Label>Obsah e-mailu</Label>
      <div className="overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-px border-b border-input bg-muted/60 px-1.5 py-1">
          {/* History */}
          <div className="flex items-center gap-px">
            <ToolbarBtn
              title="Zpět (Ctrl+Z)"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Znovu (Ctrl+Shift+Z)"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 className="h-4 w-4" />
            </ToolbarBtn>
          </div>
          <Separator orientation="vertical" className="mx-1 h-5" />
          {/* Text style */}
          <div className="flex items-center gap-px">
            <ToolbarBtn
              title="Tučně (Ctrl+B)"
              active={editor?.isActive("bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Kurzíva (Ctrl+I)"
              active={editor?.isActive("italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Přeškrtnutí"
              active={editor?.isActive("strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Kód"
              active={editor?.isActive("code")}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            >
              <Code className="h-4 w-4" />
            </ToolbarBtn>
          </div>
          <Separator orientation="vertical" className="mx-1 h-5" />
          {/* Structure */}
          <div className="flex items-center gap-px">
            <ToolbarBtn
              title="Nadpis H2"
              active={editor?.isActive("heading", { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Odrážkový seznam"
              active={editor?.isActive("bulletList")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Číslovaný seznam"
              active={editor?.isActive("orderedList")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarBtn>
          </div>
          <Separator orientation="vertical" className="mx-1 h-5" />
          {/* Media */}
          <div className="flex items-center gap-px">
            <ToolbarBtn
              title="Odkaz (Ctrl+K)"
              active={editor?.isActive("link")}
              onClick={handleInsertLink}
            >
              <Link2 className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn title="Vložit obrázek (URL)" onClick={handleInsertImageUrl}>
              <ImageIcon className="h-4 w-4" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Nahrát obrázek"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
            </ToolbarBtn>
          </div>
          <Separator orientation="vertical" className="mx-1 h-5" />
          {/* Preview */}
          <ToolbarBtn title="Náhled e-mailu" onClick={onPreviewOpen}>
            <Eye className="h-4 w-4" />
          </ToolbarBtn>
          <input
            ref={fileInputRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            hidden
            onChange={onUploadImage}
          />
        </div>

        {/* TipTap content area — drag/drop handled by editor's handleDrop */}
        <EditorContent editor={editor} className="tiptap-email-editor" />
      </div>
    </div>
  );
}
