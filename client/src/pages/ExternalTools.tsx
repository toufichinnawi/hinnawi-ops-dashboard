import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, FileText, BookOpen, ClipboardCheck, Users, Utensils } from "lucide-react";

const TOOL_GROUPS = [
  {
    title: "SharePoint Documents",
    items: [
      {
        name: "Job Descriptions",
        description: "All position job descriptions and role requirements",
        url: "https://hinnawibrothers.sharepoint.com/:f:/s/HinnawiBrothers/EoWGDlDhYqJJqVPHbhYvqXkBWPcKLxaJJnOFVHLPaOZNYA?e=cNBPmW",
        icon: Users,
        color: "bg-blue-100 text-blue-700",
      },
      {
        name: "Contracts & Agreements",
        description: "Employee contracts, vendor agreements, and legal documents",
        url: "https://hinnawibrothers.sharepoint.com/:f:/s/HinnawiBrothers/EhJqKOvVpBRBvN3kJfOqYCkBQT2-qKdPfXLVqPIVGQnDdQ?e=bJhLcR",
        icon: FileText,
        color: "bg-emerald-100 text-emerald-700",
      },
      {
        name: "Manuals & SOPs",
        description: "Standard operating procedures and training manuals",
        url: "https://hinnawibrothers.sharepoint.com/:f:/s/HinnawiBrothers/EoWGDlDhYqJJqVPHbhYvqXkBWPcKLxaJJnOFVHLPaOZNYA?e=cNBPmW",
        icon: BookOpen,
        color: "bg-purple-100 text-purple-700",
      },
    ],
  },
  {
    title: "Recipes & Menu",
    items: [
      {
        name: "Recipe Database",
        description: "Full recipe database with ingredients, portions, and prep instructions",
        url: "https://hinnawibrothers.sharepoint.com/:f:/s/HinnawiBrothers/EoWGDlDhYqJJqVPHbhYvqXkBWPcKLxaJJnOFVHLPaOZNYA?e=cNBPmW",
        icon: Utensils,
        color: "bg-amber-100 text-amber-700",
      },
    ],
  },
  {
    title: "Evaluations & Forms",
    items: [
      {
        name: "Google Form Evaluations",
        description: "Performance evaluation forms for staff reviews",
        url: "https://docs.google.com/forms",
        icon: ClipboardCheck,
        color: "bg-red-100 text-red-700",
      },
    ],
  },
];

export default function ExternalTools() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1000px]">
        <div>
          <h1 className="text-2xl font-serif text-foreground">External Tools</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick access to SharePoint documents, recipes, and external forms</p>
        </div>

        {TOOL_GROUPS.map((group) => (
          <div key={group.title} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{group.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <Card className="hover:shadow-md transition-all hover:border-amber-300/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-foreground group-hover:text-amber-700 transition-colors">{item.name}</h3>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
