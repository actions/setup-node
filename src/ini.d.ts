declare module 'ini' {
  function parse(ini: string): Record<string, string | object>;
}
