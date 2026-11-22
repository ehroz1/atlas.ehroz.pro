/** `--name value` / `--name=value` / `--flag` from process.argv. */
export function arg(name, fallback) {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === `--${name}`) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    if (argv[i].startsWith(`--${name}=`)) return argv[i].slice(name.length + 3);
  }
  return fallback;
}
