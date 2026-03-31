import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, UserPlus, Crown, Eye, Pencil, Users, Share2, Check, X, Clock, Mail, Copy, Link, Camera, ImageIcon } from "lucide-react";
import type { House, HouseMember, PendingInvite } from "@/hooks/use-houses";
import { PERSONAL_RELATIONSHIPS, BUSINESS_RELATIONSHIPS } from "@/hooks/use-houses";

interface HouseManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  members: HouseMember[];
  pendingInvites?: PendingInvite[];
  isOwner: boolean;
  onInvite: (houseId: string, email: string, role: "editor" | "viewer", relationship: string, shareMode: "full" | "selected") => void;
  onCreateInviteLink?: (houseId: string, role: "editor" | "viewer", relationship: string, shareMode: "full" | "selected") => Promise<string | null>;
  onRename: (houseId: string, newName: string) => void;
  onRemoveMember: (memberId: string, houseId: string) => void;
  onCancelInvite?: (inviteId: string, houseId: string) => void;
  onDelete: (houseId: string) => void;
  onUploadImage?: (houseId: string, file: File) => Promise<string | null>;
  onRemoveImage?: (houseId: string) => void;
  currentUserId?: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  editor: <Pencil className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

export function HouseManageDialog({
  open, onOpenChange, house, members, pendingInvites = [], isOwner, onInvite, onCreateInviteLink, onRename, onRemoveMember, onCancelInvite, onDelete, onUploadImage, onRemoveImage, currentUserId,
}: HouseManageDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [relationship, setRelationship] = useState("Household");
  const [shareMode, setShareMode] = useState<"full" | "selected">("full");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!house) return null;

  const handleInvite = () => {
    if (!email.trim()) return;
    onInvite(house.id, email.trim(), role, relationship, shareMode);
    setEmail("");
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(house.id);
    onOpenChange(false);
    setConfirmDelete(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !house || !onUploadImage) return;
    setUploadingImage(true);
    await onUploadImage(house.id, file);
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setConfirmDelete(false); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {house.propertyType === "business" ? "🏢" : "🏠"}
            {editing ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editName.trim()) {
                      onRename(house.id, editName.trim());
                      setEditing(false);
                    }
                    if (e.key === "Escape") setEditing(false);
                  }}
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { if (editName.trim()) { onRename(house.id, editName.trim()); setEditing(false); } }}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <span className="flex items-center gap-1">
                {house.name}
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditName(house.name); setEditing(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>Manage members and sharing for this {house.propertyType === "business" ? "business" : "house"}.</DialogDescription>
        </DialogHeader>

        {/* Logo / Image */}
        <div className="flex items-center gap-3">
          <div
            className="relative h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => isOwner && fileInputRef.current?.click()}
          >
            {house.imageUrl ? (
              <img src={house.imageUrl} alt={house.name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-background/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="h-4 w-4 text-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{house.name}</p>
            <p className="text-xs text-muted-foreground">
              {house.imageUrl ? "Click image to change" : isOwner ? "Click to add a logo or photo" : "No image set"}
            </p>
            {house.imageUrl && isOwner && onRemoveImage && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive mt-1" onClick={() => onRemoveImage(house.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Remove photo
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploadingImage}
          />
        </div>

        {/* Members list */}
        <div className="space-y-2">
          <Label>Members ({members.length})</Label>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  {ROLE_ICONS[m.role]}
                  <span className="text-sm truncate">{m.displayName || m.userId.slice(0, 8)}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">{m.role}</Badge>
                  {m.relationship && m.role !== "owner" && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      <Users className="h-2.5 w-2.5 mr-1" />
                      {m.relationship}
                    </Badge>
                  )}
                  {m.shareMode === "selected" && m.role !== "owner" && (
                    <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">
                      <Share2 className="h-2.5 w-2.5 mr-1" />
                      Selected items
                    </Badge>
                  )}
                </div>
                {isOwner && m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => onRemoveMember(m.id, house.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Pending Invites ({pendingInvites.length})
            </Label>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm truncate">{inv.email}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{inv.role}</Badge>
                    {inv.relationship && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        <Users className="h-2.5 w-2.5 mr-1" />
                        {inv.relationship}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          const link = `${window.location.origin}/accept-invite?token=${inv.inviteToken}`;
                          navigator.clipboard.writeText(link);
                          toast.success("Invite link copied!");
                        }}
                        title="Copy invite link"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    {isOwner && onCancelInvite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => onCancelInvite(inv.id, house!.id)}
                        title="Cancel invite"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Invite */}
        {isOwner && (
          <div className="space-y-3 pt-2 border-t">
            <Label>Invite Member</Label>
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "editor" | "viewer")}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Relationship</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(house?.propertyType === "business" ? BUSINESS_RELATIONSHIPS : PERSONAL_RELATIONSHIPS).map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">What to share</Label>
              <Select value={shareMode} onValueChange={(v) => setShareMode(v as "full" | "selected")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{house?.propertyType === "business" ? "🏢 Entire business" : "🏠 Entire house"} (all items)</SelectItem>
                  <SelectItem value="selected">📋 Selected items only</SelectItem>
                </SelectContent>
              </Select>
              {shareMode === "selected" && (
                <p className="text-xs text-muted-foreground">
                  After inviting, share specific items using the ↔ button on each item card.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1" onClick={handleInvite} disabled={!email.trim()}>
                <UserPlus className="h-4 w-4" /> Invite by Email
              </Button>
              {onCreateInviteLink && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={async () => {
                    const link = await onCreateInviteLink(house.id, role, relationship, shareMode);
                    if (link) {
                      navigator.clipboard.writeText(link);
                      toast.success("Invite link copied to clipboard!");
                    }
                  }}
                >
                  <Link className="h-4 w-4" /> Copy Invite Link
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Delete */}
        {isOwner && (
          <div className="pt-2 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {confirmDelete ? `Confirm Delete ${house?.propertyType === "business" ? "Business" : "House"}` : `Delete ${house?.propertyType === "business" ? "Business" : "House"}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
