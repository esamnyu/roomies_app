import { redirect } from 'next/navigation';

// This is a Server Component that handles the redirect.
export default function HouseholdPage({
  params,
}: {
  params: { id: string };
}) {
  // When a user lands on /household/[id], redirect them to the expenses tab.
  redirect(`/household/${params.id}/expenses`);
}