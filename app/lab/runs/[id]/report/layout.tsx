export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}

