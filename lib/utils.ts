export function cn(
  ...inputs: Array<string | number | null | undefined | false>
) {
  return inputs.filter(Boolean).join(" ");
}
