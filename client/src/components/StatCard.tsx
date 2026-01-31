import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  color?: "blue" | "green" | "orange" | "purple";
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  className,
  color = "blue" 
}: StatCardProps) {
  
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card className={cn("overflow-hidden border-none shadow-md shadow-slate-200/50 transition-all hover:shadow-lg hover:-translate-y-1", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold font-display mt-2 tracking-tight text-slate-900">{value}</h3>
            {trend && (
              <p className={cn("text-xs mt-2 font-medium flex items-center", trendUp ? "text-emerald-600" : "text-rose-600")}>
                {trendUp ? "↑" : "↓"} {trend}
                <span className="text-muted-foreground ml-1">vs last week</span>
              </p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", colorMap[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
