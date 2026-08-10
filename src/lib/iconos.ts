import {
  Activity,
  BookOpen,
  Brush,
  Code2,
  Dumbbell,
  Guitar,
  Keyboard,
  Languages,
  Moon,
  Tv,
  type LucideIcon,
} from "lucide-react";

/** Íconos, nunca emojis (CLAUDE.md §4). Librería: lucide. */
export const ICONOS: Record<string, LucideIcon> = {
  book: BookOpen,
  dumbbell: Dumbbell,
  lang: Languages,
  key: Keyboard,
  tv: Tv,
  moon: Moon,
  act: Activity,
  code: Code2,
  guitar: Guitar,
  brush: Brush,
};

export const ICONO_POR_DEFECTO = "book";

export function icono(clave: string): LucideIcon {
  return ICONOS[clave] ?? ICONOS[ICONO_POR_DEFECTO];
}
