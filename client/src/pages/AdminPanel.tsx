import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.admin.users.useQuery();

  const updateRoleMut = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      utils.admin.users.invalidate();
      toast.success("Role updated");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1000px]">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user roles and permissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="w-4 h-4" /> Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No users found</div>
            ) : (
              <div className="divide-y">
                {users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${user.role === "admin" ? "bg-amber-100" : "bg-muted"}`}>
                        {user.role === "admin" ? (
                          <Shield className="w-4 h-4 text-amber-700" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={user.role || "user"}
                        onValueChange={(role) => {
                          updateRoleMut.mutate({ userId: user.id, role: role as "admin" | "user" });
                        }}
                      >
                        <SelectTrigger className="w-[120px] bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" className={`text-xs ${user.role === "admin" ? "bg-amber-100 text-amber-800" : ""}`}>
                        {user.role || "user"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
