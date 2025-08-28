
import * as fs from 'fs/promises';
import { Effect } from 'effect';

export const readFile = (path: string) => Effect.tryPromise(() => fs.readFile(path, 'utf-8'));
export const writeFile = (path: string, content: string) => Effect.tryPromise(() => fs.writeFile(path, content));
export const mkdir = (path: string, options?: { recursive?: boolean }) => Effect.tryPromise(() => fs.mkdir(path, options));
export const readdir = (path: string) => Effect.tryPromise(() => fs.readdir(path));
export const unlink = (path: string) => Effect.tryPromise(() => fs.unlink(path));

