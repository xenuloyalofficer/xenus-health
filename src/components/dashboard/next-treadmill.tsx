import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Dumbbell } from "lucide-react";

export function NextTreadmill() {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-blue-600" />
          Next Treadmill Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="font-bold text-lg">30 minutes</p>
              <p className="text-sm text-muted-foreground">Standard pace • RPE 5-6</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button className="flex-1">Start Session</Button>
            <Button variant="outline" className="flex-1">Log Session</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
