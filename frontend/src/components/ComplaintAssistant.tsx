export function ComplaintAssistant({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <aside className="md:sticky md:top-24">
      <div className="relative rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
        <span className="mb-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
          Policía asistente
        </span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <span className="absolute -bottom-2 left-10 h-4 w-4 rotate-45 border-b border-r border-brand-100 bg-white md:left-1/2" />
      </div>
      <img
        src="/PoliciaAsistente.png"
        alt="Policía virtual de DenunciaPE"
        className="mx-auto mt-1 h-36 w-auto select-none object-contain sm:h-44 md:h-56"
        draggable={false}
      />
    </aside>
  );
}
