interface TableScrollHintProps {
  children?: string;
}

export default function TableScrollHint({
  children = 'Deslizá horizontalmente para ver todas las columnas.',
}: TableScrollHintProps) {
  return (
    <p className="mb-2 text-xs text-slate-500 md:hidden" role="note">
      {children}
    </p>
  );
}
