import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const insights = [
  { id: 1, title: "Sleep trending up", severity: "info", description: "Average increased 30min this week" },
  { id: 2, title: "Treadmill streak", severity: "info", description: "5 days consistent" },
  { id: 3, title: "Weight stable", severity: "info", description: "Within 0.5kg for 7 days" },
];

export function InsightsPreview() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight) => (
            <div 
              key={insight.id}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{insight.title}</p>
                <Badge variant="secondary" className="text-xs">{insight.severity}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
