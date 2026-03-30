import { useState } from "react";
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
import { Trash2, UserPlus, Crown, Eye, Pencil, Users, Share2, Check, X } from "lucide-react";
import type { House, HouseMember } from "@/hooks/use-houses";
import { PERSONAL_RELATIONSHIPS, BUSINESS_RELATIONSHIPS } from "@/hooks/use-houses";

interface HouseManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  members: HouseMember[];
  isOwner: boolean;
  onInvite: (houseId: string, email: string, role: "editor" | "viewer", relationship: string, shareMode: "full" | "selected") => void;
  onRemoveMember: (memberId: string, houseId: string) => void;
  onDelete: (houseId: string) => void;
  currentUserId?: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  editor: <Pencil className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

export function HouseManageDialog({
  open, onOpenChange, house, members, isOwner, onInvite, onRemoveMember, onDelete, currentUserId,
}: HouseManageDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [relationship, setRelationship] = useState("Household");
  const [shareMode, setShareMode] = useState<"full" | "selected">("full");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setConfirmDelete(false); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">🏠 {house.name}</DialogTitle>
          <DialogDescription>Manage members and sharing for this house.</DialogDescription>
        </DialogHeader>

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
                  <SelectItem value="full">🏠 Entire house (all items)</SelectItem>
                  <SelectItem value="selected">📋 Selected items only</SelectItem>
                </SelectContent>
              </Select>
              {shareMode === "selected" && (
                <p className="text-xs text-muted-foreground">
                  After inviting, share specific items using the ↔ button on each item card.
                </p>
              )}
            </div>
            <Button size="sm" className="gap-1" onClick={handleInvite} disabled={!email.trim()}>
              <UserPlus className="h-4 w-4" /> Invite
            </Button>
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
              {confirmDelete ? "Confirm Delete House" : "Delete House"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
