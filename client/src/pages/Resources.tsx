import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ExternalLink, Plus, Pencil, Trash2, X, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Resource {
  id: number;
  name: string;
  url: string;
  logoUrl: string | null;
  description: string | null;
  sortOrder: number;
}

interface ResourceFormData {
  name: string;
  url: string;
  logoUrl: string;
  description: string;
}

const EMPTY_FORM: ResourceFormData = { name: "", url: "", logoUrl: "", description: "" };

function ResourceCard({
  resource,
  isAdmin,
  onEdit,
  onDelete,
}: {
  resource: Resource;
  isAdmin: boolean;
  onEdit: (r: Resource) => void;
  onDelete: (id: number) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative flex flex-col items-center rounded-xl bg-card border border-border/50 p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
      {/* Admin controls */}
      {isAdmin && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); onEdit(resource); }}
            className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit resource"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(resource.id); }}
            className="p-1.5 rounded-md bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete resource"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clickable area */}
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center gap-4 w-full text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        {/* Logo */}
        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {resource.logoUrl && !imgError ? (
            <img
              src={resource.logoUrl}
              alt={`${resource.name} logo`}
              className="w-full h-full object-contain p-2"
              onError={() => setImgError(true)}
            />
          ) : (
            <Globe className="w-10 h-10 text-muted-foreground/40" />
          )}
        </div>

        {/* Name + external link icon */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
            {resource.name}
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          </span>
          {resource.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[160px]">{resource.description}</p>
          )}
        </div>
      </a>
    </div>
  );
}

function ResourceFormDialog({
  open,
  onClose,
  initial,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  initial: ResourceFormData;
  onSave: (data: ResourceFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ResourceFormData>(initial);
  // Sync form state whenever the dialog opens with new initial data (edit vs add)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setForm(initial); }, [open]);

  function set(field: keyof ResourceFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit Resource" : "Add Resource"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Company / Site Name *</label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Printables"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">URL *</label>
            <Input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://www.printables.com"
              type="url"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Logo URL <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
            />
            <p className="text-xs text-muted-foreground mt-1">Direct link to a logo image (PNG, SVG, WebP). Leave blank to show a globe icon.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description shown under the logo"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.name.trim() || !form.url.trim()}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Resources() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const { data: resourceList = [], isLoading } = trpc.resources.list.useQuery();

  const createMutation = trpc.resources.create.useMutation({
    onSuccess: () => { utils.resources.list.invalidate(); toast.success("Resource added"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.resources.update.useMutation({
    onSuccess: () => { utils.resources.list.invalidate(); toast.success("Resource updated"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.resources.delete.useMutation({
    onSuccess: () => { utils.resources.list.invalidate(); toast.success("Resource removed"); },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [formInitial, setFormInitial] = useState<ResourceFormData>(EMPTY_FORM);

  function openAdd() {
    setEditingResource(null);
    setFormInitial(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(r: Resource) {
    setEditingResource(r);
    setFormInitial({
      name: r.name,
      url: r.url,
      logoUrl: r.logoUrl ?? "",
      description: r.description ?? "",
    });
    setDialogOpen(true);
  }

  function handleSave(data: ResourceFormData) {
    const payload = {
      name: data.name.trim(),
      url: data.url.trim(),
      logoUrl: data.logoUrl.trim() || null,
      description: data.description.trim() || null,
    };
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(id: number) {
    if (!confirm("Remove this resource?")) return;
    deleteMutation.mutate({ id });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Resources</h1>
            <p className="text-muted-foreground mt-1">Useful links and tools for 3D printing</p>
          </div>
          {isAdmin && (
            <Button onClick={openAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Resource
            </Button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border/50 p-6 animate-pulse">
                <div className="w-20 h-20 rounded-xl bg-muted mx-auto mb-4" />
                <div className="h-4 bg-muted rounded mx-auto w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && resourceList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No resources yet</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              {isAdmin
                ? "Add links to useful 3D printing sites, tools, and communities."
                : "Check back later for useful links and resources."}
            </p>
            {isAdmin && (
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add first resource
              </Button>
            )}
          </div>
        )}

        {/* Resource grid */}
        {!isLoading && resourceList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {resourceList.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                isAdmin={isAdmin}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog — key forces remount so form state is always fresh */}
      <ResourceFormDialog
        key={editingResource ? `edit-${editingResource.id}` : "add"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={formInitial}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
