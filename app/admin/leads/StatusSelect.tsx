"use client";

export default function StatusSelect({
  leadId,
  status,
  action,
}: {
  leadId: number;
  status: string;
  action: (fd: FormData) => Promise<void>;
}) {
  const opts = ["Novo", "Em Atendimento", "Convertido", "Perdido"];
  const colors: Record<string, string> = {
    Novo: "bg-blue-50 text-blue-700 border-blue-200",
    "Em Atendimento": "bg-yellow-50 text-yellow-700 border-yellow-200",
    Convertido: "bg-green-50 text-green-700 border-green-200",
    Perdido: "bg-gray-100 text-gray-700 border-gray-300",
  };

  return (
    <form action={action} className="inline-block">
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.target.form?.requestSubmit()}
        className={`text-xs font-bold rounded-full px-3 py-1 border ${colors[status] ?? colors["Perdido"]}`}
      >
        {opts.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </form>
  );
}
