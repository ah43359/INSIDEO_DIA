import Link from "next/link";

export interface DiaChapterHeaderProps {
  projectId: string;
  projectName: string;
  title: string;
}

export default function DiaChapterHeader({
  projectId,
  projectName,
  title,
}: DiaChapterHeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
        <div>
          <Link
            href={`/projects/${projectId}/dia`}
            className="text-xs text-stone-500 hover:text-stone-700"
          >
            ← Índice DIA
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-stone-800">{title}</h1>
          <p className="text-sm text-stone-500">{projectName}</p>
        </div>
      </div>
    </header>
  );
}
