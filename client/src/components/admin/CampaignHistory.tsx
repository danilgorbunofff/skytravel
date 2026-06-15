import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function CampaignHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historie kampaní</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Zatím žádné odeslané kampaně. Historie se začne zobrazovat po odeslání první kampaně.
        </p>
      </CardContent>
    </Card>
  );
}
