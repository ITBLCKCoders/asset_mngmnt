'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Plane,
  Coffee,
  AlertCircle,
  Sun,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Shimmer } from '@/components/ui/shimmer';

export default function LeaveTab() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700">
          <Shimmer className="h-9 w-64 rounded-lg" />
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-2 border-gray-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Shimmer className="h-5 w-32 rounded" />
                      <Shimmer className="h-12 w-20 rounded-lg" />
                      <Shimmer className="h-4 w-28 rounded" />
                    </div>
                    <Shimmer className="h-14 w-14 rounded-full" />
                  </div>
                  <Shimmer className="h-3 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Shimmer className="h-14 w-64 mx-auto rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const leaves = [
    {
      type: 'Vacation Leave',
      days: 12.5,
      icon: Plane,
      color: 'red',
      progress: 58,
    },
    {
      type: 'Sick Leave',
      days: 8,
      icon: Coffee,
      color: 'orange',
      progress: 80,
    },
    {
      type: 'Emergency Leave',
      days: 5,
      icon: AlertCircle,
      color: 'blue',
      progress: 100,
    },
    {
      type: 'Birthday Leave',
      days: 1,
      icon: Sun,
      color: 'green',
      available: true,
    },
  ];

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-2xl">
        <CardTitle className="text-2xl flex items-center gap-3">
          <CalendarDays className="w-7 h-7" /> Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {leaves.map(leave => (
            <Card
              key={leave.type}
              className={`border-2 border-${leave.color}-200 bg-${leave.color}-50`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{leave.type}</p>
                    <p className={`text-3xl font-bold text-${leave.color}-700`}>
                      {leave.days}
                    </p>
                    <p className="text-sm text-gray-600">
                      {leave.available ? 'day available' : 'days remaining'}
                    </p>
                  </div>
                  <leave.icon
                    className={`w-12 h-12 text-${leave.color}-600 opacity-80`}
                  />
                </div>
                {!leave.available && (
                  <Progress
                    value={leave.progress}
                    className={`mt-4 h-3 [&>div]:bg-${leave.color}-600`}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 px-10 py-6 text-white"
          >
            <Calendar className="w-6 h-6 mr-3" />
            File Leave Request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
