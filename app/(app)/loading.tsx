import { Loader2 } from 'lucide-react';

export default function AppLoading() {
  return (
    <div aria-busy="true" className="flex min-h-[50vh] w-full items-center justify-center">
      <p role="status" className="sr-only">
        Loading...
      </p>
      <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
    </div>
  );
}
