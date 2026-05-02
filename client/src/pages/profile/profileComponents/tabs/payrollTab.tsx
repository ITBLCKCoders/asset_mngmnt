'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DollarSign, Receipt, PiggyBank, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded bg-gray-200/80', className)} />
);

export default function PayrollTab() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800">
          <Shimmer className="h-9 w-80 rounded-lg" />
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-10">
            {['Earnings', 'Deductions'].map(title => (
              <div key={title}>
                <Shimmer className="h-8 w-48 mb-6 rounded-lg" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Shimmer className="h-5 w-40 rounded" />
                      <Shimmer className="h-5 w-32 rounded" />
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t-2 border-gray-300">
                    <Shimmer className="h-7 w-36 rounded" />
                    <Shimmer className="h-8 w-44 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-10 border-t-2 border-gray-300" />

          <div className="text-center bg-gray-100 rounded-2xl p-10 space-y-6">
            <Shimmer className="h-8 w-64 mx-auto rounded" />
            <Shimmer className="h-16 w-80 mx-auto rounded-lg" />
            <Shimmer className="h-12 w-56 mx-auto rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-t-2xl">
        <CardTitle className="text-2xl flex items-center gap-3">
          <DollarSign className="w-7 h-7" /> Payroll Summary – June 2025
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-red-700">
              <Receipt className="w-6 h-6" /> Earnings
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Basic Salary</TableCell>
                  <TableCell className="text-right text-lg">
                    ₱85,000.00
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Allowance</TableCell>
                  <TableCell className="text-right">₱8,000.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Overtime (16 hrs)</TableCell>
                  <TableCell className="text-right">₱6,800.00</TableCell>
                </TableRow>
                <TableRow className="bg-red-50">
                  <TableCell className="font-bold text-lg">Gross Pay</TableCell>
                  <TableCell className="text-right text-xl font-bold text-red-700">
                    ₱99,800.00
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-red-700">
              <PiggyBank className="w-6 h-6" /> Deductions
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>SSS</TableCell>
                  <TableCell className="text-right">₱3,825.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>PhilHealth</TableCell>
                  <TableCell className="text-right">₱1,912.50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pag-IBIG</TableCell>
                  <TableCell className="text-right">₱500.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Withholding Tax</TableCell>
                  <TableCell className="text-right">₱12,450.00</TableCell>
                </TableRow>
                <TableRow className="bg-red-50">
                  <TableCell className="font-bold text-lg">
                    Total Deductions
                  </TableCell>
                  <TableCell className="text-right text-xl font-bold text-red-700">
                    ₱18,687.50
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator className="my-10 border-t-2 border-red-200" />

        <div className="text-center bg-red-50 rounded-2xl p-10">
          <p className="text-2xl font-light text-gray-700">Take-Home Pay</p>
          <p className="text-5xl font-bold text-red-700 mt-3">₱81,112.50</p>
          <Button
            size="lg"
            className="mt-8 bg-red-600 hover:bg-red-700 text-white"
          >
            <Download className="w-5 h-5 mr-2" /> Download Payslip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
