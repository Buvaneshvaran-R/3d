import { StudentFinderWrapper } from "@/components/admin/StudentFinderWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, AlertCircle, IndianRupee, Download, History } from "lucide-react";

const feeData: Array<{
  type: string;
  total: number;
  paid: number;
  due: number;
  status: string;
}> = [];

const FeeDetails = () => {
  const totalFees = feeData.reduce((acc, item) => acc + item.total, 0);
  const totalPaid = feeData.reduce((acc, item) => acc + item.paid, 0);
  const totalDue = feeData.reduce((acc, item) => acc + item.due, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <StudentFinderWrapper />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-header mb-0">Fee Details</h1>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Download Receipt
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(totalFees)}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-3xl font-bold text-success mt-2">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-3xl font-bold text-warning mt-2">{formatCurrency(totalDue)}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Table */}
      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" />
            Fee Breakdown
          </CardTitle>
          <span className="text-sm text-muted-foreground">Academic Year 2024-25</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fee Type</th>
                  <th className="text-right">Total Amount</th>
                  <th className="text-right">Amount Paid</th>
                  <th className="text-right">Amount Due</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {feeData.map((item, index) => (
                  <tr key={index}>
                    <td className="font-medium">{item.type}</td>
                    <td className="text-right text-muted-foreground">{formatCurrency(item.total)}</td>
                    <td className="text-right text-success font-medium">{formatCurrency(item.paid)}</td>
                    <td className="text-right text-warning font-medium">
                      {item.due > 0 ? formatCurrency(item.due) : "—"}
                    </td>
                    <td className="text-center">
                      {item.status === "paid" ? (
                        <span className="badge-paid">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Paid
                        </span>
                      ) : (
                        <span className="badge-pending">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td>Total</td>
                  <td className="text-right">{formatCurrency(totalFees)}</td>
                  <td className="text-right text-success">{formatCurrency(totalPaid)}</td>
                  <td className="text-right text-warning">{formatCurrency(totalDue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      {totalDue > 0 && (
        <Card className="border-none shadow-card border-l-4 border-l-warning">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Payment Due</h3>
                  <p className="text-sm text-muted-foreground">
                    You have a pending payment of {formatCurrency(totalDue)}
                  </p>
                </div>
              </div>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <CreditCard className="w-4 h-4" />
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { date: "15 Dec 2024", amount: 12500, desc: "Transport Fee - Installment 1", ref: "TXN2024121501" },
            { date: "01 Aug 2024", amount: 85000, desc: "Tuition Fee - Full Payment", ref: "TXN2024080101" },
            { date: "01 Aug 2024", amount: 20000, desc: "Laboratory + Library + Sports Fee", ref: "TXN2024080102" },
          ].map((txn, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{txn.desc}</p>
                  <p className="text-xs text-muted-foreground">{txn.date} • {txn.ref}</p>
                </div>
              </div>
              <p className="font-semibold text-success">{formatCurrency(txn.amount)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeDetails;
