import { MOCK_CURRENT_USER } from '@eduotaga/constants';

/** Displays the demo user until real auth ships (see docs/roadmap.md). */
export function UserMenu() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {MOCK_CURRENT_USER.initials}
      </span>
      <span className="hidden text-sm font-medium text-foreground sm:inline">{MOCK_CURRENT_USER.name}</span>
    </div>
  );
}
