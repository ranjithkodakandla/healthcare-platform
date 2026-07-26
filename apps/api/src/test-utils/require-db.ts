import net from 'net';

/** Skip DB-backed specs when local Postgres is unavailable (CI still runs them). */
export async function databaseReachable(
  host = process.env.PGHOST ?? '127.0.0.1',
  port = Number(process.env.PGPORT ?? 5432),
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(500);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}
