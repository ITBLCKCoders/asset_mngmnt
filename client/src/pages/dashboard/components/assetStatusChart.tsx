'use client';

interface StatusItem {
  name: string;
  value: number;
  color: string;
}

export default function AssetStatusChart({ data }: { data: StatusItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {data.map(item => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;

        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">
                {item.value} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
