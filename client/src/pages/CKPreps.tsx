import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export default function CKPreps() {
  useEffect(() => {
    toast.info("CK Preps — coming soon!");
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-[#D4A853]" />
          </div>
          <div>
            <h1 className="text-2xl font-serif text-foreground">CK Preps</h1>
            <p className="text-sm text-muted-foreground">Central kitchen preparation tracking</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <ChefHat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-1">CK Preps tracking will be available in a future update.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
