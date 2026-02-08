import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Moon, 
  Dumbbell, 
  Utensils, 
  Pill, 
  Zap,
  Plus 
} from "lucide-react";

const checklistItems = [
  { id: "sleep", label: "Sleep", icon: Moon, status: "logged", time: "7h 23m" },
  { id: "weight", label: "Weight", icon: Activity, status: "optional", time: null },
  { id: "meds", label: "Meds", icon: Pill, status: "pending", time: "Morning dose" },
  { id: "exercise", label: "Exercise", icon: Dumbbell, status: "pending", time: "Treadmill 30m" },
  { id: "food", label: "Food", icon: Utensils, status: "partial", time: "2 entries" },
  { id: "energy", label: "Energy/Mood", icon: Zap, status: "pending", time: null },
];

export function TodayChecklist() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Today&apos;s Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklistItems.map((item) => {
          const Icon = item.icon;
          const isLogged = item.status === "logged";
          const isOptional = item.status === "optional";
          const isPartial = item.status === "partial";
          
          return (
            <div 
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${
                  isLogged 
                    ? "bg-green-100 text-green-700" 
                    : isOptional
                    ? "bg-gray-100 text-gray-500"
                    : isPartial
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  {item.time && (
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  )}
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        
        <div className="pt-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium">33%</span>
          </div>
          <Progress value={33} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
