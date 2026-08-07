"use client";

// 重置密码对话框：为指定用户设置新密码。
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetPassword, type UserAdminInfo } from "@/lib/api/auth";

interface Props {
  user: UserAdminInfo | null;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordDialog({ user, onOpenChange }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(user.id, newPassword);
      toast.success("密码已重置");
      setNewPassword("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重置失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置密码 · {user?.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>新密码</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            确认重置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
