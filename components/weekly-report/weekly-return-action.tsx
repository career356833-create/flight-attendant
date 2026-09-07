export function WeeklyReturnAction({ onReturn }: { onReturn: () => void }) {
  return (
    <button
      type="button"
      onClick={onReturn}
      className="h-11 min-h-11 w-full rounded-xl bg-navy px-4 text-sm font-bold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      주간 계획으로 돌아가기
    </button>
  );
}
