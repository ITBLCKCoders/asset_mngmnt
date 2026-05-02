'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, CardContent, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

export default function ScheduleTab() {
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
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-gray-100 border-2 border-gray-200"
              >
                <Shimmer className="h-6 w-24 mx-auto rounded" />
                <div className="mt-4 space-y-3">
                  <Shimmer className="h-8 w-20 mx-auto rounded" />
                  <Shimmer className="h-4 w-8 mx-auto rounded" />
                  <Shimmer className="h-8 w-20 mx-auto rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 bg-gray-100 rounded-xl border-2 border-gray-200">
            <Shimmer className="h-6 w-48 rounded" />
            <Shimmer className="h-5 w-full mt-3 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-2xl">
        <CardTitle className="text-2xl flex items-center gap-3">
          <Clock className="w-7 h-7" /> Work Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-center">
          {days.map((day, i) => (
            <div
              key={day}
              className={`p-6 rounded-xl border-2 ${i < 5 ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-300'}`}
            >
              <p className="font-semibold text-gray-700">{day}</p>
              {i < 5 ? (
                <>
                  <p className="text-2xl font-bold text-red-700 mt-3">
                    9:00 AM
                  </p>
                  <p className="text-sm text-gray-600">—</p>
                  <p className="text-2xl font-bold text-red-700">6:00 PM</p>
                </>
              ) : (
                <p className="text-lg font-medium text-gray-500 mt-6">
                  Rest Day
                </p>
              )}
            </div>
          ))}
        </div>

        <Alert className="mt-8 border-red-200 bg-red-50">
          <Bell className="h-5 w-5 text-red-600" />
          <h4 className="font-semibold">Shift Information</h4>
          <p className="text-sm">
            Regular Office Hours • Monday–Friday • 1-hour flexible break • WFH
            on Wednesdays
          </p>
        </Alert>
      </CardContent>
    </Card>
  );
}
