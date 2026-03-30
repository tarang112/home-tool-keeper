import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import type { CustomCategory, CustomLocation } from "@/hooks/use-custom-options";

interface ManageOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customCategories: CustomCategory[];
  customLocations: CustomLocation[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, icon: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onAddLocation: (name: string) => Promise<void>;
  onUpdateLocation: (id: string, name: string) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
}

export function ManageOptionsDialog({
  open, onOpenChange,
  customCategories, customLocations,
  onAddCategory, onUpdateCategory, onDeleteCategory,
  onAddLocation, onUpdateLocation, onDeleteLocation,
}: ManageOptionsDialogProps) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [newLocName, setNewLocName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [editingLoc, setEditingLoc] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Manage Categories & Locations</DialogTitle>
          <DialogDescription>Create, edit, or delete your custom categories and locations.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="categories">
          <TabsList className="w-full">
            <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
            <TabsTrigger value="locations" className="flex-1">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="w-14 text-center" maxLength={2} />
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category name..." className="flex-1" />
              <Button size="icon" disabled={!newCatName.trim()} onClick={async () => {
                await onAddCategory(newCatName, newCatIcon || "📦");
                setNewCatName(""); setNewCatIcon("📦");
              }}><Plus className="h-4 w-4" /></Button>
            </div>
            {customCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md border">
                {editingCat === cat.id ? (
                  <>
                    <Input value={editCatIcon} onChange={e => setEditCatIcon(e.target.value)} className="w-14 text-center" maxLength={2} />
                    <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} className="flex-1" />
                    <Button size="icon" variant="ghost" onClick={async () => {
                      await onUpdateCategory(cat.id, editCatName, editCatIcon);
                      setEditingCat(null);
                    }}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingCat(null)}><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setEditingCat(cat.id); setEditCatName(cat.name); setEditCatIcon(cat.icon);
                    }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteCategory(cat.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {customCategories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No custom categories yet.</p>}
          </TabsContent>

          <TabsContent value="locations" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="New location name..." className="flex-1" />
              <Button size="icon" disabled={!newLocName.trim()} onClick={async () => {
                await onAddLocation(newLocName);
                setNewLocName("");
              }}><Plus className="h-4 w-4" /></Button>
            </div>
            {customLocations.map(loc => (
              <div key={loc.id} className="flex items-center gap-2 p-2 rounded-md border">
                {editingLoc === loc.id ? (
                  <>
                    <Input value={editLocName} onChange={e => setEditLocName(e.target.value)} className="flex-1" />
                    <Button size="icon" variant="ghost" onClick={async () => {
                      await onUpdateLocation(loc.id, editLocName);
                      setEditingLoc(null);
                    }}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingLoc(null)}><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{loc.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setEditingLoc(loc.id); setEditLocName(loc.name);
                    }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteLocation(loc.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {customLocations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No custom locations yet.</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
