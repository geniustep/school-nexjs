/**
 * Preserve the original year name while displaying the year range in chronological order.
 * Unicode LTR isolates prevent the two years from visually reversing in RTL selects.
 */
export function formatAcademicYearSwitcherLabel(name: string): string {
  return name.replace(/(20\d{2})\s*[-–—/]\s*(20\d{2})/g, (_match, left: string, right: string) => {
    const [first, second] = [left, right].sort((a, b) => Number(a) - Number(b));
    return '\u2066' + first + '/' + second + '\u2069';
  });
}
