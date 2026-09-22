const isNarrow = () => window.matchMedia("(max-width: 1023px)").matches;

/** On phones the feedback column sits below the table; bring it into view. */
export function revealOnMobile(el: HTMLElement | null): void {
  if (el && isNarrow()) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function toTopOnMobile(): void {
  if (isNarrow()) window.scrollTo({ top: 0, behavior: "smooth" });
}
