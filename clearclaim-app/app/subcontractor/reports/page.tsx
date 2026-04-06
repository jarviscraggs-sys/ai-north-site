import { redirect } from 'next/navigation';

// Reports has been merged into Returns for a unified experience.
export default function ReportsRedirect() {
  redirect('/subcontractor/returns');
}
